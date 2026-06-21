"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ShieldX, LogOut } from "lucide-react";

export default function BloqueadoPage() {
  const handleCerrarSesion = async () => {
    try {
      await signOut(auth);
      document.cookie =
        "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
      window.location.href = "/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <main className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
          <ShieldX size={36} className="text-red-500" />
        </div>

        <h1 className="font-display text-4xl text-white tracking-wide mb-4">
          ACCESO <span className="text-red-500">BLOQUEADO</span>
        </h1>

        <p className="text-text-muted text-base leading-relaxed max-w-sm mx-auto mb-8">
          Tu cuenta ha sido bloqueada por un administrador. Si crees que esto es un
          error, contacta al equipo de gestión de la barbería.
        </p>

        <button
          onClick={handleCerrarSesion}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all font-bold text-sm tracking-widest uppercase"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </div>
    </main>
  );
}
