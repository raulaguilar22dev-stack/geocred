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

export default function PublicLoansPage() {
  const { data: loans, isLoading } = useQuery({
    queryKey: ["public-loans"],
    queryFn: async () => {
      const res = await api.get("/loans/public");
      return res.data as Loan[];
    },
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Proyectos buscando financiación
          </h1>
          <p className="text-slate-600 mb-8">
            Explorá los emprendimientos que necesitan tu apoyo.
          </p>

          {isLoading ? (
            <div className="text-center text-slate-500 py-12">
              Cargando proyectos...
            </div>
          ) : !loans || loans.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-600">
                No hay proyectos buscando financiación en este momento.
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Volvé más tarde o registrate para recibir notificaciones.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {loans.map((loan) => (
                <Card key={loan.id} className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-3">
                    {loan.purpose}
                  </h3>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Meta</span>
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
                  <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                    <div
                      className="bg-slate-900 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (loan.total_invested / loan.amount) * 100,
                          100
                        )}%`,
                      }}
                    />
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
        </div>
      </main>
    </>
  );
}
