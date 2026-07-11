import { NextResponse } from "next/server";

const IMAGEKIT_BASE = "https://upload.imagekit.io/api/v1/files/upload";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "La imagen no debe superar los 5MB" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();

    const nombreUnico = `captura_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const body = new FormData();
    body.append("file", new Blob([new Uint8Array(bytes)], { type: file.type }), nombreUnico);
    body.append("fileName", nombreUnico);
    body.append("folder", "/pagos");
    body.append("useUniqueFileName", "false");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(IMAGEKIT_BASE, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.IMAGEKIT_PRIVATE_KEY}` },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text();
      console.error("ImageKit error:", res.status, errBody);
      return NextResponse.json({ error: `ImageKit: ${res.status}` }, { status: 502 });
    }

    const result = await res.json();
    return NextResponse.json({ url: result.url, fileId: result.fileId });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ error: "La subida a ImageKit excedió el tiempo máximo" }, { status: 504 });
    }
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al subir captura a ImageKit:", mensaje);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
