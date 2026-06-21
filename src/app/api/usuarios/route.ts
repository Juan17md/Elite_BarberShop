import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { toSpanishUserMessage } from "@/lib/error-messages";
import * as admin from "firebase-admin";

async function verificarSuperadmin(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();

    if (userDoc.exists && userDoc.data()?.role === "superadmin") {
      return true;
    }
  } catch (error) {
    console.error("Error verificando superadmin:", error);
  }
  return false;
}

export async function GET(request: Request) {
  try {
    const esSuperadmin = await verificarSuperadmin(request);
    if (!esSuperadmin) {
      return NextResponse.json(
        { error: "No autorizado. Solo el superadministrador puede listar usuarios." },
        { status: 403 }
      );
    }

    const snapshot = await adminDb
      .collection("users")
      .orderBy("name")
      .get();

    const usuarios = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate
        ? doc.data().createdAt.toDate().toISOString()
        : doc.data().creadoEn || null,
    }));

    return NextResponse.json({ usuarios });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return NextResponse.json(
      { error: toSpanishUserMessage(error, "Error al obtener la lista de usuarios") },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const esSuperadmin = await verificarSuperadmin(request);
    if (!esSuperadmin) {
      return NextResponse.json(
        { error: "No autorizado. Solo el superadministrador puede crear usuarios." },
        { status: 403 }
      );
    }

    const { email, password, name, phone, role } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Faltan campos requeridos: email, password y nombre" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const emailNormalizado = email.trim().toLowerCase();
    const telefonoNormalizado = typeof phone === "string" ? phone.trim() : "";

    let rolValido: "superadmin" | "admin" | "barber";
    if (role === "superadmin" || role === "admin" || role === "barber") {
      rolValido = role;
    } else {
      rolValido = "barber";
    }

    const esPrimerInicio = rolValido !== "superadmin";

    const userRecord = await adminAuth.createUser({
      email: emailNormalizado,
      password,
      displayName: name,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      email: emailNormalizado,
      name,
      phone: telefonoNormalizado,
      role: rolValido,
      bloqueado: false,
      primerInicio: esPrimerInicio,
      creadoEn: new Date().toISOString(),
    });

    await adminDb.collection("bank").doc(userRecord.uid).set({
      userId: userRecord.uid,
      userName: name,
      balance: 0,
      totalEarned: 0,
      totalPaid: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      exito: true,
      usuario: {
        uid: userRecord.uid,
        email: userRecord.email,
        nombre: name,
        rol: rolValido,
      },
    });
  } catch (error: unknown) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: toSpanishUserMessage(error, "Error al crear el usuario") },
      { status: 500 }
    );
  }
}
