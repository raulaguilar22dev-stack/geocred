# Hackanton — Handoff

Plataforma de crowdlending para emprendedores. Conecta emprendedores con inversores vía milestones, con retorno del 3% de interés.

---

## Estado Actual

- **Backend**: FastAPI v1.0 completo (3 roles, milestones, inversiones, distribución de pagos)
- **Frontend**: Next.js 15 + Tailwind CSS (build exitoso, 12 páginas)
- **Tests**: 7/7 pasando (pytest)
- **DB**: Arkiv mock en memoria (datos se pierden al reiniciar server)
- **Blockchain**: Stellar testnet simulado (no toca red real)

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Python 3.14, FastAPI, Pydantic |
| Frontend | Next.js 15, TypeScript, Tailwind CSS, TanStack Query, Zustand |
| Auth | JWT + bcrypt |
| DB | Arkiv (DB-Chain BRAGA) — fallback en memoria |
| Blockchain | Stellar testnet (simulado) |

---

## Correr el proyecto

```bash
# Backend
cd hackathon
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Seed (una sola vez, offline-friendly)
PYTHONPATH=hackathon venv/bin/python scripts/seed.py

# Frontend
cd hackathon/frontend
npm run dev
```

URLs: Frontend `http://localhost:3000`, Backend `http://localhost:8000`

---

## Usuarios de prueba (seed.py)

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `admin` | `admin123` | admin |
| `emprendedor` | `emp123` | emprendedor |
| `inversor` | `inv123` | inversor |

---

## Roles y flujo

1. **Emprendedor**: Crea préstamo con milestones → sube facturas → recibe desembolsos → paga +3%
2. **Admin**: Aprueba/rechaza → valida facturas → completa milestones → desembolsa
3. **Inversor**: Ve préstamos públicos → invierte → recibe retorno proporcional al final

Estados de préstamo: `pending` → `funding` → `active` → `completed`

---

## Estructura clave

```
hackathon/
├── app/                    # Backend FastAPI
│   ├── main.py            # Routers REST
│   ├── models.py          # Pydantic schemas
│   ├── services.py        # Lógica de negocio
│   ├── database.py        # ArkivClient (mock en memoria)
│   ├── stellar.py         # Cliente Stellar testnet
│   ├── auth.py            # JWT + bcrypt
│   └── config.py          # Settings
├── tests/test_api.py      # 7 tests (pytest)
├── scripts/seed.py        # Usuarios harcodeados
├── API.md                 # Documentación endpoints
├── requirements.txt
└── frontend/              # Next.js 15 App Router
    ├── app/               # Páginas
    │   ├── page.tsx       # Landing
    │   ├── login/page.tsx
    │   ├── register/page.tsx
    │   ├── dashboard/page.tsx       # Redirección por rol
    │   ├── dashboard/emprendedor/
    │   ├── dashboard/inversor/
    │   ├── dashboard/admin/
    │   ├── prestamos/nuevo/
    │   ├── prestamos/[id]/
    │   └── loans/public/
    ├── components/
    │   ├── Navbar.tsx
    │   ├── forms/
    │   │   ├── LoginForm.tsx
    │   │   ├── RegisterForm.tsx
    │   │   └── LoanForm.tsx
    │   └── ui/
    │       ├── Button.tsx
    │       ├── Input.tsx
    │       ├── Card.tsx
    │       └── Badge.tsx
    ├── lib/
    │   ├── api.ts           # Axios con interceptores
    │   ├── store.ts         # Zustand auth
    │   └── providers.tsx    # TanStack Query
    └── next.config.ts
```

---

## Endpoints principales

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Registro |
| POST | `/auth/login` | No | Login |
| GET | `/users/me` | Sí | Perfil + balance |
| POST | `/loans` | Sí | Crear préstamo |
| GET | `/loans/public` | No | Préstamos en funding |
| GET | `/loans/{id}` | Sí | Detalle completo |
| POST | `/loans/{id}/approve` | Admin | Aprobar |
| POST | `/loans/{id}/reject` | Admin | Rechazar |
| POST | `/loans/{id}/disburse` | Admin | Desembolsar milestone |
| POST | `/loans/{id}/milestones/{mid}/complete` | Admin | Completar meta |
| POST | `/investments` | Inversor | Invertir |
| GET | `/investments` | Inversor | Mis inversiones |
| POST | `/payments` | Emprendedor | Pagar cuota |
| POST | `/invoices` | Emprendedor | Subir factura |
| POST | `/invoices/{id}/validate` | Admin | Validar factura |
| GET | `/admin/loans` | Admin | Todos los préstamos |
| GET | `/admin/treasury` | No | PK tesorería |

---

## Bugs conocidos / Soluciones aplicadas

1. **Stellar timeout en registro** → `stellar.create_account()` ahora tiene `try/except` con timeout 5s. Si falla, crea la wallet igual sin fondos.
2. **Dashboard atascado en "Cargando"** → Eliminada dependencia de `isHydrated` en `app/dashboard/page.tsx`. Ahora revisa `user` directamente.
3. **Git embebido** → Frontend tenía `.git` propio. Eliminar con `rm -rf frontend/.git`.

---

## Pendientes / TODO

- [ ] Deploy: Vercel (frontend) + Render/Railway (backend)
- [ ] Variables de entorno para producción (`NEXT_PUBLIC_API_URL`, `TREASURY_STELLAR_PUBLIC_KEY`)
- [ ] CORS configurado para dominio de Vercel
- [ ] Conectar Arkiv real (ahora es mock en memoria)
- [ ] Stellar real (ahora simulado, para demo)
- [ ] Tests E2E con Playwright
- [ ] Landing page más completa
- [ ] Notificaciones (email/push) para estados de préstamo

---

## Decisiones técnicas

- **Monorepo**: Un solo repo con backend y frontend. Simplifica deploy y mantenimiento para MVP.
- **DB en memoria**: Arkiv está en early-access. El mock permite demo funcional sin dependencias externas.
- **Stellar simulado**: Para hackathon, no se mueve dinero real. Se verifica `tx_hash` si se proporciona, pero no es obligatorio.
- **Next.js App Router**: SSR para landing, SPA para dashboards. Ideal para SEO + interactividad.
- **Zustand + TanStack Query**: Estado global mínimo (auth) + fetching con caching.

---

## Contexto original

- `context.md`: Visión del proyecto, problema a resolver (microcréditos en Salta), filosofía.
- `contextv2.md`: Arquitectura técnica inicial (FastAPI + Arkiv + Stellar).

Leer ambos para entender el background completo.

---

*Handoff generado para continuación del proyecto. Última actualización: sesión actual.*
