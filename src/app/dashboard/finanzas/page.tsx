"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord, SERVICES, type Service, type PaymentMethod, PAYMENT_METHODS, getPaymentBadge } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  onSnapshot,
  query,
  orderBy,
  where,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  DollarSign, 
  Users, 
  Wallet, 
  Plus, 
  Check, 
  Scissors, 
  TrendingUp,
  Pencil,
  Trash2,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Select } from "@/components/ui";
import { getLocalDateString, getPeriodFromPosition, type Period } from "@/lib/utils";
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
  const [paginaActual, setPaginaActual] = useState(1);
  const REGISTROS_POR_PAGINA = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ serviceId: "", clientName: "", barberId: "", paymentMethod: "bcv" as PaymentMethod, bcvRate: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Estado para pago a barbero
  const [selectedBarberForPayout, setSelectedBarberForPayout] = useState<{
    barberId: string;
    barberName: string;
    periodEarnings: number;
  } | null>(null);

  // Estado para Eliminación
  const [recordToDelete, setRecordToDelete] = useState<FinancialRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);



  // Estado para Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);

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

  const totalPaginas = Math.ceil(filteredRecords.length / REGISTROS_POR_PAGINA);
  const registrosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * REGISTROS_POR_PAGINA;
    return filteredRecords.slice(inicio, inicio + REGISTROS_POR_PAGINA);
  }, [filteredRecords, paginaActual]);

  useEffect(() => {
    setPaginaActual(1);
  }, [position, filteredRecords.length]);


  const confirmDelete = (record: FinancialRecord) => {
    setRecordToDelete(record);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;

    setIsDeleting(true);
    const record = recordToDelete;

    try {
      // 1. Revertir saldo del barbero
      const barberBankRef = doc(db, "bank", record.barberId);
      const barberBankDoc = await getDoc(barberBankRef);
      if (barberBankDoc.exists()) {
        await updateDoc(barberBankRef, {
          balance: increment(-record.barberShare),
          totalEarned: increment(-record.barberShare),
          lastUpdated: new Date()
        });
      }

      // 2. Transacción de reversión del barbero
      await addDoc(collection(db, "bank_transactions"), {
        userId: record.barberId,
        userName: record.barberName,
        type: "deduction",
        amount: record.barberShare,
        description: `Eliminación/Reversión: ${record.serviceName}`,
        date: getLocalDateString(),
        createdAt: new Date()
      });

      // 3. Revertir saldo de barbería
      const barberiaBankRef = doc(db, "bank", "barbershop");
      const barberiaBankDoc = await getDoc(barberiaBankRef);
      if (barberiaBankDoc.exists()) {
        await updateDoc(barberiaBankRef, {
          balance: increment(-record.barberiaShare),
          totalEarned: increment(-record.barberiaShare),
          lastUpdated: new Date()
        });
      }

      // 4. Transacción de reversión de barbería
      await addDoc(collection(db, "bank_transactions"), {
        userId: "barbershop",
        userName: "Elite BarberShop",
        type: "deduction",
        amount: record.barberiaShare,
        description: `Eliminación/Reversión: ${record.serviceName} (${record.barberName})`,
        date: getLocalDateString(),
        createdAt: new Date()
      });

      // 5. Ajustar objetivos (si aplican)
      try {
        const now = new Date();
        const objectivesQuery = query(collection(db, "objectives"));
        const objectivesSnapshot = await getDocs(objectivesQuery);
        
        for (const objDoc of objectivesSnapshot.docs) {
          const objData = objDoc.data();
          const endDate = objData.endDate?.toDate();
          if (endDate && endDate >= now) {
            const isBarberObjective = objData.barberoId && objData.barberoId === record.barberId;
            const isGeneralObjective = !objData.barberoId;
            
            if (isBarberObjective || isGeneralObjective) {
              const amountToDeduct = isBarberObjective ? record.barberShare : record.totalAmount;
              await updateDoc(doc(db, "objectives", objDoc.id), {
                currentAmount: increment(-amountToDeduct)
              });
            }
          }
        }
      } catch (objError) {
        console.error("Error revirtiendo objetivos:", objError);
      }

      // 6. Eliminar el documento de finances
      await deleteDoc(doc(db, "finances", record.id));

    } catch (error) {
      console.error("Error al eliminar el registro:", error);
      alert("Hubo un error al eliminar.");
    } finally {
      setIsDeleting(false);
      setRecordToDelete(null);
    }
  };

  const openEditModal = (record: FinancialRecord) => {
    setRecordToEdit(record);
    setFormData({
      serviceId: record.serviceId,
      clientName: record.clientName,
      barberId: record.barberId,
      paymentMethod: (record.paymentMethod || "bcv") as PaymentMethod,
      bcvRate: record.bcvRate != null ? String(record.bcvRate) : "",
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!recordToEdit) return;

    if (!formData.serviceId || (isAdmin && !formData.barberId)) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    const selService = serviciosDisponibles.find(s => s.id === formData.serviceId);
    if (!selService) return;

    setIsSubmitting(true);

    const finalBarberId = isAdmin ? formData.barberId : recordToEdit.barberId;
    const finalBarber = isAdmin && formData.barberId 
      ? (barbers.find(b => b.id === formData.barberId) || { name: recordToEdit.barberName })
      : { name: recordToEdit.barberName };
    
    const finalBarberName = finalBarber.name;

    const paymentMethod = formData.paymentMethod || "bcv";
    const newTotalAmount = paymentMethod !== "bcv" && selService.priceDivisa != null
      ? selService.priceDivisa
      : selService.price;
    const newBarberShare = newTotalAmount * 0.6;
    const newBarberiaShare = newTotalAmount * 0.4;
    
    try {
      // Si cambia el monto o el barbero, hacemos reversiones de banco
      if (finalBarberId !== recordToEdit.barberId || newTotalAmount !== recordToEdit.totalAmount) {
        // --- 1. REVERTIR LO ANTIGUO ---
        const oldBarberBankRef = doc(db, "bank", recordToEdit.barberId);
        const oldBarberBankDoc = await getDoc(oldBarberBankRef);
        if (oldBarberBankDoc.exists()) {
          await updateDoc(oldBarberBankRef, { 
            balance: increment(-recordToEdit.barberShare), 
            totalEarned: increment(-recordToEdit.barberShare) 
          });
        }
        await addDoc(collection(db, "bank_transactions"), { 
          userId: recordToEdit.barberId, 
          userName: recordToEdit.barberName, 
          type: "deduction", 
          amount: recordToEdit.barberShare, 
          description: `Ajuste (Edición de registro): Reversión ${recordToEdit.serviceName}`, 
          date: getLocalDateString(), 
          createdAt: new Date() 
        });

        const oldBarberiaBankRef = doc(db, "bank", "barbershop");
        const oldBarberiaBankDoc = await getDoc(oldBarberiaBankRef);
        if (oldBarberiaBankDoc.exists()) {
          await updateDoc(oldBarberiaBankRef, { 
            balance: increment(-recordToEdit.barberiaShare), 
            totalEarned: increment(-recordToEdit.barberiaShare) 
          });
        }
        await addDoc(collection(db, "bank_transactions"), { 
          userId: "barbershop", 
          userName: "Elite BarberShop", 
          type: "deduction", 
          amount: recordToEdit.barberiaShare, 
          description: `Ajuste (Edición): Reversión ${recordToEdit.serviceName} (${recordToEdit.barberName})`, 
          date: getLocalDateString(), 
          createdAt: new Date() 
        });

        // --- 2. APLICAR LO NUEVO ---
        const newBarberBankRef = doc(db, "bank", finalBarberId);
        const newBarberBankDoc = await getDoc(newBarberBankRef);
        if (newBarberBankDoc.exists()) {
          await updateDoc(newBarberBankRef, { balance: increment(newBarberShare), totalEarned: increment(newBarberShare) });
        } else {
          // rare case if barber has no bank
        }
        await addDoc(collection(db, "bank_transactions"), { 
          userId: finalBarberId, 
          userName: finalBarberName, 
          type: "earning", 
          amount: newBarberShare, 
          description: `Ajuste (Nuevo): ${selService.name}`, 
          date: getLocalDateString(), 
          createdAt: new Date() 
        });

        await updateDoc(oldBarberiaBankRef, { balance: increment(newBarberiaShare), totalEarned: increment(newBarberiaShare) });
        await addDoc(collection(db, "bank_transactions"), { 
          userId: "barbershop", 
          userName: "Elite BarberShop", 
          type: "earning", 
          amount: newBarberiaShare, 
          description: `Ajuste (Nuevo): ${selService.name} (${finalBarberName})`, 
          date: getLocalDateString(), 
          createdAt: new Date() 
        });
        
        // --- 3. AJUSTE DE OBJETIVOS ---
        try {
          const now = new Date();
          const objectivesQuery = query(collection(db, "objectives"));
          const objectivesSnapshot = await getDocs(objectivesQuery);
          
          for (const objDoc of objectivesSnapshot.docs) {
            const objData = objDoc.data();
            const endDate = objData.endDate?.toDate();
            
            if (endDate && endDate >= now) {
              const isOldBarberObj = objData.barberoId === recordToEdit.barberId;
              const isNewBarberObj = objData.barberoId === finalBarberId;
              const isGeneralObj = !objData.barberoId;
              
              const oldDeduct = isOldBarberObj ? recordToEdit.barberShare : recordToEdit.totalAmount;
              const newAdd = isNewBarberObj ? newBarberShare : newTotalAmount;

              let diff = 0;
              if (isGeneralObj) {
                diff = newAdd - oldDeduct;
                await updateDoc(doc(db, "objectives", objDoc.id), {
                  currentAmount: increment(diff)
                });
              } else {
                if (isOldBarberObj && !isNewBarberObj) {
                  await updateDoc(doc(db, "objectives", objDoc.id), {
                    currentAmount: increment(-oldDeduct)
                  });
                } else if (!isOldBarberObj && isNewBarberObj) {
                  await updateDoc(doc(db, "objectives", objDoc.id), {
                    currentAmount: increment(newAdd)
                  });
                } else if (isOldBarberObj && isNewBarberObj) {
                  diff = newAdd - oldDeduct;
                  await updateDoc(doc(db, "objectives", objDoc.id), {
                    currentAmount: increment(diff)
                  });
                }
              }
            }
          }
        } catch (objErr) {
          console.log("Error ajustando objetivos", objErr);
        }
      }

      // --- 4. ACTUALIZAR FINANCE RECORD ---
      const bcvRate = paymentMethod === "bcv" && formData.bcvRate ? Number(formData.bcvRate) : null;
      await updateDoc(doc(db, "finances", recordToEdit.id), {
        serviceId: selService.id,
        serviceName: selService.name,
        barberId: finalBarberId,
        barberName: finalBarberName,
        clientName: formData.clientName,
        totalAmount: newTotalAmount,
        barberShare: newBarberShare,
        barberiaShare: newBarberiaShare,
        paymentMethod,
        ...(bcvRate != null ? { bcvRate } : {}),
      });

      setIsEditModalOpen(false);
      setRecordToEdit(null);
      setFormData({ serviceId: "", clientName: "", barberId: "", paymentMethod: "bcv", bcvRate: "" });

    } catch (err) {
      console.error("Error al actualizar:", err);
      alert("Hubo un problema guardando la edición.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const revenueByService = filteredRecords.reduce((acc, r) => {
    acc[r.serviceName] = (acc[r.serviceName] || 0) + r.totalAmount;
    return acc;
  }, {} as Record<string, number>);

  const serviceCount = filteredRecords.reduce((acc, r) => {
    acc[r.serviceName] = (acc[r.serviceName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 animate-fade-in-up">
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

        {/* Card Barbería (40%) */}
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
              Comparativa entre lo generado para cada barbero y lo correspondiente a la barbería.
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
                </div>
              </div>
            ))}
        </div>
      </div>
      <div className="card-premium overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-white/5">
          <h3 className="font-display text-xl text-white tracking-widest uppercase">Historial de Servicios</h3>
        </div>

        {/* Vista Escritorio (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead>Fecha</TableHead>
                {isAdmin && <TableHead>Barbero</TableHead>}
                <TableHead>Servicio</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead align="center">Pago</TableHead>
                <TableHead align="right">Total</TableHead>
                <TableHead align="right">{isAdmin ? "Barbero (60%)" : "Tu Parte"}</TableHead>
                <TableHead align="right">Barbería (40%)</TableHead>
                <TableHead align="center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrosPaginados.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="text-text-secondary text-sm">{record.date}</TableCell>
                  {isAdmin && <TableCell className="text-white text-sm font-medium">{record.barberName}</TableCell>}
                  <TableCell className="text-white text-sm font-medium">{record.serviceName}</TableCell>
                  <TableCell className="text-text-secondary text-sm">{record.clientName}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      getPaymentBadge(record.paymentMethod).colorClass
                    }`}>
                      {getPaymentBadge(record.paymentMethod).label}
                    </span>
                  </TableCell>
                  <TableCell className="text-white text-right font-display tracking-widest">${record.totalAmount.toFixed(2)}</TableCell>
                  <TableCell className="text-emerald-400 text-right font-display tracking-widest">${record.barberShare.toFixed(2)}</TableCell>
                  <TableCell className="text-blue-400 text-right font-display tracking-widest">${record.barberiaShare.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => openEditModal(record)}
                        className="p-1.5 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => confirmDelete(record)}
                        className="p-1.5 rounded-md text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Vista Móvil (Tarjetas PREMIUM) */}
        <div className="md:hidden divide-y divide-white/5">
          {registrosPaginados.map((record) => (
            <div key={record.id} className="p-5 space-y-4 bg-void/10 hover:bg-void/30 transition-colors">
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium text-base tracking-wide">{record.clientName}</p>
                    <span className="text-[10px] text-text-muted opacity-50 px-2 py-0.5 border border-white/10 rounded uppercase">{record.date}</span>
                    <span className={`text-[10px] px-2 py-0.5 border rounded uppercase font-bold ${
                      getPaymentBadge(record.paymentMethod).colorClass
                    }`}>
                      {getPaymentBadge(record.paymentMethod).label}
                    </span>
                  </div>
                  <p className="text-primary text-[10px] sm:text-xs uppercase tracking-[0.15em] font-bold">{record.serviceName}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <p className="font-display text-2xl text-white tracking-widest leading-none">${record.totalAmount.toFixed(2)}</p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(record)}
                      className="p-1.5 text-text-muted hover:text-white transition-colors"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => confirmDelete(record)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid 60/40 Directo (Admin) */}
              {isAdmin ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                    <p className="text-[9px] uppercase tracking-widest text-emerald-300 font-bold mb-1">Barbero (60%)</p>
                    <p className="font-display text-lg text-emerald-400">${record.barberShare.toFixed(2)}</p>
                    <p className="text-[8px] text-text-muted/60 mt-0.5 truncate">{record.barberName}</p>
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-[9px] uppercase tracking-widest text-blue-300 font-bold mb-1">Barbería (40%)</p>
                    <p className="font-display text-lg text-blue-400">${record.barberiaShare.toFixed(2)}</p>
                    <p className="text-[8px] text-text-muted/60 mt-0.5">Admin Shop</p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">Tu Parte (60%)</p>
                  </div>
                  <p className="font-display text-xl text-emerald-400">${record.barberShare.toFixed(2)}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredRecords.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted">
            <Wallet size={48} className="text-surface-highest mb-4" />
            <p className="text-sm font-display tracking-widest uppercase">No hay servicios registrados</p>
          </div>
        )}

        {/* Controles de Paginación */}
        {totalPaginas > 1 && (
          <div className="p-4 border-t border-white/5 bg-void/30 flex items-center justify-between gap-4">
            <button
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase tracking-wider"
            >
              <ChevronLeft size={16} />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-[0.2em] opacity-50">Historial</span>
              <p className="text-white font-display text-sm tracking-widest whitespace-nowrap">
                Página {paginaActual} <span className="text-text-muted mx-1">/</span> {totalPaginas}
              </p>
            </div>

            <button
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xs font-bold uppercase tracking-wider"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
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

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">Editar Registro</h2>
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {isAdmin && (
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Barbero</label>
                  <Select
                    options={barbers.map(b => ({ value: b.id, label: b.name }))}
                    value={formData.barberId}
                    onChange={(val: string) => setFormData({ ...formData, barberId: val })}
                    placeholder="Elegir barbero..."
                    className="bg-void/50 border-white/10 rounded-md"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Servicio</label>
                <Select
                  options={serviciosDisponibles.map(s => {
                    const precioBase = `$${s.price.toFixed(2)}`;
                    const precioDivisa = s.priceDivisa != null ? ` / $${s.priceDivisa.toFixed(2)} USD` : "";
                    return { value: s.id, label: `${precioBase}${precioDivisa} - ${s.name}` };
                  })}
                  value={formData.serviceId}
                  onChange={(val: string) => setFormData({ ...formData, serviceId: val })}
                  placeholder="Seleccionar servicio..."
                  className="bg-void/50 border-white/10 rounded-md"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: m.value })}
                      className={`px-3 py-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                        formData.paymentMethod === m.value
                          ? "bg-primary/20 border-primary text-white shadow-red-glow"
                          : "bg-void/50 border-white/10 text-text-muted hover:text-white hover:border-white/20"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {formData.paymentMethod === "bcv" && (
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Tasa BCV (Bs/USD)</label>
                  <input
                    type="number"
                    placeholder="Ej: 65.50"
                    value={formData.bcvRate}
                    onChange={(e) => setFormData({ ...formData, bcvRate: e.target.value })}
                    min="0"
                    step="0.01"
                    className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                  />
                </div>
              )}
              {formData.serviceId && (() => {
                const selectedService = serviciosDisponibles.find(s => s.id === formData.serviceId);
                if (!selectedService) return null;
                const precio = formData.paymentMethod !== "bcv" && selectedService.priceDivisa != null
                  ? selectedService.priceDivisa
                  : selectedService.price;
                return (
                  <div className="bg-primary/5 border border-primary/10 rounded-md p-4">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Precio a Cobrar</p>
                    <p className="font-display text-3xl text-white tracking-wider">
                      ${precio.toFixed(2)}
                    </p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className="text-emerald-400">Barbero 60%: ${(precio * 0.6).toFixed(2)}</span>
                      <span className="text-blue-400">Barbería 40%: ${(precio * 0.4).toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Cliente (opcional)</label>
                <input 
                  type="text" 
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                  placeholder="Nombre del cliente"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                />
              </div>
              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => { setIsEditModalOpen(false); setRecordToEdit(null); setFormData({ serviceId: "", clientName: "", barberId: "", paymentMethod: "bcv", bcvRate: "" }); }}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="flex-1 btn-primary text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Guardando...</>
                  ) : (
                    <><Check size={18} /> Guardar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {recordToDelete && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4 min-h-dvh">
          <div className="card-premium p-8 w-full max-w-sm border-red-500/20 shadow-[0_0_30px_-5px_rgba(239,68,68,0.2)] animate-scale-in">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-500 shadow-inner">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-2xl text-white tracking-widest uppercase">Eliminar Registro</h3>
                <p className="text-text-secondary text-sm">
                  ¿Estás seguro de eliminar el servicio de <span className="text-white font-medium">{recordToDelete.serviceName}</span> para <span className="text-white font-medium">{recordToDelete.clientName}</span>?
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8 pt-6 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5 hover:bg-white/10 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-red-500/90 hover:bg-red-500 text-white font-bold uppercase tracking-widest text-xs py-3 rounded-md shadow-[0_0_15px_-3px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <><Loader2 size={16} className="animate-spin" /> Eliminando...</>
                ) : (
                  <><Trash2 size={16} /> Eliminar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
