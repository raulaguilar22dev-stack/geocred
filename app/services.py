from typing import Optional

from app.database import db
from app.stellar import stellar
from app.auth import get_password_hash
from app.config import settings


class UserService:
    @staticmethod
    async def register_user(data: dict) -> dict:
        existing = await db.get_user_by_username(data["username"])
        if existing:
            raise ValueError("Usuario ya existe")

        role = data.get("role", "emprendedor")
        user_data = {
            "username": data["username"],
            "password_hash": get_password_hash(data["password"]),
            "full_name": data["full_name"],
            "business_name": data.get("business_name"),
            "role": role,
            "stellar_public_key": None,
        }

        user = await db.create_user(user_data)

        # Crear wallet Stellar automaticamente
        wallet = stellar.create_account()
        await db.update_user(user["id"], {"stellar_public_key": wallet["public_key"]})
        user["stellar_public_key"] = wallet["public_key"]
        # Solo por MVP; en produccion nunca devolver secret_key
        user["stellar_secret_key"] = wallet["secret_key"]

        return user

    @staticmethod
    async def get_user_by_username(username: str) -> Optional[dict]:
        return await db.get_user_by_username(username)

    @staticmethod
    async def get_profile(user_id: str) -> Optional[dict]:
        user = await db.get_user_by_id(user_id)
        if not user:
            return None
        if user.get("stellar_public_key"):
            try:
                user["stellar_balance"] = stellar.get_balance(user["stellar_public_key"])
            except Exception:
                user["stellar_balance"] = []
        return user


class MilestoneService:
    @staticmethod
    async def create_milestones(loan_id: str, milestones_data: list) -> list:
        created = []
        for ms in milestones_data:
            milestone = await db.create_milestone({
                "loan_id": loan_id,
                "description": ms["description"],
                "amount": ms["amount"],
            })
            created.append(milestone)
        return created

    @staticmethod
    async def complete_milestone(milestone_id: str) -> dict:
        milestone = await db.get_milestone_by_id(milestone_id)
        if not milestone:
            raise ValueError("Meta no encontrada")
        if milestone["status"] != "pending":
            raise ValueError("La meta ya fue completada o pagada")

        return await db.update_milestone(milestone_id, {"status": "completed"})


class LoanService:
    @staticmethod
    async def request_loan(user_id: str, data: dict) -> dict:
        loan_data = {
            "user_id": user_id,
            "amount": data["amount"],
            "purpose": data["purpose"],
            "objectives": data.get("objectives", []),
        }
        loan = await db.create_loan(loan_data)

        # Crear milestones asociados
        milestones = data.get("milestones", [])
        await MilestoneService.create_milestones(loan["id"], milestones)

        return loan

    @staticmethod
    async def get_loan_detail(loan_id: str, user_id: str, user_role: str) -> dict:
        loan = await db.get_loan_by_id(loan_id)
        if not loan:
            raise ValueError("Prestamo no encontrado")

        is_owner = loan["user_id"] == user_id
        is_admin = user_role == "admin"

        # Verificar si el usuario es un inversor en este prestamo
        is_investor = False
        if user_role == "inversor":
            investments = await db.list_investments_by_loan(loan_id)
            is_investor = any(inv["investor_id"] == user_id for inv in investments)

        if not (is_owner or is_admin or is_investor):
            raise ValueError("No autorizado")

        loan["milestones"] = await db.list_milestones_by_loan(loan_id)
        loan["investments"] = await db.list_investments_by_loan(loan_id)
        loan["disbursements"] = await db.list_disbursements_by_loan(loan_id)
        loan["payments"] = await db.list_payments_by_loan(loan_id)
        loan["invoices"] = await db.list_invoices_by_loan(loan_id)
        return loan

    @staticmethod
    async def approve_loan(loan_id: str) -> dict:
        loan = await db.get_loan_by_id(loan_id)
        if not loan:
            raise ValueError("Prestamo no encontrado")
        if loan["status"] != "pending":
            raise ValueError("El prestamo no esta pendiente")

        return await db.update_loan(loan_id, {"status": "funding"})

    @staticmethod
    async def reject_loan(loan_id: str) -> dict:
        loan = await db.get_loan_by_id(loan_id)
        if not loan:
            raise ValueError("Prestamo no encontrado")
        if loan["status"] != "pending":
            raise ValueError("El prestamo no esta pendiente")

        return await db.update_loan(loan_id, {"status": "rejected"})

    @staticmethod
    async def list_all_loans(status_filter: Optional[str] = None) -> list:
        return await db.list_all_loans(status=status_filter)

    @staticmethod
    async def disburse_loan(loan_id: str, milestone_id: str) -> dict:
        loan = await db.get_loan_by_id(loan_id)
        if not loan:
            raise ValueError("Prestamo no encontrado")
        if loan["status"] not in ["funding", "active", "disbursing"]:
            raise ValueError("Prestamo no esta en estado valido para desembolso")

        milestone = await db.get_milestone_by_id(milestone_id)
        if not milestone:
            raise ValueError("Meta no encontrada")
        if milestone["loan_id"] != loan_id:
            raise ValueError("La meta no pertenece a este prestamo")
        if milestone["status"] != "completed":
            raise ValueError("La meta no esta completada")
        if milestone["status"] == "paid":
            raise ValueError("La meta ya fue desembolsada")

        amount = milestone["amount"]
        previous = await db.list_disbursements_by_loan(loan_id)
        stage = len(previous) + 1

        # En MVP: registramos el desembolso sin envio real de Stellar
        # si no hay admin_stellar_secret configurado.
        tx_hash = None
        if settings.admin_stellar_secret:
            user = await db.get_user_by_id(loan["user_id"])
            if user and user.get("stellar_public_key"):
                try:
                    result = stellar.send_payment(
                        source_secret=settings.admin_stellar_secret,
                        destination=user["stellar_public_key"],
                        amount=str(amount),
                    )
                    tx_hash = result["hash"]
                except Exception:
                    # En MVP: no bloquear si falla Stellar
                    pass

        disbursement = await db.create_disbursement({
            "loan_id": loan_id,
            "milestone_id": milestone_id,
            "amount": amount,
            "stage": stage,
            "stellar_tx_hash": tx_hash,
        })

        # Marcar milestone como paid
        await db.update_milestone(milestone_id, {"status": "paid"})

        new_disbursed = loan["disbursed_amount"] + amount
        new_remaining = loan["amount"] - new_disbursed

        # Verificar si quedan milestones pendientes/completed
        milestones = await db.list_milestones_by_loan(loan_id)
        all_paid = all(m["status"] == "paid" for m in milestones)

        new_status = "active"
        if new_remaining <= 0 or all_paid:
            new_status = "active"

        await db.update_loan(loan_id, {
            "disbursed_amount": new_disbursed,
            "remaining_amount": max(0, new_remaining),
            "status": new_status,
        })

        return disbursement


