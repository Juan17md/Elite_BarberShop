import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { enviarMensajeTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const NOMBRE_PROYECTO = "Elite BarberShop";
const MAX_CAMPO = 500;

/**
 * Reporte directo de errores de cliente.
 *
 * Motivo: la telemetría del cliente (Sentry.captureException en el navegador)
 * sale por el túnel /monitoring. Si el dispositivo tiene problemas de red o
 * corrupción local (el mismo escenario que suele causar el error original),
 * el evento nunca llega a Sentry y el error queda invisible. Este endpoint
 * recibe el reporte y lo captura en Sentry desde el SERVIDOR (sin
 * geobloqueo ni dependencia del navegador) además de notificar a Telegram
 * de forma directa.
 */
interface ReporteError {
  contexto?: string;
  codigo?: string;
  mensaje?: string;
  stack?: string;
  extra?: Record<string, unknown>;
}

function cortar(texto: unknown, max = MAX_CAMPO): string {
  return typeof texto === "string" ? texto.slice(0, max) : "(sin valor)";
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    let uid = "(desconocido)";
    let email = "";
    try {
      const decodificado = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
      uid = decodificado.uid;
      email = decodificado.email ?? "";
    } catch {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
    }

    const reporte = (await request.json().catch(() => null)) as ReporteError | null;
    if (!reporte || typeof reporte !== "object") {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const contexto = cortar(reporte.contexto).slice(0, 120) || "(sin contexto)";
    const codigo = cortar(reporte.codigo, 100);
    const mensaje = cortar(reporte.mensaje);
    const stack = cortar(reporte.stack, 1500);

    // Sentry server-side: el evento sale del servidor, no del navegador
    Sentry.captureMessage(`Error reportado por cliente: ${contexto}`, {
      level: "error",
      tags: { origen: "reporte-directo", contexto, codigo },
      extra: { mensaje, stack, extra: reporte.extra, uid, email },
    });

    // Bitácora en Firestore (misma colección que el webhook de Sentry)
    try {
      await adminDb.collection("log_alertas").add({
        fecha: new Date().toISOString(),
        resultado: "reporte_directo",
        contexto,
        codigo,
        mensaje,
        uid,
        email,
      });
    } catch {
      // la bitácora jamás debe romper el flujo principal
    }

    // Notificación directa a Telegram (sin pasar por Sentry ni su webhook)
    const tokenBot = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (tokenBot && chatId) {
      const texto =
        `🔴 <b>[${escaparHtml(NOMBRE_PROYECTO)}] Error de cliente reportado</b>\n` +
        `<b>Contexto:</b> ${escaparHtml(contexto)}\n` +
        `<b>Código:</b> ${escaparHtml(codigo)}\n` +
        `<b>Mensaje:</b> ${escaparHtml(mensaje)}\n` +
        `<b>Usuario:</b> ${escaparHtml(email || uid)}`;
      try {
        await enviarMensajeTelegram(tokenBot, chatId, texto);
      } catch (errorTelegram) {
        Sentry.captureException(errorTelegram, {
          tags: { origen: "reporte-directo", fallo: "telegram" },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, { tags: { route: "/api/reportar-error" } });
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
