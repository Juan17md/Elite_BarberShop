"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  BarChart3,
  UserCog,
  Scissors,
  Package,
  History,
  Target,
  FileText,
  Users,
  ShieldCheck,
  User,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { name: "Resumen", path: "/dashboard", icon: LayoutDashboard, roles: ["superadmin", "admin", "barber"] },
  { name: "Servicios", path: "/dashboard/servicios", icon: Scissors, roles: ["superadmin", "admin", "barber"] },
  { name: "Inventario", path: "/dashboard/inventario", icon: Package, roles: ["superadmin", "admin"] },
  { name: "Finanzas", path: "/dashboard/finanzas", icon: Wallet, roles: ["superadmin", "admin", "barber"] },
  { name: "Historial", path: "/dashboard/historial", icon: History, roles: ["superadmin", "admin", "barber"] },
  { name: "Estadísticas", path: "/dashboard/estadisticas", icon: BarChart3, roles: ["superadmin", "admin", "barber"] },
  { name: "Objetivos", path: "/dashboard/objetivos", icon: Target, roles: ["superadmin", "admin", "barber"] },
  { name: "Administración", path: "/dashboard/actas", icon: FileText, roles: ["superadmin", "admin"] },
  { name: "Barberos", path: "/dashboard/personal", icon: UserCog, roles: ["superadmin", "admin"] },
  { name: "Perfil", path: "/dashboard/perfil", icon: Users, roles: ["superadmin", "admin", "barber"] },
  { name: "Usuarios", path: "/dashboard/usuarios", icon: ShieldCheck, roles: ["superadmin"] },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { datosUsuario } = useAuth();
  const rol = datosUsuario?.rol || "barber";
  const [sheetOpen, setSheetOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const openSheet = () => {
    setClosing(false);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setClosing(true);
    setTimeout(() => {
      setSheetOpen(false);
      setClosing(false);
    }, 300);
  };

  const toggleSheet = () => {
    if (sheetOpen) {
      closeSheet();
    } else {
      openSheet();
    }
  };

  const principales: NavItem[] = [
    { name: "Resumen", path: "/dashboard", icon: LayoutDashboard, roles: ["superadmin", "admin", "barber"] },
    { name: "Finanzas", path: "/dashboard/finanzas", icon: Wallet, roles: ["superadmin", "admin", "barber"] },
    { name: "Estadísticas", path: "/dashboard/estadisticas", icon: BarChart3, roles: ["superadmin", "admin", "barber"] },
    { name: "Barberos", path: "/dashboard/personal", icon: UserCog, roles: ["superadmin", "admin"] },
  ];

  const barberosVisible = principales[3].roles.includes(rol);

  const restantes = navItems.filter(
    (item) =>
      item.roles.includes(rol) &&
      !["Resumen", "Finanzas", "Estadísticas", "Barberos"].includes(item.name)
  );

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none">
        <div className="mx-auto max-w-md pointer-events-auto">
          <div className="grid grid-cols-5 items-center bg-surface/95 backdrop-blur-xl border border-white/5 rounded-2xl px-1 py-1 mx-3 mb-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] safe-area-inset-bottom">
          <NavBtn
            href="/dashboard"
            icon={LayoutDashboard}
            label="Resumen"
            active={pathname === "/dashboard"}
          />
          <NavBtn
            href="/dashboard/finanzas"
            icon={Wallet}
            label="Finanzas"
            active={pathname === "/dashboard/finanzas"}
          />
          <button
            onClick={toggleSheet}
            className="flex flex-col items-center gap-0.5 relative -mt-3"
          >
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
              sheetOpen
                ? "bg-primary text-white scale-110 shadow-[0_0_25px_rgba(255,0,0,0.3)]"
                : "bg-primary/80 text-white shadow-[0_0_15px_rgba(255,0,0,0.15)]"
            }`}>
              <ChevronDown size={24} className={`transition-transform duration-300 ${sheetOpen ? "rotate-180" : ""}`} />
            </div>
            <span className="text-[8px] font-bold tracking-widest text-text-muted uppercase">Menú</span>
          </button>
          <NavBtn
            href="/dashboard/estadisticas"
            icon={BarChart3}
            label="Estadísticas"
            active={pathname === "/dashboard/estadisticas"}
          />
          <NavBtn
            href={barberosVisible ? "/dashboard/personal" : "/dashboard/perfil"}
            icon={barberosVisible ? UserCog : User}
            label={barberosVisible ? "Barberos" : "Perfil"}
            active={pathname === (barberosVisible ? "/dashboard/personal" : "/dashboard/perfil")}
          />
        </div>
        </div>
      </nav>

      {sheetOpen && (
        <MobileNavSheet items={restantes} onClose={closeSheet} closing={closing} />
      )}
    </>
  );
}

function NavBtn({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 py-1 min-w-0"
    >
      <div className={`p-2 rounded-xl transition-all duration-300 ${
        active
          ? "bg-primary/15 text-primary"
          : "text-text-muted"
      }`}>
        <Icon size={20} />
      </div>
      <span className={`text-[8px] font-bold tracking-widest uppercase transition-colors duration-300 ${
        active ? "text-primary" : "text-text-muted"
      }`}>
        {label}
      </span>
    </Link>
  );
}

function MobileNavSheet({
  items,
  onClose,
  closing,
}: {
  items: NavItem[];
  onClose: () => void;
  closing: boolean;
}) {
  const pathname = usePathname();

  useLockBodyScroll(true);

  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-xl border-t border-white/5 rounded-t-2xl max-h-[70vh] overflow-y-auto scrollbar-personalizada ${
        closing ? "animate-slide-down" : "animate-slide-up"
      }`}>
        <div className="flex items-center justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/10" />
        </div>
        <div className="px-4 pb-6 pt-2 grid grid-cols-3 gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-text-muted hover:text-text-primary hover:bg-white/5"
                }`}
              >
                <Icon size={22} />
                <span className={`text-[9px] font-bold tracking-widest uppercase text-center leading-tight ${
                  isActive ? "text-primary" : ""
                }`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
