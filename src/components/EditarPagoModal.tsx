"use client";

import { useState, useEffect } from "react";
import { type BankTransaction } from "@/lib/types";
import { 
  doc,
  updateDoc,
  increment,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { r2 } from "@/lib/utils";
import { Check, Loader2, X, Edit3 } from "lucide-react";

interface EditarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaccion: BankTransaction | null;
}

const CONCEPT_OPTIONS = [
  { value: "Pago Semanal", label: "Pago Semanal" },
  { value: "Pago Semanal - Parcial", label: "Pago Semanal - Parcial" },
  { value: "Pago de Domingo", label: "Pago de Domingo" },
  { value: "Domingo - Parcial", label: "Domingo - Parcial" },
  { value: "otro", label: "Otro (Especificar)" }
];

export default function EditarPagoModal({
  isOpen,
  onClose,
  transaccion
}: EditarPagoModalProps) {
  const [monto, setMonto] = useState<string>("");
  const [concepto, setConcepto] = useState<string>("Pago Semanal");
  const [otroConcepto, setOtroConcepto] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!transaccion || !isOpen) return;

    setMonto(transaccion.amount.toFixed(2));
    setErrorMsg(null);

    const desc = transaccion.description;
    const esPredefinido = CONCEPT_OPTIONS.some(
      (opt) => opt.value !== "otro" && opt.value === desc
    );
    if (esPredefinido) {
      setConcepto(desc);
      setOtroConcepto("");
    } else {
      setConcepto("otro");
      setOtroConcepto(desc);
    }
  }, [transaccion, isOpen]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !transaccion) return null;

  const montoNum = r2(parseFloat(monto) || 0);
  const montoOriginal = transaccion.amount;
  const esConceptoOtro = concepto === "otro";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (montoNum <= 0) {
      setErrorMsg("El monto debe ser mayor a 0");
      return;
    }

    setGuardando(true);
    setErrorMsg(null);

    const descripcionFinal = esConceptoOtro ? otroConcepto.trim() : concepto;
    if (esConceptoOtro && !descripcionFinal) {
      setErrorMsg("Debe especificar el concepto personalizado");
      setGuardando(false);
      return;
    }

    const diferencia = r2(montoNum - montoOriginal);

    try {
      const bankRef = doc(db, "bank", transaccion.userId);
      const bankDoc = await getDoc(bankRef);

      if (bankDoc.exists()) {
        await updateDoc(bankRef, {
          balance: increment(-diferencia),
          totalPaid: increment(diferencia),
          lastUpdated: new Date()
        });
      }

      const txRef = doc(db, "bank_transactions", transaccion.id);
      await updateDoc(txRef, {
        amount: r2(montoNum),
        description: descripcionFinal,
      });

      setGuardando(false);
      onClose();
    } catch (error) {
      console.error("Error al editar el pago:", error);
      setErrorMsg("Ocurrió un error al editar el pago. Intente de nuevo.");
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="card-premium p-6 sm:p-8 w-full max-w-md border-primary/20 shadow-red-strong relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
            <Edit3 size={20} />
          </div>
          <div>
            <h2 className="font-display text-2xl text-white tracking-widest uppercase">EDITAR PAGO</h2>
            <p className="text-text-muted text-xs font-body tracking-wider">{transaccion.userName}</p>
          </div>
        </div>

        <div className="bg-surface-high/40 p-4 rounded-xl border border-white/5 mb-6">
          <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Monto Original</p>
          <p className="font-display text-2xl text-red-400 mt-1">-${montoOriginal.toFixed(2)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
              Nuevo Monto ($)
            </label>
            <input 
              type="number"
              step="0.01"
              min="0.01"
              className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none font-display tracking-wider"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              disabled={guardando}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
              Concepto de Pago
            </label>
            <select
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              disabled={guardando}
              className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none font-display tracking-wider appearance-none"
            >
              {CONCEPT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {esConceptoOtro && (
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                Especificar Concepto
              </label>
              <input 
                type="text"
                className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                placeholder="Escribe el motivo del pago..."
                value={otroConcepto}
                onChange={(e) => setOtroConcepto(e.target.value)}
                required={esConceptoOtro}
                disabled={guardando}
              />
            </div>
          )}

          {montoNum > 0 && montoNum !== montoOriginal && (
            <div className="p-3.5 rounded-lg bg-surface-high/30 border border-white/5 flex items-center gap-3 text-xs">
              <span className="text-text-secondary font-body">
                {montoNum > montoOriginal
                  ? `El saldo del barbero disminuirá en $${(montoNum - montoOriginal).toFixed(2)} adicionales`
                  : `El saldo del barbero se incrementará en $${(montoOriginal - montoNum).toFixed(2)} (devolución parcial)`
                }
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errorMsg}
            </div>
          )}

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
              disabled={guardando}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {guardando ? (
                <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              ) : (
                <><Check size={16} /> GUARDAR</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
