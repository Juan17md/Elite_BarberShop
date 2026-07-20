"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { onAuthStateChanged, onIdTokenChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import * as Sentry from "@sentry/nextjs";
import { auth, db } from "@/lib/firebase";
import type { RolUsuario } from "@/lib/types";

interface DatosUsuario {
  uid: string;
  email: string;
  nombre: string;
  telefono: string;
  rol: RolUsuario;
  bloqueado: boolean;
  primerInicio: boolean;
}

interface AuthContextType {
  usuario: User | null;
  datosUsuario: DatosUsuario | null;
  authLoading: boolean;
  rolLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  datosUsuario: null,
  authLoading: true,
  rolLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [datosUsuario, setDatosUsuario] = useState<DatosUsuario | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [rolLoading, setRolLoading] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firestoreResolved = useRef(false);

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUsuario(firebaseUser);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      firestoreResolved.current = false;

      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (!firebaseUser) {
        setDatosUsuario(null);
        setAuthLoading(false);
        setRolLoading(false);
        Sentry.setUser(null);
        return;
      }

      setAuthLoading(false);
      setRolLoading(true);

      const datosPorDefecto: DatosUsuario = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        nombre: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuario",
        telefono: "",
        rol: "barber",
        bloqueado: false,
        primerInicio: false,
      };

      timeoutRef.current = setTimeout(() => {
        if (firestoreResolved.current) return;
        console.warn("Firestore lento, usando datos por defecto temporalmente");
        setDatosUsuario(datosPorDefecto);
        setRolLoading(false);
        Sentry.setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || undefined,
          username: datosPorDefecto.nombre,
          role: datosPorDefecto.rol,
        });
      }, 3000);

      unsubFirestore = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snap) => {
          firestoreResolved.current = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          let datosResueltos: DatosUsuario;
          if (snap.exists()) {
            const data = snap.data();
            datosResueltos = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              nombre: data.name || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuario",
              telefono: data.phone || "",
              rol: data.role || "barber",
              bloqueado: data.bloqueado ?? false,
              primerInicio: data.primerInicio ?? false,
            };
          } else {
            datosResueltos = datosPorDefecto;
          }

          setDatosUsuario(datosResueltos);
          setRolLoading(false);

          Sentry.setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            username: datosResueltos.nombre,
            role: datosResueltos.rol,
          });
        },
        (error) => {
          firestoreResolved.current = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          console.error("Error en onSnapshot de usuario:", error);
          Sentry.captureException(error, {
            tags: { module: "AuthContext", action: "onSnapshotUser" },
          });
          setDatosUsuario(datosPorDefecto);
          setRolLoading(false);
          Sentry.setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            username: datosPorDefecto.nombre,
            role: datosPorDefecto.rol,
          });
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const unsubToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        document.cookie = `firebase-token=${token}; path=/; max-age=3600`;
      } else {
        document.cookie = "firebase-token=; path=/; max-age=0";
      }
    });

    return () => unsubToken();
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, datosUsuario, authLoading, rolLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
