"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord, getPaymentBadge } from "@/lib/types";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DollarSign, Users, Scissors, TrendingUp, Activity, Wallet, Target, BarChart3, ArrowRight, History, ChevronLeft, ChevronRight, RotateCcw, Plus } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { getLocalDateString, getStartOfMonthString, getPeriodFromPosition } from "@/lib/utils";
import RegisterServiceModal from "@/components/RegisterServiceModal";

export default function DashboardPage() {
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const isAdmin = (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin");
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [allRecords, setAllRecords] = useState<FinancialRecord[]>([]);
  const [today, setToday] = useState(getLocalDateString());
  const [loading, setLoading] = useState(true);
  const [errorFirestore, setErrorFirestore] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  const esPosicionActual = position === 0;
  const periodo = useMemo(() => getPeriodFromPosition(position), [position]);

  // Actualizar la fecha actual cada minuto para manejar el cambio de medianoche
  useEffect(() => {
    const timer = setInterval(() => {
      const current = getLocalDateString();
      if (current !== today) {
        setToday(current);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [today]);

  useEffect(() => {
    if (!datosUsuario?.uid) return;
    
    let q;
    if (isAdmin) {
      q = query(collection(db, "finances"), orderBy("date", "desc"));
    } else {
      q = query(collection(db, "finances"), where("barberId", "==", datosUsuario?.uid), orderBy("date", "desc"));
    }
    
    const timer = setTimeout(() => setLoading(false), 10000);

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        clearTimeout(timer);
        setErrorFirestore(null);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FinancialRecord[];
        setRecords(data);
        setLoading(false);
      },
      (error) => {
        clearTimeout(timer);
        console.error("Error cargando registros:", error);
        setErrorFirestore("No se pudieron cargar los datos. Verifica la conexión.");
        setLoading(false);
      }
    );
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [isAdmin, datosUsuario?.uid]);

  // Fetch all records para ranking (solo barberos)
  useEffect(() => {
    if (!datosUsuario?.uid || isAdmin) return;

    const q = query(collection(db, "finances"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as FinancialRecord[];
        setAllRecords(data);
      },
      (error) => {
        console.error("Error cargando ranking:", error);
      }
    );
    return () => unsubscribe();
  }, [isAdmin, datosUsuario?.uid]);

  // Resumen rápido (siempre período actual) — excluye fiados no cobrados
  const startOfMonthStr = getStartOfMonthString();
  const todayRecords = records.filter(r => r.date === today && r.estado !== "pendiente");
  const weekRecords = records.filter(r => r.date >= getPeriodFromPosition(0).inicio && r.estado !== "pendiente");
  const monthRecords = records.filter(r => r.date >= startOfMonthStr && r.estado !== "pendiente");

  // Registros filtrados por la semana seleccionada (navegador)
  const weeklyFilteredRecords = useMemo(() => {
    return records.filter(r => r.date >= periodo.inicio && r.date <= periodo.fin && r.estado !== "pendiente");
  }, [records, periodo]);

  const dailyRevenue = todayRecords.reduce((sum: number, r: FinancialRecord) => sum + r.totalAmount, 0);
  const weeklyRevenue = weekRecords.reduce((sum: number, r: FinancialRecord) => sum + r.totalAmount, 0);
  const monthlyRevenue = monthRecords.reduce((sum: number, r: FinancialRecord) => sum + r.totalAmount, 0);

  const barberDaily = todayRecords.reduce((sum: number, r: FinancialRecord) => sum + r.barberShare, 0);

  const todayServices = todayRecords.length;

  const rankingSource = useMemo(() => {
    if (isAdmin) return weeklyFilteredRecords;
    return allRecords.filter(r => r.date >= periodo.inicio && r.date <= periodo.fin);
  }, [isAdmin, weeklyFilteredRecords, allRecords, periodo]);

  const topBarbers = useMemo(() => {
    const source = rankingSource;
    if (source.length === 0) return [];
    const revenueByBarber = source.reduce((acc: Record<string, number>, r: FinancialRecord) => {
      acc[r.barberName] = (acc[r.barberName] || 0) + (r.barberShare - (r.propina || 0));
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(revenueByBarber).sort((a, b) => b[1] - a[1]);
  }, [rankingSource]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-text-muted text-sm">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (errorFirestore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-2xl">!</span>
          </div>
          <p className="text-red-400 text-sm font-bold uppercase tracking-widest">Error de conexión</p>
          <p className="text-text-muted text-xs">{errorFirestore}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 rounded-md bg-primary/20 border border-primary/30 text-primary text-[10px] font-bold uppercase tracking-widest hover:bg-primary/30 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Navegador de periodo global ──
  const navegadorSemanal = (
    <div className="card-premium p-4 sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setPosition((prev) => prev + 1)}
          className="p-2.5 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all"
          aria-label="Anterior"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex flex-col items-center gap-1.5 min-w-0">
          {esPosicionActual && (
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.15em] shadow-[0_0_12px_rgba(16,185,129,0.15)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {periodo.isSunday ? "Domingo actual" : "Semana actual"}
            </span>
          )}
          <span className="font-display text-sm sm:text-base text-white tracking-widest uppercase text-center">
            {periodo.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!esPosicionActual && (
            <button
              onClick={() => setPosition(0)}
              className="p-2.5 rounded-lg border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all"
              aria-label="Ir a actual"
              title="Ir a actual"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            onClick={() => setPosition((prev) => Math.max(0, prev - 1))}
            disabled={esPosicionActual}
            className="p-2.5 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════
  // ══  VISTA ADMIN  ═════════════════════
  // ══════════════════════════════════════
  if (isAdmin) {
    const stats = [
      { name: "Ingresos del Día", value: `$${dailyRevenue.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
      { name: "Ingresos Semana", value: `$${weeklyRevenue.toFixed(2)}`, icon: TrendingUp, color: "text-emerald-400" },
      { name: "Ingresos Mes", value: `$${monthlyRevenue.toFixed(2)}`, icon: Activity, color: "text-blue-400" },
      { name: "Servicios Hoy", value: todayServices.toString(), icon: Scissors, color: "text-primary-light" },
    ];

    const earningsByBarber = weeklyFilteredRecords.reduce((acc, r) => {
      if (!acc[r.barberName]) acc[r.barberName] = { share: 0, barberiaShare: 0, generated: 0, services: 0, propina: 0 };
      acc[r.barberName].share += r.barberShare;
      acc[r.barberName].barberiaShare += r.barberiaShare;
      acc[r.barberName].generated += r.totalAmount;
      acc[r.barberName].services += 1;
      acc[r.barberName].propina += (r.propina || 0);
      return acc;
    }, {} as Record<string, { share: number; barberiaShare: number; generated: number; services: number; propina: number }>);
    const barberEntries = Object.entries(earningsByBarber);

    return (
      <div className="space-y-8">
        {/* Cabecera con botón de acceso rápido */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl text-white tracking-wider uppercase">Panel de Control</h1>
            <p className="text-text-muted text-[10px] tracking-[0.2em] font-bold mt-1 opacity-70">VISTA ADMINISTRATIVA GLOBAL</p>
          </div>
          <button 
            onClick={() => setIsRegisterModalOpen(true)}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-xs tracking-[0.2em] font-bold uppercase shadow-red-strong hover:-translate-y-0.5 transition-all w-full sm:w-auto justify-center"
          >
            <Plus size={16} /> Registrar Servicio
          </button>
        </div>

        {/* Tarjetas de resumen rápido */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 stagger-children">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="card-premium p-4 sm:p-6 group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-surface-high flex items-center justify-center border border-white/5 group-hover:border-primary/50 transition-colors">
                    <Icon size={20} className={stat.color} />
                  </div>
                </div>
                <div>
                  <p className="text-text-muted text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold mb-1 opacity-70">{stat.name}</p>
                  <h3 className="font-display text-3xl sm:text-5xl text-text-primary tracking-tight leading-none group-hover:scale-110 transition-transform origin-left duration-500">{stat.value}</h3>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navegador semanal global */}
        {navegadorSemanal}

        <div className="grid grid-cols-1 gap-6">
          {/* Distribución de Ganancias */}
          <div className="card-premium p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="font-display text-lg sm:text-2xl text-text-primary flex flex-wrap items-center gap-x-3 gap-y-1 tracking-[0.05em] uppercase">
                <Wallet size={22} className="text-primary" />
                DISTRIBUCIÓN DE GANANCIAS
              </h3>
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
              {barberEntries.map(([name, data]) => (
                <div key={name} className="bg-surface-high/50 p-3 sm:p-5 rounded-xl border border-border-subtle hover:border-primary/30 transition-all duration-300 flex flex-col group w-full">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                      <Scissors size={18} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-lg leading-tight uppercase tracking-wider font-display">{name}</p>
                      <p className="text-text-muted text-[10px] uppercase tracking-wider">{data.services} servicio{data.services !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  
                    <div className="space-y-3 flex-1 mb-5">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Barbero <span className="text-text-muted/50 font-normal">(60%)</span></span>
                      <span className="font-display text-xl text-emerald-400">${data.share.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-amber-500/20 pb-2">
                      <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Propina</span>
                      <span className="font-display text-xl text-amber-400">
                        {data.propina > 0 ? `+$${data.propina.toFixed(2)}` : "$0.00"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Barbería <span className="text-text-muted/50 font-normal">(40%)</span></span>
                      <span className="font-display text-xl text-blue-400">${data.barberiaShare.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto flex justify-between items-center bg-void/40 p-3 rounded-lg border border-white/5 relative overflow-hidden group-hover:border-white/10 transition-colors">
                    <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <span className="text-white text-[10px] uppercase tracking-[0.2em] font-bold relative z-10">Total Generado</span>
                    <span className="font-display text-2xl text-white relative z-10">${data.generated.toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {barberEntries.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-10 text-center bg-surface-high/20 rounded-xl border border-white/5 border-dashed">
                  <Wallet size={32} className="text-text-muted/30 mb-3" />
                  <p className="text-text-muted text-sm uppercase tracking-widest font-bold text-[10px]">No hay ganancias registradas en la semana seleccionada</p>
                </div>
              )}
            </div>
          </div>

          {/* Ranking Barberos */}
          <div className="card-premium p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="font-display text-lg sm:text-2xl text-text-primary flex items-center gap-3 tracking-[0.05em] uppercase">
                <Users size={22} className="text-primary" />
                RANKING <span className="text-primary">BARBEROS</span>
              </h3>
            </div>
            {topBarbers.length > 0 ? (
              <div className="space-y-3">
                {topBarbers.map(([name, amount], index) => (
                  <div key={name} className="flex items-center gap-4 p-3 rounded-lg bg-surface-high/30 border border-white/5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-lg font-bold ${
                      index === 0 ? "bg-amber-500/20 text-amber-400" :
                      index === 1 ? "bg-gray-400/20 text-gray-300" :
                      index === 2 ? "bg-amber-700/20 text-amber-600" :
                      "bg-surface-high text-text-muted"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-lg text-text-primary leading-none tracking-wide">{name.toUpperCase()}</p>
                    </div>
                    <p className="font-display text-xl text-emerald-400 tracking-wider">${amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted">No hay datos disponibles</p>
            )}
          </div>
        </div>

        {/* Servicios de la semana */}
        <div className="card-premium p-6">
          <h3 className="font-display text-2xl text-text-primary mb-6 tracking-[0.05em] uppercase">SERVICIOS DE LA <span className="text-primary">SEMANA</span></h3>
          
          {/* Vista Escritorio (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Barbero</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead align="right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyFilteredRecords.slice(0, 10).map((r) => (
                  <TableRow key={r.id} className="hover:bg-surface-high/30">
                    <TableCell className="py-3 text-text-secondary">{r.date}</TableCell>
                    <TableCell className="py-3 text-text-primary">{r.barberName}</TableCell>
                    <TableCell className="py-3 text-text-secondary">{r.serviceName}</TableCell>
                    <TableCell className="py-3 text-text-secondary">{r.clientName}</TableCell>
                    <TableCell className="py-3">
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${
                        getPaymentBadge(r.paymentMethod).colorClass
                      }`}>
                        {getPaymentBadge(r.paymentMethod).label}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-primary text-right font-display">${r.totalAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {weeklyFilteredRecords.length === 0 && (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={6} className="py-8 text-center text-text-muted">
                      No hay servicios en la semana seleccionada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden divide-y divide-white/5 -mx-6 -mb-6 border-t border-white/5">
            {weeklyFilteredRecords.slice(0, 10).map((r) => (
              <div key={r.id} className="p-5 space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <p className="text-white font-medium tracking-wide">{r.clientName}</p>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold">Barbero: {r.barberName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-primary tracking-widest">${r.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
                  <div className="flex justify-between items-center bg-void/30 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-text-secondary text-[10px] uppercase tracking-widest font-bold leading-relaxed mr-2">{r.serviceName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full border ${
                        getPaymentBadge(r.paymentMethod).colorClass
                      }`}>
                        {getPaymentBadge(r.paymentMethod).label}
                      </span>
                      <span className="text-text-muted text-[10px]">{r.date}</span>
                    </div>
                  </div>
              </div>
            ))}
            {weeklyFilteredRecords.length === 0 && (
              <div className="py-12 text-center text-text-muted uppercase tracking-widest text-[11px] opacity-50">
                No hay servicios esta semana
              </div>
            )}
          </div>
        </div>

        <RegisterServiceModal 
          isOpen={isRegisterModalOpen} 
          onClose={() => setIsRegisterModalOpen(false)} 
        />
      </div>
    );
  }

  // ══════════════════════════════════════
  // ══  VISTA BARBERO  ═══════════════════
  // ══════════════════════════════════════
  const accionesRapidas = [
    {
      label: "Registrar Servicio",
      descripcion: "Agrega un nuevo servicio al registro",
      icon: DollarSign,
      colorIcono: "text-emerald-400",
      bgIcono: "bg-emerald-400/10",
      bordeIcono: "border-emerald-400/20",
      hoverCard: "hover:border-emerald-400/30 hover:bg-emerald-400/5",
      esModal: true,
    },
    {
      label: "Mis Finanzas",
      descripcion: "Control de ingresos y ganancias",
      href: "/dashboard/finanzas",
      icon: Wallet,
      colorIcono: "text-cyan-400",
      bgIcono: "bg-cyan-400/10",
      bordeIcono: "border-cyan-400/20",
      hoverCard: "hover:border-cyan-400/30 hover:bg-cyan-400/5",
    },
    {
      label: "Servicios",
      descripcion: "Catálogo de servicios disponibles",
      href: "/dashboard/servicios",
      icon: Scissors,
      colorIcono: "text-primary",
      bgIcono: "bg-primary/10",
      bordeIcono: "border-primary/20",
      hoverCard: "hover:border-primary/30 hover:bg-primary/5",
    },
    {
      label: "Estadísticas",
      descripcion: "Revisa tu rendimiento y métricas",
      href: "/dashboard/estadisticas",
      icon: BarChart3,
      colorIcono: "text-purple-400",
      bgIcono: "bg-purple-400/10",
      bordeIcono: "border-purple-400/20",
      hoverCard: "hover:border-purple-400/30 hover:bg-purple-400/5",
    },
    {
      label: "Mis Objetivos",
      descripcion: "Sigue el avance de tus metas",
      href: "/dashboard/objetivos",
      icon: Target,
      colorIcono: "text-amber-400",
      bgIcono: "bg-amber-400/10",
      bordeIcono: "border-amber-400/20",
      hoverCard: "hover:border-amber-400/30 hover:bg-amber-400/5",
    },
    {
      label: "Mi Historial",
      descripcion: "Consulta todos tus servicios registrados",
      href: "/dashboard/historial",
      icon: History,
      colorIcono: "text-rose-400",
      bgIcono: "bg-rose-400/10",
      bordeIcono: "border-rose-400/20",
      hoverCard: "hover:border-rose-400/30 hover:bg-rose-400/5",
    },
  ];

  // Datos semanales del barbero
  const weeklyBarberShare = weeklyFilteredRecords.reduce((sum, r) => sum + r.barberShare, 0);
  const weeklyTotalRevenue = weeklyFilteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const weeklyPropina = weeklyFilteredRecords.reduce((sum, r) => sum + (r.propina || 0), 0);

  const stats = [
    { name: "Tus Ingresos Hoy", value: `$${barberDaily.toFixed(2)}`, icon: DollarSign, color: "text-emerald-400" },
    { name: "Tus Ingresos Semana", value: `$${weekRecords.reduce((s, r) => s + r.barberShare, 0).toFixed(2)}`, icon: TrendingUp, color: "text-blue-400" },
    { name: "Tus Ingresos Mes", value: `$${monthRecords.reduce((s, r) => s + r.barberShare, 0).toFixed(2)}`, icon: Activity, color: "text-primary-light" },
    { name: "Servicios Hoy", value: todayServices.toString(), icon: Scissors, color: "text-primary" },
  ];

  return (
    <div className="space-y-8">
      {/* Tarjetas de resumen rápido */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 stagger-children">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="card-premium p-4 sm:p-6 group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-surface-high flex items-center justify-center border border-border-subtle group-hover:border-primary/50 transition-colors">
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
              <div>
                <p className="text-text-muted text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-bold mb-1 opacity-70">{stat.name}</p>
                <h3 className="font-display text-3xl sm:text-5xl text-text-primary tracking-tight leading-none group-hover:scale-110 transition-transform origin-left duration-500">{stat.value}</h3>
              </div>
            </div>
          );
        })}
      </div>

      {/* Acciones Rápidas */}
      <div className="space-y-4">
        <p className="font-display text-[10px] uppercase tracking-[0.3em] text-text-muted font-bold px-1">
          Acciones Rápidas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accionesRapidas.map((accion) => {
            const Icono = accion.icon;
            const contenido = (
              <>
                <div className={`w-12 h-12 rounded-xl ${accion.bgIcono} border ${accion.bordeIcono} flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110`}>
                  <Icono size={22} className={accion.colorIcono} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-sm font-bold text-text-primary uppercase tracking-widest leading-tight">{accion.label}</p>
                  <p className="text-text-muted text-[11px] mt-1 leading-snug">{accion.descripcion}</p>
                </div>
                <ArrowRight size={16} className="text-text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
              </>
            );

            if (accion.esModal) {
              return (
                <button
                  key={accion.label}
                  onClick={() => setIsRegisterModalOpen(true)}
                  className={`group card-premium p-5 flex items-center gap-4 transition-all duration-300 border border-border-subtle ${accion.hoverCard} w-full text-left cursor-pointer`}
                >
                  {contenido}
                </button>
              );
            }

            return (
              <Link
                key={(accion as any).href}
                href={(accion as any).href}
                className={`group card-premium p-5 flex items-center gap-4 transition-all duration-300 border border-border-subtle ${accion.hoverCard}`}
              >
                {contenido}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Navegador semanal global */}
      {navegadorSemanal}

      <div className="grid grid-cols-1 gap-6">
        {/* Distribución de Ganancias */}
        <div className="card-premium p-6">
          <h3 className="font-display text-lg sm:text-2xl text-text-primary mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 tracking-[0.05em] uppercase">
            <Wallet size={22} className="text-primary" />
            DISTRIBUCIÓN DE <span className="text-primary">GANANCIAS</span>
          </h3>
          {weeklyFilteredRecords.length > 0 ? (
            <div className="bg-surface-high/50 p-5 rounded-xl border border-border-subtle hover:border-primary/30 transition-all duration-300 group w-full">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 transition-colors">
                    <Scissors size={18} className="text-primary" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-3xl text-white leading-none">
                      {weeklyFilteredRecords.length}
                    </span>
                    <p className="text-text-secondary text-[11px] sm:text-xs uppercase tracking-[0.16em] font-semibold leading-none">
                      servicio{weeklyFilteredRecords.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between items-center border border-white/5 rounded-lg bg-void/20 px-4 py-4">
                  <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Tu Parte <span className="text-text-muted/50 font-normal">(60% + propina)</span></span>
                  <span className="font-display text-2xl text-emerald-400">${weeklyBarberShare.toFixed(2)}</span>
                </div>

                {weeklyPropina > 0 && (
                  <div className="flex justify-between items-center border border-amber-500/20 rounded-lg bg-amber-500/5 px-4 py-3">
                    <span className="text-text-secondary text-[11px] uppercase tracking-widest font-bold">Propina <span className="text-text-muted/50 font-normal">(100% tuyo)</span></span>
                    <span className="font-display text-xl text-amber-400">+${weeklyPropina.toFixed(2)}</span>
                  </div>
                )}

                <div className="mt-auto flex justify-between items-center bg-void/40 p-4 rounded-lg border border-white/5 relative overflow-hidden group-hover:border-white/10 transition-colors">
                  <div className="absolute inset-0 bg-linear-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="text-white text-[10px] uppercase tracking-[0.2em] font-bold relative z-10">Total Generado</span>
                  <span className="font-display text-3xl text-white relative z-10">${weeklyTotalRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center bg-surface-high/20 rounded-xl border border-white/5 border-dashed">
              <Wallet size={32} className="text-text-muted/30 mb-3" />
              <p className="text-text-muted text-sm uppercase tracking-widest font-bold text-[10px]">No hay ganancias registradas en la semana seleccionada</p>
            </div>
          )}
        </div>

        {/* Ranking Barberos */}
        <div className="card-premium p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="font-display text-lg sm:text-2xl text-text-primary flex items-center gap-3 tracking-[0.05em] uppercase">
              <Users size={22} className="text-primary" />
              RANKING <span className="text-primary">BARBEROS</span>
            </h3>
          </div>
          {topBarbers.length > 0 ? (
            <div className="space-y-3">
              {topBarbers.map(([name, amount], index) => (
                <div key={name} className="flex items-center gap-4 p-3 rounded-lg bg-surface-high/30 border border-white/5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-display text-lg font-bold ${
                    index === 0 ? "bg-amber-500/20 text-amber-400" :
                    index === 1 ? "bg-gray-400/20 text-gray-300" :
                    index === 2 ? "bg-amber-700/20 text-amber-600" :
                    "bg-surface-high text-text-muted"
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-lg text-text-primary leading-none tracking-wide">{name.toUpperCase()}</p>
                  </div>
                  <p className="font-display text-xl text-emerald-400 tracking-wider">${amount.toFixed(2)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-muted">No hay datos disponibles</p>
          )}
        </div>

        {/* Tus Servicios de la Semana */}
        <div className="card-premium p-6">
          <h3 className="font-display text-2xl text-text-primary mb-6 flex items-center gap-3 tracking-[0.05em] uppercase">
            <History size={22} className="text-primary" />
            TUS SERVICIOS DE LA <span className="text-primary">SEMANA</span>
          </h3>

          {/* Vista Escritorio (Tabla) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead align="right">Tu Parte (60%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyFilteredRecords.map((r) => (
                  <TableRow key={r.id} className="hover:bg-surface-high/30">
                    <TableCell className="py-3 text-text-secondary">{r.date}</TableCell>
                    <TableCell className="py-3 text-text-primary">{r.serviceName}</TableCell>
                    <TableCell className="py-3 text-text-secondary">{r.clientName}</TableCell>
                    <TableCell className="py-3">
                      <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full border ${
                        getPaymentBadge(r.paymentMethod).colorClass
                      }`}>
                        {getPaymentBadge(r.paymentMethod).label}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-emerald-400 text-right font-display">${r.barberShare.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                {weeklyFilteredRecords.length === 0 && (
                  <TableRow className="hover:bg-transparent border-0">
                    <TableCell colSpan={5} className="py-8 text-center text-text-muted">
                      No hay servicios en la semana seleccionada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Vista Móvil (Tarjetas) */}
          <div className="md:hidden divide-y divide-white/5 -mx-6 -mb-6 border-t border-white/5">
            {weeklyFilteredRecords.map((r) => (
              <div key={r.id} className="p-5 space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <p className="text-white font-medium tracking-wide">{r.clientName}</p>
                    <p className="text-[10px] uppercase tracking-widest text-text-muted font-bold mt-1">{r.serviceName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl text-emerald-400 tracking-widest">${r.barberShare.toFixed(2)}</p>
                    <p className="text-[9px] uppercase tracking-tighter text-text-muted">(Tu parte 60%)</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-text-muted">
                  <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full border ${getPaymentBadge(r.paymentMethod).colorClass}`}>
                    {getPaymentBadge(r.paymentMethod).label}
                  </span>
                  <span className="italic">{r.date}</span>
                </div>
              </div>
            ))}
            {weeklyFilteredRecords.length === 0 && (
              <div className="py-12 text-center text-text-muted uppercase tracking-widest text-[11px] opacity-50">
                No hay servicios esta semana
              </div>
            )}
          </div>
        </div>
      </div>

      <RegisterServiceModal 
        isOpen={isRegisterModalOpen} 
        onClose={() => setIsRegisterModalOpen(false)} 
      />
    </div>
  );
}
