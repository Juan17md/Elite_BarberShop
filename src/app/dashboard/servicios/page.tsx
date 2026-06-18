"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { SERVICES, type Service } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Pencil, Trash2, Check, Scissors } from "lucide-react";

const normalizarNombreServicio = (nombre: string) => nombre.trim().toLowerCase();
const formatearNombreServicio = (nombre: string) => nombre.trim().toUpperCase();

export default function ServiciosPage() {
  const { userRole } = useAuth();
  const puedeGestionarServicios = userRole?.role === "admin" || userRole?.role === "barber";
  const [servicios, setServicios] = useState<Service[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", priceDivisa: "", duration: 45, description: "" });

  useEffect(() => {
    const q = query(collection(db, "services"), orderBy("name"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serviciosPersonalizados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Service[];

      const serviciosBase = [...SERVICES];
      const nombresBase = new Set(
        serviciosBase.map((servicio) => normalizarNombreServicio(servicio.name))
      );

      const serviciosExtra = serviciosPersonalizados.filter(
        (servicio) => !nombresBase.has(normalizarNombreServicio(servicio.name))
      );

      setServicios([...serviciosBase, ...serviciosExtra]);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const datosServicio: Record<string, unknown> = {
      ...formData,
      name: formatearNombreServicio(formData.name),
      price: Number(formData.price),
    };
    if (formData.priceDivisa) {
      datosServicio.priceDivisa = Number(formData.priceDivisa);
    }

    if (editingId) {
      await updateDoc(doc(db, "services", editingId), datosServicio);
    } else {
      await addDoc(collection(db, "services"), datosServicio);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", price: "", priceDivisa: "", duration: 45, description: "" });
  };

  const handleEdit = (servicio: Service) => {
    setFormData({ name: servicio.name, price: String(servicio.price), priceDivisa: servicio.priceDivisa != null ? String(servicio.priceDivisa) : "", duration: servicio.duration, description: servicio.description || "" });
    setEditingId(servicio.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteDoc(doc(db, "services", deletingId));
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end mb-8 animate-fade-in-up w-full">
        {puedeGestionarServicios && (
          <button 
            onClick={() => { setIsModalOpen(true); setEditingId(null); setFormData({ name: "", price: "", priceDivisa: "", duration: 45, description: "" }); }}
            className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-sm py-3 sm:py-2.5 px-6"
          >
            <Plus size={18} /> Nuevo Servicio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 animate-fade-in-up delay-children-1">
        {servicios.map((servicio) => {
          return (
          <div
            key={servicio.id}
            className="card-premium group relative overflow-hidden p-0 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-primary-light/60 to-primary/60 opacity-80" />

            <div className="relative p-6">
              <div className="mb-5 border-t border-transparent pt-0">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1">
                    <Scissors size={12} className="text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">Servicio</span>
                  </div>

                  {puedeGestionarServicios && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleEdit(servicio)}
                        className="rounded-md border border-white/8 bg-surface-high p-2 text-text-muted transition-colors hover:border-primary/35 hover:text-primary"
                        aria-label={`Editar ${servicio.name}`}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(servicio.id)}
                        className="rounded-md border border-white/8 bg-surface-high p-2 text-text-muted transition-colors hover:border-red-400/35 hover:text-red-400"
                        aria-label={`Eliminar ${servicio.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4 border-t border-white/6 pt-5">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-[1.9rem] leading-none tracking-wide text-white whitespace-normal wrap-break-word md:truncate">
                      {servicio.name}
                    </h3>

                    {servicio.description && (
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
                        {servicio.description}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="font-display text-3xl leading-none tracking-wide text-emerald-400 text-right">
                      ${servicio.price}
                    </p>
                    {servicio.priceDivisa != null && (
                      <p className="text-xs text-amber-400 font-bold tracking-wide">
                        Div: ${servicio.priceDivisa}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">
              {editingId ? "Editar Servicio" : "Nuevo Servicio"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Nombre del Servicio
                </label>
                <input
                  type="text"
                  placeholder="Corte de Cabello Simple"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Precio BCV ($)
                </label>
                <input
                  type="number"
                  placeholder="7"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  min="0"
                  step="0.01"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Precio Divisa / USDT (opcional)
                </label>
                <input
                  type="number"
                  placeholder="5"
                  value={formData.priceDivisa}
                  onChange={(e) => setFormData({ ...formData, priceDivisa: e.target.value })}
                  min="0"
                  step="0.01"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Descripción (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Detalles del servicio..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none placeholder:text-text-muted/50"
                />
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary text-sm py-3"
                >
                  <Check size={18} /> {editingId ? "Guardar" : "Crear"}
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
            <h3 className="font-display text-2xl mb-2 text-white tracking-wider">¿ELIMINAR <span className="text-red-500">SERVICIO</span>?</h3>
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
