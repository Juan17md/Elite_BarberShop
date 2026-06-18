"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type FinancialRecord, type Service, SERVICES, type PaymentMethod, PAYMENT_METHODS } from "@/lib/types";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  increment,
  getDocs,
  addDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  History,
  DollarSign,
  Scissors,
  Wallet,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Trash2,
  Check,
  CalendarDays
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Select,
} from "@/components/ui";
import SearchInput from "@/components/ui/search-input";
import { getLocalDateString, getPeriodFromPosition } from "@/lib/utils";

const ITEMS_POR_PAGINA = 15;

export default function HistorialPage() {
  const { userRole } = useAuth();
  const esAdmin = userRole?.role === "admin";

  const [registros, setRegistros] = useState<FinancialRecord[]>([]);
  const [cargando, setCargando] = useState(true);
  const [pagina, setPagina] = useState(1);

  // Navegación semanal
  const [position, setPosition] = useState(0);

  const periodo = useMemo(
    () => getPeriodFromPosition(position),
    [position]
  );
  const esPosicionActual = position === 0;


  // Estado para Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<FinancialRecord | null>(null);
  const [formData, setFormData] = useState({ serviceId: "", clientName: "", barberId: "", paymentMethod: "bcv" as PaymentMethod, bcvRate: "" });
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Service[]>(SERVICES);
  const [barbers, setBarbers] = useState<any[]>([]);

  // Efecto para registros
  useEffect(() => {
    if (!userRole?.uid) return;
    let q;
    if (esAdmin) {
      q = query(collection(db, "finances"), orderBy("date", "desc"));
    } else {
      q = query(
        collection(db, "finances"),
        where("barberId", "==", userRole?.uid),
        orderBy("date", "desc")
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FinancialRecord[];
      setRegistros(data);
      setCargando(false);
    });
    return () => unsubscribe();
  }, [esAdmin, userRole?.uid]);

  // Efecto para servicios disponibles (para el modal de edición)
  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serviciosPersonalizados = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Service[];

      const serviciosBase = [...SERVICES];
      const normalizarNombreServicio = (nombre: string) => nombre.trim().toLowerCase();
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

  // Efecto para barberos (para el modal de edición como admin)
  useEffect(() => {
    if (!esAdmin) return;
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
  }, [esAdmin]);

  // Eliminar Registro
  const handleDelete = async (record: FinancialRecord) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro? Se revertirán los saldos de ganancias asociados.")) return;

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

  // Guardar edición
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordToEdit) return;

    if (!formData.serviceId || (esAdmin && !formData.barberId)) {
      alert("Completa todos los campos obligatorios.");
      return;
    }

    const selService = serviciosDisponibles.find(s => s.id === formData.serviceId);
    if (!selService) return;

    const finalBarberId = esAdmin ? formData.barberId : recordToEdit.barberId;
    const finalBarberName = esAdmin 
      ? (barbers.find(b => b.id === formData.barberId)?.name || recordToEdit.barberName) 
      : recordToEdit.barberName;

    const paymentMethod = formData.paymentMethod || "bcv";
    const newTotalAmount = paymentMethod === "divisa" && selService.priceDivisa != null
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
          // rare case if barber has no bank, but ignore for simple flow
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
        
        // --- 3. AJUSTE DE OBJETIVOS (Simplificado: reversión bruta, aplicación bruta) ---
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
                // Same objective applies for both before and after, just calculate difference
                diff = newAdd - oldDeduct;
                await updateDoc(doc(db, "objectives", objDoc.id), {
                  currentAmount: increment(diff)
                });
              } else {
                // Specific barber objective
                if (isOldBarberObj && !isNewBarberObj) {
                  // Left this barber, so deduct
                  await updateDoc(doc(db, "objectives", objDoc.id), {
                    currentAmount: increment(-oldDeduct)
                  });
                } else if (!isOldBarberObj && isNewBarberObj) {
                  // Arrived at this barber, so add
                  await updateDoc(doc(db, "objectives", objDoc.id), {
                    currentAmount: increment(newAdd)
                  });
                } else if (isOldBarberObj && isNewBarberObj) {
                  // Same barber, diff amount
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

    } catch (err) {
      console.error("Error al actualizar:", err);
      alert("Hubo un problema guardando la edición. Revisa la consola.");
    }
  };

  // Opciones dinámicas de filtros
  const opcionesBarberos = useMemo(() => {
    return [...new Set(registros.map((r) => r.barberName))].sort();
  }, [registros]);

  const opcionesServicios = useMemo(() => {
    return [...new Set(registros.map((r) => r.serviceName))].sort();
  }, [registros]);

  // Registros filtrados por semana seleccionada
  const registrosFiltrados = useMemo(() => {
    return registros.filter((r) => {
      // Filtro semanal
      if (r.date < periodo.inicio || r.date > periodo.fin) return false;
      if (esAdmin && filtroBarbero !== "todos" && r.barberName !== filtroBarbero)
        return false;
      if (filtroServicio !== "todos" && r.serviceName !== filtroServicio)
        return false;
      if (busqueda) {
        const t = busqueda.toLowerCase();
        return (
          r.clientName.toLowerCase().includes(t) ||
          r.serviceName.toLowerCase().includes(t) ||
          (esAdmin && r.barberName.toLowerCase().includes(t))
        );
      }
      return true;
    });
  }, [registros, periodo, filtroBarbero, filtroServicio, busqueda, esAdmin]);

  // Reset paginación cuando cambian filtros
  useEffect(() => {
    setPagina(1);
  }, [position, busqueda, filtroBarbero, filtroServicio]);

  const totalPaginas = Math.ceil(registrosFiltrados.length / ITEMS_POR_PAGINA);
  const registrosPagina = registrosFiltrados.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  );

  // Métricas del filtro actual
  const totalIngresos = registrosFiltrados.reduce((s: number, r: FinancialRecord) => s + r.totalAmount, 0);
  const totalBarbero = registrosFiltrados.reduce((s: number, r: FinancialRecord) => s + r.barberShare, 0);
  const totalBarberia = registrosFiltrados.reduce((s: number, r: FinancialRecord) => s + r.barberiaShare, 0);

  const hayFiltrosActivos =
    busqueda || filtroBarbero !== "todos" || filtroServicio !== "todos";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroBarbero("todos");
    setFiltroServicio("todos");
  };

  // Números de página visibles
  const paginasVisibles = useMemo(() => {
    if (totalPaginas <= 5) return Array.from({ length: totalPaginas }, (_, i) => i + 1);
    if (pagina <= 3) return [1, 2, 3, 4, 5];
    if (pagina >= totalPaginas - 2)
      return [
        totalPaginas - 4,
        totalPaginas - 3,
        totalPaginas - 2,
        totalPaginas - 1,
        totalPaginas,
      ];
    return [pagina - 2, pagina - 1, pagina, pagina + 1, pagina + 2];
  }, [pagina, totalPaginas]);

  if (cargando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-text-muted text-sm">Cargando historial...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Panel de filtros */}
      <div className="card-premium p-4 md:p-5 space-y-4">
        {/* Navegador de periodo */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between font-display">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
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

        {/* Búsqueda y filtros avanzados */}
        <div className="grid grid-cols-1 md:flex md:flex-wrap gap-3 items-center">
          <div className="md:flex-1">
            <SearchInput
              value={busqueda}
              onChange={setBusqueda}
              placeholder={esAdmin ? "Buscar cliente, servicio o barbero..." : "Buscar cliente o servicio..."}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {esAdmin && (
              <div className="flex-1 sm:min-w-[170px]">
                <Select
                  options={[
                    { value: "todos", label: "Todos los barberos" },
                    ...opcionesBarberos.map((b) => ({ value: b, label: b })),
                  ]}
                  value={filtroBarbero}
                  onChange={setFiltroBarbero}
                  placeholder="Todos los barberos"
                />
              </div>
            )}

            <div className="flex-1 sm:min-w-[170px]">
              <Select
                options={[
                  { value: "todos", label: "Todos los servicios" },
                  ...opcionesServicios.map((s) => ({ value: s, label: s })),
                ]}
                value={filtroServicio}
                onChange={setFiltroServicio}
                placeholder="Todos los servicios"
              />
            </div>
          </div>

          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm text-text-muted hover:text-white border border-white/10 hover:border-white/20 transition-all w-full md:w-auto"
            >
              <X size={14} />
              <span className="md:hidden lg:inline">Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="card-premium p-4 md:p-5 group hover:border-primary/20 transition-colors">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <Scissors size={14} className="text-primary md:w-[18px] md:h-[18px]" />
            <p className="text-text-muted text-[8px] md:text-[10px] uppercase tracking-widest font-bold">
              Servicios
            </p>
          </div>
          <p className="font-display text-2xl md:text-3xl text-white">
            {registrosFiltrados.length}
          </p>
        </div>

        <div className="card-premium p-4 md:p-5 group hover:border-emerald-400/20 transition-colors">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <DollarSign size={14} className="text-emerald-400 md:w-[18px] md:h-[18px]" />
            <p className="text-text-muted text-[8px] md:text-[10px] uppercase tracking-widest font-bold">
              Total
            </p>
          </div>
          <p className="font-display text-2xl md:text-3xl text-white">
            ${totalIngresos.toFixed(2)}
          </p>
        </div>

        <div className="card-premium p-4 md:p-5 group hover:border-blue-400/20 transition-colors">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <Users size={14} className="text-blue-400 md:w-[18px] md:h-[18px]" />
            <p className="text-text-muted text-[8px] md:text-[10px] uppercase tracking-widest font-bold">
              {esAdmin ? "Barberos" : "Tu Parte"}
            </p>
          </div>
          <p className="font-display text-2xl md:text-3xl text-white">
            ${totalBarbero.toFixed(2)}
          </p>
        </div>

        <div className="card-premium p-4 md:p-5 group hover:border-amber-400/20 transition-colors">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <Wallet size={14} className="text-amber-400 md:w-[18px] md:h-[18px]" />
            <p className="text-text-muted text-[8px] md:text-[10px] uppercase tracking-widest font-bold truncate">
              Barbería (40%)
            </p>
          </div>
          <p className="font-display text-2xl md:text-3xl text-white truncate">
            ${totalBarberia.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="card-premium overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display text-lg text-white tracking-widest uppercase flex items-center gap-3">
            <History size={20} className="text-primary" />
            Registros
          </h3>
          <span className="text-text-muted text-xs">
            {registrosFiltrados.length} resultado{registrosFiltrados.length !== 1 ? "s" : ""}
          </span>
        </div>

        {registrosPagina.length > 0 ? (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-0 hover:bg-transparent">
                    <TableHead>Fecha</TableHead>
                    {esAdmin && <TableHead>Barbero</TableHead>}
                    <TableHead>Servicio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead align="center">Pago</TableHead>
                    <TableHead align="right">Total</TableHead>
                    <TableHead align="right">
                      {esAdmin ? "Barbero (60%)" : "Tu Parte"}
                    </TableHead>
                    <TableHead align="right">Barbería (40%)</TableHead>
                    <TableHead align="center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registrosPagina.map((r) => (
                    <TableRow key={r.id} className="hover:bg-surface-high/30">
                      <TableCell className="text-text-secondary text-sm">
                        {r.date}
                      </TableCell>
                      {esAdmin && (
                        <TableCell className="text-white text-sm font-medium">
                          {r.barberName}
                        </TableCell>
                      )}
                      <TableCell className="text-white text-sm">
                        {r.serviceName}
                      </TableCell>
                      <TableCell className="text-text-secondary text-sm">
                        {r.clientName}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          r.paymentMethod === "divisa" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {r.paymentMethod === "divisa" ? "Divisa" : "BCV"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-display text-white tracking-wider">
                        ${r.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-display text-emerald-400 tracking-wider">
                        ${r.barberShare.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-display text-blue-400 tracking-wider">
                        ${r.barberiaShare.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(r)}
                            className="p-1.5 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(r)}
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

            <div className="lg:hidden divide-y divide-white/5">
              {registrosPagina.map((r) => (
                <div key={r.id} className="p-4 space-y-4 hover:bg-surface-high/20 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium text-sm">
                        {r.clientName}
                      </p>
                      <p className="text-text-muted text-[10px] uppercase tracking-wider font-bold mt-0.5">
                        {r.date}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        r.paymentMethod === "divisa" ? "text-amber-400 bg-amber-500/10 border border-amber-500/20" : "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                      }`}>
                        {r.paymentMethod === "divisa" ? "Divisa" : "BCV"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-primary/10 border border-primary/20">
                        <span className="text-white font-display text-sm tracking-wider">
                          ${r.totalAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 text-text-muted hover:text-white transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-y-3 gap-x-6 text-xs">
                    <div className="space-y-1">
                      <p className="text-text-muted uppercase text-[9px] tracking-widest font-bold">
                        Servicio
                      </p>
                      <p className="text-text-secondary">
                        {r.serviceName}
                      </p>
                    </div>
                    {esAdmin && (
                      <div className="space-y-1">
                        <p className="text-text-muted uppercase text-[9px] tracking-widest font-bold">
                          Barbero
                        </p>
                        <p className="text-text-secondary">
                          {r.barberName}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-void/40 p-2 rounded-lg border border-white/5">
                      <p className="text-text-muted text-[9px] uppercase tracking-widest font-bold mb-1">
                        {esAdmin ? "Barbero (60%)" : "Tu Parte"}
                      </p>
                      <p className="text-emerald-400 font-display text-sm">
                        ${r.barberShare.toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-void/40 p-2 rounded-lg border border-white/5">
                      <p className="text-text-muted text-[9px] uppercase tracking-widest font-bold mb-1">
                        Barbería (40%)
                      </p>
                      <p className="text-blue-400 font-display text-sm">
                        ${r.barberiaShare.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPaginas > 1 && (
              <div className="p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-text-muted text-xs text-center sm:text-left order-2 sm:order-1">
                  Página {pagina} de {totalPaginas} &middot; {registrosFiltrados.length} registros
                </p>
                <div className="flex items-center gap-1.5 order-1 sm:order-2">
                  <button
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={15} />
                  </button>

                  <div className="flex items-center gap-1.5">
                    {paginasVisibles.map((num) => (
                      <button
                        key={num}
                        onClick={() => setPagina(num)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          pagina === num
                            ? "bg-primary/20 text-white border border-primary shadow-red-glow"
                            : "text-text-muted hover:text-white border border-white/10 hover:border-white/20"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <History size={48} className="text-text-muted/20 mb-4" />
            <p className="font-display text-sm uppercase tracking-widest text-text-muted">
              No hay registros
            </p>
            <p className="text-text-muted/60 text-xs mt-2">
              {hayFiltrosActivos
                ? "Intenta ajustar los filtros de búsqueda"
                : "Aún no se han registrado servicios"}
            </p>
            {hayFiltrosActivos && (
              <button
                onClick={limpiarFiltros}
                className="mt-4 px-4 py-2 rounded-lg text-xs text-text-muted border border-white/10 hover:text-white hover:border-white/20 transition-all"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN */}
      {isEditModalOpen && recordToEdit && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">Editar Registro</h2>
            
            <form onSubmit={handleEditSubmit} className="space-y-6">
              {esAdmin && (
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
                    const precioDivisa = s.priceDivisa != null ? ` / $${s.priceDivisa.toFixed(2)} Div` : "";
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
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: m.value })}
                      className={`px-4 py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all border ${
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
                const precio = formData.paymentMethod === "divisa" && selectedService.priceDivisa != null
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
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Cliente</label>
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
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary text-sm py-3"
                >
                  <Check size={18} /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
