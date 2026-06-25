"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

const RUTAS_PUBLICAS = ["/login", "/bloqueado", "/cambiar-contrasena"];

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, datosUsuario, authLoading, rolLoading } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const loading = authLoading || rolLoading;
  const autenticado = !!usuario;
  const esRutaPublica = RUTAS_PUBLICAS.includes(pathname);

  const estabaAutenticado = useRef(false);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autenticado) {
      estabaAutenticado.current = true;
    }
  }, [autenticado]);

  useEffect(() => {
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }

    if (loading) return;

    if (!autenticado && !esRutaPublica) {
      if (estabaAutenticado.current) {
        redirectTimer.current = setTimeout(() => {
          redirectTimer.current = null;
          router.replace("/login");
        }, 1500);
      } else {
        router.replace("/login");
      }
      return;
    }

    if (autenticado && datosUsuario) {
      if (datosUsuario.primerInicio && pathname !== "/cambiar-contrasena") {
        router.replace("/cambiar-contrasena");
        return;
      }

      if (!datosUsuario.primerInicio && pathname === "/cambiar-contrasena") {
        router.replace("/dashboard");
        return;
      }

      if (pathname === "/login") {
        router.replace("/dashboard");
        return;
      }

      if (datosUsuario.bloqueado && pathname !== "/bloqueado") {
        router.replace("/bloqueado");
        return;
      }

      if (!datosUsuario.bloqueado && pathname === "/bloqueado") {
        router.replace("/dashboard");
        return;
      }

      if (
        pathname.startsWith("/dashboard/usuarios") &&
        datosUsuario.rol !== "superadmin"
      ) {
        router.replace("/dashboard");
        return;
      }
    }
  }, [loading, autenticado, esRutaPublica, datosUsuario, pathname, router]);

  if (loading && isClient) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <img
            src="https://ik.imagekit.io/h5w0cdkit/elite_barber_shop/elite_logo.png"
            alt="Elite BarberShop Logo"
            className="w-24 h-24 object-contain opacity-20 animate-pulse"
          />
          <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  if (!autenticado && !esRutaPublica) {
    return null;
  }

  if (autenticado && datosUsuario) {
    if (datosUsuario.primerInicio && pathname !== "/cambiar-contrasena") {
      return null;
    }

    if (datosUsuario.bloqueado && pathname !== "/bloqueado") {
      return null;
    }

    if (
      pathname.startsWith("/dashboard/usuarios") &&
      datosUsuario.rol !== "superadmin"
    ) {
      return null;
    }
  }

  return <>{children}</>;
}
