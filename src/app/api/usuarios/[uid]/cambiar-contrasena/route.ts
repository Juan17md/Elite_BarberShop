import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { toSpanishUserMessage } from "@/lib/error-messages";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
    }

    const { uid } = await params;

    if (decodedToken.uid !== uid) {
      return NextResponse.json(
        { error: "Solo puedes cambiar tu propia contraseña" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nuevaContrasena } = body;

    if (!nuevaContrasena || typeof nuevaContrasena !== "string" || nuevaContrasena.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    await adminAuth.updateUser(uid, { password: nuevaContrasena });

    await adminDb.collection("users").doc(uid).update({
      primerInicio: false,
    });

    return NextResponse.json({ exito: true });
  } catch (error: unknown) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json(
      { error: toSpanishUserMessage(error, "Error al cambiar la contraseña") },
      { status: 500 }
    );
  }
}
