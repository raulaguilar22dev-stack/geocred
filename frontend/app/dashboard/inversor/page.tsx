"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";

interface Loan {
  id: string;
  amount: number;
  purpose: string;
  status: string;
  total_invested: number;
  interest_rate: number;
  created_at: string;
}

interface Investment {
  id: string;
  loan_id: string;
  amount: number;
  created_at: string;
}

export default function InversorDashboard() {
  const { data: publicLoans } = useQuery({
    queryKey: ["public-loans"],
    queryFn: async () => {
      const res = await api.get("/loans/public");
      return res.data as Loan[];
    },
  });

  const { data: myInvestments } = useQuery({
    queryKey: ["my-investments"],
    queryFn: async () => {
      const res = await api.get("/investments");
      return res.data as Investment[];
    },
  });

  const getLoanPurpose = (loanId: string) => {
    const loan = publicLoans?.find((l) => l.id === loanId);
    return loan?.purpose || `Préstamo ${loanId.slice(0, 8)}...`;
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-8">
            Panel de inversor
          </h1>

          {/* Mis inversiones */}
          <section className="mb-12">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Mis inversiones
            </h2>
            {!myInvestments || myInvestments.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-slate-600">
                  Todavía no realizaste ninguna inversión.
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Explorá los proyectos disponibles abajo y empezá a generar retornos.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {myInvestments.map((inv) => (
                  <Card key={inv.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {getLoanPurpose(inv.loan_id)}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          Invertido: <span className="font-medium text-slate-900">${inv.amount.toLocaleString()}</span>
                        </p>
                      </div>
                      <Link
                        href={`/prestamos/${inv.loan_id}`}
                        className="text-sm font-medium bg-slate-100 text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Ver proyecto →
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Préstamos disponibles */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Préstamos buscando financiación
            </h2>
            {!publicLoans || publicLoans.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-slate-600">
                  No hay préstamos buscando financiación en este momento.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {publicLoans.map((loan) => {
                  const progress = Math.min(
                    (loan.total_invested / loan.amount) * 100,
                    100
                  );
                  const remaining = loan.amount - loan.total_invested;

                  return (
                    <Card key={loan.id} className="p-6 flex flex-col">
                      <h3 className="font-semibold text-slate-900 mb-3">
                        {loan.purpose}
                      </h3>

                      {/* Progress bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">
                            {progress.toFixed(0)}% financiado
                          </span>
                          <span className="font-medium text-slate-900">
                            ${loan.total_invested.toLocaleString()} / ${loan.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3">
                          <div
                            className="bg-emerald-500 h-3 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Faltan ${remaining.toLocaleString()} para completar la meta
                        </p>
                      </div>

                      <div className="space-y-2 text-sm mb-6 flex-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Retorno anual</span>
                          <Badge text={`${loan.interest_rate}%`} variant="success" />
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Estado</span>
                          <Badge text="Buscando inversores" variant="info" />
                        </div>
                      </div>

                      <Link
                        href={`/prestamos/${loan.id}`}
                        className="block w-full text-center bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                      >
                        Invertir ahora
                      </Link>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
