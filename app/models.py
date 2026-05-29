from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


# Enums
class LoanStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    FUNDING = "funding"
    ACTIVE = "active"
    COMPLETED = "completed"
    DISBURSING = "disbursing"
    PAID = "paid"


class UserRole(str, Enum):
    EMPRENDEDOR = "emprendedor"
    INVERSOR = "inversor"
    ADMIN = "admin"


class MilestoneStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    PAID = "paid"


# Auth
class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    business_name: Optional[str] = None
    role: UserRole = UserRole.EMPRENDEDOR


class UserLogin(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Users
class UserOut(BaseModel):
    id: str
    username: str
    full_name: str
    business_name: Optional[str] = None
    role: UserRole
    stellar_public_key: Optional[str] = None
    stellar_balance: Optional[list] = None
    created_at: datetime


# Milestones
class MilestoneCreate(BaseModel):
    description: str
    amount: float = Field(gt=0)


class MilestoneOut(BaseModel):
    id: str
    loan_id: str
    description: str
    amount: float
    status: MilestoneStatus
    created_at: datetime


# Loans
class LoanCreate(BaseModel):
    amount: float = Field(gt=0)
    purpose: str
    objectives: List[str]
    milestones: List[MilestoneCreate]


class LoanOut(BaseModel):
    id: str
    user_id: str
    amount: float
    purpose: str
    objectives: List[str]
    status: LoanStatus
    interest_rate: float = 3.0
    total_invested: float = 0.0
    disbursed_amount: float = 0.0
    remaining_amount: float = 0.0
    created_at: datetime


# Investments
class InvestmentCreate(BaseModel):
    loan_id: str
    amount: float = Field(gt=0)


class InvestmentOut(BaseModel):
    id: str
    investor_id: str
    loan_id: str
    amount: float
    created_at: datetime


# Disbursements
class DisbursementOut(BaseModel):
    id: str
    loan_id: str
    milestone_id: Optional[str] = None
    amount: float
    stage: int
    stellar_tx_hash: Optional[str] = None
    created_at: datetime


# Payments
class PaymentCreate(BaseModel):
    loan_id: str
    amount: float = Field(gt=0)
    stellar_tx_hash: Optional[str] = None


class PaymentOut(BaseModel):
    id: str
    loan_id: str
    amount: float
    investor_id: Optional[str] = None
    stellar_tx_hash: Optional[str] = None
    created_at: datetime


# Invoices
class InvoiceCreate(BaseModel):
    loan_id: str
    description: str
    amount: float = Field(gt=0)
    document_url: Optional[str] = None


class InvoiceOut(BaseModel):
    id: str
    loan_id: str
    description: str
    amount: float
    document_url: Optional[str] = None
    validated: bool = False
    created_at: datetime


class LoanDetailOut(BaseModel):
    id: str
    user_id: str
    amount: float
    purpose: str
    objectives: List[str]
    status: LoanStatus
    interest_rate: float = 3.0
    total_invested: float = 0.0
    disbursed_amount: float = 0.0
    remaining_amount: float = 0.0
    created_at: datetime
    milestones: List[MilestoneOut] = []
    investments: List[InvestmentOut] = []
    disbursements: List[DisbursementOut] = []
    payments: List[PaymentOut] = []
    invoices: List[InvoiceOut] = []


class TreasuryOut(BaseModel):
    stellar_public_key: str
    network: str
