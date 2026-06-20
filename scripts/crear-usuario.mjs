import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import admin from "firebase-admin";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function preguntar(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function pedirDatos() {
  console.log("=== Crear nuevo usuario ===\n");

  const email = await preguntar("Email: ");
  if (!email) {
    console.error("Error: el email es requerido");
    process.exit(1);
  }

  const password = await preguntar("Contraseña (mín. 6 caracteres): ");
  if (!password) {
    console.error("Error: la contraseña es requerida");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("Error: la contraseña debe tener al menos 6 caracteres");
    process.exit(1);
  }

  const name = await preguntar("Nombre completo: ");
  if (!name) {
    console.error("Error: el nombre es requerido");
    process.exit(1);
  }

  const phone = await preguntar("Teléfono (opcional): ");

  const roleInput = await preguntar("Rol (admin/barber) [barber]: ");
  const role = roleInput || "barber";
  if (!["admin", "barber"].includes(role)) {
    console.error('Error: el rol debe ser "admin" o "barber"');
    process.exit(1);
  }

  rl.close();
  return { email, password, name, phone, role };
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
  const { email, password, name, phone, role } = await pedirDatos();
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
