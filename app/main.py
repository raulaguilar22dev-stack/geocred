from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer

from app.config import settings
from app.auth import get_current_user, verify_password, create_access_token
from app.models import (
    UserRegister, UserLogin, Token, UserOut,
    LoanCreate, LoanOut, LoanDetailOut,
    MilestoneOut,
    InvestmentCreate, InvestmentOut,
    DisbursementOut,
    PaymentCreate, PaymentOut,
    InvoiceCreate, InvoiceOut,
    TreasuryOut,
)
from app.services import (
    UserService, LoanService, PaymentService,
    InvoiceService, MilestoneService, InvestmentService,
)
from app.database import db

app = FastAPI(title="Hackanton - Crowdlending", version="1.0.0")
security = HTTPBearer()


@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)},
    )


@app.post("/auth/register", response_model=UserOut)
async def register(data: UserRegister):
    try:
        user = await UserService.register_user(data.model_dump())
        return UserOut(**user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/auth/login", response_model=Token)
async def login(data: UserLogin):
    user = await UserService.get_user_by_username(data.username)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales invalidas")

    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return Token(access_token=token)


@app.get("/users/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    user = await UserService.get_profile(current_user["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return UserOut(**user)


@app.post("/loans", response_model=LoanOut)
async def create_loan(data: LoanCreate, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "emprendedor":
        raise HTTPException(status_code=403, detail="Solo emprendedores pueden crear prestamos")
    loan = await LoanService.request_loan(current_user["sub"], data.model_dump())
    return LoanOut(**loan)


@app.get("/loans", response_model=list[LoanOut])
async def list_loans(current_user: dict = Depends(get_current_user)):
    loans = await db.list_loans_by_user(current_user["sub"])
    return [LoanOut(**l) for l in loans]


@app.get("/loans/public", response_model=list[LoanOut])
async def list_public_loans():
    loans = await db.list_all_loans(status="funding")
    return [LoanOut(**l) for l in loans]


@app.get("/loans/{loan_id}", response_model=LoanDetailOut)
async def get_loan_detail(
    loan_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        loan = await LoanService.get_loan_detail(
            loan_id, current_user["sub"], current_user.get("role", "")
        )
        return LoanDetailOut(**loan)
    except ValueError as e:
        raise HTTPException(status_code=404 if "no encontrado" in str(e) else 403, detail=str(e))


@app.post("/loans/{loan_id}/approve", response_model=LoanOut)
async def approve_loan(loan_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede aprobar")
    loan = await LoanService.approve_loan(loan_id)
    return LoanOut(**loan)


@app.post("/loans/{loan_id}/reject", response_model=LoanOut)
async def reject_loan(
    loan_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede rechazar")
    try:
        loan = await LoanService.reject_loan(loan_id)
        return LoanOut(**loan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/loans/{loan_id}/disburse", response_model=DisbursementOut)
async def disburse_loan(
    loan_id: str,
    milestone_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede desembolsar")
    try:
        disp = await LoanService.disburse_loan(loan_id, milestone_id)
        return DisbursementOut(**disp)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/loans/{loan_id}/milestones/{milestone_id}/complete", response_model=MilestoneOut)
async def complete_milestone(
    loan_id: str,
    milestone_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede completar metas")
    try:
        milestone = await MilestoneService.complete_milestone(milestone_id)
        return MilestoneOut(**milestone)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/investments", response_model=InvestmentOut)
async def create_investment(
    data: InvestmentCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "inversor":
        raise HTTPException(status_code=403, detail="Solo inversores pueden aportar")
    try:
        investment = await InvestmentService.create_investment(
            current_user["sub"], data.model_dump()
        )
        return InvestmentOut(**investment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/investments", response_model=list[InvestmentOut])
async def list_my_investments(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "inversor":
        raise HTTPException(status_code=403, detail="Solo inversores tienen inversiones")
    investments = await InvestmentService.list_my_investments(current_user["sub"])
    return [InvestmentOut(**i) for i in investments]


@app.get("/investments/{investment_id}", response_model=InvestmentOut)
async def get_investment(
    investment_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "inversor":
        raise HTTPException(status_code=403, detail="Solo inversores")
    try:
        investment = await InvestmentService.get_investment_detail(
            investment_id, current_user["sub"]
        )
        return InvestmentOut(**investment)
    except ValueError as e:
        raise HTTPException(status_code=404 if "no encontrada" in str(e) else 403, detail=str(e))


@app.post("/payments", response_model=PaymentOut)
async def create_payment(
    data: PaymentCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "emprendedor":
        raise HTTPException(status_code=403, detail="Solo emprendedores pueden pagar")
    payment = await PaymentService.register_payment(current_user["sub"], data.model_dump())
    return PaymentOut(**payment)


@app.get("/payments/{payment_id}", response_model=PaymentOut)
async def get_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
):
    payment = await db.get_payment_by_id(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    loan = await db.get_loan_by_id(payment["loan_id"])
    if not loan:
        raise HTTPException(status_code=404, detail="Prestamo asociado no encontrado")
    if loan["user_id"] != current_user["sub"] and current_user.get("role") != "admin":
        # Inversores tambien pueden ver sus retornos
        if payment.get("investor_id") != current_user["sub"]:
            raise HTTPException(status_code=403, detail="No autorizado")
    return PaymentOut(**payment)


@app.post("/invoices", response_model=InvoiceOut)
async def create_invoice(
    data: InvoiceCreate,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "emprendedor":
        raise HTTPException(status_code=403, detail="Solo emprendedores pueden subir facturas")
    invoice = await InvoiceService.submit_invoice(current_user["sub"], data.model_dump())
    return InvoiceOut(**invoice)


@app.post("/invoices/{invoice_id}/validate", response_model=InvoiceOut)
async def validate_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede validar facturas")
    try:
        invoice = await InvoiceService.validate_invoice(invoice_id)
        return InvoiceOut(**invoice)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/invoices/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(get_current_user),
):
    invoice = await db.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    loan = await db.get_loan_by_id(invoice["loan_id"])
    if not loan:
        raise HTTPException(status_code=404, detail="Prestamo asociado no encontrado")
    if loan["user_id"] != current_user["sub"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    return InvoiceOut(**invoice)


@app.get("/admin/loans", response_model=list[LoanOut])
async def list_all_loans(
    status: str = None,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Solo admin puede ver todos los prestamos")
    loans = await LoanService.list_all_loans(status_filter=status)
    return [LoanOut(**l) for l in loans]


@app.get("/admin/treasury", response_model=TreasuryOut)
async def get_treasury():
    if not settings.treasury_stellar_public_key:
        raise HTTPException(status_code=503, detail="Tesoreria no configurada")
    return TreasuryOut(
        stellar_public_key=settings.treasury_stellar_public_key,
        network=settings.stellar_network,
    )
