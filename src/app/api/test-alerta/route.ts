import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

// TEMPORAL: endpoint de verificación del canal Sentry → Telegram.
// Protegido con CRON_SECRET; eliminar tras la prueba.
export async function GET(request: NextRequest) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("x-test-secret") !== secreto) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const errorPrueba = new Error(
    "[VERIFICACIÓN] Error real generado en producción para validar la cadena de alertas"
  );
  Sentry.captureException(errorPrueba, {
    tags: { route: "/api/test-alerta", tipo: "prueba-verificacion" },
  });

  await Sentry.flush(5000);

  return NextResponse.json({
    ok: true,
    mensaje: "Error de verificación enviado a Sentry",
  });
}
