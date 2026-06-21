"use client";

import { useState, useEffect } from "react";
import type { Timestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { type Objective } from "@/lib/types";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  increment,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Pencil, Trash2, Target, Check, Calendar, Wallet } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { getLocalDateString } from "@/lib/utils";

function convertirFecha(valor: unknown): Date | undefined {
  if (!valor) return undefined;
  if (valor instanceof Date) return valor;

  if (
    typeof valor === "object" &&
    valor !== null &&
    "toDate" in valor &&
    typeof (valor as Timestamp).toDate === "function"
  ) {
    return (valor as Timestamp).toDate();
  }

  if (typeof valor === "string" || typeof valor === "number") {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? undefined : fecha;
  }

  return undefined;
}

export default function ObjetivosPage() {
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const isAdmin = (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin");
  const [objetivos, setObjetivos] = useState<Objective[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [registroObjetivoId, setRegistroObjetivoId] = useState<string | null>(null);
  const [montoRegistrado, setMontoRegistrado] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    targetAmount: "",
    endDate: "",
  });
  const [usuariosPorId, setUsuariosPorId] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) {
      setUsuariosPorId({});
      return;
    }

    const cargarUsuarios = async () => {
      const snapshot = await getDocs(query(collection(db, "users"), orderBy("name")));
      const mapaUsuarios = snapshot.docs.reduce((acc, userDoc) => {
        const data = userDoc.data();
        acc[userDoc.id] = data.name || data.email || "Usuario";
        return acc;
      }, {} as Record<string, string>);

      setUsuariosPorId(mapaUsuarios);
    };

    void cargarUsuarios();
  }, [isAdmin]);

  useEffect(() => {
    if (!datosUsuario?.uid) return;
    let q;
    if (isAdmin) {
      q = query(collection(db, "objectives"), orderBy("endDate", "desc"));
    } else {
      q = query(collection(db, "objectives"), where("barberoId", "==", datosUsuario?.uid), orderBy("endDate", "desc"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const datos = doc.data();

        return {
          id: doc.id,
          ...datos,
          createdByName:
            typeof datos.createdByName === "string" ? datos.createdByName : undefined,
          startDate: convertirFecha(datos.startDate),
          endDate: convertirFecha(datos.endDate),
          createdAt: convertirFecha(datos.createdAt) ?? new Date(),
        } as unknown as Objective;
      });

      setObjetivos(data);
    });
    return () => unsubscribe();
  }, [isAdmin, datosUsuario?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.endDate) return;

    const montoObjetivo = Number(formData.targetAmount);

    const payload = {
      name: formData.name,
      targetAmount: montoObjetivo,
      endDate: new Date(formData.endDate + "T00:00:00"),
    };

    if (editingId) {
      await updateDoc(doc(db, "objectives", editingId), payload);
    } else {
      await addDoc(collection(db, "objectives"), {
        ...payload,
        currentAmount: 0,
        createdAt: new Date(),
        barberoId: datosUsuario?.uid ?? "",
        createdByName: datosUsuario?.nombre ?? "Usuario",
      });
    }

    cerrarModalObjetivo();
  };

  const handleEdit = (obj: Objective) => {
    setFormData({
      name: obj.name ?? "",
      targetAmount: String(obj.targetAmount ?? ""),
      endDate: obj.endDate ? getLocalDateString(obj.endDate) : "",
    });
    setEditingId(obj.id);
    setIsModalOpen(true);
  };

  const cerrarModalObjetivo = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", targetAmount: "", endDate: "" });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    await deleteDoc(doc(db, "objectives", deletingId));
    setDeletingId(null);
  };

  const abrirRegistroMonto = (objetivo: Objective) => {
    setRegistroObjetivoId(objetivo.id);
    setMontoRegistrado("");
  };

  const cerrarRegistroMonto = () => {
    setRegistroObjetivoId(null);
    setMontoRegistrado("");
  };

  const registrarMontoObjetivo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registroObjetivoId) return;

    const monto = Number(montoRegistrado);

    if (!monto || monto <= 0) return;

    await updateDoc(doc(db, "objectives", registroObjetivoId), {
      currentAmount: increment(monto),
    });

    cerrarRegistroMonto();
  };

  const getProgress = (obj: Objective) => {
    if (obj.targetAmount === 0) return 0;
    return Math.min(100, Math.round((obj.currentAmount / obj.targetAmount) * 100));
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "-";
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  };

  const obtenerNombreRegistrador = (obj: Objective) => {
    if (obj.createdByName?.trim()) return obj.createdByName;
    if (obj.barberoId === datosUsuario?.uid && datosUsuario?.nombre) return datosUsuario.nombre;
    if (obj.barberoId && usuariosPorId[obj.barberoId]) return usuariosPorId[obj.barberoId];
    if (!obj.barberoId) return "Administración";
    return "Usuario no disponible";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-8 animate-fade-in-up w-full">
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ name: "", targetAmount: "", endDate: "" });
            setIsModalOpen(true);
          }}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-sm py-3 sm:py-2.5 px-6"
        >
          <Plus size={18} /> Nuevo Objetivo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up delay-children-1">
        {objetivos.map((obj) => {
          const progress = getProgress(obj);

          return (
            <div key={obj.id} className="card-premium p-6 flex flex-col justify-between border border-white/8 bg-linear-to-br from-surface/95 via-surface/92 to-surface-high/60 shadow-[0_0_18px_rgba(255,255,255,0.03)]">
              <div className="flex items-start justify-between mb-6">
                <h3 className="font-display text-2xl tracking-wide text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.08)]">
                  {obj.name}
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(obj)}
                    className="p-2 text-text-muted hover:text-primary transition-colors bg-surface-high rounded-md border border-white/5 hover:border-primary/30"
                    aria-label={`Editar objetivo ${obj.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(obj.id)}
                    className="p-2 text-text-muted hover:text-red-400 transition-colors bg-surface-high rounded-md border border-white/5 hover:border-red-500/30"
                    aria-label={`Eliminar objetivo ${obj.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/4 px-4 py-3">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase mb-2">Meta</p>
                    <p className="font-display text-2xl text-emerald-400 tracking-wide">${obj.targetAmount}</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/15 bg-blue-500/4 px-4 py-3">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase mb-2">Actual</p>
                    <p className="font-display text-2xl text-blue-400 tracking-wide">${obj.currentAmount}</p>
                  </div>
                </div>
                <div className="relative">
                  <div className="h-3.5 bg-linear-to-r from-white/3 to-white/6 rounded-full overflow-hidden border border-white/8 shadow-inner shadow-black/40">
                    <div
                      className={`h-full transition-all duration-1000 ease-out relative overflow-hidden rounded-full ${progress >= 100 ? "bg-linear-to-r from-emerald-500 via-emerald-400 to-lime-300 shadow-[0_0_16px_rgba(52,211,153,0.32)]" : "bg-linear-to-r from-amber-400 via-orange-400 to-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.35)]"}`}
                      style={{ width: `${progress}%` }}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)] animate-pulse"></div>
                    </div>
                  </div>

                  {progress > 0 && progress < 100 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white/70 bg-orange-300 shadow-[0_0_12px_rgba(251,146,60,0.55)]"
                      style={{ left: `calc(${progress}% - 7px)` }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-xs font-medium pt-2 text-text-muted uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <Calendar size={12} className="opacity-70" />
                    <span>Tope: {formatDate(obj.endDate)}</span>
                  </div>
                  <span className={`${progress >= 100 ? "text-emerald-400" : "text-orange-400"} font-display text-[16px]`}>
                    {progress}%
                  </span>
                </div>

                {isAdmin && (
                  <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3">
                    <p className="text-[10px] font-bold tracking-[0.2em] text-text-muted uppercase mb-2">
                      Registrado por
                    </p>
                    <p className="text-sm text-white font-semibold tracking-wide">
                      {obtenerNombreRegistrador(obj)}
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => abrirRegistroMonto(obj)}
                  className="w-full mt-4 py-3 rounded-md border border-white/15 bg-white/80 text-slate-900 hover:bg-white hover:text-black transition-all font-bold text-[10px] tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(255,255,255,0.10)]"
                >
                  <Wallet size={14} />
                  Registrar monto
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {objetivos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted animate-fade-in-up">
          <Target size={48} className="text-surface-highest mb-4" />
          <p className="text-sm font-display tracking-widest uppercase">No hay objetivos registrados</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">
              {editingId ? "Editar Objetivo" : "Nuevo Objetivo"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Nombre</label>
                <input
                  type="text"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                  placeholder="Ej: Meta del mes"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Monto ($)</label>
                <input 
                  type="number" 
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none font-display tracking-widest"
                  placeholder="100"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  required
                />
              </div>

              <DatePicker
                label="Fecha Tope"
                value={formData.endDate}
                onChange={(v) => setFormData({ ...formData, endDate: v })}
              />

              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={cerrarModalObjetivo}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 btn-primary text-sm py-3"
                >
                  <Check size={18} className="mr-2 inline-block" /> {editingId ? "Guardar" : "Crear"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {registroObjetivoId && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">
              Registrar avance
            </h2>

            <form onSubmit={registrarMontoObjetivo} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Monto a sumar ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none font-display tracking-widest"
                  placeholder="Ej: 25"
                  value={montoRegistrado}
                  onChange={(e) => setMontoRegistrado(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={cerrarRegistroMonto}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary text-sm py-3"
                >
                  <Check size={18} className="mr-2 inline-block" /> Guardar avance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="card-premium w-full max-w-sm p-8 relative flex flex-col items-center text-center border-t-2 border-t-red-500 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20">
              <Trash2 size={24} />
            </div>
            <h3 className="font-display text-2xl mb-2 text-white tracking-wider">¿ELIMINAR <span className="text-red-500">OBJETIVO</span>?</h3>
            <p className="text-text-muted text-sm mb-8 font-body">Esta acción no se puede deshacer y los datos se perderán permanentemente.</p>
            <div className="flex gap-3 w-full">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-text-muted hover:bg-surface-high hover:text-white transition-all font-bold text-xs tracking-widest uppercase"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 hover:border-red-500 hover:shadow-red-glow font-bold text-xs tracking-widest uppercase"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
