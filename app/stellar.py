from typing import Optional
from stellar_sdk import Server, Keypair, TransactionBuilder, Network, Payment, Asset
from stellar_sdk.exceptions import NotFoundError

from app.config import settings


class StellarClient:
    def __init__(self):
        self.server = Server(settings.stellar_horizon_url)
        self.network_passphrase = Network.TESTNET_NETWORK_PASSPHRASE
        # USDC en testnet (issuer de ejemplo; reemplazar si es necesario)
        self.asset_usdc = Asset(
            "USDC",
            "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
        )

    def create_account(self) -> dict:
        """Crea una nueva cuenta Stellar. Intenta fondear via Friendbot en testnet.
        Si falla (sin internet, timeout, etc.), devuelve la cuenta igual sin fondos."""
        keypair = Keypair.random()
        public_key = keypair.public_key
        secret_key = keypair.secret

        import httpx

        try:
            httpx.get(
                f"{settings.stellar_friendbot_url}?addr={public_key}",
                timeout=5.0,
            )
        except Exception:
            # En demo/MVP: no bloquear si Friendbot no responde.
            # La wallet existe localmente, solo no tiene fondos iniciales.
            pass

        return {
            "public_key": public_key,
            "secret_key": secret_key,
        }

    def get_balance(self, public_key: str) -> list:
        """Obtiene balances de una cuenta."""
        try:
            account = self.server.accounts().account_id(public_key).call()
            return account["balances"]
        except NotFoundError:
            return []

    def send_payment(
        self,
        source_secret: str,
        destination: str,
        amount: str,
        asset: Optional[Asset] = None,
    ) -> dict:
        """
        Envía un pago en Stellar.
        Retorna dict con hash de transacción.
        """
        source_keypair = Keypair.from_secret(source_secret)
        source_public = source_keypair.public_key

        source_account = self.server.load_account(source_public)
        asset = asset or self.asset_usdc

        transaction = (
            TransactionBuilder(
                source_account=source_account,
                network_passphrase=self.network_passphrase,
                base_fee=100,
            )
            .append_payment_op(destination=destination, amount=amount, asset=asset)
            .set_timeout(30)
            .build()
        )

        transaction.sign(source_keypair)
        response = self.server.submit_transaction(transaction)

        return {
            "successful": response["successful"],
            "hash": response["hash"],
            "ledger": response["ledger"],
        }

    def get_transaction(self, tx_hash: str) -> Optional[dict]:
        """Obtiene una transacción de Stellar por su hash."""
        try:
            return self.server.transactions().transaction(tx_hash).call()
        except NotFoundError:
            return None


# Singleton
stellar = StellarClient()
