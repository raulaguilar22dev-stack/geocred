"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { username, password });
      const { access_token } = res.data;

      // Obtener datos del usuario
      const meRes = await api.get("/users/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      setAuth(meRes.data, access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Usuario"
        value={username}
        onChange={setUsername}
        placeholder="Tu nombre de usuario"
        required
      />
      <Input
        label="Contraseña"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="Tu contraseña"
        required
      />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Cargando..." : "Iniciar sesión"}
      </Button>
    </form>
  );
}
