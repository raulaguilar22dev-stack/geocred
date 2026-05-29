import pytest
import pytest_asyncio
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import db


def mock_create_account():
    import uuid
    pk = f"mock_{uuid.uuid4().hex[:12]}"
    return {"public_key": pk, "secret_key": f"secret_{pk}"}


@pytest_asyncio.fixture
async def client():
    with patch("app.services.stellar.create_account", side_effect=mock_create_account):
        # Limpiar memoria antes de cada test para aislar estado
        for key in db._memory:
            db._memory[key].clear()

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


async def register_and_login(client, username, password, role="emprendedor"):
    r = await client.post("/auth/register", json={
        "username": username,
        "password": password,
        "full_name": f"{username} Full",
        "business_name": f"{username} Biz",
        "role": role,
    })
    assert r.status_code == 200
    data = r.json()

    # Forzar rol si se necesita admin (seed o manual)
    if role == "admin":
        user = await db.get_user_by_username(username)
        await db.update_user(user["id"], {"role": "admin"})

    r = await client.post("/auth/login", json={
        "username": username,
        "password": password,
    })
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.mark.asyncio
async def test_register_and_login(client):
    token = await register_and_login(client, "testuser", "testpass")
    assert isinstance(token, str)


@pytest.mark.asyncio
async def test_create_loan_with_milestones(client):
    emp_token = await register_and_login(client, "emp1", "emppass")

    r = await client.post("/loans", json={
        "amount": 1000.0,
        "purpose": "Comprar stock",
        "objectives": ["Comprar mercaderia", "Ampliar local"],
        "milestones": [
            {"description": "Meta 1: Compra inicial", "amount": 300.0},
            {"description": "Meta 2: Equipamiento", "amount": 300.0},
            {"description": "Meta 3: Ampliacion", "amount": 400.0},
        ],
    }, headers={"Authorization": f"Bearer {emp_token}"})
    assert r.status_code == 200
    loan = r.json()
    assert loan["amount"] == 1000.0
    assert loan["status"] == "pending"
    assert loan["interest_rate"] == 3.0
    assert loan["total_invested"] == 0.0

    # Verificar milestones creados
    r = await client.get(f"/loans/{loan['id']}", headers={"Authorization": f"Bearer {emp_token}"})
    assert r.status_code == 200
    detail = r.json()
    assert len(detail["milestones"]) == 3
    assert detail["milestones"][0]["status"] == "pending"


