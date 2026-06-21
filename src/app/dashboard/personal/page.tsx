"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Shield, Users, TrendingUp, DollarSign, Calendar, Award, Activity, Wallet, ChevronLeft, ChevronRight, RotateCcw, ArrowDownRight } from "lucide-react";
import { getPeriodFromPosition } from "@/lib/utils";
import RegistrarPagoModal from "@/components/RegistrarPagoModal";
import type { BankTransaction } from "@/lib/types";

interface BarberWithStats {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "barber";
  totalServices: number;
  totalRevenue: number;
  balance: number;
  periodEarnings: number;
}

export default function PersonalPage() {
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const isAdmin = (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin");
  const [barbers, setBarbers] = useState<BarberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBarberForPayout, setSelectedBarberForPayout] = useState<BarberWithStats | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);

  const [position, setPosition] = useState(0);
  const esPosicionActual = position === 0;
  const periodo = useMemo(() => getPeriodFromPosition(position), [position]);
  const bankUnsubsRef = useRef<Map<string, () => void>>(new Map());

  const currentPeriod = useMemo(() => {
    const hoy = new Date();
    const fechaCaracas = new Date(hoy.toLocaleString("en-US", { timeZone: "America/Caracas" }));
    const diaSemana = fechaCaracas.getDay();
    const currentPeriodPosition = diaSemana === 0 ? 1 : 0;
    return getPeriodFromPosition(currentPeriodPosition);
  }, []);

  // Listener de usuarios + listeners individuales de banco (tiempo real)
  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const usersQuery = query(collection(db, "users"), orderBy("name"));

    const unsubUsers = onSnapshot(usersQuery, (usersSnapshot) => {
      const barbersData: BarberWithStats[] = [];
      const newBankUnsubs = new Map<string, () => void>();

      for (const docSnap of usersSnapshot.docs) {
        const userData = docSnap.data();
        const role = userData.role || "barber";
        if (role === "superadmin") continue;
        const uid = docSnap.id;

        const entry: BarberWithStats = {
          uid,
          name: userData.name || "Sin nombre",
          email: userData.email || "",
          role,
          totalServices: 0,
          totalRevenue: 0,
          balance: 0,
          periodEarnings: 0,
        };

        barbersData.push(entry);

        // Suscribirse al banco de este barbero si no hay listener activo
        if (!bankUnsubsRef.current.has(uid)) {
          const unsubBank = onSnapshot(doc(db, "bank", uid), (bankSnap) => {
            const bankData = bankSnap.exists() ? bankSnap.data() : null;
            setBarbers((prev) =>
              prev.map((b) =>
                b.uid === uid
                  ? {
                      ...b,
                      totalRevenue: bankData?.totalEarned || 0,
                      balance: bankData?.balance || 0,
                    }
                  : b
              )
            );
          });
          newBankUnsubs.set(uid, unsubBank);
        }
      }

      // Cleanup de listeners de banco para barberos que ya no están
      for (const [uid, unsub] of bankUnsubsRef.current.entries()) {
        const stillExists = barbersData.some((b) => b.uid === uid);
        if (!stillExists) {
          unsub();
          bankUnsubsRef.current.delete(uid);
        }
      }

      // Añadir nuevos listeners
      for (const [uid, unsub] of newBankUnsubs.entries()) {
        bankUnsubsRef.current.set(uid, unsub);
      }

      // Preservar balance y stats previos al refrescar la lista
      setBarbers((prev) => {
        const prevMap = new Map(prev.map((b) => [b.uid, b]));
        return barbersData.map((bd) => ({
          ...bd,
          balance: prevMap.get(bd.uid)?.balance ?? 0,
          totalRevenue: prevMap.get(bd.uid)?.totalRevenue ?? 0,
          totalServices: prevMap.get(bd.uid)?.totalServices ?? 0,
          periodEarnings: prevMap.get(bd.uid)?.periodEarnings ?? 0,
        }));
      });
      setLoading(false);
    },
    (error) => {
      console.error("Error escuchando usuarios:", error);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      // Limpiar todos los listeners de banco
      for (const unsub of bankUnsubsRef.current.values()) {
        unsub();
      }
      bankUnsubsRef.current.clear();
    };
  }, [isAdmin]);

  // Estadísticas desde finances (servicios + ganancia del periodo)
  useEffect(() => {
    if (!isAdmin || barbers.length === 0) return;

    const financesQuery = query(
      collection(db, "finances"),
      where("date", ">=", currentPeriod.inicio),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(financesQuery, (snapshot) => {
      const statsByBarber = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        const barberId = data.barberId;

        if (!acc[barberId]) {
          acc[barberId] = { services: 0, periodEarnings: 0 };
        }

        acc[barberId].services++;
        acc[barberId].periodEarnings += data.barberShare || 0;
        return acc;
      }, {} as Record<string, { services: number; periodEarnings: number }>);

      setBarbers((prev) =>
        prev.map((b) => ({
          ...b,
          totalServices: statsByBarber[b.uid]?.services || 0,
          periodEarnings: statsByBarber[b.uid]?.periodEarnings || 0,
        }))
      );
    });

    return () => unsub();
  }, [isAdmin, barbers.length, currentPeriod]);

  // Transacciones (historial de pagos) - sin where para evitar índice
  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, "bank_transactions"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs
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
    });

    return () => unsub();
  }, [isAdmin]);

  const transaccionesDelPeriodo = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false;
      return t.date >= periodo.inicio && t.date <= periodo.fin;
    });
  }, [transactions, periodo]);

  const totalPagadoPeriodo = useMemo(() => {
    return transaccionesDelPeriodo.reduce((acc, t) => acc + (t.amount || 0), 0);
  }, [transaccionesDelPeriodo]);

  const totalTeamServices = barbers.reduce((acc, b) => acc + b.totalServices, 0);
  const totalBalance = barbers.reduce((acc, b) => acc + b.balance, 0);
  const avgServicesPerBarber = barbers.length > 0 ? Math.round(totalTeamServices / barbers.length) : 0;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse font-display text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats de equipo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="card-premium p-4 md:p-6 flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="text-primary" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-text-muted text-[8px] md:text-xs font-bold uppercase tracking-widest">Total Equipo</p>
            <p className="font-display text-xl md:text-3xl text-white">{barbers.length}</p>
          </div>
        </div>

        <div className="card-premium p-4 md:p-6 flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
            <Activity className="text-green-500" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-text-muted text-[8px] md:text-xs font-bold uppercase tracking-widest">Servicios</p>
            <p className="font-display text-xl md:text-3xl text-white">{totalTeamServices}</p>
          </div>
        </div>

        <div className="card-premium p-4 md:p-6 flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <TrendingUp className="text-blue-500" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-text-muted text-[8px] md:text-xs font-bold uppercase tracking-widest">Promedio x Barbero</p>
            <p className="font-display text-xl md:text-3xl text-white">{avgServicesPerBarber}</p>
          </div>
        </div>

        <div className="card-premium p-4 md:p-6 flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0">
            <DollarSign className="text-cyan-500" size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-text-muted text-[8px] md:text-xs font-bold uppercase tracking-widest">Saldo Pendiente</p>
            <p className="font-display text-xl md:text-3xl text-cyan-400">${totalBalance.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Cards de barberos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {barbers.map((barber) => (
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
                  <span className="font-display text-lg md:text-xl text-white">{barber.totalServices}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-white/5">
                  <span className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                    <DollarSign size={12} className="md:size-[14px]" /> Ingresos
                  </span>
                  <span className="font-display text-lg md:text-xl text-green-400">${(barber.totalRevenue || 0).toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 md:py-2 border-b border-white/5">
                  <span className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                    <Award size={12} className="md:size-[14px]" /> Saldo Acumulado
                  </span>
                  <span className={`font-display text-lg md:text-xl ${barber.balance > 0 ? "text-cyan-400" : "text-text-secondary"}`}>
                    ${(barber.balance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 md:py-2">
                  <span className="text-text-muted text-[10px] md:text-xs uppercase tracking-widest flex items-center gap-2">
                    <Activity size={12} className="md:size-[14px] text-primary" /> {currentPeriod.isSunday ? "Ganado este Domingo" : "Ganado esta Semana"}
                  </span>
                  <span className="font-display text-sm md:text-base text-primary">
                    ${(barber.periodEarnings || 0).toFixed(2)}
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

      {barbers.length === 0 && (
        <div className="card-premium p-12 text-center">
          <Users size={48} className="text-text-muted mx-auto mb-4" />
          <p className="text-text-muted">No hay barberos registrados</p>
          <p className="text-text-muted text-sm mt-2">Crea usuarios desde Usuarios</p>
        </div>
      )}

      {/* Historial de Pagos */}
      <div className="card-premium p-4 md:p-6">
        <div className="flex flex-col gap-4 mb-6">
          <h3 className="font-display text-xl md:text-2xl text-white tracking-widest uppercase flex items-center gap-3">
            <ArrowDownRight className="text-primary" size={20} />
            Historial de Pagos
          </h3>

          {/* Navegador de periodo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPosition((prev) => prev + 1)}
                className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 hover:bg-white/5 active:scale-95 transition-all"
                aria-label="Anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-void/60 rounded-lg border border-white/5">
                <Calendar size={14} className="text-primary shrink-0" />
                <span className="text-white text-[11px] md:text-sm tracking-wider whitespace-nowrap">
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

            <div className="text-right">
              <p className="text-text-muted text-[10px] uppercase tracking-widest font-bold">Total Pagado</p>
              <p className="font-display text-xl md:text-2xl text-red-400">-${totalPagadoPeriodo.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Tabla de pagos (escritorio) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Barbero</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Monto</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Concepto</th>
                <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {transaccionesDelPeriodo.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted text-sm">
                    No hay pagos registrados en este periodo
                  </td>
                </tr>
              )}
              {transaccionesDelPeriodo.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4 text-white text-sm">{tx.userName}</td>
                  <td className="py-3 px-4 text-red-400 font-display">-${tx.amount.toFixed(2)}</td>
                  <td className="py-3 px-4 text-text-secondary text-sm">{tx.description}</td>
                  <td className="py-3 px-4 text-text-muted text-sm">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cards de pagos (móvil) */}
        <div className="md:hidden divide-y divide-white/5">
          {transaccionesDelPeriodo.length === 0 && (
            <div className="py-8 text-center text-text-muted text-sm">
              No hay pagos registrados en este periodo
            </div>
          )}
          {transaccionesDelPeriodo.map((tx) => (
            <div key={tx.id} className="py-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-white text-sm font-medium">{tx.userName}</span>
                <span className="text-red-400 font-display">-${tx.amount.toFixed(2)}</span>
              </div>
              <p className="text-text-secondary text-[11px]">{tx.description}</p>
              <p className="text-text-muted text-[10px]">{tx.date}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedBarberForPayout && (
        <RegistrarPagoModal
          isOpen={!!selectedBarberForPayout}
          onClose={() => setSelectedBarberForPayout(null)}
          barberId={selectedBarberForPayout.uid}
          barberName={selectedBarberForPayout.name}
          periodEarnings={selectedBarberForPayout.periodEarnings || 0}
          currentPeriodLabel={currentPeriod.isSunday ? "Ganado este Domingo" : "Ganado esta Semana"}
        />
      )}
    </div>
  );
}
