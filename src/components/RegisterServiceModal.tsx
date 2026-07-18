"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type Service, SERVICES, type PaymentMethod, PAYMENT_METHODS } from "@/lib/types";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  getDocs,
  updateDoc,
  increment,
  runTransaction
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, Loader2, X, Upload } from "lucide-react";
import { Select } from "@/components/ui";
import { getLocalDateString } from "@/lib/utils";
import { toast } from "sonner";

interface RegisterServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const normalizarNombreServicio = (nombre: string) => nombre.trim().toLowerCase();
const obtenerNombreBarbero = (b: any) => b?.nombre ?? b?.name ?? "Barbero";
const sanitizarTexto = (texto: string) => texto.replace(/<[^>]*>/g, "").trim().slice(0, 100);

export default function RegisterServiceModal({ isOpen, onClose }: RegisterServiceModalProps) {
  const { datosUsuario, usuario } = useAuth();
  const esAdmin = datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin";

  const [formData, setFormData] = useState({
    serviceId: "",
    clientName: "",
    barberId: "",
    paymentMethod: "bcv" as PaymentMethod,
    numeroReferencia: "",
  });

  const [serviciosDisponibles, setServiciosDisponibles] = useState<Service[]>(SERVICES);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [bcvRateDb, setBcvRateDb] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturaFile, setCapturaFile] = useState<File | null>(null);
  const [capturaSubiendo, setCapturaSubiendo] = useState(false);
  const [capturaPreview, setCapturaPreview] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [incluyePropina, setIncluyePropina] = useState(false);
  const [montoPropina, setMontoPropina] = useState("");
  const [esFiado, setEsFiado] = useState(false);

  // Escuchar la tasa BCV en tiempo real de la base de datos
  useEffect(() => {
    if (!isOpen) return;

    fetch("/api/bcv-rate").catch(() => {});

    const unsub = onSnapshot(doc(db, "settings", "bcv"),
      (snap) => {
        if (snap.exists() && snap.data().rate) {
          setBcvRateDb(Number(snap.data().rate));
        }
      },
      (error) => {
        console.error("Error cargando tasa BCV en modal:", error);
      }
    );
    return () => unsub();
  }, [isOpen]);

  // Cargar servicios (estáticos + personalizados)
  useEffect(() => {
    if (!isOpen) return;

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
        console.error("Error cargando servicios en modal:", error);
      }
    );

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
    const unsubscribe = onSnapshot(consulta,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBarbers(data);
      },
      (error) => {
        console.error("Error cargando barberos en modal:", error);
      }
    );
    return () => unsubscribe();
  }, [isOpen, esAdmin]);

  // Inicializar o limpiar campos al abrir/cerrar el modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        serviceId: "",
        clientName: "",
        barberId: esAdmin ? "" : (datosUsuario?.uid || ""),
        paymentMethod: "bcv",
        numeroReferencia: "",
      });
      setCapturaFile(null);
      setCapturaPreview("");
      setIncluyePropina(false);
      setMontoPropina("");
      setEsFiado(false);
    }
  }, [isOpen, esAdmin, datosUsuario]);

  // Crear preview URL para la captura
  useEffect(() => {
    if (!capturaFile) {
      setCapturaPreview("");
      return;
    }
    const url = URL.createObjectURL(capturaFile);
    setCapturaPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [capturaFile]);

  // Resetear método de pago a BCV si el servicio no tiene divisa
  const rawPropina = incluyePropina ? (Number(montoPropina) || 0) : 0;
  const propinaAmount = rawPropina > 0 && formData.paymentMethod === "bcv" && bcvRateDb
    ? rawPropina / bcvRateDb
    : rawPropina;
  useEffect(() => {
    if (!formData.serviceId) return;
    const servicio = serviciosDisponibles.find(s => s.id === formData.serviceId);
    if (servicio && !servicio.priceDivisa && formData.paymentMethod !== "bcv") {
      setFormData(prev => ({ ...prev, paymentMethod: "bcv" }));
    }
  }, [formData.serviceId, serviciosDisponibles, formData.paymentMethod]);

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setCapturaFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCapturaFile(e.target.files?.[0] || null);
  };

  const limpiarCaptura = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCapturaFile(null);
    setCapturaPreview("");
  };

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

    if (rawPropina > 0 && formData.paymentMethod === "bcv" && !bcvRateDb) {
      alert("La tasa BCV aún no está disponible. Intenta de nuevo en unos segundos o cambia el método de pago.");
      return;
    }

    setIsSubmitting(true);
    try {
      let capturaURL = "";
      let capturaFileId = "";
      if (capturaFile) {
        setCapturaSubiendo(true);
        const fileBytes = await capturaFile.arrayBuffer();
        const token = await usuario?.getIdToken();
        const res = await fetch("/api/upload-captura", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-File-Type": capturaFile.type || "image/jpeg",
            "X-File-Name": encodeURIComponent(capturaFile.name),
          },
          body: fileBytes,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error al subir la captura");
        }
        const uploadResult = await res.json();
        capturaURL = uploadResult.url;
        capturaFileId = uploadResult.fileId;
        setCapturaSubiendo(false);
      }

      const paymentMethod = formData.paymentMethod || "bcv";
      const esDivisa = paymentMethod !== "bcv";
      const rawTotal = esDivisa && service.priceDivisa
        ? service.priceDivisa
        : service.price;
      const totalAmount = Number(rawTotal) || 0;
      const propinaFinal = propinaAmount;
      const barberShareAmount = totalAmount * 0.6 + propinaFinal;
      const barberiaShareAmount = totalAmount * 0.4;
      const date = getLocalDateString();

      const bcvRate = paymentMethod === "bcv" ? bcvRateDb : null;
      const clientName = sanitizarTexto(formData.clientName) || "Cliente";

      // Transacción atómica: finances + bank + bank_transactions
      await runTransaction(db, async (transaction) => {
        const financeRef = doc(collection(db, "finances"));
        transaction.set(financeRef, {
          serviceId: service.id,
          serviceName: service.name,
          barberId: finalBarberId,
          barberName: obtenerNombreBarbero(finalBarber),
          clientName,
          totalAmount,
          barberShare: barberShareAmount,
          barberiaShare: barberiaShareAmount,
          date,
          createdAt: new Date(),
          paymentMethod,
          estado: esFiado ? "pendiente" : "pagado",
          ...(bcvRate != null ? { bcvRate } : {}),
          ...(formData.numeroReferencia.trim() ? { numeroReferencia: formData.numeroReferencia.trim() } : {}),
          ...(capturaURL ? { capturaURL, capturaFileId } : {}),
          ...(propinaFinal > 0 ? { propina: propinaFinal } : {}),
        });

        if (!esFiado) {
          const barberBankRef = doc(db, "bank", finalBarberId);
          const barberBankDoc = await transaction.get(barberBankRef);
          if (barberBankDoc.exists()) {
            transaction.update(barberBankRef, {
              balance: increment(barberShareAmount),
              totalEarned: increment(barberShareAmount),
              lastUpdated: new Date()
            });
          } else {
            transaction.set(barberBankRef, {
              userId: finalBarberId,
              userName: obtenerNombreBarbero(finalBarber),
              balance: barberShareAmount,
              totalEarned: barberShareAmount,
              totalPaid: 0,
              lastUpdated: new Date()
            });
          }

          const barberTxRef = doc(collection(db, "bank_transactions"));
          transaction.set(barberTxRef, {
            userId: finalBarberId,
            userName: obtenerNombreBarbero(finalBarber),
            type: "earning",
            amount: barberShareAmount,
            description: `Servicio: ${service.name}${propinaFinal > 0 ? ` (incl. propina $${propinaFinal.toFixed(2)})` : ""}`,
            date,
            createdAt: new Date()
          });

          const barberiaBankRef = doc(db, "bank", "barbershop");
          const barberiaBankDoc = await transaction.get(barberiaBankRef);
          if (barberiaBankDoc.exists()) {
            transaction.update(barberiaBankRef, {
              balance: increment(barberiaShareAmount),
              totalEarned: increment(barberiaShareAmount),
              lastUpdated: new Date()
            });
          } else {
            transaction.set(barberiaBankRef, {
              userId: "barbershop",
              userName: "Elite BarberShop",
              balance: barberiaShareAmount,
              totalEarned: barberiaShareAmount,
              totalPaid: 0,
              lastUpdated: new Date()
            });
          }

          const barberiaTxRef = doc(collection(db, "bank_transactions"));
          transaction.set(barberiaTxRef, {
            userId: "barbershop",
            userName: "Elite BarberShop",
            type: "earning",
            amount: barberiaShareAmount,
            description: `Servicio: ${service.name} (${obtenerNombreBarbero(finalBarber)})`,
            date,
            createdAt: new Date()
          });
        }
      });

      if (esFiado) {
        toast.success("Servicio fiado registrado", { duration: 2000, closeButton: false });
        onClose();
        return;
      }

      // Actualizar objetivos (best-effort después de la transacción)
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

      toast.success("Servicio registrado exitosamente", { duration: 2000, closeButton: false });
      onClose();

    } catch (error) {
      console.error("Error al registrar el servicio:", error);
      alert("Hubo un error al registrar el servicio. Todos los cambios fueron revertidos automáticamente.");
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
      <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong relative max-h-[90vh] overflow-y-auto no-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors"
          type="button"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <h2 className="font-display text-3xl text-white mb-6 tracking-widest uppercase">Registrar Servicio</h2>
        
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
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Cliente (opcional)</label>
            <input 
              type="text" 
              className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
              placeholder="Nombre del cliente"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setEsFiado(!esFiado)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                esFiado
                  ? "bg-purple-500/20 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]"
                  : "bg-void/50 border-white/10 text-text-muted hover:text-white hover:border-white/20"
              }`}
            >
              <span className="flex items-center gap-2">
                {esFiado ? "✓" : "+"} Fiado (Paga después)
              </span>
            </button>
          </div>

          {!esFiado && (() => {
            const servicioSel = formData.serviceId
              ? serviciosDisponibles.find(s => s.id === formData.serviceId)
              : null;
            const tieneDivisa = !!servicioSel?.priceDivisa;
            const metodosPago = tieneDivisa
              ? PAYMENT_METHODS
              : PAYMENT_METHODS.filter(m => m.value === "bcv");

            return (
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Método de Pago</label>
                <div className={`grid gap-2 ${tieneDivisa ? "grid-cols-3" : "grid-cols-1"}`}>
                  {metodosPago.map((m) => (
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
            );
          })()}

          {formData.serviceId && (() => {
            const selectedService = serviciosDisponibles.find(s => s.id === formData.serviceId);
            if (!selectedService) return null;
            const esDivisa = !esFiado && formData.paymentMethod !== "bcv";
            const rawPrecio = esDivisa && selectedService.priceDivisa
              ? selectedService.priceDivisa
              : selectedService.price;
            const precio = Number(rawPrecio) || 0;
            return (
              <div className={`${esFiado ? "bg-purple-500/5 border-purple-500/10" : "bg-primary/5 border-primary/10"} border rounded-md p-4`}>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">{esFiado ? "Monto Fiado" : "Precio a Cobrar"}</p>
                <p className="font-display text-3xl text-white tracking-wider">
                  ${precio.toFixed(2)}
                  {!esFiado && formData.paymentMethod === "bcv" && bcvRateDb && (
                    <span className="text-base text-text-muted ml-2">
                      (Bs {(precio * bcvRateDb).toFixed(2)})
                    </span>
                  )}
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span className="text-emerald-400">60%: ${(precio * 0.6).toFixed(2)}</span>
                  {!esFiado && incluyePropina && propinaAmount > 0 && (
                    <span className="text-amber-400">Propina: +${propinaAmount.toFixed(2)}</span>
                  )}
                </div>
              </div>
            );
          })()}

          {!esFiado && (
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">N° Referencia (opcional)</label>
              <input 
                type="text" 
                className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                placeholder="Últimos 4 dígitos"
                maxLength={4}
                value={formData.numeroReferencia}
                onChange={(e) => setFormData({ ...formData, numeroReferencia: e.target.value.replace(/\D/g, "").slice(-4) })}
              />
            </div>
          )}

          {!esFiado && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIncluyePropina(!incluyePropina)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  incluyePropina
                    ? "bg-amber-500/20 border-amber-500 text-white shadow-amber-glow"
                    : "bg-void/50 border-white/10 text-text-muted hover:text-white hover:border-white/20"
                }`}
              >
                <span className="flex items-center gap-2">
                  {incluyePropina ? "✓" : "+"} Incluir Propina
                </span>
              </button>
              {incluyePropina && (
                <>
                  <input
                    type="number"
                    className="w-full bg-void/50 border border-amber-500/30 rounded-md px-4 py-3 text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all outline-none placeholder:text-text-muted/50"
                    placeholder={formData.paymentMethod !== "bcv" ? "Monto en USD ($)" : "Monto en Bs"}
                    value={montoPropina}
                    onChange={(e) => setMontoPropina(e.target.value.replace(/^0+/, ""))}
                    min="0"
                    step="0.01"
                  />
                  {formData.paymentMethod === "bcv" && rawPropina > 0 && bcvRateDb && (
                    <p className="text-[10px] text-amber-400/70">
                      ≈ ${propinaAmount.toFixed(2)} (Bs {rawPropina.toFixed(2)} ÷ {bcvRateDb.toFixed(2)})
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {!esFiado && (
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Captura de pago (opcional)</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("captura-input")?.click()}
              className={`
                relative flex flex-col items-center justify-center gap-2 w-full
                border-2 border-dashed rounded-md px-4 py-5 cursor-pointer
                transition-all duration-200
                ${dragOver
                  ? "border-primary bg-primary/10 scale-[1.02]"
                  : capturaFile
                    ? "border-primary/50 bg-primary/5"
                    : "border-white/10 bg-void/50 hover:border-white/30 hover:bg-white/5"
                }
              `}
            >
              <input
                id="captura-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />

              {capturaFile && capturaPreview ? (
                <div className="flex items-center gap-4 w-full">
                  <div className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10">
                    <img
                      src={capturaPreview}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{capturaFile.name}</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {(capturaFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={limpiarCaptura}
                    className="p-1.5 rounded-md text-text-muted hover:text-white hover:bg-white/10 transition-colors shrink-0"
                    aria-label="Quitar imagen"
                  >
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
          )}

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
                <><Loader2 size={18} className="animate-spin" /> {capturaSubiendo ? "Subiendo..." : "Registrando..."}</>
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
