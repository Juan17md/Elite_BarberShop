import { adminDb } from "@/lib/firebaseAdmin";
import * as admin from "firebase-admin";

const LOTE_TAMANIO = 500;

function serializarValor(valor: unknown, ruta: string): unknown {
  if (valor === null || valor === undefined) return valor;

  if (valor instanceof admin.firestore.Timestamp) {
    return { __tipo: "timestamp", valor: valor.toDate().toISOString() };
  }

  if (valor instanceof admin.firestore.GeoPoint) {
    return { __tipo: "geopoint", latitud: valor.latitude, longitud: valor.longitude };
  }

  if (valor instanceof admin.firestore.DocumentReference) {
    return { __tipo: "referencia", ruta: valor.path };
  }

  if (Buffer.isBuffer(valor)) {
    return { __tipo: "bytes", valor: valor.toString("base64") };
  }

  if (Array.isArray(valor)) {
    return valor.map((v, i) => serializarValor(v, `${ruta}[${i}]`));
  }

  if (typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    const resultado: Record<string, unknown> = {};
    for (const [clave, subValor] of Object.entries(objeto)) {
      if (subValor !== undefined) {
        resultado[clave] = serializarValor(subValor, `${ruta}.${clave}`);
      }
    }
    return resultado;
  }

  return valor;
}

async function exportarColeccion(nombreColeccion: string): Promise<Record<string, unknown>> {
  const documentos: Record<string, unknown> = {};
  let ultimoDoc: admin.firestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query: admin.firestore.Query = adminDb.collection(nombreColeccion).orderBy("__name__").limit(LOTE_TAMANIO);
    if (ultimoDoc) {
      query = query.startAfter(ultimoDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      documentos[doc.id] = serializarValor(doc.data(), `${nombreColeccion}/${doc.id}`);
    }

    ultimoDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < LOTE_TAMANIO) break;
  }

  return documentos;
}

export interface ResultadoExportacion {
  exportadoEn: string;
  colecciones: string[];
  totalDocumentos: number;
  datos: Record<string, Record<string, unknown>>;
}

export async function exportarFirestoreCompleto(): Promise<ResultadoExportacion> {
  const coleccionesSnapshot = await adminDb.listCollections();
  const datos: Record<string, Record<string, unknown>> = {};
  const colecciones: string[] = [];
  let totalDocumentos = 0;

  for (const coleccion of coleccionesSnapshot) {
    const documentos = await exportarColeccion(coleccion.id);
    datos[coleccion.id] = documentos;
    colecciones.push(coleccion.id);
    totalDocumentos += Object.keys(documentos).length;
  }

  return {
    exportadoEn: new Date().toISOString(),
    colecciones,
    totalDocumentos,
    datos,
  };
}
