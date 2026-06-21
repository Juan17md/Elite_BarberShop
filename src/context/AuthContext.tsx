"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
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

  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUsuario(firebaseUser);

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

      unsubFirestore = onSnapshot(
        doc(db, "users", firebaseUser.uid),
        (snap) => {
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
            setDatosUsuario({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              nombre: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuario",
              telefono: "",
              rol: "barber",
              bloqueado: false,
              primerInicio: false,
            });
          }
          setRolLoading(false);
        },
        (error) => {
          console.error("Error en onSnapshot de usuario:", error);
          setDatosUsuario({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            nombre: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuario",
            telefono: "",
            rol: "barber",
            bloqueado: false,
            primerInicio: false,
          });
          setRolLoading(false);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ usuario, datosUsuario, authLoading, rolLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
