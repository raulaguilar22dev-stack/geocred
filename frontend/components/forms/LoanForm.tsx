"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface MilestoneInput {
  description: string;
  amount: string;
}

export default function LoanForm() {
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [objectives, setObjectives] = useState("");
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { description: "", amount: "" },
  ]);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: (data: any) => api.post("/loans", data),
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  const addMilestone = () => {
    setMilestones([...milestones, { description: "", amount: "" }]);
  };

  const updateMilestone = (index: number, field: keyof MilestoneInput, value: string) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  const removeMilestone = (index: number) => {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const totalMilestoneAmount = milestones.reduce(
      (sum, m) => sum + (parseFloat(m.amount) || 0),
      0
    );

    if (totalMilestoneAmount !== parseFloat(amount)) {
      alert(`La suma de las metas ($${totalMilestoneAmount}) debe ser igual al monto total ($${amount})`);
      return;
    }

    mutation.mutate({
      amount: parseFloat(amount),
      purpose,
      objectives: objectives.split(",").map((o) => o.trim()).filter(Boolean),
      milestones: milestones.map((m) => ({
        description: m.description,
        amount: parseFloat(m.amount),
      })),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Input
        label="Monto total del préstamo"
        type="number"
        value={amount}
        onChange={setAmount}
        placeholder="Ej: 1000"
        required
      />
      <Input
        label="Propósito"
        value={purpose}
        onChange={setPurpose}
        placeholder="¿Para qué necesitas el préstamo?"
        required
      />
      <Input
        label="Objetivos (separados por coma)"
        value={objectives}
        onChange={setObjectives}
        placeholder="Crecer, generar empleo, expandir"
      />

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Metas (milestones)
        </label>
        <div className="space-y-3">
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-2 items-end">
              <div className="flex-1">
                <input
                  type="text"
                  value={m.description}
                  onChange={(e) => updateMilestone(i, "description", e.target.value)}
                  placeholder="Descripción de la meta"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="w-32">
                <input
                  type="number"
                  value={m.amount}
                  onChange={(e) => updateMilestone(i, "amount", e.target.value)}
                  placeholder="Monto"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removeMilestone(i)}
                className="text-red-500 hover:text-red-700 text-sm px-2"
                disabled={milestones.length <= 1}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMilestone}
          className="mt-2 text-sm text-slate-600 hover:text-slate-900 underline"
        >
          + Agregar otra meta
        </button>
      </div>

      {mutation.isError && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
          {(mutation.error as any)?.response?.data?.detail || "Error al crear préstamo"}
        </div>
      )}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? "Creando..." : "Solicitar préstamo"}
      </Button>
    </form>
  );
}
