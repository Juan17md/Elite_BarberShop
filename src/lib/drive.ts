import { OAuth2Client } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const API_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const NOMBRE_CARPETA_RESPALDOS = "Elite-BarberShop-Backups";

// Memoización por ejecución: evita carpetas duplicadas por eventual consistency
// de la API de Drive al indexar archivos recién creados.
let carpetaRespaldoMemoizada: string | null = null;

function obtenerOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Credenciales OAuth de Drive no configuradas (GOOGLE_DRIVE_CLIENT_ID / GOOGLE_DRIVE_CLIENT_SECRET / GOOGLE_DRIVE_REFRESH_TOKEN)");
  }

  const cliente = new OAuth2Client({ clientId, clientSecret });
  cliente.setCredentials({ refresh_token: refreshToken });
  return cliente;
}

async function obtenerToken(): Promise<string> {
  const cliente = obtenerOAuthClient();
  const { token } = await cliente.getAccessToken();
  if (!token) {
    throw new Error("No se pudo obtener token de acceso para Google Drive");
  }
  return token;
}

async function obtenerOCrearCarpetaRespaldo(): Promise<string> {
  if (carpetaRespaldoMemoizada) return carpetaRespaldoMemoizada;

  const carpetaConfigurada = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (carpetaConfigurada) {
    carpetaRespaldoMemoizada = carpetaConfigurada;
    return carpetaConfigurada;
  }

  const token = await obtenerToken();
  const consulta = encodeURIComponent(`name='${NOMBRE_CARPETA_RESPALDOS}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);

  const resBusqueda = await fetch(
    `${API_BASE}/files?q=${consulta}&fields=files(id,name)&spaces=drive&pageSize=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!resBusqueda.ok) {
    throw new Error(`Error buscando carpeta de respaldos: ${resBusqueda.status} ${await resBusqueda.text()}`);
  }

  const datosBusqueda = await resBusqueda.json();
  const carpetaExistente = datosBusqueda.files?.[0];
  if (carpetaExistente) {
    carpetaRespaldoMemoizada = carpetaExistente.id;
    return carpetaExistente.id;
  }

  const resCrear = await fetch(`${API_BASE}/files?supportsAllDrives=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: NOMBRE_CARPETA_RESPALDOS,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!resCrear.ok) {
    throw new Error(`Error creando carpeta de respaldos: ${resCrear.status} ${await resCrear.text()}`);
  }

  const carpetaCreada = await resCrear.json();
  carpetaRespaldoMemoizada = carpetaCreada.id;
  return carpetaCreada.id;
}

export interface RespaldoDrive {
  id: string;
  nombre: string;
  creadoEn: string;
  tamanoBytes: number;
}

export async function subirRespaldoDrive(nombreArchivo: string, contenido: string): Promise<RespaldoDrive> {
  const token = await obtenerToken();
  const carpetaId = await obtenerOCrearCarpetaRespaldo();
  const bytes = Buffer.from(contenido, "utf-8");

  // Carga reanudable (resumable upload) para soportar archivos de cualquier tamaño
  const sesionRes = await fetch(`${UPLOAD_BASE}/files?uploadType=resumable&supportsAllDrives=true`, {
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
  const carpetaId = await obtenerOCrearCarpetaRespaldo();

  const res = await fetch(
    `${API_BASE}/files?q='${carpetaId}'+in+parents+and+trashed=false&fields=files(id,name,createdTime,size)&orderBy=createdTime%20desc&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true`,
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
  const res = await fetch(`${API_BASE}/files/${fileId}?supportsAllDrives=true`, {
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
