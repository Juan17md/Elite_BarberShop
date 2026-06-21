"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  FileText,
  Wallet, 
  LogOut,
  Package,
  Target,
  BarChart3,
  Scissors,
  Users,
  History,
  ShieldCheck,
  UserCog
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

interface SidebarProps {
  collapsed: boolean;
  isOpen: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
}

export default function Sidebar({ collapsed, isOpen, onToggleCollapse, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { usuario, datosUsuario } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      document.cookie = "firebase-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC";
      window.location.href = "/login";
    } catch (error) {
      console.error("Error al cerrar sesión", error);
    }
  };

  const navItems = [
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

  const filteredNavItems = navItems.filter(item => 
    item.roles.includes(datosUsuario?.rol || "barber")
  );

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Bloquear scroll del body cuando el sidebar está abierto en móvil
  useEffect(() => {
    if (isOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        document.body.style.overflow = "";
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]);

  return (
    <aside className={`
      fixed top-0 left-0 h-dvh z-50
      bg-surface/80 backdrop-blur-xl border-r border-border-subtle flex flex-col
      transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.1)
      ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      ${collapsed ? "w-20" : "w-[min(90vw,420px)] lg:w-64"}
    `}>
      {/* Logo */}
      <div className="h-24 flex items-center justify-center border-b border-white/5 w-full">
        <img 
          src="https://ik.imagekit.io/h5w0cdkit/elite_barber_shop/elite_logo.png" 
          alt="Elite BarberShop Logo" 
          className={`transition-all duration-300 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] ${collapsed ? "w-12 h-12" : "h-20 lg:h-18 w-auto max-w-[85%]"}`}
        />
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-4 lg:py-6 grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          
          return (
            <Link 
              key={item.path}
              href={item.path}
              onClick={handleNavClick}
              className={`
                w-full flex items-center gap-3 lg:gap-4 rounded-lg transition-all duration-300 group
                ${collapsed ? "justify-center px-4 py-4" : "px-3 py-2.5 lg:px-4 lg:py-3"}
                ${isActive 
                  ? "glass-premium text-primary border-r-2 border-primary bg-primary/5 shadow-[0_0_15px_rgba(255,0,0,0.1)] lg:shadow-red-glow" 
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }
              `}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={isActive ? 20 : 18} className={isActive ? "text-primary" : "text-text-muted group-hover:text-text-secondary"} />
              {!collapsed && (
                <span className={`font-display text-[15px] font-bold tracking-widest uppercase transition-all duration-300 ${isActive ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                  {item.name}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Area */}
      <div className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-white/5 mt-auto">
        {collapsed ? (
          <div className="flex flex-col gap-4 items-center">
            <div className="w-10 h-10 rounded-full bg-surface-high border border-white/5 flex items-center justify-center text-primary font-display">
              {usuario?.email?.[0].toUpperCase()}
            </div>
            <button 
              onClick={handleLogout}
              className="p-3 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-surface-high border border-white/5 shadow-lg">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-display border border-primary/20 shadow-inner">
                {usuario?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-[13px] font-bold text-white truncate uppercase tracking-wider">{datosUsuario?.nombre || "Usuario"}</p>
                <p className="text-[10px] text-primary font-bold tracking-widest uppercase opacity-80">{datosUsuario?.rol || 'Barber'}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl font-display text-[13px] tracking-widest uppercase text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut size={14} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}