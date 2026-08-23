export interface PayloadSentry {
  action?: string
  data?: {
    issue?: {
      id?: string
      title?: string
      level?: string
      web_url?: string
      project?: { name?: string; slug?: string }
    }
  }
}

const NOMBRE_PROYECTO = "Elite BarberShop"

export const ACCIONES_NOTIFICABLES = ["created", "unresolved"] as const

const NOMBRES_NIVEL: Record<string, string> = {
  fatal: "Fatal",
  error: "Error",
  warning: "Advertencia",
  info: "Info",
  debug: "Debug",
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function esAccionNotificable(payload: PayloadSentry): boolean {
  return (
    typeof payload.action === "string" &&
    (ACCIONES_NOTIFICABLES as readonly string[]).includes(payload.action)
  )
}

export function formatearMensajeSentry(payload: PayloadSentry): string | null {
  const issue = payload.data?.issue
  if (!issue?.title) return null

  const nivel = NOMBRES_NIVEL[issue.level ?? ""] ?? "Error"
  const emojiNivel =
    issue.level === "warning" || issue.level === "info" || issue.level === "debug"
      ? "🟠"
      : "🔴"
  const emojiAccion = payload.action === "unresolved" ? "🔁" : "🆕"
  const tituloAccion =
    payload.action === "unresolved" ? "Regresión detectada" : "Nuevo error"
  const proyecto = escaparHtml(issue.project?.name ?? "Sin proyecto")
  const titulo = escaparHtml(issue.title)
  const url = issue.web_url ? `<a href="${issue.web_url}">Ver issue en Sentry</a>` : ""

  return (
    `${emojiAccion} <b>[${escaparHtml(NOMBRE_PROYECTO)}] ${tituloAccion}</b>\n` +
    `${emojiNivel} <b>Nivel:</b> ${nivel}\n` +
    `<b>Proyecto:</b> ${proyecto}\n` +
    `<b>Título:</b> ${titulo}\n` +
    (url ? url + "\n" : "")
  )
}

export async function enviarMensajeTelegram(
  botToken: string,
  chatId: string,
  mensaje: string,
): Promise<boolean> {
  const respuesta = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: mensaje,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  })

  if (!respuesta.ok) {
    const cuerpo = await respuesta.text().catch(() => "")
    throw new Error(`Telegram respondió ${respuesta.status}: ${cuerpo}`)
  }

  return true
}
