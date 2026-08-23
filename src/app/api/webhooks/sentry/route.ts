import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  enviarMensajeTelegram,
  esAccionNotificable,
  formatearMensajeSentry,
  type PayloadSentry,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

// Bitácora consultable en Firestore: fuente de verdad sobre cada webhook
async function registrarBitacora(datos: Record<string, unknown>) {
  try {
    await adminDb.collection("log_alertas").add({
      fecha: new Date().toISOString(),
      ...datos,
    });
  } catch {
    // la bitácora jamás debe romper el flujo principal
  }
}

export async function POST(request: Request) {
  const tokenBot = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!tokenBot || !chatId) {
    await registrarBitacora({ resultado: "sin_credenciales" });
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const secreto = process.env.SENTRY_WEBHOOK_SECRET;
  if (!secreto || request.headers.get("x-webhook-secret") !== secreto) {
    await registrarBitacora({ resultado: "no_autorizado" });
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let payload: PayloadSentry;
  try {
    payload = (await request.json()) as PayloadSentry;
  } catch {
    await registrarBitacora({ resultado: "payload_invalido" });
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const accion = payload?.action ?? "(sin action)";
  const tituloIssue =
    payload?.data?.issue?.title ?? payload?.data?.event?.message ?? "(sin título)";

  if (!esAccionNotificable(payload)) {
    await registrarBitacora({
      resultado: "ignorado",
      motivo: "accion_no_notificable",
      accion,
      tituloIssue,
    });
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const mensaje = formatearMensajeSentry(payload);
  if (!mensaje) {
    await registrarBitacora({
      resultado: "ignorado",
      motivo: "sin_titulo_formateable",
      accion,
      tituloIssue,
    });
    return NextResponse.json({ ok: true, ignorado: true });
  }

  try {
    await enviarMensajeTelegram(tokenBot, chatId, mensaje);
    await registrarBitacora({
      resultado: "enviado",
      accion,
      tituloIssue,
      chatConfigurado: chatId,
    });
  } catch (error) {
    await registrarBitacora({
      resultado: "error_envio",
      accion,
      tituloIssue,
      detalleError: error instanceof Error ? error.message.slice(0, 300) : "(desconocido)",
    });
    Sentry.captureException(error, { extra: { payload } });
    return NextResponse.json({ error: "No se pudo notificar" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
