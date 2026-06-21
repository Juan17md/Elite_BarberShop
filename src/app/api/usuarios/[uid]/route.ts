import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { toSpanishUserMessage } from "@/lib/error-messages";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const esSuperadmin = await verificarSuperadmin(request);
    if (!esSuperadmin) {
      return NextResponse.json(
        { error: "No autorizado. Solo el superadministrador puede modificar usuarios." },
        { status: 403 }
      );
    }

    const { uid } = await params;
    const body = await request.json();
    const { email, password, name, phone, role, bloqueado } = body;

    if (!uid) {
      return NextResponse.json({ error: "Falta el ID del usuario" }, { status: 400 });
    }

    const firestoreUpdate: Record<string, unknown> = {};
    const authUpdate: Record<string, unknown> = {};

    if (name !== undefined) {
      firestoreUpdate.name = name;
      authUpdate.displayName = name;
    }

    if (phone !== undefined) {
      firestoreUpdate.phone = typeof phone === "string" ? phone.trim() : "";
    }

    if (email !== undefined) {
      const emailNormalizado = String(email).trim().toLowerCase();
      firestoreUpdate.email = emailNormalizado;
      authUpdate.email = emailNormalizado;
    }

    if (role !== undefined) {
      if (role === "superadmin" || role === "admin" || role === "barber") {
        firestoreUpdate.role = role;
      }
    }

    if (password && typeof password === "string" && password.length >= 6) {
      authUpdate.password = password;
    }

    if (bloqueado !== undefined) {
      const bloquear = Boolean(bloqueado);
      firestoreUpdate.bloqueado = bloquear;
    }

    if (Object.keys(authUpdate).length > 0) {
      await adminAuth.updateUser(uid, authUpdate);
    }

    if (bloqueado !== undefined) {
      const bloquear = Boolean(bloqueado);
      await adminAuth.updateUser(uid, { disabled: bloquear });
    }

    if (Object.keys(firestoreUpdate).length > 0) {
      await adminDb.collection("users").doc(uid).update(firestoreUpdate);
    }

    return NextResponse.json({ exito: true });
  } catch (error: unknown) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: toSpanishUserMessage(error, "Error al actualizar el usuario") },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const esSuperadmin = await verificarSuperadmin(request);
    if (!esSuperadmin) {
      return NextResponse.json(
        { error: "No autorizado. Solo el superadministrador puede eliminar usuarios." },
        { status: 403 }
      );
    }

    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: "Falta el ID del usuario" }, { status: 400 });
    }

    await adminAuth.deleteUser(uid);

    await adminDb.collection("users").doc(uid).delete();
    await adminDb.collection("bank").doc(uid).delete();

    return NextResponse.json({ exito: true });
  } catch (error: unknown) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { error: toSpanishUserMessage(error, "Error al eliminar el usuario") },
      { status: 500 }
    );
  }
}
