import { OAuth2Client } from "google-auth-library";
import { createServer } from "http";
import { open } from "node:fs/promises";
import { spawn } from "child_process";

const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const PUERTO = 4512;
const REDIRECT_URI = `http://localhost:${PUERTO}`;

const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("ERROR: Configura GOOGLE_DRIVE_CLIENT_ID y GOOGLE_DRIVE_CLIENT_SECRET antes de ejecutar este script.");
  process.exit(1);
}

const oauth = new OAuth2Client({ clientId, clientSecret, redirectUri: REDIRECT_URI });

const authUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: SCOPES,
});

console.log("\n=== AUTORIZACIÓN GOOGLE DRIVE — ELITE BARBERSHOP ===\n");
console.log("1. Se abrirá tu navegador (o copia esta URL manualmente):\n");
console.log(authUrl);
console.log("\n2. Inicia sesión con TU cuenta de Google y acepta los permisos.");
console.log("3. El script capturará el código automáticamente y mostrará el refresh token.\n");

try {
  const plataforma = process.platform;
  if (plataforma === "darwin") {
    spawn("open", [authUrl]);
  } else if (plataforma === "win32") {
    spawn("cmd", ["/c", "start", "", authUrl]);
  } else {
    spawn("xdg-open", [authUrl]);
  }
} catch {
  console.log("No se pudo abrir el navegador automáticamente, copia la URL manualmente.");
}

const servidor = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", REDIRECT_URI);
    const codigo = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<h3>Autorización cancelada: ${error}</h3>`);
      console.error(`\nERROR de autorización: ${error}`);
      servidor.close();
      process.exit(1);
      return;
    }

    if (!codigo) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h3>Código no recibido</h3>");
      return;
    }

    const { tokens } = await oauth.getToken(codigo);
    oauth.setCredentials(tokens);

    if (!tokens.refresh_token) {
      res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h3>No se obtuvo refresh_token. Cierra sesión de Google y vuelve a intentar.</h3>");
      console.error("\nERROR: No se obtuvo refresh_token (revoca el acceso previo de la app en tu cuenta de Google y reintenta).");
      servidor.close();
      process.exit(1);
      return;
    }

    const archivo = await open("refresh_token_google_drive.txt", "w");
    await archivo.write(tokens.refresh_token + "\n");
    await archivo.close();

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h3>¡Autorización exitosa! Ya puedes cerrar esta pestaña.</h3>");

    console.log("\n=== AUTORIZACIÓN EXITOSA ===\n");
    console.log("Refresh token guardado en: refresh_token_google_drive.txt\n");
    console.log("Añade esta línea a tu .env (y a Vercel):");
    console.log(`GOOGLE_DRIVE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

    servidor.close();
    process.exit(0);
  } catch (err) {
    console.error("\nERROR procesando la autorización:", err);
    servidor.close();
    process.exit(1);
  }
});

servidor.listen(PUERTO, () => {
  console.log(`Escuchando en ${REDIRECT_URI} para capturar el código de autorización...`);
});
