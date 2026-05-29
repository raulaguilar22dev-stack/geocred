import asyncio
from app.database import db
from app.auth import get_password_hash
from app.stellar import stellar


async def seed():
    # Crear usuario admin
    admin = await db.create_user({
        "username": "admin",
        "password_hash": get_password_hash("admin123"),
        "full_name": "Administrador",
        "business_name": None,
        "role": "admin",
        "stellar_public_key": None,
    })

    # Crear wallet Stellar para admin
    wallet_admin = stellar.create_account()
    await db.update_user(admin["id"], {"stellar_public_key": wallet_admin["public_key"]})

    print(f"Admin creado: {admin['id']} | username: admin | password: admin123")
    print(f"  Stellar PK: {wallet_admin['public_key']}")

    # Crear usuario emprendedor de prueba
    emp = await db.create_user({
        "username": "emprendedor",
        "password_hash": get_password_hash("emp123"),
        "full_name": "Juan Pérez",
        "business_name": "Kiosco Juan",
        "role": "emprendedor",
        "stellar_public_key": None,
    })

    # Crear wallet Stellar para emprendedor
    wallet_emp = stellar.create_account()
    await db.update_user(emp["id"], {"stellar_public_key": wallet_emp["public_key"]})

    print(f"Emprendedor creado: {emp['id']} | username: emprendedor | password: emp123")
    print(f"  Stellar PK: {wallet_emp['public_key']}")

    # Crear usuario inversor de prueba
    inv = await db.create_user({
        "username": "inversor",
        "password_hash": get_password_hash("inv123"),
        "full_name": "María Gómez",
        "business_name": None,
        "role": "inversor",
        "stellar_public_key": None,
    })

    # Crear wallet Stellar para inversor
    wallet_inv = stellar.create_account()
    await db.update_user(inv["id"], {"stellar_public_key": wallet_inv["public_key"]})

    print(f"Inversor creado: {inv['id']} | username: inversor | password: inv123")
    print(f"  Stellar PK: {wallet_inv['public_key']}")


if __name__ == "__main__":
    asyncio.run(seed())
