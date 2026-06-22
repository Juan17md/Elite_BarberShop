import { NextResponse } from "next/server";
import ImageKit, { toFile } from "@imagekit/nodejs";

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadFile = await toFile(buffer, file.name, { type: file.type });

    const nombreUnico = `captura_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const result = await imagekit.files.upload({
      file: uploadFile,
      fileName: nombreUnico,
      folder: "/pagos",
      useUniqueFileName: false,
    });

    return NextResponse.json({ url: result.url, fileId: result.fileId });
  } catch (error) {
    console.error("Error al subir captura a ImageKit:", error);
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 500 });
  }
}
