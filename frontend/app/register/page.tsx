import Navbar from "@/components/Navbar";
import RegisterForm from "@/components/forms/RegisterForm";
import Card from "@/components/ui/Card";

export default function RegisterPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Crear cuenta
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            Registrate como emprendedor, inversor o administrador.
          </p>
          <RegisterForm />
        </Card>
      </main>
    </>
  );
}
