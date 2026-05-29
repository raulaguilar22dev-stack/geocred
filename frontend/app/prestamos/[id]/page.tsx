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

  const { data: loan, isLoading } = useQuery({
    queryKey: ["loan", id],
    queryFn: async () => {
      const res = await api.get(`/loans/${id}`);
      return res.data as LoanDetail;
    },
  });

  const investMutation = useMutation({
    mutationFn: () =>
      api.post("/investments", { loan_id: id, amount: parseFloat(investAmount) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", id] });
      setInvestAmount("");
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

  if (isLoading || !loan) {
    return (
      <>
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-slate-500">Cargando...</div>
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
            <Card className="p-6 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">Invertir en este proyecto</h3>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={investAmount}
                  onChange={(e) => setInvestAmount(e.target.value)}
                  placeholder="Monto a invertir"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                />
                <Button
                  onClick={() => investMutation.mutate()}
                  disabled={investMutation.isPending || !investAmount}
                >
                  {investMutation.isPending ? "..." : "Invertir"}
                </Button>
              </div>
              {investMutation.isError && (
                <p className="text-red-600 text-sm mt-2">
                  {(investMutation.error as any)?.response?.data?.detail || "Error al invertir"}
                </p>
              )}
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
