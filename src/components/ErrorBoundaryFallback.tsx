"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

interface ErrorBoundaryFallbackProps {
  error?: Error;
  resetError?: () => void;
}

export default function ErrorBoundaryFallback({
  error,
  resetError,
}: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center bg-zinc-950/80 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-md">
      <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4 text-red-400 animate-pulse">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <h3 className="text-xl font-semibold text-zinc-100 tracking-tight mb-2">
        Ha ocurrido un error inesperado
      </h3>

      <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
        El módulo experimentó una falla y el evento fue notificado automáticamente a nuestro sistema de monitoreo.
      </p>

      {error?.message && (
        <div className="w-full max-w-lg mb-6 p-3 bg-zinc-900/90 border border-zinc-800 rounded-lg text-left text-xs font-mono text-zinc-400 overflow-x-auto">
          <span className="text-red-400 font-semibold">Detalle: </span>
          {error.message}
        </div>
      )}

      <button
        onClick={() => (resetError ? resetError() : window.location.reload())}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-100 text-zinc-900 hover:bg-white text-sm font-medium transition-all shadow-md active:scale-95 cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
        Reintentar cargar vista
      </button>
    </div>
  );
}
