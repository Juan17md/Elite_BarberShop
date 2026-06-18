import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

const SEIS_HORAS = 6 * 60 * 60 * 1000;

export async function GET() {
  try {
    const docRef = adminDb.collection("settings").doc("bcv");
    const docSnap = await docRef.get();

    const ahora = Date.now();

    if (docSnap.exists) {
      const data = docSnap.data()!;
      const lastUpdated = data.lastUpdated?.toDate?.()?.getTime() || data.lastUpdated?.getTime();
      if (lastUpdated && ahora - lastUpdated < SEIS_HORAS) {
        return NextResponse.json({ rate: data.rate, cached: true, lastUpdated });
      }
    }

    const res = await fetch("https://ve.dolarapi.com/v1/dolares/oficial");

    if (!res.ok) {
      if (docSnap.exists) {
        const data = docSnap.data()!;
        return NextResponse.json({ rate: data.rate, cached: true });
      }
      return NextResponse.json({ error: "No se pudo obtener la tasa BCV" }, { status: 502 });
    }

    const data = await res.json();
    const rate = data.promedio || data.venta || data.compra;

    if (!rate || typeof rate !== "number") {
      if (docSnap.exists) {
        const old = docSnap.data()!;
        return NextResponse.json({ rate: old.rate, cached: true });
      }
      return NextResponse.json({ error: "Respuesta inválida de la API" }, { status: 502 });
    }

    const now = new Date();
    await docRef.set({
      rate,
      lastUpdated: now,
      source: "api",
    });

    return NextResponse.json({ rate, cached: false, lastUpdated: now.getTime() });
  } catch (error) {
    console.error("Error fetching BCV rate:", error);
    try {
      const docRef = adminDb.collection("settings").doc("bcv");
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data()!;
        return NextResponse.json({ rate: data.rate, cached: true });
      }
    } catch {}
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
