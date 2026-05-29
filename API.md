# Hackanton API v1.0 — Documentación

Plataforma de crowdlending para emprendedores. Tres roles: **Emprendedor**, **Inversor** y **Admin**.

---

## Modelo de Negocio

1. El **emprendedor** crea un préstamo con un monto total y lo divide en **milestones** (metas).
2. El **admin** aprueba el préstamo y pasa a estado `funding` (buscando inversores).
3. Los **inversores** ven préstamos públicos y aportan dinero.
4. Cuando el préstamo alcanza el 100% del monto, pasa a `active`.
5. El emprendedor ejecuta cada meta, sube facturas, y el admin las valida.
6. Por cada meta validada, el admin marca la milestone como `completed` y libera el desembolso.
7. Al finalizar todas las metas, el emprendedor paga el total + **3% de interés**.
8. El sistema distribuye el retorno proporcionalmente a cada inversor.

---

## Roles

| Rol | Descripción |
|-----|-------------|
| `emprendedor` | Solicita préstamos, sube facturas, recibe desembolsos y paga cuotas |
| `inversor` | Aporta a préstamos aprobados, recibe retornos con interés |
| `admin` | Aprueba/rechaza préstamos, valida facturas, completa milestones, desembolsa fondos |

---

## Endpoints

### Auth

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `POST` | `/auth/register` | No | — | Registro de usuario (emprendedor, inversor o admin) |
| `POST` | `/auth/login` | No | — | Login, retorna JWT |

**Payload `/auth/register`:**
```json
{
  "username": "juan_perez",
  "password": "secreto123",
  "full_name": "Juan Pérez",
  "business_name": "Kiosco Juan",
  "role": "emprendedor"
}
```

**Payload `/auth/login`:**
```json
{
  "username": "juan_perez",
  "password": "secreto123"
}
```

---

### Usuarios

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `GET` | `/users/me` | Sí | Cualquiera | Perfil del usuario + balance Stellar en tiempo real |

---

### Préstamos (Emprendedor)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `POST` | `/loans` | Sí | Emprendedor | Crear préstamo con milestones |
| `GET` | `/loans` | Sí | Emprendedor | Listar mis préstamos |

**Payload `/loans`:**
```json
{
  "amount": 1000.0,
  "purpose": "Comprar stock para el negocio",
  "objectives": ["Crecer", "Generar empleo"],
  "milestones": [
    {"description": "Compra inicial de mercadería", "amount": 300.0},
    {"description": "Equipamiento básico", "amount": 300.0},
    {"description": "Ampliación del local", "amount": 400.0}
  ]
}
```

---

### Préstamos (Público)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `GET` | `/loans/public` | **No** | — | Ver préstamos en estado `funding` (buscando inversores) |

---

### Préstamos (Detalle)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `GET` | `/loans/{id}` | Sí | Owner / Admin / Inversor* | Detalle completo: milestones, inversiones, desembolsos, pagos, facturas |

> *Solo inversores que aportaron a ese préstamo pueden verlo.

---

### Admin — Gestión de Préstamos

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `GET` | `/admin/loans?status=` | Sí | Admin | Listar todos los préstamos (filtro opcional por status) |
| `POST` | `/loans/{id}/approve` | Sí | Admin | Aprobar préstamo → status `funding` |
| `POST` | `/loans/{id}/reject` | Sí | Admin | Rechazar préstamo → status `rejected` |
| `POST` | `/loans/{id}/milestones/{mid}/complete` | Sí | Admin | Marcar milestone como completada |
| `POST` | `/loans/{id}/disburse?milestone_id=` | Sí | Admin | Desembolsar fondos de una milestone completada |

> El desembolso solo se ejecuta si la milestone está en estado `completed`.

---

### Inversiones (Inversor)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `POST` | `/investments` | Sí | Inversor | Aportar a un préstamo en `funding` |
| `GET` | `/investments` | Sí | Inversor | Mis inversiones |
| `GET` | `/investments/{id}` | Sí | Inversor | Detalle de una inversión |

**Payload `/investments`:**
```json
{
  "loan_id": "uuid-del-prestamo",
  "amount": 500.0
}
```

> No se puede aportar más del monto restante. Si el préstamo alcanza el 100%, pasa a `active` automáticamente.

---

### Pagos (Emprendedor)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `POST` | `/payments` | Sí | Emprendedor | Pagar cuota del préstamo |
| `GET` | `/payments/{id}` | Sí | Owner / Admin / Inversor | Detalle de un pago (incluye retornos a inversores) |

