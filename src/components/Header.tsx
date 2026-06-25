"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const SEIS_HORAS = 6 * 60 * 60 * 1000;

const navItems = [
  { name: "Resumen", path: "/dashboard" },
  { name: "Servicios", path: "/dashboard/servicios" },
  { name: "Inventario", path: "/dashboard/inventario" },
  { name: "Finanzas", path: "/dashboard/finanzas" },
  { name: "Historial", path: "/dashboard/historial" },
  { name: "Estadísticas", path: "/dashboard/estadisticas" },
  { name: "Objetivos", path: "/dashboard/objetivos" },
  { name: "Administración", path: "/dashboard/actas" },
  { name: "Personal", path: "/dashboard/perfil" },
];

export default function Header() {
  const pathname = usePathname();
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const isAdmin = (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin");

  const [bcvRate, setBcvRate] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "bcv"), (snap) => {
      if (snap.exists()) {
        setBcvRate(snap.data().rate as number);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchAndSet = async () => {
      try {
        const res = await fetch("/api/bcv-rate");
        const data = await res.json();
        if (mounted && data.rate != null) {
          setBcvRate(Number(data.rate));
        }
      } catch (e) {
        console.error("Error fetching BCV rate:", e);
      }
    };
    fetchAndSet();
    const interval = setInterval(fetchAndSet, SEIS_HORAS);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const getHeaderInfo = () => {
    switch (pathname) {
      case "/dashboard":
        if (isAdmin) {
          return {
            title: <>RESUMEN DE <span className="text-primary">OPERACIONES</span></>,
            desc: `Bienvenido, ${datosUsuario?.nombre || ""}. Aquí está el overview de la barbería.`
          };
        }
        return {
          title: <>HOLA, <span className="text-primary">{datosUsuario?.nombre?.toUpperCase() || ""}</span></>,
          desc: "Este es tu resumen de ganancias y rendimiento."
        };
      case "/dashboard/clientes":
        return {
          title: <>CLIEN<span className="text-primary">TES</span></>,
          desc: "Gestiona los clientes de la barbería"
        };
      case "/dashboard/actas":
        return {
          title: <>GESTIÓN DE <span className="text-primary">ACTAS Y GASTOS</span></>,
          desc: "Lleva el control de actas, vales y gastos"
        };
      case "/dashboard/inventario":
        return {
          title: <>INVENTA<span className="text-primary">RIO</span></>,
          desc: "Control de stock y suministros"
        };
      case "/dashboard/finanzas":
        return {
          title: <>FINAN<span className="text-primary">ZAS</span></>,
          desc: "Centro de control financiero"
        };
      case "/dashboard/historial":
        return {
          title: <>HISTO<span className="text-primary">RIAL</span></>,
          desc: "Consulta el registro de servicios y movimientos"
        };
      case "/dashboard/estadisticas":
        return {
          title: <>ESTADÍS<span className="text-primary">TICAS</span></>,
          desc: isAdmin ? "Overview completo de la barbería" : "Tu rendimiento personal"
        };
      case "/dashboard/perfil":
        return {
          title: <>PER<span className="text-primary">FIL</span></>,
          desc: "Ajustes y configuración personal"
        };
      case "/dashboard/personal":
        if (isAdmin) {
          return {
            title: <>GESTIÓN DE <span className="text-primary">ESPECIALISTAS</span></>,
            desc: "Administra el equipo y comisiones"
          };
        }
        return {
          title: <>MI <span className="text-primary">PERFIL</span></>,
          desc: "Ajustes y configuración"
        };
      case "/dashboard/objetivos":
        return {
          title: <>OBJETI<span className="text-primary">VOS</span></>,
          desc: "Gestiona los objetivos semanales y mensuales"
        };
      case "/dashboard/servicios":
        return {
          title: <>SERVICI<span className="text-primary">OS</span></>,
          desc: "Gestiona los servicios y precios de la barbería"
        };
      default:
        const item = navItems.find(item => item.path === pathname);
        return {
          title: <>{item?.name?.toUpperCase() || "DASHBOARD"}</>,
          desc: ""
        };
    }
  };

  const { title, desc } = getHeaderInfo();

  return (
    <header className="h-28 glass-premium sticky top-0 z-20 flex items-center justify-between px-8 border-b border-white/5">
      <div className="flex items-center gap-8">
        <div className="animate-fade-in-up flex flex-col justify-center">
          <h2 className="text-urban-header text-text-primary tracking-tighter leading-none text-2xl sm:text-3xl lg:text-4xl">
            {title}
          </h2>
          {desc && (
            <p className="text-text-secondary mt-1 text-sm sm:text-base">{desc}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden md:flex flex-col items-end gap-1.5 border border-white/5 rounded-xl px-4 py-2 bg-void/50 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10B981] animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">ONLINE</span>
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_#3B82F6] animate-pulse shrink-0 ml-1" />
            <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">
              BCV {bcvRate != null ? bcvRate.toFixed(2) : <span className="text-text-muted/50 animate-pulse">--</span>}
            </span>
          </div>
          <p className="text-[10px] text-white font-medium tracking-wide">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>
    </header>
  );
}
