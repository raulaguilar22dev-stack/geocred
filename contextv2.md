# Proyecto: Plataforma de Microcréditos para Emprendedores — v2

## Descripción General
Sistema de préstamos digitales en dólares (USDC) para pequeños emprendedores.
Tecnologías: Python, FastAPI, Arkiv (DB-Chain), Stellar (testnet).

## Arquitectura

### Backend: FastAPI (Python)
API REST minimalista con autenticación JWT simple.

### Base de Datos: Arkiv
- DB-Chain "BRAGA" (testnet) sobre Ethereum
- RPC URL: `https://braga.hoodi.arkiv.network/rpc`
- Almacena: usuarios, préstamos, desembolsos, facturas, pagos
- Queryable, verifiable, time-scoped data

### Blockchain Financiera: Stellar
- Red: Testnet
- Stablecoin: USDC (dólar digital)
- Funciones: envío de préstamos, recepción de cuotas, wallets, balances

## Estructura de Carpetas

```
hackanton/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app + routers REST
│   ├── config.py         # Settings (Arkiv RPC, Stellar testnet, JWT)
│   ├── auth.py           # JWT simple (registro/login/protección)
│   ├── database.py       # Cliente Arkiv (CRUD vía RPC)
│   ├── stellar.py        # Cliente Stellar testnet
│   ├── models.py         # Pydantic schemas
│   └── services.py       # Lógica de negocio
├── tests/
│   └── test_api.py
├── scripts/
│   └── seed.py           # Usuario admin de prueba
├── requirements.txt
├── .env.example
└── README.md
```

## Flujo del Sistema

1. **Registro**: Emprendedor se registra solo (`POST /auth/register`)
2. **Login**: Obtiene JWT (`POST /auth/login`)
3. **Solicitud**: Pide préstamo (`POST /loans`) → estado "pendiente"
4. **Evaluación**: Admin aprueba (`POST /loans/{id}/approve`) → estado "aprobado"
5. **Desembolso**: Admin libera fondos (`POST /loans/{id}/disburse`) → envío USDC vía Stellar
   - Puede ser completo o por etapas
6. **Validación**: Emprendedor sube facturas (`POST /invoices`) para validar gastos
7. **Reembolso**: Emprendedor paga cuotas (`POST /payments`) → recepción USDC vía Stellar

## Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Registro emprendedor | No |
| POST | `/auth/login` | Login + JWT | No |
| GET | `/users/me` | Mi perfil | Sí |
| POST | `/loans` | Solicitar préstamo | Sí |
| GET | `/loans` | Mis préstamos | Sí |
| POST | `/loans/{id}/approve` | Aprobar préstamo (admin) | Sí |
| POST | `/loans/{id}/disburse` | Desembolsar fondos (admin) | Sí |
| POST | `/payments` | Pagar cuota | Sí |
| POST | `/invoices` | Subir factura | Sí |

## Consideraciones
- MVP funcional, no sobre-ingeniería
- Autenticación JWT simple con passlib bcrypt
- Stellar testnet para desarrollo sin dinero real
- Arkiv testnet (BRAGA) para datos
- Priorizar: simplicidad, claridad, flujo financiero entendible
