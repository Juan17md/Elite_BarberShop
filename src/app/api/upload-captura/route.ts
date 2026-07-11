import { NextResponse } from "next/server";
import ImageKit from "@imagekit/nodejs";

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

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

    const nombreUnico = `captura_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const result = await imagekit.files.upload({
      file,
      fileName: nombreUnico,
      folder: "/pagos",
      useUniqueFileName: false,
    });

    return NextResponse.json({ url: result.url, fileId: result.fileId });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : "Error desconocido";
    console.error("Error al subir captura a ImageKit:", mensaje);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