@pytest.mark.asyncio
async def test_full_crowdlending_lifecycle(client):
    with patch("app.services.stellar.create_account", side_effect=mock_create_account), \
         patch("app.services.stellar.send_payment", return_value={"successful": True, "hash": "tx_disburse_123", "ledger": 12345}), \
         patch("app.services.stellar.get_transaction", return_value={"successful": True, "hash": "tx_payment_456"}), \
         patch("app.services.settings.admin_stellar_secret", "SADMINMOCKSECRET123"):

        # 1. Registrar emprendedor
        emp_token = await register_and_login(client, "emp2", "emppass")

        # 2. Crear prestamo con milestones
        r = await client.post("/loans", json={
            "amount": 1000.0,
            "purpose": "Comprar stock",
            "objectives": ["Crecer"],
            "milestones": [
                {"description": "Meta 1", "amount": 300.0},
                {"description": "Meta 2", "amount": 300.0},
                {"description": "Meta 3", "amount": 400.0},
            ],
        }, headers={"Authorization": f"Bearer {emp_token}"})
        assert r.status_code == 200
        loan = r.json()
        loan_id = loan["id"]
        assert loan["status"] == "pending"

        # 3. Registrar admin
        admin_token = await register_and_login(client, "admin1", "adminpass", role="admin")

        # 4. Admin aprueba -> status funding
        r = await client.post(f"/loans/{loan_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        loan = r.json()
        assert loan["status"] == "funding"

        # 5. Inversores registran
        inv_a_token = await register_and_login(client, "inv_a", "invpass", role="inversor")
        inv_b_token = await register_and_login(client, "inv_b", "invpass", role="inversor")

        # 6. Ver prestamos publicos
        r = await client.get("/loans/public")
        assert r.status_code == 200
        public_loans = r.json()
        assert len(public_loans) == 1
        assert public_loans[0]["id"] == loan_id

        # 7. Inversor A aporta $600
        r = await client.post("/investments", json={
            "loan_id": loan_id,
            "amount": 600.0,
        }, headers={"Authorization": f"Bearer {inv_a_token}"})
        assert r.status_code == 200
        inv_a = r.json()
        assert inv_a["amount"] == 600.0

        # 8. Inversor B aporta $400 -> prestamo pasa a active
        r = await client.post("/investments", json={
            "loan_id": loan_id,
            "amount": 400.0,
        }, headers={"Authorization": f"Bearer {inv_b_token}"})
        assert r.status_code == 200
        inv_b = r.json()
        assert inv_b["amount"] == 400.0

        # Verificar prestamo ahora active
        r = await client.get(f"/loans/{loan_id}", headers={"Authorization": f"Bearer {emp_token}"})
        assert r.status_code == 200
        loan_detail = r.json()
        assert loan_detail["status"] == "active"
        assert loan_detail["total_invested"] == 1000.0

        # 9. Emprendedor sube factura para meta 1
        r = await client.post("/invoices", json={
            "loan_id": loan_id,
            "description": "Factura proveedor meta 1",
            "amount": 250.0,
            "document_url": "https://example.com/factura1.pdf",
        }, headers={"Authorization": f"Bearer {emp_token}"})
        assert r.status_code == 200
        invoice1 = r.json()
        invoice1_id = invoice1["id"]

        # 10. Admin valida factura y completa meta 1
        r = await client.post(f"/invoices/{invoice1_id}/validate", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200

        milestone1_id = loan_detail["milestones"][0]["id"]
        r = await client.post(f"/loans/{loan_id}/milestones/{milestone1_id}/complete", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        assert r.json()["status"] == "completed"

        # 11. Admin desembolsa meta 1
        r = await client.post(f"/loans/{loan_id}/disburse", params={"milestone_id": milestone1_id}, headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        disp = r.json()
        assert disp["amount"] == 300.0
        assert disp["milestone_id"] == milestone1_id

        # 12. Meta 2: factura, validar, completar, desembolsar
        r = await client.post("/invoices", json={
            "loan_id": loan_id,
            "description": "Factura meta 2",
            "amount": 280.0,
        }, headers={"Authorization": f"Bearer {emp_token}"})
        invoice2_id = r.json()["id"]
        await client.post(f"/invoices/{invoice2_id}/validate", headers={"Authorization": f"Bearer {admin_token}"})

        milestone2_id = loan_detail["milestones"][1]["id"]
        await client.post(f"/loans/{loan_id}/milestones/{milestone2_id}/complete", headers={"Authorization": f"Bearer {admin_token}"})
        r = await client.post(f"/loans/{loan_id}/disburse", params={"milestone_id": milestone2_id}, headers={"Authorization": f"Bearer {admin_token}"})
        assert r.json()["amount"] == 300.0

        # 13. Meta 3
        r = await client.post("/invoices", json={
            "loan_id": loan_id,
            "description": "Factura meta 3",
            "amount": 350.0,
        }, headers={"Authorization": f"Bearer {emp_token}"})
        invoice3_id = r.json()["id"]
        await client.post(f"/invoices/{invoice3_id}/validate", headers={"Authorization": f"Bearer {admin_token}"})

        milestone3_id = loan_detail["milestones"][2]["id"]
        await client.post(f"/loans/{loan_id}/milestones/{milestone3_id}/complete", headers={"Authorization": f"Bearer {admin_token}"})
        await client.post(f"/loans/{loan_id}/disburse", params={"milestone_id": milestone3_id}, headers={"Authorization": f"Bearer {admin_token}"})

        # Verificar que todo fue desembolsado
        r = await client.get(f"/loans/{loan_id}", headers={"Authorization": f"Bearer {emp_token}"})
        loan_detail = r.json()
        assert loan_detail["disbursed_amount"] == 1000.0

        # 14. Emprendedor paga $1030 (1000 + 3% interes)
        r = await client.post("/payments", json={
            "loan_id": loan_id,
            "amount": 1030.0,
            "stellar_tx_hash": "tx_payment_456",
        }, headers={"Authorization": f"Bearer {emp_token}"})
        assert r.status_code == 200
        payment = r.json()
        assert payment["amount"] == 1030.0

        # 15. Verificar prestamo completed
        r = await client.get(f"/loans/{loan_id}", headers={"Authorization": f"Bearer {emp_token}"})
        assert r.status_code == 200
        loan = r.json()
        assert loan["status"] == "completed"
        assert loan["remaining_amount"] == 0.0

        # 16. Verificar que los inversores tienen retornos registrados
        r = await client.get("/investments", headers={"Authorization": f"Bearer {inv_a_token}"})
        assert r.status_code == 200
        inv_a_list = r.json()
        assert len(inv_a_list) == 1
        assert inv_a_list[0]["loan_id"] == loan_id

        # Ver pagos del prestamo (incluyendo retornos a inversores)
        r = await client.get(f"/loans/{loan_id}", headers={"Authorization": f"Bearer {emp_token}"})
        loan = r.json()
        # Debe haber 1 pago del emprendedor + 2 retornos a inversores = 3 payments total
        assert len(loan["payments"]) == 3

        # Inversor A recibio aprox 618 (600/1000 * 1030)
        inv_a_returns = [p for p in loan["payments"] if p.get("investor_id") == inv_a_list[0]["investor_id"]]
        assert len(inv_a_returns) == 1
        assert abs(inv_a_returns[0]["amount"] - 618.0) < 1.0


@pytest.mark.asyncio
async def test_cannot_disburse_uncompleted_milestone(client):
    with patch("app.services.stellar.create_account", side_effect=mock_create_account):
        emp_token = await register_and_login(client, "emp3", "emppass")
        admin_token = await register_and_login(client, "admin2", "adminpass", role="admin")

        r = await client.post("/loans", json={
            "amount": 500.0,
            "purpose": "Test",
            "objectives": [],
            "milestones": [
                {"description": "Meta 1", "amount": 500.0},
            ],
        }, headers={"Authorization": f"Bearer {emp_token}"})
        loan_id = r.json()["id"]

        await client.post(f"/loans/{loan_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

        # Inversor fondea
        inv_token = await register_and_login(client, "inv_c", "invpass", role="inversor")
        await client.post("/investments", json={
            "loan_id": loan_id,
            "amount": 500.0,
        }, headers={"Authorization": f"Bearer {inv_token}"})

        # Intentar desembolsar meta sin completar
        r = await client.get(f"/loans/{loan_id}", headers={"Authorization": f"Bearer {emp_token}"})
        milestone_id = r.json()["milestones"][0]["id"]

        r = await client.post(f"/loans/{loan_id}/disburse", params={"milestone_id": milestone_id}, headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 400
        assert "completada" in r.json()["detail"].lower() or "completed" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_cannot_invest_more_than_remaining(client):
    with patch("app.services.stellar.create_account", side_effect=mock_create_account):
        emp_token = await register_and_login(client, "emp4", "emppass")
        admin_token = await register_and_login(client, "admin3", "adminpass", role="admin")

        r = await client.post("/loans", json={
            "amount": 100.0,
            "purpose": "Test",
            "objectives": [],
            "milestones": [
                {"description": "Meta", "amount": 100.0},
            ],
        }, headers={"Authorization": f"Bearer {emp_token}"})
        loan_id = r.json()["id"]

        await client.post(f"/loans/{loan_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

        inv_token = await register_and_login(client, "inv_d", "invpass", role="inversor")

        # Aportar exacto
        r = await client.post("/investments", json={
            "loan_id": loan_id,
            "amount": 100.0,
        }, headers={"Authorization": f"Bearer {inv_token}"})
        assert r.status_code == 200

        # Intentar aportar de mas -> prestamo ya paso a active, no acepta mas
        r = await client.post("/investments", json={
            "loan_id": loan_id,
            "amount": 10.0,
        }, headers={"Authorization": f"Bearer {inv_token}"})
        assert r.status_code == 400
        assert "no esta buscando financiacion" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_unauthorized_roles(client):
    with patch("app.services.stellar.create_account", side_effect=mock_create_account):
        emp_token = await register_and_login(client, "emp5", "emppass")
        inv_token = await register_and_login(client, "inv_e", "invpass", role="inversor")
        admin_token = await register_and_login(client, "admin4", "adminpass", role="admin")

        # Emprendedor crea prestamo
        r = await client.post("/loans", json={
            "amount": 50.0,
            "purpose": "Test",
            "objectives": [],
            "milestones": [{"description": "Meta", "amount": 50.0}],
        }, headers={"Authorization": f"Bearer {emp_token}"})
        loan_id = r.json()["id"]

        # Inversor no puede crear prestamo
        r = await client.post("/loans", json={
            "amount": 50.0,
            "purpose": "Test",
            "objectives": [],
            "milestones": [{"description": "Meta", "amount": 50.0}],
        }, headers={"Authorization": f"Bearer {inv_token}"})
        assert r.status_code == 403

        # Emprendedor no puede invertir
        r = await client.post("/investments", json={
            "loan_id": loan_id,
            "amount": 10.0,
        }, headers={"Authorization": f"Bearer {emp_token}"})
        assert r.status_code == 403

        # Inversor no puede pagar
        r = await client.post("/payments", json={
            "loan_id": loan_id,
            "amount": 10.0,
        }, headers={"Authorization": f"Bearer {inv_token}"})
        assert r.status_code == 403

        # Inversor no puede subir factura
        r = await client.post("/invoices", json={
            "loan_id": loan_id,
            "description": "Factura",
            "amount": 10.0,
        }, headers={"Authorization": f"Bearer {inv_token}"})
        assert r.status_code == 403


@pytest.mark.asyncio
async def test_investor_can_view_returns(client):
    with patch("app.services.stellar.create_account", side_effect=mock_create_account), \
         patch("app.services.settings.admin_stellar_secret", "SADMINMOCKSECRET123"):

        emp_token = await register_and_login(client, "emp6", "emppass")
        admin_token = await register_and_login(client, "admin5", "adminpass", role="admin")
        inv_token = await register_and_login(client, "inv_f", "invpass", role="inversor")

        # Crear y aprobar prestamo
        r = await client.post("/loans", json={
            "amount": 100.0,
            "purpose": "Test",
            "objectives": [],
            "milestones": [{"description": "Meta", "amount": 100.0}],
        }, headers={"Authorization": f"Bearer {emp_token}"})
        loan_id = r.json()["id"]
        await client.post(f"/loans/{loan_id}/approve", headers={"Authorization": f"Bearer {admin_token}"})

        # Inversor fondea
        r = await client.post("/investments", json={
            "loan_id": loan_id,
            "amount": 100.0,
        }, headers={"Authorization": f"Bearer {inv_token}"})
        inv_id = r.json()["id"]

        # Completar y desembolsar meta
        r = await client.get(f"/loans/{loan_id}", headers={"Authorization": f"Bearer {emp_token}"})
        ms_id = r.json()["milestones"][0]["id"]
        await client.post(f"/loans/{loan_id}/milestones/{ms_id}/complete", headers={"Authorization": f"Bearer {admin_token}"})
        await client.post(f"/loans/{loan_id}/disburse", params={"milestone_id": ms_id}, headers={"Authorization": f"Bearer {admin_token}"})

        # Emprendedor paga
        await client.post("/payments", json={
            "loan_id": loan_id,
            "amount": 103.0,
        }, headers={"Authorization": f"Bearer {emp_token}"})

        # Ver inversores retornos en payments del prestamo
        r = await client.get(f"/loans/{loan_id}", headers={"Authorization": f"Bearer {inv_token}"})
        assert r.status_code == 200
        loan = r.json()
        assert any(p.get("investor_id") is not None for p in loan["payments"])

        # Ver detalle de inversion
        r = await client.get(f"/investments/{inv_id}", headers={"Authorization": f"Bearer {inv_token}"})
        assert r.status_code == 200
        assert r.json()["amount"] == 100.0