class InvestmentService:
    @staticmethod
    async def create_investment(investor_id: str, data: dict) -> dict:
        loan = await db.get_loan_by_id(data["loan_id"])
        if not loan:
            raise ValueError("Prestamo no encontrado")
        if loan["status"] != "funding":
            raise ValueError("El prestamo no esta buscando financiacion")

        amount = data["amount"]
        current_invested = loan["total_invested"]
        if current_invested + amount > loan["amount"]:
            raise ValueError(f"El aporte excede el monto restante. Maximo: {loan['amount'] - current_invested}")

        investment = await db.create_investment({
            "investor_id": investor_id,
            "loan_id": data["loan_id"],
            "amount": amount,
        })

        new_total = current_invested + amount
        updates = {"total_invested": new_total}

        # Si se alcanzo el monto completo, pasar a active
        if new_total >= loan["amount"]:
            updates["status"] = "active"

        await db.update_loan(data["loan_id"], updates)
        return investment

    @staticmethod
    async def list_my_investments(investor_id: str) -> list:
        return await db.list_investments_by_investor(investor_id)

    @staticmethod
    async def get_investment_detail(investment_id: str, investor_id: str) -> dict:
        investment = await db.get_investment_by_id(investment_id)
        if not investment:
            raise ValueError("Inversion no encontrada")
        if investment["investor_id"] != investor_id:
            raise ValueError("No autorizado")
        return investment


class PaymentService:
    @staticmethod
    async def register_payment(user_id: str, data: dict) -> dict:
        loan = await db.get_loan_by_id(data["loan_id"])
        if not loan:
            raise ValueError("Prestamo no encontrado")
        if loan["user_id"] != user_id:
            raise ValueError("No autorizado")

        tx_hash = data.get("stellar_tx_hash")
        if tx_hash:
            tx = stellar.get_transaction(tx_hash)
            if not tx:
                raise ValueError("Transaccion Stellar no encontrada")
            if not tx.get("successful"):
                raise ValueError("Transaccion Stellar no fue exitosa")

        payment = await db.create_payment({
            "loan_id": data["loan_id"],
            "amount": data["amount"],
            "stellar_tx_hash": tx_hash,
        })

        new_remaining = max(0, loan["remaining_amount"] - data["amount"])
        new_status = loan["status"]

        if new_remaining <= 0:
            # Verificar si hay inversores para distribuir retorno
            investments = await db.list_investments_by_loan(data["loan_id"])
            if investments:
                total_loan = loan["amount"]
                total_paid = data["amount"]
                for inv in investments:
                    ratio = inv["amount"] / total_loan
                    return_amount = total_paid * ratio
                    await db.create_payment({
                        "loan_id": data["loan_id"],
                        "amount": round(return_amount, 2),
                        "investor_id": inv["investor_id"],
                        "stellar_tx_hash": None,
                    })
                new_status = "completed"
            else:
                new_status = "paid"

        await db.update_loan(data["loan_id"], {
            "remaining_amount": new_remaining,
            "status": new_status,
        })

        return payment


class InvoiceService:
    @staticmethod
    async def submit_invoice(user_id: str, data: dict) -> dict:
        loan = await db.get_loan_by_id(data["loan_id"])
        if not loan:
            raise ValueError("Prestamo no encontrado")
        if loan["user_id"] != user_id:
            raise ValueError("No autorizado")

        return await db.create_invoice({
            "loan_id": data["loan_id"],
            "description": data["description"],
            "amount": data["amount"],
            "document_url": data.get("document_url"),
        })

    @staticmethod
    async def validate_invoice(invoice_id: str) -> dict:
        invoice = await db.update_invoice(invoice_id, {"validated": True})
        if not invoice:
            raise ValueError("Factura no encontrada")
        return invoice
