"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Shield, Users, TrendingUp, DollarSign, Calendar, Award, Wallet, ChevronLeft, ChevronRight, RotateCcw, ArrowDownRight, Pencil } from "lucide-react";
import { getPeriodFromPosition } from "@/lib/utils";
import RegistrarPagoModal from "@/components/RegistrarPagoModal";
import EditarPagoModal from "@/components/EditarPagoModal";
import type { BankTransaction } from "@/lib/types";

interface BarberWithStats {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "barber";
  totalServices: number;
  periodServices: number;
  totalRevenue: number;
  periodRevenue: number;
  balance: number;
  periodEarnings: number;
  periodPropina: number;
}

export default function PersonalPage() {
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const isAdmin = (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin");
  const [barbers, setBarbers] = useState<BarberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarberForPayout, setSelectedBarberForPayout] = useState<BarberWithStats | null>(null);
  const [pagoAEditar, setPagoAEditar] = useState<BankTransaction | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [bankBalances, setBankBalances] = useState<Record<string, { totalEarned: number; balance: number }>>({});
  const [financeStats, setFinanceStats] = useState<Record<string, { totalServices: number; servicesInPeriod: number; totalAmountInPeriod: number; periodEarnings: number; periodPropina: number }>>({});
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [financeLoaded, setFinanceLoaded] = useState(false);

  const [position, setPosition] = useState(0);
  const [paginaHistorial, setPaginaHistorial] = useState(0);
  const ITEMS_POR_PAGINA = 10;
  const esPosicionActual = position === 0;
  const periodo = useMemo(() => getPeriodFromPosition(position), [position]);

  // Resetear paginación al cambiar de periodo
  useEffect(() => { setPaginaHistorial(0); }, [position]);

  // Merge bank + finance stats into barbers
  const barbersWithBank = useMemo(() => {
    return barbers.map((b) => {
      const bank = bankBalances[b.uid];
      const stats = financeStats[b.uid];
      return {
        ...b,
        totalRevenue: bank?.totalEarned ?? b.totalRevenue,
        balance: bank?.balance ?? b.balance,
        totalServices: stats?.totalServices ?? 0,
        periodServices: stats?.servicesInPeriod ?? 0,
        periodRevenue: stats?.totalAmountInPeriod ?? 0,
        periodEarnings: stats?.periodEarnings ?? 0,
        periodPropina: stats?.periodPropina ?? 0,
      };
    });
  }, [barbers, bankBalances, financeStats]);

  // 1. Listener de usuarios
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "users"), orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      const list: BarberWithStats[] = [];
      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const role = data.role || "barber";
        if (role === "superadmin") continue;
        list.push({
          uid: docSnap.id,
          name: data.name || "Sin nombre",
          email: data.email || "",
          role,
          totalServices: 0,
          periodServices: 0,
          totalRevenue: 0,
          periodRevenue: 0,
          balance: 0,
          periodEarnings: 0,
          periodPropina: 0,
        });
      }
      setBarbers(list);
      setUsersLoaded(true);
    },
    (err) => {
      console.error("Error escuchando usuarios:", err);
      setUsersLoaded(true);
    });

    return () => unsub();
  }, [isAdmin]);

  // 2. Listener de balances bancarios — un solo onSnapshot para toda la colección
  useEffect(() => {
    if (!isAdmin) return;

    const unsub = onSnapshot(collection(db, "bank"),
      (snap) => {
        const balances: Record<string, { totalEarned: number; balance: number }> = {};
        snap.forEach((doc) => {
          const data = doc.data();
          balances[doc.id] = {
            totalEarned: data.totalEarned || 0,
            balance: data.balance || 0,
          };
        });
        setBankBalances(balances);
      },
      (error) => {
        console.error("Error cargando bancos:", error);
      }
    );

    return () => unsub();
  }, [isAdmin]);

  // 3. Estadísticas desde finances
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, "finances"), orderBy("date", "desc"));

    const unsub = onSnapshot(q,
      (snap) => {
        const statsByBarber: Record<string, { totalServices: number; servicesInPeriod: number; totalAmountInPeriod: number; periodEarnings: number; periodPropina: number }> = {};
        snap.forEach((doc) => {
          const data = doc.data();
          if (data.estado === "pendiente") return;
          const barberId = data.barberId;
          const date = data.date;
          const isWithinPeriod = date >= periodo.inicio && date <= periodo.fin;

          if (!statsByBarber[barberId]) {
            statsByBarber[barberId] = { totalServices: 0, servicesInPeriod: 0, totalAmountInPeriod: 0, periodEarnings: 0, periodPropina: 0 };
          }
          statsByBarber[barberId].totalServices++;
          if (isWithinPeriod) {
            statsByBarber[barberId].servicesInPeriod++;
            statsByBarber[barberId].totalAmountInPeriod += data.totalAmount || 0;
            statsByBarber[barberId].periodEarnings += data.barberShare || 0;
            statsByBarber[barberId].periodPropina += data.propina || 0;
          }
        });

        setFinanceStats(statsByBarber);
        setFinanceLoaded(true);
      },
      (error) => {
        console.error("Error cargando estadísticas de personal:", error);
        setFinanceLoaded(true);
      }
    );

    return () => unsub();
  }, [isAdmin, periodo]);

  // 4. Historial de transacciones
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, "bank_transactions"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q,
      (snap) => {
        const data = snap.docs
          .filter((doc) => doc.data().type === "withdrawal")
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate
              ? doc.data().createdAt.toDate()
              : doc.data().createdAt
              ? new Date(doc.data().createdAt)
              : undefined,
          })) as BankTransaction[];
        setTransactions(data);
      },
      (error) => {
        console.error("Error cargando transacciones:", error);
      }
    );

    return () => unsub();
  }, [isAdmin]);

  const transaccionesDelPeriodo = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;
      return t.date >= periodo.inicio && t.date <= periodo.fin;
    });
  }, [transactions, periodo]);

  const totalPaginas = Math.max(1, Math.ceil(transaccionesDelPeriodo.length / ITEMS_POR_PAGINA));
  const paginaSegura = Math.min(paginaHistorial, totalPaginas - 1);
  const transaccionesPaginadas = useMemo(() => {
    const inicio = paginaSegura * ITEMS_POR_PAGINA;
    return transaccionesDelPeriodo.slice(inicio, inicio + ITEMS_POR_PAGINA);
  }, [transaccionesDelPeriodo, paginaSegura]);

  if (!isAdmin) {
    return (
      <div className="space-y-8">
        <div className="card-premium p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-display text-3xl text-primary">
                {datosUsuario?.nombre?.[0] || "U"}
              </span>
            </div>
            <div>
              <h2 className="font-display text-2xl text-white">{datosUsuario?.nombre}</h2>
              <p className="text-text-secondary">Barbero</p>
            </div>
          </div>
          <p className="text-text-muted">Dirígete a la sección de Perfil para más opciones.</p>
        </div>
      </div>
    );
  }

  const ready = !isAdmin || (usersLoaded && financeLoaded);

  if (!ready && loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse font-display text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Navegador de periodo */}
      <div className="card-premium p-4 md:p-5">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPosition((prev) => prev + 1)}
            className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex flex-col items-center gap-1 min-w-0">
            {esPosicionActual && (
              <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-[0.15em] shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {periodo.isSunday ? "Domingo actual" : "Semana actual"}
              </span>
            )}
            <span className="font-display text-xs md:text-sm text-white tracking-widest uppercase text-center">
              {periodo.label}
            </span>
          </div>

          <button
            onClick={() => setPosition((prev) => Math.max(0, prev - 1))}
            disabled={esPosicionActual}
            className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            aria-label="Siguiente"
          >
            <ChevronRight size={16} />
          </button>

          {!esPosicionActual && (
            <button
              onClick={() => setPosition(0)}
              className="p-2 rounded-lg border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 active:scale-95 transition-all"
              aria-label="Ir a actual"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Cards de barberos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {barbersWithBank.map((barber) => (
          <div key={barber.uid} className="card-premium overflow-hidden group hover:-translate-y-1 transition-all duration-300">
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-display text-2xl md:text-3xl text-primary border border-primary/20 shrink-0">
                  {barber.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg md:text-xl text-white truncate">{barber.name}</h3>
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-md mt-1 ${
                    barber.role === "admin"
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-surface-high text-text-secondary border border-white/5"
                  }`}>
                    {barber.role === "admin" && <Shield size={10} />}
                    {barber.role === "admin" ? "Admin" : "Barbero"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-white/5">
                  <span className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                    <Calendar size={12} className="md:size-[14px]" /> Servicios
                  </span>
                  <span className="font-display text-lg md:text-xl text-white">{barber.periodServices}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-white/5">
                  <span className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={12} className="md:size-[14px]" /> Ingresos
                  </span>
                  <span className="font-display text-lg md:text-xl text-green-400">${(barber.periodEarnings || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-white/5">
                  <span className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                    <Award size={12} className="md:size-[14px] text-amber-400" /> Propina
                  </span>
                  <span className="font-display text-lg md:text-xl text-amber-400">+${(barber.periodPropina || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-white/5">
                  <span className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                    <Wallet size={12} className="md:size-[14px]" /> Saldo Acumulado
                  </span>
                  <span className={`font-display text-lg md:text-xl ${barber.balance > 0 ? "text-cyan-400" : "text-text-secondary"}`}>
                    ${(barber.balance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 md:py-2 bg-primary/5 -mx-4 md:-mx-6 px-4 md:px-6 rounded-b-[inherit] mt-1">
                  <span className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={12} className="md:size-[14px] text-primary" /> Total Generado
                  </span>
                  <span className="font-display text-xl md:text-2xl text-white">
                    ${((barber.periodEarnings || 0) + (barber.periodPropina || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="mt-4 md:mt-5 pt-3 md:pt-4 border-t border-white/5">
                <button
                  onClick={() => setSelectedBarberForPayout(barber)}
                  className="w-full btn-primary text-[10px] md:text-xs py-2 md:py-2.5 flex items-center justify-center gap-2 tracking-wider uppercase font-bold"
                >
                  <Wallet size={12} className="md:size-[14px]" /> Registrar Pago
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {barbersWithBank.length === 0 && (
        <div className="card-premium p-12 text-center">
          <Users size={48} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No hay barberos registrados</p>
          <p className="text-text-muted text-sm mt-2">Crea usuarios desde Usuarios</p>
        </div>
      )}

      {/* Historial de Pagos */}
      <div className="card-premium p-4 md:p-6">
        <h3 className="font-display text-xl md:text-2xl text-white tracking-widest uppercase flex items-center gap-3 mb-4 md:mb-6">
          <ArrowDownRight className="text-primary" size={20} />
          Historial de Pagos
        </h3>

        {/* Tabla de pagos (escritorio) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Barbero</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Monto</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Concepto</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Fecha</th>
                <th className="text-right py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody>
              {transaccionesPaginadas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted text-sm">
                    No hay pagos registrados en este periodo
                  </td>
                </tr>
              )}
              {transaccionesPaginadas.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-white text-sm">{tx.userName}</td>
                  <td className="py-3 px-4 text-red-400 font-display">-${tx.amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-text-secondary text-sm">{tx.description}</td>
                  <td className="py-3 px-4 text-text-muted text-sm">{tx.date}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setPagoAEditar(tx)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                      title="Editar pago"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards de pagos (móvil) */}
        <div className="md:hidden divide-y divide-white/5">
          {transaccionesPaginadas.length === 0 && (
            <div className="py-8 text-center text-text-muted text-sm">
              No hay pagos registrados en este periodo
            </div>
          )}
          {transaccionesPaginadas.map((tx) => (
            <div key={tx.id} className="py-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-medium">{tx.userName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-red-400 font-display">-${tx.amount.toFixed(2)}</span>
                  <button
                    onClick={() => setPagoAEditar(tx)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                    title="Editar pago"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              </div>
              <p className="text-text-secondary text-[11px]">{tx.description}</p>
              <p className="text-text-muted text-[10px]">{tx.date}</p>
            </div>
          ))}
        </div>

        {/* Paginación */}
        {transaccionesDelPeriodo.length > ITEMS_POR_PAGINA && (
          <div className="flex items-center justify-center gap-3 mt-4 md:mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => setPaginaHistorial((p) => Math.max(0, p - 1))}
              disabled={paginaSegura === 0}
              className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-text-muted text-xs tracking-wider">
              {paginaSegura + 1} / {totalPaginas}
            </span>
            <button
              onClick={() => setPaginaHistorial((p) => Math.min(totalPaginas - 1, p + 1))}
              disabled={paginaSegura >= totalPaginas - 1}
              className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              aria-label="Siguiente"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {selectedBarberForPayout && (
        <RegistrarPagoModal
          isOpen={!!selectedBarberForPayout}
          onClose={() => setSelectedBarberForPayout(null)}
          barberId={selectedBarberForPayout.uid}
          barberName={selectedBarberForPayout.name}
          periodEarnings={selectedBarberForPayout.periodEarnings || 0}
          currentPeriodLabel={periodo.isSunday ? "Ganado este Domingo" : "Ganado esta Semana"}
        />
      )}

      <EditarPagoModal
        isOpen={!!pagoAEditar}
        onClose={() => setPagoAEditar(null)}
        transaccion={pagoAEditar}
      />
    </div>
  );
}
