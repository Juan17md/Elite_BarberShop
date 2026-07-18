import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

const IMAGEKIT_UPLOAD = "https://upload.imagekit.io/api/v1/files/upload";
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 15000;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    try {
      await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
    }

    const fileType = request.headers.get("x-file-type") || "";
    const fileName = request.headers.get("x-file-name") || "captura.jpg";

    if (fileType && !fileType.startsWith("image/")) {
      return NextResponse.json({ error: `Tipo inválido: "${fileType}"` }, { status: 400 });
    }

    const bytes = await request.arrayBuffer();
    const logInfo = { byteLength: bytes.byteLength, fileType, fileName };
    console.log("upload-captura request:", JSON.stringify(logInfo));

    if (bytes.byteLength === 0) {
      return NextResponse.json({ error: "No se envió ningún archivo" }, { status: 400 });
    }

    if (bytes.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: `Archivo excede 5MB (${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB)` }, { status: 400 });
    }

    const nombreUnico = `captura_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const body = new FormData();
    body.append("file", new Blob([new Uint8Array(bytes)], { type: fileType }), nombreUnico);
    body.append("fileName", nombreUnico);
    body.append("folder", "/pagos");
    body.append("useUniqueFileName", "false");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(IMAGEKIT_UPLOAD, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString("base64")}`,
      },
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
