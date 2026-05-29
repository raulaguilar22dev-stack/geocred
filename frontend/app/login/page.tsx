import Navbar from "@/components/Navbar";
import LoginForm from "@/components/forms/LoginForm";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Iniciar sesión
          </h1>
          <p className="text-slate-600 text-sm mb-6">
            Accedé a tu cuenta para gestionar tus préstamos o inversiones.
          </p>
          <LoginForm />
        </Card>
      </main>
    </>
  );
}
