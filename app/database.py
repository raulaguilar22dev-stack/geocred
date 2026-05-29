import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings


class ArkivClient:
    """
    Cliente minimalista para Arkiv DB-Chain via JSON-RPC.
    Como Arkiv es relativamente nuevo, este cliente usa un patron generico
    que puede adaptarse al SDK oficial cuando este disponible.
    """

    def __init__(self, rpc_url: str):
        self.rpc_url = rpc_url
        self.client = httpx.AsyncClient(timeout=30.0)
        # En un MVP inicial, simulamos almacenamiento en memoria
        # hasta tener acceso real a la DB-Chain de Arkiv
        self._memory: Dict[str, List[Dict[str, Any]]] = {
            "users": [],
            "loans": [],
            "milestones": [],
            "investments": [],
            "disbursements": [],
            "payments": [],
            "invoices": [],
        }

    def _generate_id(self) -> str:
        return str(uuid.uuid4())

    def _now(self) -> str:
        return datetime.utcnow().isoformat()

    # --- USERS ---
    async def create_user(self, user_data: dict) -> dict:
        user = {
            "id": self._generate_id(),
            **user_data,
            "created_at": self._now(),
        }
        self._memory["users"].append(user)
        return user

    async def get_user_by_username(self, username: str) -> Optional[dict]:
        for u in self._memory["users"]:
            if u["username"] == username:
                return u
        return None

    async def get_user_by_id(self, user_id: str) -> Optional[dict]:
        for u in self._memory["users"]:
            if u["id"] == user_id:
                return u
        return None

    async def update_user(self, user_id: str, updates: dict) -> Optional[dict]:
        for u in self._memory["users"]:
            if u["id"] == user_id:
                u.update(updates)
                return u
        return None

    # --- LOANS ---
    async def create_loan(self, loan_data: dict) -> dict:
        loan = {
            "id": self._generate_id(),
            **loan_data,
            "status": "pending",
            "interest_rate": 3.0,
            "total_invested": 0.0,
            "disbursed_amount": 0.0,
            "remaining_amount": loan_data.get("amount", 0.0),
            "created_at": self._now(),
        }
        self._memory["loans"].append(loan)
        return loan

    async def get_loan_by_id(self, loan_id: str) -> Optional[dict]:
        for l in self._memory["loans"]:
            if l["id"] == loan_id:
                return l
        return None

    async def list_loans_by_user(self, user_id: str) -> List[dict]:
        return [l for l in self._memory["loans"] if l["user_id"] == user_id]

    async def list_all_loans(self, status: Optional[str] = None) -> List[dict]:
        loans = self._memory["loans"]
        if status:
            return [l for l in loans if l["status"] == status]
        return loans

    async def update_loan(self, loan_id: str, updates: dict) -> Optional[dict]:
        for l in self._memory["loans"]:
            if l["id"] == loan_id:
                l.update(updates)
                return l
        return None

    # --- MILESTONES ---
    async def create_milestone(self, data: dict) -> dict:
        ms = {
            "id": self._generate_id(),
            **data,
            "status": "pending",
            "created_at": self._now(),
        }
        self._memory["milestones"].append(ms)
        return ms

    async def list_milestones_by_loan(self, loan_id: str) -> List[dict]:
        return [m for m in self._memory["milestones"] if m["loan_id"] == loan_id]

    async def get_milestone_by_id(self, milestone_id: str) -> Optional[dict]:
        for m in self._memory["milestones"]:
            if m["id"] == milestone_id:
                return m
        return None

    async def update_milestone(self, milestone_id: str, updates: dict) -> Optional[dict]:
        for m in self._memory["milestones"]:
            if m["id"] == milestone_id:
                m.update(updates)
                return m
        return None

    # --- INVESTMENTS ---
    async def create_investment(self, data: dict) -> dict:
        inv = {
            "id": self._generate_id(),
            **data,
            "created_at": self._now(),
        }
        self._memory["investments"].append(inv)
        return inv

    async def list_investments_by_loan(self, loan_id: str) -> List[dict]:
        return [i for i in self._memory["investments"] if i["loan_id"] == loan_id]

    async def list_investments_by_investor(self, investor_id: str) -> List[dict]:
        return [i for i in self._memory["investments"] if i["investor_id"] == investor_id]

    async def get_investment_by_id(self, investment_id: str) -> Optional[dict]:
        for i in self._memory["investments"]:
            if i["id"] == investment_id:
                return i
        return None

    # --- DISBURSEMENTS ---
    async def create_disbursement(self, data: dict) -> dict:
        disp = {
            "id": self._generate_id(),
            **data,
            "created_at": self._now(),
        }
        self._memory["disbursements"].append(disp)
        return disp

    async def list_disbursements_by_loan(self, loan_id: str) -> List[dict]:
        return [d for d in self._memory["disbursements"] if d["loan_id"] == loan_id]

    # --- PAYMENTS ---
    async def create_payment(self, data: dict) -> dict:
        pay = {
            "id": self._generate_id(),
            **data,
            "created_at": self._now(),
        }
        self._memory["payments"].append(pay)
        return pay

    async def list_payments_by_loan(self, loan_id: str) -> List[dict]:
        return [p for p in self._memory["payments"] if p["loan_id"] == loan_id]

    async def get_payment_by_id(self, payment_id: str) -> Optional[dict]:
        for p in self._memory["payments"]:
            if p["id"] == payment_id:
                return p
        return None

    # --- INVOICES ---
    async def create_invoice(self, data: dict) -> dict:
        inv = {
            "id": self._generate_id(),
            **data,
            "validated": False,
            "created_at": self._now(),
        }
        self._memory["invoices"].append(inv)
        return inv

    async def list_invoices_by_loan(self, loan_id: str) -> List[dict]:
        return [i for i in self._memory["invoices"] if i["loan_id"] == loan_id]

    async def get_invoice_by_id(self, invoice_id: str) -> Optional[dict]:
        for i in self._memory["invoices"]:
            if i["id"] == invoice_id:
                return i
        return None

    async def update_invoice(self, invoice_id: str, updates: dict) -> Optional[dict]:
        for i in self._memory["invoices"]:
            if i["id"] == invoice_id:
                i.update(updates)
                return i
        return None


# Singleton
db = ArkivClient(settings.arkiv_rpc_url)
