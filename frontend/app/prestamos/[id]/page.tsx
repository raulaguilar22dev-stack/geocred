"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";

interface LoanDetail {
  id: string;
  user_id: string;
  amount: number;
  purpose: string;
  objectives: string[];
  status: string;
  interest_rate: number;
  total_invested: number;
  disbursed_amount: number;
  remaining_amount: number;
  created_at: string;
  milestones: Milestone[];
  investments: Investment[];
  disbursements: Disbursement[];
  payments: Payment[];
  invoices: Invoice[];
}

interface Milestone {
  id: string;
  description: string;
  amount: number;
  status: string;
}

interface Investment {
  id: string;
  investor_id: string;
  amount: number;
}

interface Disbursement {
  id: string;
  amount: number;
  milestone_id: string;
  stage: number;
}

interface Payment {
  id: string;
  amount: number;
  investor_id?: string;
  stellar_tx_hash?: string;
}

interface Invoice {
  id: string;
  description: string;
  amount: number;
  validated: boolean;
  document_url?: string;
}

export default function LoanDetailPage() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [investAmount, setInvestAmount] = useState("");
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [investSuccess, setInvestSuccess] = useState(false);

  const { data: loan, isLoading, error } = useQuery({
    queryKey: ["loan", id],
    queryFn: async () => {
      const res = await api.get(`/loans/${id}`);
      return res.data as LoanDetail;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const investMutation = useMutation({
    mutationFn: () =>
      api.post("/investments", { loan_id: id, amount: parseFloat(investAmount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
      queryClient.invalidateQueries({ queryKey: ["my-investments"] });
      setInvestAmount("");
      setInvestSuccess(true);
      setTimeout(() => setInvestSuccess(false), 5000);
    },
  });

  const completeMilestoneMutation = useMutation({
    mutationFn: (milestoneId: string) =>
      api.post(`/loans/${id}/milestones/${milestoneId}/complete`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loan", id] }),
  });

  const disburseMutation = useMutation({
    mutationFn: (milestoneId: string) =>
      api.post(`/loans/${id}/disburse`, null, { params: { milestone_id: milestoneId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loan", id] }),
  });

  const validateInvoiceMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      api.post(`/invoices/${invoiceId}/validate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loan", id] }),
  });

  const submitInvoiceMutation = useMutation({
    mutationFn: () =>
      api.post("/invoices", {
        loan_id: id,
        description: invoiceDesc,
        amount: parseFloat(invoiceAmount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
      setInvoiceDesc("");
      setInvoiceAmount("");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      api.post("/payments", {
        loan_id: id,
        amount: parseFloat(paymentAmount),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
      setPaymentAmount("");
    },
  });

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-slate-500">Cargando...</div>
        </main>
      </>
    );
  }

  if (error || !loan) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 font-medium mb-2">Error al cargar el proyecto</p>
            <p className="text-slate-500 text-sm">
              {(error as any)?.response?.data?.detail || "No se pudo obtener la información del préstamo."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-slate-900 underline"
            >
              Intentar de nuevo
            </button>
          </div>
        </main>
      </>
    );
  }

  const isOwner = user?.id === loan.user_id;
  const isAdmin = user?.role === "admin";
  const isInvestor = user?.role === "inversor";
  const hasInvested = loan.investments.some((i) => i.investor_id === user?.id);

  return (
    <>
      <Navbar />
      <main className="flex-1 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {loan.purpose}
              </h1>
              <Badge
                text={loan.status}
                variant={
                  loan.status === "active"
                    ? "success"
                    : loan.status === "funding"
                    ? "info"
                    : loan.status === "pending"
                    ? "warning"
                    : "default"
                }
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Monto total</span>
                <p className="font-medium">${loan.amount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-500">Invertido</span>
                <p className="font-medium">${loan.total_invested.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-500">Desembolsado</span>
                <p className="font-medium">${loan.disbursed_amount.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-slate-500">Restante</span>
                <p className="font-medium">${loan.remaining_amount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Invertir (solo inversores en funding) */}
          {isInvestor && loan.status === "funding" && (
            <Card className="p-6 mb-6 border-emerald-200 bg-emerald-50/30">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Invertir en este proyecto</h3>
                  <p className="text-sm text-slate-600">Apoyá este emprendimiento y generá retornos.</p>
                </div>
              </div>

              {/* Funding progress */}
              <div className="mb-4 bg-white rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600">Progreso de financiación</span>
                  <span className="font-medium text-slate-900">
                    {Math.min((loan.total_invested / loan.amount) * 100, 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                  <div
                    className="bg-emerald-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min((loan.total_invested / loan.amount) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Recaudado: ${loan.total_invested.toLocaleString()}</span>
                  <span>Meta: ${loan.amount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-1">
                  Faltan ${(loan.amount - loan.total_invested).toLocaleString()} para completar
                </p>
              </div>

              {/* User's existing investment */}
              {hasInvested && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Ya invertiste <span className="font-semibold">${loan.investments.find(i => i.investor_id === user?.id)?.amount.toLocaleString()}</span> en este proyecto.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input
                    type="number"
                    value={investAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val && parseFloat(val) > loan.amount - loan.total_invested) {
                        setInvestAmount(String(loan.amount - loan.total_invested));
                      } else {
                        setInvestAmount(val);
                      }
                      setInvestSuccess(false);
                    }}
                    placeholder="Monto a invertir"
                    min="1"
                    max={loan.amount - loan.total_invested}
                    className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <Button
                  onClick={() => investMutation.mutate()}
                  disabled={investMutation.isPending || !investAmount || parseFloat(investAmount) <= 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {investMutation.isPending ? "Procesando..." : "Invertir ahora"}
                </Button>
              </div>

              {investMutation.isError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">
                    {(investMutation.error as any)?.response?.data?.detail || "Error al procesar la inversión. Intentá de nuevo."}
                  </p>
                </div>
              )}

              {investSuccess && (
                <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <p className="text-emerald-700 text-sm font-medium">
                    ¡Inversión realizada con éxito! 🎉
                  </p>
                  <p className="text-emerald-600 text-xs mt-0.5">
                    Tu aporte ya forma parte de este proyecto.
                  </p>
                </div>
              )}
            </Card>
          )}

          {isInvestor && loan.status !== "funding" && (
            <Card className="p-6 mb-6 bg-slate-50 border-slate-200">
              <p className="text-sm text-slate-600 text-center">
                Este proyecto ya no acepta inversiones (estado: <Badge text={loan.status} variant="default" />).
              </p>
            </Card>
          )}

          {/* Milestones */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Metas</h2>
            <div className="space-y-3">
              {loan.milestones.map((ms) => (
                <Card key={ms.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{ms.description}</p>
                      <p className="text-sm text-slate-600">${ms.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        text={ms.status}
                        variant={
                          ms.status === "paid"
                            ? "success"
                            : ms.status === "completed"
                            ? "info"
                            : "warning"
                        }
                      />
                      {isAdmin && ms.status === "pending" && (
                        <Button
                          variant="secondary"
                          onClick={() => completeMilestoneMutation.mutate(ms.id)}
                          disabled={completeMilestoneMutation.isPending}
                        >
                          Completar
                        </Button>
                      )}
                      {isAdmin && ms.status === "completed" && (
                        <Button
                          onClick={() => disburseMutation.mutate(ms.id)}
                          disabled={disburseMutation.isPending}
                        >
                          Desembolsar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Facturas */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Facturas</h2>
            {isOwner && (
              <Card className="p-4 mb-4">
                <h3 className="text-sm font-medium text-slate-900 mb-2">Subir nueva factura</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={invoiceDesc}
                    onChange={(e) => setInvoiceDesc(e.target.value)}
                    placeholder="Descripción"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="Monto"
                    className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <Button
                    onClick={() => submitInvoiceMutation.mutate()}
                    disabled={submitInvoiceMutation.isPending}
                  >
                    Subir
                  </Button>
                </div>
              </Card>
            )}
            <div className="space-y-2">
              {loan.invoices.map((inv) => (
                <Card key={inv.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{inv.description}</p>
                      <p className="text-sm text-slate-600">${inv.amount.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        text={inv.validated ? "Validada" : "Pendiente"}
                        variant={inv.validated ? "success" : "warning"}
                      />
                      {isAdmin && !inv.validated && (
                        <Button
                          variant="secondary"
                          onClick={() => validateInvoiceMutation.mutate(inv.id)}
                          disabled={validateInvoiceMutation.isPending}
                        >
                          Validar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
              {loan.invoices.length === 0 && (
                <p className="text-slate-500 text-sm">No hay facturas registradas.</p>
              )}
            </div>
          </section>

          {/* Pagos */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Pagos</h2>
            {isOwner && loan.status === "active" && (
              <Card className="p-4 mb-4">
                <h3 className="text-sm font-medium text-slate-900 mb-2">Realizar pago</h3>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="Monto a pagar"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <Button
                    onClick={() => paymentMutation.mutate()}
                    disabled={paymentMutation.isPending}
                  >
                    Pagar
                  </Button>
                </div>
                {paymentMutation.isError && (
                  <p className="text-red-600 text-sm mt-2">
                    {(paymentMutation.error as any)?.response?.data?.detail || "Error al pagar"}
                  </p>
                )}
              </Card>
            )}
            <div className="space-y-2">
              {loan.payments.map((pay) => (
                <Card key={pay.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        ${pay.amount.toLocaleString()}
                        {pay.investor_id && (
                          <span className="text-sm text-slate-500 ml-2">
                            (Retorno a inversor)
                          </span>
                        )}
                      </p>
                    </div>
                    {pay.stellar_tx_hash && (
                      <Badge text="On-chain" variant="info" />
                    )}
                  </div>
                </Card>
              ))}
              {loan.payments.length === 0 && (
                <p className="text-slate-500 text-sm">No hay pagos registrados.</p>
              )}
            </div>
          </section>

          {/* Inversiones */}
          {loan.investments.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Inversiones</h2>
              <div className="space-y-2">
                {loan.investments.map((inv) => (
                  <Card key={inv.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        Inversor: {inv.investor_id.slice(0, 8)}...
                      </p>
                      <p className="font-medium text-slate-900">
                        ${inv.amount.toLocaleString()}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
