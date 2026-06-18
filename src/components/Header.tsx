"use client";

import { usePathname } from "next/navigation";
import { Menu, DollarSign } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface HeaderProps {
  onOpenSidebar: () => void;
}

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

export default function Header({ onOpenSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";

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
            desc: `Bienvenido, ${userRole?.name || ""}. Aquí está el overview de la barbería.`
          };
        }
        return {
          title: <>HOLA, <span className="text-primary">{userRole?.name?.toUpperCase() || ""}</span></>,
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
        <button 
          onClick={onOpenSidebar}
          className="lg:hidden p-3 rounded-xl bg-surface-high text-text-muted hover:text-white transition-all border border-white/5 shadow-md"
        >
          <Menu size={20} />
        </button>

        <div className="hidden md:flex items-center gap-2 border border-blue-500/20 rounded-lg px-3 py-1.5 bg-blue-500/5 min-w-[90px]">
          <DollarSign size={14} className="text-blue-400 shrink-0" />
          <div className="flex items-baseline gap-1">
            <span className="text-[9px] text-text-muted uppercase tracking-widest font-bold">BCV</span>
            <span className="text-sm text-white font-display tracking-wider">
              {bcvRate != null ? bcvRate.toFixed(2) : <span className="text-text-muted/50 animate-pulse">--</span>}
            </span>
          </div>
        </div>

        <div className="hidden lg:flex flex-col items-end">
          <p className="text-[10px] text-text-muted uppercase tracking-[0.2em] font-bold">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long' })}
          </p>
          <p className="text-xs text-white font-medium tracking-wide">
            {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <div className="h-10 w-px bg-white/5 hidden md:block" />

        <div className="hidden md:flex items-center gap-3 border border-white/5 rounded-full pl-3 pr-4 py-1.5 bg-void/50 backdrop-blur-xl">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10B981] animate-pulse" />
          <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">ONLINE</span>
        </div>
      </div>
    </header>
  );
}
