"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { Loader2, Lock, ShieldCheck, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function CambiarContrasenaPage() {
  const { datosUsuario } = useAuth();
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (nuevaContrasena.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError("Las contraseñas no coinciden");
      return;
    }

    if (!datosUsuario?.uid || !auth.currentUser) {
      setError("Error de sesión. Recarga la página e inténtalo de nuevo.");
      return;
    }

    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const respuesta = await fetch(
        `/api/usuarios/${datosUsuario.uid}/cambiar-contrasena`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nuevaContrasena }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error || "Error al cambiar la contraseña");
        return;
      }

      setExito(true);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      setError("Error inesperado al cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (!datosUsuario) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-[10px] uppercase tracking-widest">Verificando sesión...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void flex items-center justify-center p-4">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <h1 className="font-display text-3xl text-white tracking-wide">
            CAMBIO DE <span className="text-primary">CONTRASEÑA</span>
          </h1>
          <p className="text-text-muted text-sm mt-2">
            Por seguridad, debes cambiar tu contraseña temporal antes de acceder al sistema
          </p>
        </div>

        <div className="bg-surface/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
          {exito ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={24} className="text-emerald-500" />
              </div>
              <h2 className="font-display text-xl text-white mb-2">¡Contraseña actualizada!</h2>
              <p className="text-text-muted text-sm">Redirigiendo al dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input
                    type={mostrarContrasena ? "text" : "password"}
                    className="w-full bg-void/50 border border-white/10 rounded-lg px-10 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                    placeholder="Mínimo 6 caracteres"
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-muted hover:text-primary transition-colors"
                    aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Confirmar Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                  <input
                    type={mostrarContrasena ? "text" : "password"}
                    className="w-full bg-void/50 border border-white/10 rounded-lg px-10 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                    placeholder="Repite tu nueva contraseña"
                    value={confirmarContrasena}
                    onChange={(e) => setConfirmarContrasena(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold tracking-wide shadow-[0_10px_30px_rgba(139,0,0,0.35)] hover:scale-[1.01] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Actualizando...</span>
                  </>
                ) : (
                  <>
                    <span>GUARDAR Y ACCEDER</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
