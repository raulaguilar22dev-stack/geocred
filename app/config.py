from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Arkiv
    arkiv_rpc_url: str = "https://braga.hoodi.arkiv.network/rpc"

    # Stellar
    stellar_network: str = "testnet"
    stellar_horizon_url: str = "https://horizon-testnet.stellar.org"
    stellar_friendbot_url: str = "https://friendbot.stellar.org"

    # Admin Stellar (para desembolsos en MVP)
    # En producción: usar gestor de secretos
    admin_stellar_secret: str = ""

    # Cuenta tesorería para recibir pagos de cuotas
    treasury_stellar_public_key: str = ""

    # JWT
    jwt_secret: str = "cambiar_en_produccion"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    class Config:
        env_file = ".env"


settings = Settings()
