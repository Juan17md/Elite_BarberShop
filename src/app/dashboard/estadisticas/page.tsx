"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord } from "@/lib/types";

import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TrendingUp, Scissors, DollarSign, Activity, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { getPeriodFromPosition } from "@/lib/utils";


export default function EstadisticasPage() {
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const isAdmin = (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin");
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [barbersList, setBarbersList] = useState<{uid: string, name: string}[]>([]);

  const [position, setPosition] = useState(0);
  const periodo = useMemo(
    () => getPeriodFromPosition(position),
    [position]
  );
  const esPosicionActual = position === 0;


  useEffect(() => {
    const fetchBarbers = async () => {
      try {
        const querySnapshot = await getDocs(query(collection(db, "users"), where("role", "==", "barber")));
        const list = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          name: doc.data().name || "Sin nombre"
        }));
        
        setBarbersList(list);
      } catch (error) {
        console.error("Error al cargar barberos:", error);
      }
    };
    fetchBarbers();
  }, []);

  useEffect(() => {
    if (authLoading || rolLoading) return;

    if (!datosUsuario?.uid) {
      setRecords([]);
      return;
    }

    const consultaFinanzas = isAdmin
      ? query(collection(db, "finances"), orderBy("date", "desc"))
      : query(
          collection(db, "finances"),
          where("barberId", "==", datosUsuario.uid),
          orderBy("date", "desc")
        );

    const unsubscribe = onSnapshot(consultaFinanzas, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as FinancialRecord[];

      setRecords(data);
    });

    return () => unsubscribe();
  }, [isAdmin, authLoading, rolLoading, datosUsuario?.uid]);


  // Registros filtrados por semana seleccionada
  const filteredRecords = useMemo(() => {
    return records.filter((r) => r.date >= periodo.inicio && r.date <= periodo.fin);
  }, [records, periodo]);

  const totalServices = filteredRecords.length;
  const totalRevenue = filteredRecords.reduce((sum, r) => sum + r.totalAmount, 0);
  const ingresosBarbero = filteredRecords.reduce((sum, r) => sum + r.barberShare, 0);
  const ingresosBarberia = filteredRecords.reduce((sum, r) => sum + r.barberiaShare, 0);
  const avgTicket = totalServices > 0 ? totalRevenue / totalServices : 0;

  const servicesByType = filteredRecords.reduce((acc, r) => {
    acc[r.serviceName] = (acc[r.serviceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const revenueByBarber = filteredRecords.reduce((acc, r) => {
    acc[r.barberName] = (acc[r.barberName] || 0) + r.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const topService = Object.entries(servicesByType).sort((a, b) => b[1] - a[1])[0];
  const topBarber = Object.entries(revenueByBarber).sort((a, b) => b[1] - a[1])[0];
  
  // Para mantener compatibilidad con otras partes si se usan
  const dailyStats = filteredRecords.reduce((acc, r) => {
    if (!acc[r.date]) {
      acc[r.date] = { total: 0, barbero: 0, barberia: 0 };
    }
    acc[r.date].total += r.totalAmount;
    acc[r.date].barbero += r.barberShare;
    acc[r.date].barberia += r.barberiaShare;
    return acc;
  }, {} as Record<string, { total: number; barbero: number; barberia: number }>);

  return (
    <div className="space-y-8">
      <div className="card-premium p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-[0.25em] uppercase opacity-70">
                Vista general
              </p>
              <h2 className="font-display text-2xl sm:text-3xl text-white tracking-[0.05em] uppercase">
                Rendimiento{periodo.isSunday ? " del domingo" : " semanal"}
              </h2>
            </div>

            <div className="flex items-center">
              {esPosicionActual ? (
                <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                  {periodo.isSunday ? "Domingo actual" : "Semana actual"}
                </span>
              ) : (
                <button
                  onClick={() => setPosition(0)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white border border-white/10 hover:border-primary/30 hover:bg-primary/10 active:scale-95 transition-all"
                >
                  Ir a actual
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 w-full font-display">
            <button
              onClick={() => setPosition((prev) => prev + 1)}
              className="p-2.5 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all"
              aria-label="Anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-4 py-2.5 bg-void/60 rounded-lg border border-white/5 min-w-0 sm:min-w-[240px]">
              <CalendarDays size={16} className="text-primary shrink-0" />
              <span className="text-white text-xs sm:text-sm tracking-wider whitespace-nowrap">
                {periodo.label}
              </span>
            </div>

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

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <Scissors size={16} className="text-primary md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70">Servicios</span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none">{totalServices}</p>
        </div>

        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
              <DollarSign size={16} className="text-emerald-400 md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70 shrink-0 truncate">
              Barbero
            </span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none truncate">${ingresosBarbero.toFixed(2)}</p>
        </div>

        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shrink-0">
              <DollarSign size={16} className="text-cyan-400 md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70 shrink-0 truncate">
              Barbería
            </span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none truncate">${ingresosBarberia.toFixed(2)}</p>
        </div>

        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shrink-0">
              <TrendingUp size={16} className="text-blue-400 md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70">Promedio</span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none truncate">${avgTicket.toFixed(0)}</p>
        </div>

        <div className="card-premium p-4 md:p-6 min-h-[140px] md:min-h-[170px] flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Activity size={16} className="text-amber-400 md:w-[20px] md:h-[20px]" />
            </div>
            <span className="text-text-muted text-[8px] md:text-[10px] font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase opacity-70 shrink-0 truncate">Serv/Día</span>
          </div>
          <p className="font-display text-3xl md:text-5xl text-white tracking-tight leading-none">
            {Object.keys(dailyStats).length > 0 ? (totalServices / Object.keys(dailyStats).length).toFixed(1) : 0}
          </p>
        </div>
      </div>

      {(topService || (isAdmin && topBarber)) && (
        <div className={`grid grid-cols-1 gap-6 ${isAdmin && topBarber ? "xl:grid-cols-[1.3fr_0.9fr]" : ""}`}>
          {topService && (
            <div className="card-premium p-6 sm:p-8 group overflow-hidden">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-4 opacity-70">
                    Servicio más popular
                  </h3>
                  <p className="font-display text-3xl sm:text-5xl text-white leading-none mb-4 group-hover:text-primary transition-colors uppercase tracking-tight">
                    {topService[0]}
                  </p>
                  <p className="text-primary font-display text-lg sm:text-2xl tracking-widest">
                    {topService[1]} SERVICIOS
                  </p>
                </div>
                <div className="hidden sm:flex w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 items-center justify-center">
                  <Scissors size={24} className="text-primary" />
                </div>
              </div>
            </div>
          )}

          {isAdmin && topBarber && (
            <div className="card-premium p-6 sm:p-8 group">
              <h3 className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-4 opacity-70">
                Mejor barbero
              </h3>
              <p className="font-display text-3xl sm:text-5xl text-white leading-none mb-4 group-hover:text-emerald-400 transition-colors uppercase tracking-tight">
                {topBarber[0]}
              </p>
              <p className="text-emerald-400 font-display text-lg sm:text-2xl tracking-widest">
                ${topBarber[1].toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}



      {Object.keys(servicesByType).length > 0 && (
        <div className="card-premium p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
            <div>
              <h3 className="font-display text-2xl text-text-primary tracking-[0.05em] uppercase">
                Distribución por <span className="text-primary">servicio</span>
              </h3>
              <p className="text-text-muted text-sm">
                Ranking visual de los servicios con mayor participación en la semana seleccionada.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
            {Object.entries(servicesByType)
              .sort((a, b) => b[1] - a[1])
              .map(([service, count], index) => {
                const percentage = totalServices > 0 ? (count / totalServices) * 100 : 0;
                
                return (
                  <div
                    key={service}
                    className="bg-surface-high/40 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/5 group hover:border-primary/40 hover:bg-surface-high/60 transition-all duration-300 relative overflow-hidden"
                  >
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />

                    <div className="relative z-10 flex flex-col gap-4">
                      {/* Cabecera: Ranking + Nombre */}
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-void/60 border border-white/10 flex items-center justify-center shadow-lg group-hover:border-primary/30 transition-colors">
                          <span className="font-hero text-lg sm:text-xl text-primary tracking-tight">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-white font-display text-lg sm:text-xl tracking-wide uppercase leading-tight truncate group-hover:text-primary-light transition-colors">
                            {service}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">
                              Ranking #{index + 1}
                            </span>
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                              {percentage.toFixed(1)}% Participación
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cuerpo: Estadísticas y Barra */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <div className="flex items-baseline gap-1">
                            <span className="font-display text-2xl text-white tracking-widest">
                              {count}
                            </span>
                            <span className="text-[9px] text-text-muted uppercase font-bold tracking-widest">
                              Servicios realizados
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5">
                            <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                            <span className="text-[9px] text-text-secondary uppercase font-bold tracking-tighter">Popular</span>
                          </div>
                        </div>

                        {/* Barra de progreso premium */}
                        <div className="relative h-1.5 bg-void/60 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="absolute inset-y-0 left-0 bg-linear-to-r from-primary-dark via-primary to-zinc-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(82,82,91,0.3)]"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {isAdmin && Object.keys(revenueByBarber).length > 0 && (
        <div className="card-premium p-5 md:p-6">
          <h3 className="font-display text-xl md:text-2xl text-white mb-6 tracking-[0.05em] uppercase">RENDIMIENTO POR <span className="text-primary">STAFF</span></h3>
          
          {/* Escritorio - Tabla */}
          <div className="hidden lg:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-0 hover:bg-transparent text-text-muted">
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold">Barbero</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold">Servicios</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold">Ingresos</TableHead>
                  <TableHead className="uppercase tracking-widest text-[10px] font-bold text-right">% Participación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(revenueByBarber)
                  .sort((a, b) => b[1] - a[1])
                  .map(([barber, revenue]) => {
                    const services = filteredRecords.filter(r => r.barberName === barber).length;
                    const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                    return (
                      <TableRow key={barber} className="hover:bg-surface-high/30 transition-colors">
                        <TableCell className="text-text-primary font-medium tracking-wide py-4">{barber}</TableCell>
                        <TableCell className="text-text-secondary py-4">{services}</TableCell>
                        <TableCell className="text-primary font-display text-xl tracking-wider py-4">
                          ${revenue.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-text-muted text-right py-4 font-medium">{percentage.toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          {/* Móvil - Vista de Tarjetas */}
          <div className="lg:hidden space-y-3">
            {Object.entries(revenueByBarber)
              .sort((a, b) => b[1] - a[1])
              .map(([barber, revenue]) => {
                const services = filteredRecords.filter(r => r.barberName === barber).length;
                const percentage = totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={barber} className="bg-void/40 border border-white/5 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-white font-display text-lg tracking-wide uppercase">{barber}</p>
                      <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                        <span className="text-primary font-display text-sm">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Servicios</p>
                        <p className="text-text-secondary font-display text-lg tracking-widest">{services}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Ingresos</p>
                        <p className="text-emerald-400 font-display text-xl tracking-wider">${revenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
