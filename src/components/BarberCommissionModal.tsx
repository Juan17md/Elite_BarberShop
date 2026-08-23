"use client";

import { useState, useEffect } from "react";
import { DEFAULT_COMMISSION_RATE } from "@/lib/types";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, Loader2, X, Percent } from "lucide-react";
import { toast } from "sonner";
import * as Sentry from "@sentry/nextjs";

interface BarberCommissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  barberId: string;
  barberName: string;
  currentCommission: number;
}

export default function BarberCommissionModal({
  isOpen,
  onClose,
  barberId,
  barberName,
  currentCommission,
}: BarberCommissionModalProps) {
  const [porcentaje, setPorcentaje] = useState<string>("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPorcentaje(String(currentCommission || DEFAULT_COMMISSION_RATE));
  }, [isOpen, currentCommission]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const porcentajeNum = parseInt(porcentaje, 10) || 0;
  const esValido = porcentajeNum >= 1 && porcentajeNum <= 99;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!esValido) return;

    setGuardando(true);

    try {
      const bankRef = doc(db, "bank", barberId);
      const bankDoc = await getDoc(bankRef);

      if (bankDoc.exists()) {
        await updateDoc(bankRef, {
          commissionRate: porcentajeNum,
          lastUpdated: new Date(),
        });
      } else {
        await setDoc(bankRef, {
          userId: barberId,
          userName: barberName,
          balance: 0,
          totalEarned: 0,
          totalPaid: 0,
          commissionRate: porcentajeNum,
          lastUpdated: new Date(),
        });
      }

      toast.success(`Comisión de ${barberName} actualizada: ${porcentajeNum}%`, {
        duration: 2000,
        closeButton: false,
      });
      onClose();
    } catch (error) {
      Sentry.captureException(error);
      console.error("Error al guardar la comisión:", error);
      toast.error("Error al guardar la comisión", { duration: 3000, closeButton: false });
    } finally {
      setGuardando(false);
    }
  };

  const barberiaPorcentaje = 100 - porcentajeNum;

  return (
    <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-premium p-6 sm:p-8 w-full max-w-md border-primary/20 shadow-red-strong relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
          disabled={guardando}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Percent size={20} />
          </div>
          <div>
            <h2 className="font-display text-2xl text-white tracking-widest uppercase">
              COMISIÓN
            </h2>
            <p className="text-text-muted text-xs font-body tracking-wider">
              {barberName}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
              Porcentaje de ganancia para el barbero (%)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="99"
                step="1"
                className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none font-display tracking-wider text-2xl text-center"
                placeholder="60"
                value={porcentaje}
                onChange={(e) => {
                  const val = e.target.value.replace(/^0+/, "");
                  setPorcentaje(val);
                }}
                required
                disabled={guardando}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted text-lg">
                %
              </span>
            </div>
          </div>

          {porcentajeNum >= 1 && porcentajeNum <= 99 && (
            <div className="bg-surface-high/40 p-4 rounded-xl border border-white/5 space-y-2">
              <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">
                Distribución
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                  <p className="text-emerald-400 font-display text-xl">
                    {porcentajeNum}%
                  </p>
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">
                    Barbero
                  </p>
                </div>
                <span className="text-text-muted text-sm">+</span>
                <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                  <p className="text-blue-400 font-display text-xl">
                    {barberiaPorcentaje}%
                  </p>
                  <p className="text-text-muted text-[10px] uppercase tracking-wider mt-0.5">
                    Barbería
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-text-muted text-xs">
            Este porcentaje se usará al registrar nuevos servicios para{" "}
            <strong className="text-white">{barberName}</strong>. Los servicios
            ya registrados no se verán afectados.
          </p>

          <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando || !esValido}
              className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {guardando ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Check size={16} /> GUARDAR
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
