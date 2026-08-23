import { NextResponse } from "next/server";
import { createHash } from "crypto";
import * as Sentry from "@sentry/nextjs";
import {
  enviarMensajeTelegram,
  esAccionNotificable,
  formatearMensajeSentry,
  type PayloadSentry,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const tokenBot = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!tokenBot || !chatId) {
    return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
  }

  const secreto = process.env.SENTRY_WEBHOOK_SECRET;
  const headerSecreto = request.headers.get("x-webhook-secret");
  // Diagnóstico temporal: huellas SHA-256 (12 chars) y longitudes, jamás valores
  const huella = (v: string | undefined) =>
    v ? createHash("sha256").update(v).digest("hex").slice(0, 12) : "(vacío)";
  console.log(
    `[webhook-sentry] secreto ${headerSecreto === secreto ? "COINCIDE" : "NO COINCIDE"} | ` +
      `fp token=${huella(process.env.TELEGRAM_BOT_TOKEN)} len=${process.env.TELEGRAM_BOT_TOKEN?.length ?? 0} | ` +
      `chat=${process.env.TELEGRAM_CHAT_ID} len=${process.env.TELEGRAM_CHAT_ID?.length ?? 0}`
  );
  if (!secreto || headerSecreto !== secreto) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let payload: PayloadSentry;
  try {
    payload = (await request.json()) as PayloadSentry;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  console.log(`[webhook-sentry] acción recibida: ${payload.action ?? "(sin action)"}`);

  if (!esAccionNotificable(payload)) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  const mensaje = formatearMensajeSentry(payload);
  if (!mensaje) {
    return NextResponse.json({ ok: true, ignorado: true });
  }

  try {
    await enviarMensajeTelegram(tokenBot, chatId, mensaje);
  } catch (error) {
    Sentry.captureException(error, { extra: { payload } });
    return NextResponse.json({ error: "No se pudo notificar" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
