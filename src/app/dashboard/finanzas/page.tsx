"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord, SERVICES, type Service, type PaymentMethod, PAYMENT_METHODS } from "@/lib/types";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  increment,
  addDoc,
  getDocs,
  deleteDoc
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
  RotateCcw,
  HandCoins,
  CheckCircle2,
  Loader2,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { toast } from "sonner";

import { getLocalDateString, getPeriodFromPosition, r2 } from "@/lib/utils";
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
  const [loading, setLoading] = useState(true);
  const [errorFirestore, setErrorFirestore] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const esPosicionActual = position === 0;
  const periodo = useMemo(() => getPeriodFromPosition(position), [position]);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [porCobrarRecords, setPorCobrarRecords] = useState<FinancialRecord[]>([]);
  const [procesandoPago, setProcesandoPago] = useState<string | null>(null);
  const [recordAEliminar, setRecordAEliminar] = useState<FinancialRecord | null>(null);
  const [fiadoACobrar, setFiadoACobrar] = useState<FinancialRecord | null>(null);
  const [cobroPaymentMethod, setCobroPaymentMethod] = useState<PaymentMethod>("bcv");
  const [cobroPropina, setCobroPropina] = useState(false);
  const [cobroMontoPropina, setCobroMontoPropina] = useState("");
  const [cobroReferencia, setCobroReferencia] = useState("");
  const [cobroCapturaFile, setCobroCapturaFile] = useState<File | null>(null);
  const [cobroCapturaPreview, setCobroCapturaPreview] = useState("");
  const [cobroDragOver, setCobroDragOver] = useState(false);
  const [cobroBcvRate, setCobroBcvRate] = useState<number | null>(null);
  
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

    const timer = setTimeout(() => setLoading(false), 10000);

    const unsubscribe = onSnapshot(consulta,
      (snapshot) => {
        clearTimeout(timer);
        setErrorFirestore(null);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        })) as FinancialRecord[];
        setRecords(data);
        setLoading(false);
      },
      (error) => {
        clearTimeout(timer);
        console.error("Error cargando registros financieros:", error);
        setErrorFirestore("No se pudieron cargar los datos financieros.");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [isAdmin, datosUsuario?.uid]);

  useEffect(() => {
    if (!datosUsuario?.uid) return;

    const consulta = isAdmin
      ? query(collection(db, "finances"), where("estado", "==", "pendiente"), orderBy("date", "desc"))
      : query(
          collection(db, "finances"),
          where("barberId", "==", datosUsuario.uid),
          where("estado", "==", "pendiente"),
          orderBy("date", "desc")
        );

    const unsubscribe = onSnapshot(consulta,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        })) as FinancialRecord[];
        setPorCobrarRecords(data);
      },
      (error) => {
        console.error("Error cargando fiados:", error);
      }
    );

    return () => unsubscribe();
  }, [isAdmin, datosUsuario?.uid]);

  useEffect(() => {
    if (!fiadoACobrar) return;

    fetch("/api/bcv-rate").catch(() => {});

    const unsub = onSnapshot(doc(db, "settings", "bcv"),
      (snap) => {
        if (snap.exists() && snap.data().rate) {
          setCobroBcvRate(Number(snap.data().rate));
        }
      },
      (error) => {
        console.error("Error cargando tasa BCV en cobro fiado:", error);
      }
    );
    return () => unsub();
  }, [fiadoACobrar]);

  useEffect(() => {
    if (!cobroCapturaFile) {
      setCobroCapturaPreview("");
      return;
    }
    const url = URL.createObjectURL(cobroCapturaFile);
    setCobroCapturaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cobroCapturaFile]);

  useEffect(() => {
    const q = query(collection(db, "transacciones"), orderBy("creadoAt", "desc"));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const datos = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaccion[];
        setTransacciones(datos);
      },
      (error) => {
        console.error("Error cargando transacciones:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("name"));
    const unsubscribe = onSnapshot(q,
      (snapshot) => {
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
      },
      (error) => {
        console.error("Error cargando servicios:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    
    const consulta = query(
      collection(db, "users"), 
      where("role", "in", ["barber", "admin"]),
      orderBy("name")
    );
    const unsubscribe = onSnapshot(consulta,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBarbers(data);
      },
      (error) => {
        console.error("Error cargando barberos:", error);
      }
    );
    return () => unsubscribe();
  }, [isAdmin]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => r.date >= periodo.inicio && r.date <= periodo.fin && r.estado !== "pendiente");
  }, [records, periodo]);

  const totalRevenue = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.totalAmount, 0);
  const barberShare = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.barberShare, 0);
  const barberiaShare = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + r.barberiaShare, 0);
  const propinaTotal = filteredRecords.reduce((sum: number, r: FinancialRecord) => sum + (r.propina || 0), 0);

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
        acc[r.barberName] = { barberId: r.barberId, barberShare: 0, barberiaShare: 0, total: 0, propina: 0 };
      }
      acc[r.barberName].barberShare += r.barberShare;
      acc[r.barberName].barberiaShare += r.barberiaShare;
      acc[r.barberName].total += r.totalAmount;
      acc[r.barberName].propina += (r.propina || 0);
      return acc;
    }, {} as Record<string, { barberId: string; barberShare: number; barberiaShare: number; total: number; propina: number }>);

    // Asegurar que todos los barberos registrados aparezcan (si es admin)
    if (isAdmin) {
      barbers.forEach((barber: any) => {
        if (!desglose[barber.name]) {
          desglose[barber.name] = { barberId: barber.id, barberShare: 0, barberiaShare: 0, total: 0, propina: 0 };
        }
      });
    }

    return desglose;
  }, [filteredRecords, barbers, isAdmin]);

  const maxBarValue = Math.max(
    ...Object.entries(desgloseBarbers).flatMap(([, b]) => [b.barberShare, b.barberiaShare]),
    1
  );

  const handleEliminarFiado = (record: FinancialRecord) => {
    setRecordAEliminar(record);
  };

  const confirmarEliminacionFiado = async () => {
    const record = recordAEliminar;
    if (!record) return;
    setRecordAEliminar(null);
    try {
      await deleteDoc(doc(db, "finances", record.id));
      toast.success("Servicio fiado eliminado", { duration: 2000, closeButton: false });
    } catch (error) {
      console.error("Error al eliminar:", error);
      toast.error("Error al eliminar el registro", { duration: 3000, closeButton: false });
    }
  };

  const handleMarcarPagado = (record: FinancialRecord) => {
    setFiadoACobrar(record);
    setCobroPaymentMethod("bcv");
    setCobroPropina(false);
    setCobroMontoPropina("");
    setCobroReferencia("");
    setCobroCapturaFile(null);
    setCobroCapturaPreview("");
    setCobroBcvRate(null);
  };

  const limpiarCobroCaptura = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCobroCapturaFile(null);
    setCobroCapturaPreview("");
  };

  const handleConfirmarCobro = async () => {
    const record = fiadoACobrar;
    if (!record) return;
    if (procesandoPago) return;
    setProcesandoPago(record.id);

    const rawPropina = cobroPropina ? (Number(cobroMontoPropina) || 0) : 0;
    if (rawPropina > 0 && cobroPaymentMethod === "bcv" && !cobroBcvRate) {
      setProcesandoPago(null);
      toast.error("La tasa BCV no está disponible. Intenta de nuevo o cambia el método de pago.");
      return;
    }

    try {
      const date = getLocalDateString();
      let capturaURL = "";
      let capturaFileId = "";

      if (cobroCapturaFile) {
        const cobroFileBytes = await cobroCapturaFile.arrayBuffer();
        const res = await fetch("/api/upload-captura", {
          method: "POST",
          headers: {
            "X-File-Type": cobroCapturaFile.type || "image/jpeg",
            "X-File-Name": encodeURIComponent(cobroCapturaFile.name),
          },
          body: cobroFileBytes,
        });
        if (res.ok) {
          const uploadResult = await res.json();
          capturaURL = uploadResult.url;
          capturaFileId = uploadResult.fileId;
        }
      }

      const propinaAmount = r2(rawPropina > 0 && cobroPaymentMethod === "bcv" && cobroBcvRate
        ? rawPropina / cobroBcvRate
        : rawPropina);
      const barberShareTotal = record.barberShare + propinaAmount;
      const bcvRate = cobroPaymentMethod === "bcv" ? cobroBcvRate : null;

      await updateDoc(doc(db, "finances", record.id), {
        estado: "pagado",
        date,
        paymentMethod: cobroPaymentMethod,
        barberShare: barberShareTotal,
        ...(bcvRate != null ? { bcvRate } : {}),
        ...(propinaAmount > 0 ? { propina: propinaAmount } : {}),
        ...(cobroReferencia.trim() ? { numeroReferencia: cobroReferencia.trim() } : {}),
        ...(capturaURL ? { capturaURL, capturaFileId } : {}),
      });

      const finalBarberId = record.barberId;
      const finalBarberName = record.barberName;

      const barberBankRef = doc(db, "bank", finalBarberId);
      const barberBankDoc = await getDoc(barberBankRef);
      if (barberBankDoc.exists()) {
        await updateDoc(barberBankRef, {
          balance: increment(barberShareTotal),
          totalEarned: increment(barberShareTotal),
          lastUpdated: new Date(),
        });
      } else {
        await setDoc(barberBankRef, {
          userId: finalBarberId,
          userName: finalBarberName,
          balance: barberShareTotal,
          totalEarned: barberShareTotal,
          totalPaid: 0,
          lastUpdated: new Date(),
        });
      }

      await addDoc(collection(db, "bank_transactions"), {
        userId: finalBarberId,
        userName: finalBarberName,
        type: "earning",
        amount: barberShareTotal,
        description: `Pago fiado - Servicio: ${record.serviceName}${propinaAmount > 0 ? ` (incl. propina $${propinaAmount.toFixed(2)})` : ""}`,
        date,
        createdAt: new Date(),
      });

      const barberiaBankRef = doc(db, "bank", "barbershop");
      const barberiaBankDoc = await getDoc(barberiaBankRef);
      if (barberiaBankDoc.exists()) {
        await updateDoc(barberiaBankRef, {
          balance: increment(record.barberiaShare),
          totalEarned: increment(record.barberiaShare),
          lastUpdated: new Date(),
        });
      } else {
        await setDoc(barberiaBankRef, {
          userId: "barbershop",
          userName: "Elite BarberShop",
          balance: record.barberiaShare,
          totalEarned: record.barberiaShare,
          totalPaid: 0,
          lastUpdated: new Date(),
        });
      }

      await addDoc(collection(db, "bank_transactions"), {
        userId: "barbershop",
        userName: "Elite BarberShop",
        type: "earning",
        amount: record.barberiaShare,
        description: `Pago fiado - Servicio: ${record.serviceName} (${finalBarberName})`,
        date,
        createdAt: new Date(),
      });

      try {
        const objectivesQuery = query(collection(db, "objectives"));
        const objectivesSnapshot = await getDocs(objectivesQuery);
        const now = new Date();

        for (const objDoc of objectivesSnapshot.docs) {
          const objData = objDoc.data();
          const endDate = objData.endDate?.toDate();

          if (endDate && endDate >= now) {
            const isBarberObjective = objData.barberoId && objData.barberoId === finalBarberId;
            const isGeneralObjective = !objData.barberoId;

            if (isBarberObjective || isGeneralObjective) {
              const currentAmount = objData.currentAmount || 0;
              const newAmount = isBarberObjective
                ? currentAmount + barberShareTotal
                : currentAmount + record.totalAmount;

              await updateDoc(doc(db, "objectives", objDoc.id), {
                currentAmount: newAmount,
              });
            }
          }
        }
      } catch (objError) {
        console.error("Error al actualizar objetivos:", objError);
      }

      setFiadoACobrar(null);
      toast.success("Servicio cobrado exitosamente", { duration: 2000, closeButton: false });
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      toast.error("Error al procesar el pago", { duration: 3000, closeButton: false });
    } finally {
      setProcesandoPago(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-text-muted text-sm">Cargando datos financieros...</p>
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

      <div className={`grid grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-3 md:gap-6 animate-fade-in-up`}>
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

        {/* Card Propina */}
        <div className="card-premium p-5 md:p-6 flex flex-col justify-between">
          <div className="flex items-center gap-3 md:gap-3 mb-3 md:mb-4">
            <div className="w-12 h-12 md:w-12 md:h-12 rounded-xl md:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
              <TrendingUp size={22} className="md:size-6" />
            </div>
            <p className="text-[10px] md:text-[10px] font-bold text-text-muted uppercase tracking-[0.15em] md:tracking-[0.2em]">Propina</p>
          </div>
          <div className="mt-auto">
            <p className="font-display text-2xl md:text-5xl text-white font-bold tracking-tighter leading-none">${propinaTotal.toFixed(2).split('.')[0]}<span className="text-sm md:text-2xl opacity-50">.{propinaTotal.toFixed(2).split('.')[1]}</span></p>
            <p className="text-[10px] md:text-[9px] text-text-muted uppercase tracking-widest font-bold mt-1 md:mt-2">100% para el barbero</p>
          </div>
        </div>

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

                  <div className="grid grid-cols-1 md:grid-cols-[140px_1fr_110px] items-center gap-3">
                    <span className="text-amber-400 text-[10px] font-bold uppercase tracking-[0.18em]">
                      Propina
                    </span>
                    <div className="h-2.5 bg-void/40 rounded-full overflow-hidden border border-amber-500/20 shadow-inner">
                      <div
                        className="h-full bg-linear-to-r from-amber-700 to-amber-400 rounded-full transition-all duration-1000 shadow-amber-glow"
                        style={{ width: `${maxBarValue > 0 ? (stats.propina / maxBarValue) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-white font-display text-lg text-left md:text-right tracking-wider">
                      +${stats.propina.toFixed(2)}
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

      {/* ──────── POR COBRAR ──────── */}
      <div className="card-premium p-6 sm:p-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="font-display text-2xl text-white tracking-[0.05em] uppercase">
            Por <span className="text-purple-400">Cobrar</span>
          </h3>
          {porCobrarRecords.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-bold">
              {porCobrarRecords.length}
            </span>
          )}
        </div>
        {porCobrarRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <p className="text-text-muted text-sm">No hay servicios fiados pendientes de cobro</p>
          </div>
        ) : (
          <>
          {/* Tabla (escritorio) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Servicio</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Barbero</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Cliente</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Fecha</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Monto</th>
                  <th className="text-left py-3 px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">Acción</th>
                </tr>
              </thead>
              <tbody>
                {porCobrarRecords.map((record) => (
                  <tr key={record.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm">{record.serviceName}</span>
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[8px] font-bold uppercase">Fiado</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-secondary text-sm">{record.barberName}</td>
                    <td className="py-3 px-4 text-text-secondary text-sm">{record.clientName}</td>
                    <td className="py-3 px-4 text-text-muted text-sm">{record.date}</td>
                    <td className="py-3 px-4">
                      <span className="font-display text-base text-white">${record.totalAmount.toFixed(2)}</span>
                      {record.propina ? <span className="text-amber-400 text-[10px] ml-1">(+${record.propina.toFixed(2)})</span> : null}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-start gap-2">
                        <button
                          onClick={() => handleMarcarPagado(record)}
                          disabled={procesandoPago === record.id}
                          className="px-3 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-500/50 text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          {procesandoPago === record.id ? (
                            <><Loader2 size={11} className="animate-spin" /> Procesando</>
                          ) : (
                            <><CheckCircle2 size={11} /> Pagado</>
                          )}
                        </button>
                        <button
                          onClick={() => handleEliminarFiado(record)}
                          className="p-1.5 rounded-md border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards (móvil) — estilo historial */}
          <div className="md:hidden space-y-3">
            {porCobrarRecords.map((record) => (
              <div key={record.id} className="p-4 space-y-4 rounded-xl border border-white/5 bg-void/20 hover:bg-surface-high/20 hover:border-white/10 transition-all">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-white font-medium text-sm">
                      {record.clientName}
                    </p>
                    <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold mt-0.5">
                      {record.date}
                    </p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-bold uppercase tracking-wider">
                      Fiado
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20">
                      <span className="text-white font-display text-sm tracking-wider">
                        ${record.totalAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEliminarFiado(record)}
                        className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-y-3 gap-x-6 text-xs">
                  <div className="space-y-1">
                    <p className="text-text-muted uppercase text-[9px] tracking-widest font-bold">Servicio</p>
                    <p className="text-text-secondary">{record.serviceName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-text-muted uppercase text-[9px] tracking-widest font-bold">Barbero</p>
                    <p className="text-text-secondary">{record.barberName}</p>
                  </div>
                  {record.propina ? (
                    <div className="space-y-1">
                      <p className="text-text-muted uppercase text-[9px] tracking-widest font-bold">Propina</p>
                      <p className="text-amber-400 font-display text-xs tracking-wider">+${record.propina.toFixed(2)}</p>
                    </div>
                  ) : null}
                </div>

                <button
                  onClick={() => handleMarcarPagado(record)}
                  disabled={procesandoPago === record.id}
                  className="w-full px-3 py-2 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-500/50 text-[10px] font-bold uppercase tracking-[0.15em] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {procesandoPago === record.id ? (
                    <><Loader2 size={12} className="animate-spin" /> Procesando</>
                  ) : (
                    <><CheckCircle2 size={12} /> Pagado</>
                  )}
                </button>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* MODAL CONFIRMAR ELIMINACIÓN FIADO */}
      {recordAEliminar && (
        <div
          className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setRecordAEliminar(null)}
        >
          <div
            className="card-premium p-8 w-full max-w-md border-danger/30 shadow-red-strong"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-2xl text-white mb-2 tracking-widest uppercase">Eliminar Fiado</h2>
            <p className="text-text-muted text-sm mb-6">
              ¿Estás seguro de eliminar este servicio fiado? Esta acción no se puede deshacer.
            </p>

            <div className="bg-void/40 rounded-lg p-4 border border-white/5 mb-6 space-y-1">
              <p className="text-white text-sm font-medium">{recordAEliminar.serviceName}</p>
              <p className="text-text-muted text-xs">{recordAEliminar.barberName} · {recordAEliminar.clientName} · ${recordAEliminar.totalAmount.toFixed(2)}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setRecordAEliminar(null)}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacionFiado}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-white bg-danger/80 hover:bg-danger transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COBRAR FIADO */}
      {fiadoACobrar && (
        <div
          className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setFiadoACobrar(null)}
        >
          <div
            className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong relative max-h-[90vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setFiadoACobrar(null)}
              className="absolute top-4 right-4 p-1 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
              type="button"
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>

            <h2 className="font-display text-3xl text-white mb-2 tracking-widest uppercase">Cobrar Fiado</h2>
            <p className="text-text-muted text-[10px] tracking-[0.3em] font-bold mb-6 opacity-70">REGISTRAR PAGO PENDIENTE</p>

            {/* Datos del registro */}
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-4 mb-6 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Servicio</span>
                <span className="text-white text-sm font-medium">{fiadoACobrar.serviceName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Barbero</span>
                <span className="text-text-secondary text-sm">{fiadoACobrar.barberName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Cliente</span>
                <span className="text-text-secondary text-sm">{fiadoACobrar.clientName}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-purple-500/10">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">Monto</span>
                <span className="font-display text-xl text-white tracking-wider">${fiadoACobrar.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="mb-5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Método de Pago *</label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setCobroPaymentMethod(m.value)}
                    className={`px-3 py-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      cobroPaymentMethod === m.value
                        ? "bg-primary/20 border-primary text-white shadow-red-glow"
                        : "bg-void/50 border-white/10 text-text-muted hover:text-white hover:border-white/20"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tasa BCV (solo si BCV) */}
            {cobroPaymentMethod === "bcv" && cobroBcvRate && (
              <div className="mb-5 p-4 rounded-md bg-blue-500/10 border border-blue-500/20">
                <p className="font-display text-2xl text-blue-400 tracking-wider">Bs {(fiadoACobrar.totalAmount * cobroBcvRate).toFixed(2)}</p>
                <p className="text-[10px] text-text-muted mt-1">Tasa BCV: Bs {cobroBcvRate.toFixed(2)}</p>
              </div>
            )}

            {/* Propina */}
            <div className="mb-5 space-y-3">
              <button
                type="button"
                onClick={() => setCobroPropina(!cobroPropina)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  cobroPropina
                    ? "bg-amber-500/20 border-amber-500 text-white shadow-amber-glow"
                    : "bg-void/50 border-white/10 text-text-muted hover:text-white hover:border-white/20"
                }`}
              >
                <span className="flex items-center gap-2">
                  {cobroPropina ? "✓" : "+"} Incluir Propina
                </span>
              </button>
              {cobroPropina && (
                <>
                  <input
                    type="number"
                    className="w-full bg-void/50 border border-amber-500/30 rounded-md px-4 py-3 text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all outline-none placeholder:text-text-muted/50"
                    placeholder={cobroPaymentMethod !== "bcv" ? "Monto en USD ($)" : "Monto en Bs"}
                    value={cobroMontoPropina}
                    onChange={(e) => setCobroMontoPropina(e.target.value.replace(/^0+/, ""))}
                    min="0"
                    step="0.01"
                  />
                  {cobroPaymentMethod === "bcv" && cobroMontoPropina && cobroBcvRate && (
                    <p className="text-[10px] text-amber-400/70">
                      ≈ ${((Number(cobroMontoPropina) || 0) / cobroBcvRate).toFixed(2)} (Bs {Number(cobroMontoPropina).toFixed(2)} ÷ {cobroBcvRate.toFixed(2)})
                    </p>
                  )}
                </>
              )}
            </div>

            {/* N° Referencia */}
            <div className="mb-5">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">N° Referencia (opcional)</label>
              <input 
                type="text" 
                className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                placeholder="Últimos 4 dígitos"
                maxLength={4}
                value={cobroReferencia}
                onChange={(e) => setCobroReferencia(e.target.value.replace(/\D/g, "").slice(-4))}
              />
            </div>

            {/* Captura de pago */}
            <div className="mb-6">
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Captura de pago (opcional)</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setCobroDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setCobroDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setCobroDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file?.type.startsWith("image/")) setCobroCapturaFile(file);
                }}
                onClick={() => document.getElementById("cobro-captura-input")?.click()}
                className={`
                  relative flex flex-col items-center justify-center gap-2 w-full
                  border-2 border-dashed rounded-md px-4 py-5 cursor-pointer
                  transition-all duration-200
                  ${cobroDragOver
                    ? "border-primary bg-primary/10 scale-[1.02]"
                    : cobroCapturaFile
                      ? "border-primary/50 bg-primary/5"
                      : "border-white/10 bg-void/50 hover:border-white/30 hover:bg-white/5"
                  }
                `}
              >
                <input
                  id="cobro-captura-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setCobroCapturaFile(e.target.files?.[0] || null)}
                />
                {cobroCapturaFile ? (
                  <div className="flex items-center gap-4 w-full">
                    <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10">
                      {cobroCapturaPreview && <img src={cobroCapturaPreview} alt="Vista previa" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{cobroCapturaFile.name}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{(cobroCapturaFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={limpiarCobroCaptura} className="p-1.5 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors shrink-0" aria-label="Quitar imagen">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-white/5 border border-white/10">
                      <Upload size={20} className="text-text-muted" />
                    </div>
                    <p className="text-sm text-text-muted">
                      <span className="text-white font-medium">Haz clic</span> o arrastra una imagen
                    </p>
                    <p className="text-[11px] text-text-muted/50">PNG, JPG, WebP — Máx 5 MB</p>
                  </>
                )}
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-4 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setFiadoACobrar(null)}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarCobro}
                disabled={procesandoPago === fiadoACobrar.id}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-white bg-emerald-600/80 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {procesandoPago === fiadoACobrar.id ? (
                  <><Loader2 size={14} className="animate-spin" /> Cobrando...</>
                ) : (
                  <><CheckCircle2 size={14} /> Cobrar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
