const fs = require("fs");
const admin = require("firebase-admin");
const readline = require("readline");

// Cargar variables de entorno desde .env.local
if (fs.existsSync(".env.local")) {
  const envFile = fs.readFileSync(".env.local", "utf8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\n/g, "\n");
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1).replace(/\\n/g, "\n");
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY,
};

if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
  console.error("❌ Faltan las credenciales de Firebase Admin (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) en .env.local");
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function deleteCollection(collectionPath, batchSize = 500) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteAllDocsExcept(collectionPath, exceptionIds, batchSize = 500) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy("__name__").limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatchExcept(query, exceptionIds, resolve).catch(reject);
  });
}

async function deleteQueryBatchExcept(query, exceptionIds, resolve) {
  const snapshot = await query.get();

  const docsToDelete = snapshot.docs.filter((doc) => !exceptionIds.includes(doc.id));

  if (docsToDelete.length > 0) {
    const batch = db.batch();
    docsToDelete.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  if (snapshot.size < 500) {
    resolve();
    return;
  }

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextQuery = query.startAfter(lastDoc);

  process.nextTick(() => {
    deleteQueryBatchExcept(nextQuery, exceptionIds, resolve);
  });
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    // 1. Encontrar superadmin
    console.log("\n🔍 Buscando superadmin en Firestore...");
    const snapshot = await db.collection("users").where("role", "==", "superadmin").get();

    if (snapshot.empty) {
      console.error("❌ No se encontró ningún usuario con rol 'superadmin' en la colección 'users'. Abortando.");
      process.exit(1);
    }

    const superadminDoc = snapshot.docs[0];
    const superadminUid = superadminDoc.id;
    const superadminData = superadminDoc.data();

    console.log(`\n✅ Superadmin encontrado:`);
    console.log(`   UID: ${superadminUid}`);
    console.log(`   Email: ${superadminData.email}`);
    console.log(`   Nombre: ${superadminData.name}`);

    if (snapshot.size > 1) {
      console.log(`\n⚠️  Hay ${snapshot.size} superadmins en la base de datos. Solo se conservará el primero.`);
    }

    // 2. Confirmación
    console.log("\n⚠️  ⚠️  ⚠️  ADVERTENCIA ⚠️  ⚠️  ⚠️");
    console.log("Este script ELIMINARÁ:");
    console.log("  • TODOS los documentos en TODAS las colecciones de Firestone (excepto el superadmin en users)");
    console.log("  • TODOS los usuarios de Firebase Authentication (excepto el superadmin)");
    console.log(`\nÚNICO DATO CONSERVADO: users/${superadminUid} (${superadminData.name || superadminData.email})`);

    const answer = await rl.question("\n¿Estás seguro? Escribe 'SI' para confirmar: ");

    if (answer.trim() !== "SI") {
      console.log("Operación cancelada.");
      return;
    }

    // 3. Limpiar Firestore
    console.log("\n🗑️  Limpiando Firestore...");
    const collections = await db.listCollections();

    for (const collection of collections) {
      if (collection.id === "users") {
        console.log(`\n👤 Procesando colección 'users' (conservando superadmin)...`);
        const count = await deleteAllDocsExcept("users", [superadminUid]);
        console.log(`   ✅ Usuarios no-superadmin eliminados.`);
      } else {
        console.log(`\n🗑️  Eliminando colección: ${collection.id}...`);
        await deleteCollection(collection.id);
        console.log(`   ✅ Colección ${collection.id} vaciada.`);
      }
    }

    // 4. Limpiar Firebase Auth
    console.log("\n🔑 Eliminando usuarios de Firebase Authentication...");
    let allUsers = [];
    let nextPageToken;

    do {
      const result = await auth.listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(result.users);
      nextPageToken = result.pageToken;
    } while (nextPageToken);

    const uidsToDelete = allUsers
      .filter((u) => u.uid !== superadminUid)
      .map((u) => u.uid);

    console.log(`   ${allUsers.length} usuarios en Auth, ${uidsToDelete.length} serán eliminados...`);

    for (let i = 0; i < uidsToDelete.length; i += 1000) {
      const batch = uidsToDelete.slice(i, i + 1000);
      const result = await auth.deleteUsers(batch);
      if (result.errors.length > 0) {
        console.error(`   ⚠️  Errores eliminando lote ${i / 1000 + 1}:`);
        result.errors.forEach((err) => {
          console.error(`      • ${err.index} -> ${err.error.message}`);
        });
      } else {
        console.log(`   ✅ Lote ${i / 1000 + 1}/${Math.ceil(uidsToDelete.length / 1000)} eliminado (${batch.length} usuarios)`);
      }
    }

    console.log(`\n🎉 Limpieza completada exitosamente.`);
    console.log(`   Único dato conservado: ${superadminData.name || "Superadmin"} (users/${superadminUid})`);
  } catch (error) {
    console.error("\n❌ Error durante la limpieza:", error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