**Payload `/payments`:**
```json
{
  "loan_id": "uuid-del-prestamo",
  "amount": 1030.0,
  "stellar_tx_hash": "hash-de-tx-stellar"
}
```

> El `stellar_tx_hash` es opcional. Si se proporciona, se verifica que la transacción exista y haya sido exitosa en Stellar testnet.

> Al pagar el total + 3% de interés, el sistema distribuye retornos proporcionales a todos los inversores y marca el préstamo como `completed`.

---

### Facturas (Emprendedor)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `POST` | `/invoices` | Sí | Emprendedor | Subir factura/comprobante |
| `GET` | `/invoices/{id}` | Sí | Owner / Admin | Ver detalle de factura |
| `POST` | `/invoices/{id}/validate` | Sí | Admin | Validar factura |

**Payload `/invoices`:**
```json
{
  "loan_id": "uuid-del-prestamo",
  "description": "Factura de proveedor #1234",
  "amount": 250.0,
  "document_url": "https://example.com/factura.pdf"
}
```

---

### Tesorería (Público)

| Método | Ruta | Auth | Rol | Descripción |
|--------|------|------|-----|-------------|
| `GET` | `/admin/treasury` | **No** | — | Dirección Stellar pública de la tesorería del sistema |

---

## Estados de un Préstamo

| Estado | Significado |
|--------|-------------|
| `pending` | Creado por el emprendedor, esperando aprobación del admin |
| `funding` | Aprobado por el admin, visible públicamente para inversores |
| `active` | Alcanzó el 100% de financiación, listo para desembolsos |
| `disbursing` | En proceso de liberación de fondos por milestones (obsoleto en v1.0) |
| `rejected` | Rechazado por el admin |
| `completed` | El emprendedor pagó todo + interés, retornos distribuidos |
| `paid` | Pagado sin inversores (rareza, mantenido por compatibilidad) |

---

## Estados de una Milestone

| Estado | Significado |
|--------|-------------|
| `pending` | Creada, esperando que el emprendedor la ejecute y suba facturas |
| `completed` | Admin validó las facturas y marcó la meta como completada |
| `paid` | Fondos de esa milestone fueron desembolsados al emprendedor |

---

## Flujo de la Demo (Paso a Paso)

### Fase 1: Creación
1. `POST /auth/register` → Emprendedor se registra
2. `POST /auth/login` → Obtiene JWT
3. `POST /loans` → Crea préstamo de $1000 con 3 milestones

### Fase 2: Aprobación
4. `POST /auth/register` → Admin se registra
5. `POST /auth/login` → Admin obtiene JWT
6. `POST /loans/{id}/approve` → Préstamo pasa a `funding`

### Fase 3: Inversión
7. `POST /auth/register` → Inversor A se registra (role: `inversor`)
8. `POST /auth/login` → Inversor A obtiene JWT
9. `GET /loans/public` → Ve préstamos disponibles
10. `POST /investments` → Aporta $600
11. Inversor B repite pasos 7-10 y aporta $400 → Préstamo pasa a `active`

### Fase 4: Ejecución por Metas
12. Emprendedor ejecuta meta 1
13. `POST /invoices` → Sube factura
14. `POST /invoices/{id}/validate` → Admin valida
15. `POST /loans/{id}/milestones/{mid}/complete` → Admin completa meta
16. `POST /loans/{id}/disburse?milestone_id=` → Admin libera $300
17. Repite para meta 2 y 3

### Fase 5: Reembolso
18. `POST /payments` → Emprendedor paga $1030 (1000 + 3%)
19. Sistema distribuye automáticamente:
    - Inversor A recibe $618 (600/1000 * 1030)
    - Inversor B recibe $412 (400/1000 * 1030)
20. Préstamo pasa a `completed`

---

## Notas Técnicas

- **Blockchain:** Stellar testnet. Wallets se crean automáticamente al registrar usuario.
- **Base de datos:** Arkiv (DB-Chain BRAGA) en modo fallback con almacenamiento en memoria.
- **Moneda:** USDC (dólar digital) sobre Stellar.
- **Interés:** Tasa fija del 3% sobre el monto total del préstamo.
- **Simulación:** Para la demo, los pagos Stellar son simulados (no se mueve dinero real).

---

## Stack

- **Backend:** FastAPI (Python)
- **Base de Datos:** Arkiv (DB-Chain BRAGA testnet) — fallback en memoria
- **Blockchain:** Stellar (testnet)
- **Auth:** JWT simple con bcrypt
- **Tests:** pytest + pytest-asyncio

---

*Documentación generada para el hackathon. API version 1.0.0*
