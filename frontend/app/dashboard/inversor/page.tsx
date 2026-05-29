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
              </Card>
            ) : (
              <div className="grid gap-4">
                {myInvestments.map((inv) => (
                  <Card key={inv.id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">
                          Préstamo: {inv.loan_id}
                        </p>
                        <p className="text-sm text-slate-600">
                          Invertido: ${inv.amount.toLocaleString()}
                        </p>
                      </div>
                      <Link
                        href={`/prestamos/${inv.loan_id}`}
                        className="text-sm font-medium text-slate-900 hover:underline"
                      >
                        Ver préstamo →
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
              Préstamos disponibles para invertir
            </h2>
            {!publicLoans || publicLoans.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-slate-600">
                  No hay préstamos buscando financiación en este momento.
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {publicLoans.map((loan) => (
                  <Card key={loan.id} className="p-6">
                    <h3 className="font-semibold text-slate-900 mb-2">
                      {loan.purpose}
                    </h3>
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Monto total</span>
                        <span className="font-medium">
                          ${loan.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recaudado</span>
                        <span className="font-medium">
                          ${loan.total_invested.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Interés</span>
                        <Badge text={`${loan.interest_rate}%`} variant="success" />
                      </div>
                    </div>
                    <Link
                      href={`/prestamos/${loan.id}`}
                      className="block w-full text-center bg-slate-900 text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                    >
                      Ver detalle e invertir
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
