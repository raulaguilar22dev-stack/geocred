import Navbar from "@/components/Navbar";
import LoanForm from "@/components/forms/LoanForm";
import Card from "@/components/ui/Card";

export default function NuevoPrestamoPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 py-8 px-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Solicitar nuevo préstamo
          </h1>
          <p className="text-slate-600 mb-6">
            Definí el monto, el propósito y dividí tu proyecto en metas claras.
          </p>
          <Card className="p-6">
            <LoanForm />
          </Card>
        </div>
      </main>
    </>
  );
}
