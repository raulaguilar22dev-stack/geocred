"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import Link from "next/link";

interface Loan {
  id: string;
  user_id: string;
  amount: number;
  purpose: string;
  status: string;
  total_invested: number;
  created_at: string;
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();

  const { data: loans, isLoading } = useQuery({
    queryKey: ["admin-loans"],
    queryFn: async () => {
      const res = await api.get("/admin/loans");
      return res.data as Loan[];
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/loans/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-loans"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/loans/${id}/reject`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-loans"] }),
  });

  const pending = loans?.filter((l) => l.status === "pending") || [];
  const funding = loans?.filter((l) => l.status === "funding") || [];
  const active = loans?.filter((l) => l.status === "active") || [];

  return (
    <>
      <Navbar />
      <main className="flex-1 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-8">
            Panel de administración
          </h1>

          {/* Resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{loans?.length || 0}</p>
              <p className="text-sm text-slate-500">Total préstamos</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
              <p className="text-sm text-slate-500">Pendientes</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{funding.length}</p>
              <p className="text-sm text-slate-500">En financiación</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{active.length}</p>
              <p className="text-sm text-slate-500">Activos</p>
            </Card>
          </div>

          {isLoading ? (
            <div className="text-center text-slate-500 py-12">
              Cargando préstamos...
            </div>
          ) : (
            <>
              {/* Pendientes */}
              <section className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Préstamos pendientes de aprobación
                </h2>
                {pending.length === 0 ? (
                  <Card className="p-6 text-center text-slate-600">
                    No hay préstamos pendientes.
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {pending.map((loan) => (
                      <Card key={loan.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-900">
                              {loan.purpose}
                            </p>
                            <p className="text-sm text-slate-600">
                              ${loan.amount.toLocaleString()} — Usuario: {loan.user_id}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveMutation.mutate(loan.id)}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(loan.id)}
                              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* Activos/Funding */}
              <section>
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Todos los préstamos
                </h2>
                <div className="space-y-3">
                  {loans?.map((loan) => (
                    <Card key={loan.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">
                              {loan.purpose}
                            </p>
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
                          <p className="text-sm text-slate-600 mt-1">
                            ${loan.amount.toLocaleString()} — Invertido: ${loan.total_invested.toLocaleString()}
                          </p>
                        </div>
                        <Link
                          href={`/prestamos/${loan.id}`}
                          className="text-sm font-medium text-slate-900 hover:underline"
                        >
                          Ver detalle →
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </>
  );
}
