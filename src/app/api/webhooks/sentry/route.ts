import { NextResponse } from "next/server";
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
  if (!secreto || request.headers.get("x-webhook-secret") !== secreto) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let payload: PayloadSentry;
  try {
    payload = (await request.json()) as PayloadSentry;
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

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
