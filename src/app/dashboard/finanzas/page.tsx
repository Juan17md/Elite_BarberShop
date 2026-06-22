"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord, SERVICES, type Service, PAYMENT_METHODS } from "@/lib/types";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  DollarSign, 
  Wallet, 
  Plus, 
  Scissors, 
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from "lucide-react";

import { getLocalDateString, getPeriodFromPosition } from "@/lib/utils";
import RegisterServiceModal from "@/components/RegisterServiceModal";
import RegistrarPagoModal from "@/components/RegistrarPagoModal";

interface Transaccion {
  id: string;
  tipo: "acta" | "gasto";
  concepto: string;
  monto: number;
  fechaString: string;
  creadoAt?: any;
}

const normalizarNombreServicio = (nombre: string) => nombre.trim().toLowerCase();

export default function FinanzasPage() {
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const isAdmin = (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin");
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Service[]>(SERVICES);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [position, setPosition] = useState(0);
  const esPosicionActual = position === 0;
  const periodo = useMemo(() => getPeriodFromPosition(position), [position]);


  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado para pago a barbero
  const [selectedBarberForPayout, setSelectedBarberForPayout] = useState<{
    barberId: string;
    barberName: string;
    periodEarnings: number;
  } | null>(null);



  useEffect(() => {
    if (!datosUsuario?.uid) {
      return;
    }

    const consulta = isAdmin
      ? query(collection(db, "finances"), orderBy("date", "desc"))
      : query(
          collection(db, "finances"),
          where("barberId", "==", datosUsuario.uid),
          orderBy("date", "desc")
        );

    const unsubscribe = onSnapshot(consulta, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
      })) as FinancialRecord[];
      setRecords(data);
    });

    return () => unsubscribe();
  }, [isAdmin, datosUsuario?.uid]);

  useEffect(() => {
    const q = query(collection(db, "transacciones"), orderBy("creadoAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Transaccion[];
      setTransacciones(datos);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serviciosPersonalizados = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Service[];

      const serviciosBase = [...SERVICES];
      const nombresBase = new Set(
        serviciosBase.map((servicio) => normalizarNombreServicio(servicio.name))
      );

      const serviciosExtra = serviciosPersonalizados.filter(
        (servicio) => !nombresBase.has(normalizarNombreServicio(servicio.name))
      );

      setServiciosDisponibles([...serviciosBase, ...serviciosExtra]);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    
    const consulta = query(
      collection(db, "users"), 
      where("role", "==", "barber"),
      orderBy("name")
    );
    const unsubscribe = onSnapshot(consulta, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBarbers(data);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => r.date >= periodo.inicio && r.date <= periodo.fin);
  }, [records, periodo]);

  const totalRevenue = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.totalAmount, 0);
  const barberShare = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.barberShare, 0);
  const barberiaShare = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.barberiaShare, 0);

  // Global totals for Balance Neto
  const globalBarberiaShare = records.reduce((sum: number, r: FinancialRecord) => sum + r.barberiaShare, 0);

  const globalIngresos = transacciones
    .filter((t) => t.tipo === "acta")
    .reduce((acc: number, curr: Transaccion) => acc + curr.monto, 0);

  const globalEgresos = transacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((acc: number, curr: Transaccion) => acc + curr.monto, 0);

  // Transacciones filtradas por semana seleccionada
  const filteredTransacciones = useMemo(() => {
    return transacciones.filter(t => {
      let txDate: Date;
      if (t.creadoAt?.toDate) {
        txDate = t.creadoAt.toDate();
      } else if (t.creadoAt instanceof Date) {
        txDate = t.creadoAt;
      } else {
        return false;
      }
      const txDateStr = getLocalDateString(txDate);
      return txDateStr >= periodo.inicio && txDateStr <= periodo.fin;
    });
  }, [transacciones, periodo]);

  const ingresos = filteredTransacciones
    .filter((t) => t.tipo === "acta")
    .reduce((acc: number, curr: Transaccion) => acc + curr.monto, 0);

  const egresos = filteredTransacciones
    .filter((t) => t.tipo === "gasto")
    .reduce((acc: number, curr: Transaccion) => acc + curr.monto, 0);

  // Desglose por barbero para el componente de ingresos de la semana
  const desgloseBarbers = useMemo(() => {
    const desglose = filteredRecords.reduce((acc, r) => {
      if (!acc[r.barberName]) {
        acc[r.barberName] = { barberId: r.barberId, barberShare: 0, barberiaShare: 0, total: 0 };
      }
      acc[r.barberName].barberShare += r.barberShare;
      acc[r.barberName].barberiaShare += r.barberiaShare;
      acc[r.barberName].total += r.totalAmount;
      return acc;
    }, {} as Record<string, { barberId: string; barberShare: number; barberiaShare: number; total: number }>);

    // Asegurar que todos los barberos registrados aparezcan (si es admin)
    if (isAdmin) {
      barbers.forEach((barber: any) => {
        if (!desglose[barber.name]) {
          desglose[barber.name] = { barberId: barber.id, barberShare: 0, barberiaShare: 0, total: 0 };
        }
      });
    }

    return desglose;
  }, [filteredRecords, barbers, isAdmin]);

  const maxBarValue = Math.max(
    ...Object.entries(desgloseBarbers).flatMap(([, b]) => [b.barberShare, b.barberiaShare]),
    1
  );




  return (
    <div className="space-y-6 pb-10">
      {/* Cabecera Desktop */}
      <div className="hidden lg:flex justify-between items-center mb-0">
        <div>
          <h1 className="font-display text-4xl text-white tracking-widest uppercase">Finanzas</h1>
          <p className="text-text-muted text-[10px] tracking-[0.3em] font-bold mt-1 opacity-70">CENTRO DE CONTROL Y RENDIMIENTO</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 px-6 py-3 text-xs tracking-[0.2em] font-bold uppercase shadow-red-strong hover:-translate-y-0.5 transition-all"
        >
          <Plus size={16} /> Registrar Servicio
        </button>
      </div>

      {/* Navegador de periodo */}
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.15em] shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {periodo.isSunday ? "Domingo actual" : "Semana actual"}
              </span>
            )}
            {periodo.isSunday && !esPosicionActual && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-[0.15em]">
                Domingo
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

        {/* Botón registrar servicio (solo móvil) */}
        <button 
          onClick={() => setIsModalOpen(true)}
          className="lg:hidden btn-primary text-xs py-3 w-full flex items-center justify-center gap-2 mt-4"
        >
          <Plus size={16} /> Registrar Servicio
        </button>
      </div>

      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3 md:gap-6 animate-fade-in-up`}>
        {/* Card Servicios Count */}
        <div className="card-premium p-5 md:p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 md:gap-3 mb-3 md:mb-4">
            <div className="w-12 h-12 md:w-12 md:h-12 rounded-xl md:rounded-xl bg-void/50 border border-white/5 flex items-center justify-center text-primary shadow-inner">
              <Scissors size={22} className="md:size-6" />
            </div>
            <p className="text-[10px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] md:tracking-[0.2em]">Servicios</p>
          </div>
          <div className="mt-auto">
            <p className="font-display text-3xl md:text-5xl text-white font-bold tracking-tighter leading-none">{filteredRecords.length}</p>
            <p className="text-[10px] md:text-[9px] text-text-muted uppercase tracking-widest font-bold mt-1 md:mt-2 flex items-center gap-1">
              <TrendingUp size={10} className="md:size-[10px] text-emerald-500" /> Total Realizados
            </p>
          </div>
        </div>

        {/* Card Ingreso Barbero (60%) / Tu Parte */}
        <div className="card-premium p-5 md:p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 md:gap-3 mb-3 md:mb-4">
            <div className="w-12 h-12 md:w-12 md:h-12 rounded-xl md:rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-inner">
              <DollarSign size={22} className="md:size-6" />
            </div>
            <p className="text-[10px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] md:tracking-[0.2em]">{isAdmin ? "Ingreso Barberos" : "Tu Parte"}</p>
          </div>
          <div className="mt-auto">
            <p className="font-display text-2xl md:text-5xl text-white font-bold tracking-tighter leading-none">${barberShare.toFixed(2).split('.')[0]}<span className="text-sm md:text-2xl opacity-50">.{barberShare.toFixed(2).split('.')[1]}</span></p>
            <p className="text-[10px] md:text-[9px] text-text-muted uppercase tracking-widest font-bold mt-1 md:mt-2">60% de Comisiones</p>
          </div>
        </div>

        {/* Card Barbería (40%) — solo admin */}
        {isAdmin && (
        <div className="card-premium p-5 md:p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 md:gap-3 mb-3 md:mb-4">
            <div className="w-12 h-12 md:w-12 md:h-12 rounded-xl md:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
              <Wallet size={22} className="md:size-6" />
            </div>
            <p className="text-[10px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] md:tracking-[0.2em]">Barbería</p>
          </div>
          <div className="mt-auto">
            <p className="font-display text-2xl md:text-5xl text-white font-bold tracking-tighter leading-none">${barberiaShare.toFixed(2).split('.')[0]}<span className="text-sm md:text-2xl opacity-50">.{barberiaShare.toFixed(2).split('.')[1]}</span></p>
            <p className="text-[10px] md:text-[9px] text-text-muted uppercase tracking-widest font-bold mt-1 md:mt-2">40% de Comisiones</p>
          </div>
        </div>
        )}

        {/* Card Total Generado */}
        <div className="card-premium p-5 md:p-6 flex flex-col justify-between border-l-2 md:border-l-4 border-l-primary/40">
          <div className="flex items-center gap-3 md:gap-3 mb-3 md:mb-4">
            <div className="w-12 h-12 md:w-12 md:h-12 rounded-xl md:rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <TrendingUp size={22} className="md:size-6" />
            </div>
            <p className="text-[10px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] md:tracking-[0.2em]">Total Generado</p>
          </div>
          <div className="mt-auto">
            <p className="font-display text-2xl md:text-5xl text-white font-bold tracking-tighter leading-none">${totalRevenue.toFixed(2).split('.')[0]}<span className="text-sm md:text-2xl opacity-50">.{totalRevenue.toFixed(2).split('.')[1]}</span></p>
            <p className="text-[10px] md:text-[9px] text-text-muted uppercase tracking-widest font-bold mt-1 md:mt-2">Ingreso bruto semanal</p>
          </div>
        </div>

        {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 animate-fade-in-up col-span-full">
          <div className="card-premium p-5 md:p-6 border-l-2 md:border-l-4 border-l-emerald-500/80">
            <p className="text-text-secondary font-display text-[10px] md:text-[10px] tracking-widest uppercase mb-2 md:mb-3 font-bold opacity-60">Ingresos (Actas)</p>
            <p className="font-display text-2xl md:text-3xl text-white font-bold tracking-tight leading-none">${ingresos.toFixed(2)}</p>
          </div>
          <div className="card-premium p-5 md:p-6 border-l-2 md:border-l-4 border-l-red-500/80">
            <p className="text-text-secondary font-display text-[10px] md:text-[10px] tracking-widest uppercase mb-2 md:mb-3 font-bold opacity-60">Egresos (Gastos)</p>
            <p className="font-display text-2xl md:text-3xl text-white font-bold tracking-tight leading-none">${egresos.toFixed(2)}</p>
          </div>
          <div className="card-premium p-5 md:p-6 border-l-2 md:border-l-4 border-l-cyan-500/80">
            <p className="text-text-secondary font-display text-[10px] md:text-[10px] tracking-widest uppercase mb-2 md:mb-3 font-bold opacity-60">Balance Semanal</p>
            <p className="font-display text-2xl md:text-3xl text-white font-bold tracking-tight leading-none">
              ${(ingresos + barberiaShare - egresos).toFixed(2).split('.')[0]}<span className="text-sm md:text-xl opacity-50">.{(ingresos + barberiaShare - egresos).toFixed(2).split('.')[1]}</span>
            </p>
          </div>
          <div className="card-premium p-5 md:p-6 border-l-2 md:border-l-4 border-l-primary-light bg-linear-to-br from-primary/10 to-transparent">
            <p className="text-text-secondary font-display text-[10px] md:text-[10px] tracking-widest uppercase mb-2 md:mb-3 font-bold opacity-60">Balance Neto Global</p>
            <p className="font-display text-2xl md:text-3xl text-white font-bold tracking-tight leading-none">
              ${(globalIngresos + globalBarberiaShare - globalEgresos).toFixed(2).split('.')[0]}<span className="text-sm md:text-xl opacity-50">.{(globalIngresos + globalBarberiaShare - globalEgresos).toFixed(2).split('.')[1]}</span>
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Componente: Ingresos de la semana (Barberas Breakdown) */}
      <div className="card-premium p-6 sm:p-8 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-8">
          <div>
            <h3 className="font-display text-2xl text-white tracking-[0.05em] uppercase">
              Ingresos de la <span className="text-primary">semana</span>
            </h3>
            <p className="text-text-muted text-sm">
              {isAdmin ? "Comparativa entre lo generado para cada barbero y lo correspondiente a la barbería." : "Desglose de tus ingresos personales en el periodo."}
            </p>
          </div>
          <span className="text-white font-display text-lg tracking-wider">
            Total ${totalRevenue.toFixed(2)}
          </span>
        </div>

        <div className="space-y-8">
          {Object.entries(desgloseBarbers)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([barberName, stats]) => (
              <div key={barberName} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1 bg-white/5"></div>
                  <span className="text-white/80 font-display text-[13px] uppercase tracking-[0.2em]">{barberName}</span>
                  {isAdmin && (
                    <button
                      onClick={() => setSelectedBarberForPayout({
                        barberId: stats.barberId,
                        barberName,
                        periodEarnings: stats.barberShare
                      })}
                      className="p-1.5 rounded-lg border border-primary/20 text-primary/70 hover:text-primary hover:bg-primary/10 hover:border-primary/40 transition-all"
                      title={`Pagar a ${barberName}`}
                    >
                      <Wallet size={14} />
                    </button>
                  )}
                  <div className="h-px flex-1 bg-white/5"></div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_110px] items-center gap-3">
                    <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-[0.18em]">
                      Personal
                    </span>
                    <div className="h-2.5 bg-void/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <div
                        className="h-full bg-linear-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-1000 shadow-emerald-glow"
                        style={{ width: `${maxBarValue > 0 ? (stats.barberShare / maxBarValue) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-white font-display text-lg text-left md:text-right tracking-wider">
                      ${stats.barberShare.toFixed(2)}
                    </span>
                  </div>

                  {isAdmin && (
                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_110px] items-center gap-3">
                    <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.18em]">
                      Barbería
                    </span>
                    <div className="h-2.5 bg-void/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
                      <div
                        className="h-full bg-linear-to-r from-cyan-700 to-cyan-400 rounded-full transition-all duration-1000 shadow-cyan-glow"
                        style={{ width: `${maxBarValue > 0 ? (stats.barberiaShare / maxBarValue) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-white font-display text-lg text-left md:text-right tracking-wider">
                      ${stats.barberiaShare.toFixed(2)}
                    </span>
                  </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>


      <RegisterServiceModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {selectedBarberForPayout && (
        <RegistrarPagoModal
          isOpen={!!selectedBarberForPayout}
          onClose={() => setSelectedBarberForPayout(null)}
          barberId={selectedBarberForPayout.barberId}
          barberName={selectedBarberForPayout.barberName}
          periodEarnings={selectedBarberForPayout.periodEarnings}
          currentPeriodLabel={`Ganado en: ${periodo.label}`}
        />
      )}


    </div>
  );
}
