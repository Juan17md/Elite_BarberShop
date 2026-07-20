"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es" className="dark">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            Error Crítico del Sistema
          </h1>

          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Se ha producido un error grave. El incidente ha sido registrado automáticamente en Sentry para su análisis.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => reset()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reintentar Operación
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
