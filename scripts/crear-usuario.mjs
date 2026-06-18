import admin from "firebase-admin";

const args = process.argv.slice(2);

function usage() {
  console.log(`
Uso: node scripts/crear-usuario.mjs [opciones]

Opciones:
  --email=<email>       Correo del usuario (requerido)
  --password=<pass>     Contraseña (requerido)
  --name=<nombre>       Nombre completo (requerido)
  --phone=<teléfono>    Teléfono (opcional)
  --role=<role>         Rol: admin | barber (default: barber)

Ejemplo:
  node scripts/crear-usuario.mjs --email=admin@elitebarber.com --password=123456 --name="Admin" --role=admin
`);
  process.exit(1);
}

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  usage();
}

function parseArg(flag) {
  const arg = args.find((a) => a.startsWith(flag));
  if (!arg) return null;
  return arg.split("=").slice(1).join("=");
}

const email = parseArg("--email");
const password = parseArg("--password");
const name = parseArg("--name");
const phone = parseArg("--phone") || "";
const role = parseArg("--role") || "barber";

if (!email || !password || !name) {
  console.error("Error: --email, --password y --name son requeridos");
  usage();
}

if (!["admin", "barber"].includes(role)) {
  console.error('Error: --role debe ser "admin" o "barber"');
  process.exit(1);
}

if (password.length < 6) {
  console.error("Error: la contraseña debe tener al menos 6 caracteres");
  process.exit(1);
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Error al inicializar Firebase Admin:", error);
    process.exit(1);
  }
}

const db = admin.firestore();
const auth = admin.auth();

async function createUser() {
  const emailNormalized = email.trim().toLowerCase();

  try {
    const userRecord = await auth.createUser({
      email: emailNormalized,
      password,
      displayName: name,
    });

    await db.collection("users").doc(userRecord.uid).set({
      email: emailNormalized,
      name,
      phone,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("bank").doc(userRecord.uid).set({
      userId: userRecord.uid,
      userName: name,
      balance: 0,
      totalEarned: 0,
      totalPaid: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✓ Usuario creado exitosamente:
  UID:    ${userRecord.uid}
  Email:  ${emailNormalized}
  Nombre: ${name}
  Rol:    ${role}`);
  } catch (error) {
    console.error("Error al crear usuario:", error);
    process.exit(1);
  }
}

createUser();
