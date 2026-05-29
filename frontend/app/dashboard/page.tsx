"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    switch (user.role) {
      case "emprendedor":
        router.push("/dashboard/emprendedor");
        break;
      case "inversor":
        router.push("/dashboard/inversor");
        break;
      case "admin":
        router.push("/dashboard/admin");
        break;
      default:
        router.push("/login");
    }
  }, [user, router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-slate-500">Cargando dashboard...</div>
    </div>
  );
}
