"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { onAuthStateChanged, onIdTokenChanged, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
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
  const resolvedRef = useRef(false);

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUsuario(firebaseUser);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      resolvedRef.current = false;

      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }

      if (!firebaseUser) {
        setDatosUsuario(null);
        setAuthLoading(false);
        setRolLoading(false);
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
        if (resolvedRef.current) return;
        resolvedRef.current = true;
        timeoutRef.current = null;
        console.warn("onSnapshot no respondió, usando datos por defecto");
        setDatosUsuario(datosPorDefecto);
        setRolLoading(false);
      }, 5000);

      unsubFirestore = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snap) => {
          if (resolvedRef.current) return;
          resolvedRef.current = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          if (snap.exists()) {
            const data = snap.data();
            setDatosUsuario({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              nombre: data.name || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuario",
              telefono: data.phone || "",
              rol: data.role || "barber",
              bloqueado: data.bloqueado ?? false,
              primerInicio: data.primerInicio ?? false,
            });
          } else {
            setDatosUsuario(datosPorDefecto);
          }
          setRolLoading(false);
        },
        (error) => {
          if (resolvedRef.current) return;
          resolvedRef.current = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          console.error("Error en onSnapshot de usuario:", error);
          setDatosUsuario(datosPorDefecto);
          setRolLoading(false);
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
