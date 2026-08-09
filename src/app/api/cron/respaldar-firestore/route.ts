import { NextRequest, NextResponse } from "next/server";
import { exportarFirestoreCompleto } from "@/lib/exportFirestore";
import { subirRespaldoDrive, eliminarRespaldosViejos } from "@/lib/drive";

export const maxDuration = 60;

const RETENCION_DIAS = Number(process.env.BACKUP_RETENTION_DAYS ?? 7);
const NOMBRE_PREFIJO = "elite-barbershop-respaldo";

function validarAutorizacion(request: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return false;
  const authHeader = request.headers.get("Authorization");
  return authHeader === `Bearer ${process.env.CRON_SECRET}`;
}

function nombreArchivoRespaldo(): string {
  const ahora = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fecha = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}_${pad(ahora.getHours())}-${pad(ahora.getMinutes())}-${pad(ahora.getSeconds())}`;
  return `${NOMBRE_PREFIJO}-${fecha}.json`;
}

export async function GET(request: NextRequest) {
  try {
    if (!validarAutorizacion(request)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const proyecto = process.env.FIREBASE_PROJECT_ID;
    if (!proyecto) {
      return NextResponse.json({ error: "FIREBASE_PROJECT_ID no configurado" }, { status: 500 });
    }

    const exportacion = await exportarFirestoreCompleto();
    const contenido = JSON.stringify(exportacion, null, 2);

    const nombreArchivo = nombreArchivoRespaldo();
    const respaldo = await subirRespaldoDrive(nombreArchivo, contenido);

    const eliminados = await eliminarRespaldosViejos(RETENCION_DIAS);

    return NextResponse.json({
      message: "Respaldo completado",
      proyecto,
      archivo: respaldo.nombre,
      archivoId: respaldo.id,
      tamanoBytes: respaldo.tamanoBytes,
      colecciones: exportacion.colecciones,
      totalDocumentos: exportacion.totalDocumentos,
      retencion: { mantenerUltimos: RETENCION_DIAS, eliminados },
    });
  } catch (error) {
    console.error("Error en respaldo de Firestore:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}
