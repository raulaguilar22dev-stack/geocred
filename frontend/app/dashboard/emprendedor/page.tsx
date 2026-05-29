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
  disbursed_amount: number;
  remaining_amount: number;
  created_at: string;
}

function getStatusBadge(status: string) {
  const map: Record<string, { text: string; variant: any }> = {
    pending: { text: "Pendiente", variant: "warning" },
    funding: { text: "Buscando inversores", variant: "info" },
    active: { text: "Activo", variant: "success" },
    completed: { text: "Completado", variant: "success" },
    rejected: { text: "Rechazado", variant: "danger" },
  };
  const s = map[status] || { text: status, variant: "default" };
  return <Badge text={s.text} variant={s.variant} />;
}

export default function EmprendedorDashboard() {
  const { data: loans, isLoading } = useQuery({
    queryKey: ["my-loans"],
    queryFn: async () => {
      const res = await api.get("/loans");
      return res.data as Loan[];
    },
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Mis préstamos
              </h1>
              <p className="text-slate-600 text-sm mt-1">
                Gestiona tus solicitudes y pagos.
              </p>
            </div>
            <Link
              href="/prestamos/nuevo"
              className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              + Nuevo préstamo
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-500 py-12">
              Cargando préstamos...
            </div>
          ) : !loans || loans.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-600 mb-4">
                No tenés préstamos solicitados todavía.
              </p>
              <Link
                href="/prestamos/nuevo"
                className="text-slate-900 font-medium underline"
              >
                Solicitar mi primer préstamo
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4">
              {loans.map((loan) => (
                <Card key={loan.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-slate-900">
                          {loan.purpose}
                        </h3>
                        {getStatusBadge(loan.status)}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-slate-500">Monto total</span>
                          <p className="font-medium text-slate-900">
                            ${loan.amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Invertido</span>
                          <p className="font-medium text-slate-900">
                            ${loan.total_invested.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Desembolsado</span>
                          <p className="font-medium text-slate-900">
                            ${loan.disbursed_amount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-500">Restante</span>
                          <p className="font-medium text-slate-900">
                            ${loan.remaining_amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/prestamos/${loan.id}`}
                      className="text-sm font-medium text-slate-900 hover:underline shrink-0"
                    >
                      Ver detalle →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
