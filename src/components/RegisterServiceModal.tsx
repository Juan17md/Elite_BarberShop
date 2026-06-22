"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type Service, SERVICES, type PaymentMethod, PAYMENT_METHODS } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, Loader2, X } from "lucide-react";
import { Select } from "@/components/ui";
import { getLocalDateString } from "@/lib/utils";

interface RegisterServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const normalizarNombreServicio = (nombre: string) => nombre.trim().toLowerCase();

export default function RegisterServiceModal({ isOpen, onClose }: RegisterServiceModalProps) {
  const { datosUsuario } = useAuth();
  const esAdmin = datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin";

  const [formData, setFormData] = useState({
    serviceId: "",
    clientName: "",
    barberId: "",
    paymentMethod: "bcv" as PaymentMethod
  });

  const [serviciosDisponibles, setServiciosDisponibles] = useState<Service[]>(SERVICES);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [bcvRateDb, setBcvRateDb] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Escuchar la tasa BCV en tiempo real de la base de datos
  useEffect(() => {
    if (!isOpen) return;

    const unsub = onSnapshot(doc(db, "settings", "bcv"), (snap) => {
      if (snap.exists() && snap.data().rate) {
        setBcvRateDb(Number(snap.data().rate));
      }
    });
    return () => unsub();
  }, [isOpen]);

  // Cargar servicios (estáticos + personalizados)
  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  // Cargar barberos si es administrador
  useEffect(() => {
    if (!isOpen || !esAdmin) return;

    const consulta = query(
      collection(db, "users"), 
      where("role", "in", ["barber", "admin"]),
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
  }, [isOpen, esAdmin]);

  // Inicializar o limpiar campos al abrir/cerrar el modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        serviceId: "",
        clientName: "",
        barberId: esAdmin ? "" : (datosUsuario?.uid || ""),
        paymentMethod: "bcv"
      });
    }
  }, [isOpen, esAdmin, datosUsuario]);

  const handleRegisterService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const service = serviciosDisponibles.find(s => s.id === formData.serviceId);
    if (!service) {
      alert("Debes seleccionar un servicio");
      return;
    }

    const finalBarberId = esAdmin ? formData.barberId : datosUsuario?.uid;
    const finalBarber = esAdmin && formData.barberId 
      ? (barbers.find(b => b.id === formData.barberId) || datosUsuario)
      : datosUsuario;

    if (!finalBarberId || !finalBarber) {
      alert("Debes seleccionar un barbero");
      return;
    }

    setIsSubmitting(true);
    try {
      const paymentMethod = formData.paymentMethod || "bcv";
      const esDivisa = paymentMethod !== "bcv";
      const totalAmount = esDivisa && service.priceDivisa != null
        ? service.priceDivisa
        : service.price;
      const barberShareAmount = totalAmount * 0.6;
      const barberiaShareAmount = totalAmount * 0.4;
      const date = getLocalDateString();

      // Guardar la tasa BCV en segundo plano si el método de pago es bolívares (BCV)
      const bcvRate = paymentMethod === "bcv" ? bcvRateDb : null;

      // 1. Crear registro financiero
      await addDoc(collection(db, "finances"), {
        serviceId: service.id,
        serviceName: service.name,
        barberId: finalBarberId,
        barberName: finalBarber.name,
        clientName: formData.clientName || "Cliente",
        totalAmount,
        barberShare: barberShareAmount,
        barberiaShare: barberiaShareAmount,
        date,
        createdAt: new Date(),
        paymentMethod,
        ...(bcvRate != null ? { bcvRate } : {}),
      });

      // 2. Actualizar banco del barbero
      const barberBankRef = doc(db, "bank", finalBarberId);
      const barberBankDoc = await getDoc(barberBankRef);
      if (barberBankDoc.exists()) {
        await updateDoc(barberBankRef, {
          balance: increment(barberShareAmount),
          totalEarned: increment(barberShareAmount),
          lastUpdated: new Date()
        });
      } else {
        await setDoc(barberBankRef, {
          userId: finalBarberId,
          userName: finalBarber.name,
          balance: barberShareAmount,
          totalEarned: barberShareAmount,
          totalPaid: 0,
          lastUpdated: new Date()
        });
      }

      // 3. Agregar transacción al historial del banco del barbero
      await addDoc(collection(db, "bank_transactions"), {
        userId: finalBarberId,
        userName: finalBarber.name,
        type: "earning",
        amount: barberShareAmount,
        description: `Servicio: ${service.name}`,
        date,
        createdAt: new Date()
      });

      // 4. Actualizar banco de la barbería (barbershop)
      const barberiaBankRef = doc(db, "bank", "barbershop");
      const barberiaBankDoc = await getDoc(barberiaBankRef);
      if (barberiaBankDoc.exists()) {
        await updateDoc(barberiaBankRef, {
          balance: increment(barberiaShareAmount),
          totalEarned: increment(barberiaShareAmount),
          lastUpdated: new Date()
        });
      } else {
        await setDoc(barberiaBankRef, {
          userId: "barbershop",
          userName: "Elite BarberShop",
          balance: barberiaShareAmount,
          totalEarned: barberiaShareAmount,
          totalPaid: 0,
          lastUpdated: new Date()
        });
      }

      // 5. Agregar transacción al historial de la barbería
      await addDoc(collection(db, "bank_transactions"), {
        userId: "barbershop",
        userName: "Elite BarberShop",
        type: "earning",
        amount: barberiaShareAmount,
        description: `Servicio: ${service.name} (${finalBarber.name})`,
        date,
        createdAt: new Date()
      });

      // 6. Actualizar objetivos automáticamente
      try {
        let objectivesQuery;
        if (esAdmin) {
          objectivesQuery = query(collection(db, "objectives"));
        } else {
          objectivesQuery = query(collection(db, "objectives"), where("barberoId", "==", finalBarberId));
        }
        
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
                ? currentAmount + barberShareAmount 
                : currentAmount + totalAmount;
              
              await updateDoc(doc(db, "objectives", objDoc.id), {
                currentAmount: newAmount
              });
            }
          }
        }
      } catch (objError) {
        console.error("Error al actualizar objetivos:", objError);
      }

      // Cerrar modal
      onClose();

    } catch (error) {
      console.error("Error al registrar el servicio:", error);
      alert("Hubo un error al registrar el servicio. Por favor intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
          type="button"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">Registrar Servicio</h2>
        
        <form onSubmit={handleRegisterService} className="space-y-6">
          {esAdmin && (
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Barbero</label>
              <Select
                options={barbers.map(b => ({ value: b.id, label: b.name }))}
                value={formData.barberId}
                onChange={(val: string) => setFormData({ ...formData, barberId: val })}
                placeholder="Elegir barbero..."
                className="bg-void/50 border-white/10 rounded-md w-full"
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Servicio realizado</label>
            <Select
              options={serviciosDisponibles.map(s => ({
                value: s.id, label: s.name
              }))}
              value={formData.serviceId}
              onChange={(val: string) => setFormData({ ...formData, serviceId: val })}
              placeholder="Seleccionar servicio..."
              className="bg-void/50 border-white/10 rounded-md w-full"
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

          {formData.serviceId && (() => {
            const selectedService = serviciosDisponibles.find(s => s.id === formData.serviceId);
            if (!selectedService) return null;
            const esDivisa = formData.paymentMethod !== "bcv";
            const precio = esDivisa && selectedService.priceDivisa != null
              ? selectedService.priceDivisa
              : selectedService.price;
            return (
              <div className="bg-primary/5 border border-primary/10 rounded-md p-4">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Precio a Cobrar</p>
                <p className="font-display text-3xl text-white tracking-wider">
                  ${precio.toFixed(2)}
                  {formData.paymentMethod === "bcv" && bcvRateDb && (
                    <span className="text-base text-text-muted ml-2">
                      (Bs {(precio * bcvRateDb).toFixed(2)})
                    </span>
                  )}
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
              onClick={onClose}
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
                <><Loader2 size={18} className="animate-spin" /> Registrando...</>
              ) : (
                <><Check size={18} /> Registrar</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
