"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

const ROLES = [
  { value: "emprendedor", label: "Emprendedor" },
  { value: "inversor", label: "Inversor" },
  { value: "admin", label: "Administrador" },
];

export default function RegisterForm() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    full_name: "",
    business_name: "",
    role: "emprendedor",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const update = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", form);
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Nombre completo"
        value={form.full_name}
        onChange={(v) => update("full_name", v)}
        placeholder="Juan Pérez"
        required
      />
      <Input
        label="Nombre de usuario"
        value={form.username}
        onChange={(v) => update("username", v)}
        placeholder="juan_perez"
        required
      />
      <Input
        label="Contraseña"
        type="password"
        value={form.password}
        onChange={(v) => update("password", v)}
        placeholder="Mínimo 6 caracteres"
        required
      />
      <Input
        label="Nombre del negocio"
        value={form.business_name}
        onChange={(v) => update("business_name", v)}
        placeholder="Opcional"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Rol <span className="text-red-500">*</span>
        </label>
        <select
          value={form.role}
          onChange={(e) => update("role", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
        >
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
