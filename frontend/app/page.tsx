import Navbar from "@/components/Navbar";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-white py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
              Financiá tu emprendimiento con la comunidad
            </h1>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Hackanton conecta emprendedores con inversores para financiar
              proyectos de forma transparente y segura mediante blockchain.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Empezar ahora
              </Link>
              <Link
                href="/loans/public"
                className="bg-white text-slate-900 border border-slate-300 px-8 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors"
              >
                Ver proyectos
              </Link>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="py-16 px-6 bg-slate-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-slate-900 mb-12">
              ¿Cómo funciona?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold mb-4">
                  1
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Solicitá tu préstamo
                </h3>
                <p className="text-slate-600 text-sm">
                  Registrate como emprendedor, definí el monto y dividí tu proyecto
                  en metas claras.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold mb-4">
                  2
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Recibí financiación
                </h3>
                <p className="text-slate-600 text-sm">
                  Los inversores aportan a tu proyecto. Al alcanzar el 100%,
                  recibís los fondos por etapas según completás las metas.
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold mb-4">
                  3
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Devolvé con interés
                </h3>
                <p className="text-slate-600 text-sm">
                  Pagá el préstamo con una tasa fija del 3%. Los inversores
                  reciben su retorno proporcional.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
