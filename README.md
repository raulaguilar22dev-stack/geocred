# Hackanton - Plataforma de Microcréditos

Sistema de préstamos digitales en dólares (USDC) para emprendedores.

## Stack

- **Backend**: FastAPI (Python)
- **Base de Datos**: Arkiv (DB-Chain BRAGA testnet)
- **Blockchain**: Stellar (testnet)
- **Auth**: JWT simple con bcrypt

## Instalación

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Ejecutar

```bash
uvicorn app.main:app --reload
```

API disponible en: http://127.0.0.1:8000

Docs automáticas: http://127.0.0.1:8000/docs

## Seed (datos de prueba)

```bash
python scripts/seed.py
```

Credenciales de prueba:
- Admin: `admin` / `admin123`
- Emprendedor: `emprendedor` / `emp123`

## Tests

```bash
pytest
```

## Endpoints principales

- `POST /auth/register` — Registro emprendedor
- `POST /auth/login` — Login
- `GET /users/me` — Mi perfil
- `POST /loans` — Solicitar préstamo
- `GET /loans` — Mis préstamos
- `POST /loans/{id}/approve` — Aprobar (admin)
- `POST /loans/{id}/disburse?amount=XX` — Desembolsar (admin)
- `POST /payments` — Pagar cuota
- `POST /invoices` — Subir factura

## Notas técnicas

- **Arkiv**: El `database.py` usa almacenamiento en memoria como fallback hasta tener acceso pleno a la DB-Chain BRAGA. Reemplazar las operaciones `_memory` por llamadas JSON-RPC reales cuando el SDK esté disponible.
- **Stellar**: Todo opera sobre testnet. Las wallets se fondean automáticamente vía Friendbot. Para producción, cambiar a public network y usar un gestor de secretos.
- **Seguridad**: La clave secreta Stellar del admin se lee de `ADMIN_STELLAR_SECRET` en `.env`. En producción, usar AWS Secrets Manager, HashiCorp Vault, etc.
