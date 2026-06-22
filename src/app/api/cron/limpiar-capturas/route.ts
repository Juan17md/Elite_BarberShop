import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import ImageKit from "@imagekit/nodejs";
import * as admin from "firebase-admin";

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

export async function GET(request: NextRequest) {
  try {
    if (process.env.CRON_SECRET) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
    }

    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const snapshot = await adminDb
      .collection("finances")
      .where("capturaFileId", ">", "")
      .where("createdAt", "<", hace30Dias)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ message: "Sin capturas para limpiar" });
    }

    let eliminadas = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const fileId = data.capturaFileId;

      if (!fileId) continue;

      try {
        await imagekit.files.delete(fileId);
      } catch (err) {
        console.error(`Error al eliminar ${fileId} de ImageKit:`, err);
      }

      await adminDb.collection("finances").doc(doc.id).update({
        capturaURL: admin.firestore.FieldValue.delete(),
        capturaFileId: admin.firestore.FieldValue.delete(),
      });

      eliminadas++;
    }

    return NextResponse.json({ message: "OK", eliminadas });
  } catch (error) {
    console.error("Error en limpieza de capturas:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
