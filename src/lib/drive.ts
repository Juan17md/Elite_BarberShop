import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

function obtenerClienteJwt(): JWT {
  if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Credenciales de Service Account no configuradas (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY)");
  }

  return new JWT({
    email: process.env.FIREBASE_CLIENT_EMAIL,
    key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    scopes: SCOPES,
  });
}

async function obtenerToken(): Promise<string> {
  const cliente = obtenerClienteJwt();
  const { token } = await cliente.getAccessToken();
  if (!token) {
    throw new Error("No se pudo obtener token de acceso para Google Drive");
  }
  return token;
}

function obtenerCarpetaId(): string {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID no configurado");
  }
  return folderId;
}

export interface RespaldoDrive {
  id: string;
  nombre: string;
  creadoEn: string;
  tamanoBytes: number;
}

export async function subirRespaldoDrive(nombreArchivo: string, contenido: string): Promise<RespaldoDrive> {
  const token = await obtenerToken();
  const carpetaId = obtenerCarpetaId();
  const bytes = Buffer.from(contenido, "utf-8");

  // Carga reanudable (resumable upload) para soportar archivos de cualquier tamaño
  const sesionRes = await fetch(`${UPLOAD_BASE}/files?uploadType=resumable`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: nombreArchivo,
      parents: [carpetaId],
      mimeType: "application/json",
      description: "Respaldo automático de Firestore de Elite BarberShop",
    }),
  });

  if (!sesionRes.ok) {
    throw new Error(`Error iniciando sesión de carga: ${sesionRes.status} ${await sesionRes.text()}`);
  }

  const sesionUrl = sesionRes.headers.get("Location");
  if (!sesionUrl) {
    throw new Error("La sesión de carga no devolvió URL de reanudación");
  }

  const uploadRes = await fetch(sesionUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": String(bytes.length),
    },
    body: bytes,
  });

  if (!uploadRes.ok) {
    throw new Error(`Error subiendo archivo a Drive: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  const archivo = await uploadRes.json();
  return {
    id: archivo.id,
    nombre: archivo.name,
    creadoEn: archivo.createdTime,
    tamanoBytes: Number(archivo.size ?? bytes.length),
  };
}

export async function listarRespaldosDrive(): Promise<RespaldoDrive[]> {
  const token = await obtenerToken();
  const carpetaId = obtenerCarpetaId();

  const res = await fetch(
    `${API_BASE}/files?q='${carpetaId}'+in+parents+and+trashed=false&fields=files(id,name,createdTime,size)&orderBy=createdTime%20desc&pageSize=1000`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) {
    throw new Error(`Error listando respaldos en Drive: ${res.status} ${await res.text()}`);
  }

  const datos = await res.json();
  return (datos.files ?? []).map((f: { id: string; name: string; createdTime: string; size?: string }) => ({
    id: f.id,
    nombre: f.name,
    creadoEn: f.createdTime,
    tamanoBytes: Number(f.size ?? 0),
  }));
}

export async function eliminarArchivoDrive(fileId: string): Promise<void> {
  const token = await obtenerToken();
  const res = await fetch(`${API_BASE}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Error eliminando archivo ${fileId} de Drive: ${res.status} ${await res.text()}`);
  }
}

export async function eliminarRespaldosViejos(mantenerUltimos: number): Promise<number> {
  const respaldos = await listarRespaldosDrive();
  const aEliminar = respaldos.slice(mantenerUltimos);

  for (const respaldo of aEliminar) {
    await eliminarArchivoDrive(respaldo.id);
  }

  return aEliminar.length;
}
