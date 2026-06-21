"use client";

import { useState, useEffect } from "react";
import { type BankAccount, type BankTransaction } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  increment
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Check, Loader2, X, Wallet, ArrowDownRight, AlertTriangle } from "lucide-react";
import { Select } from "@/components/ui";
import { getLocalDateString } from "@/lib/utils";

interface RegistrarPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
  barberId: string;
  barberName: string;
  periodEarnings: number;
  currentPeriodLabel: string;
}

const CONCEPT_OPTIONS = [
  { value: "Pago Semanal", label: "Pago Semanal" },
  { value: "Pago Semanal - Parcial", label: "Pago Semanal - Parcial" },
  { value: "Pago de Domingo", label: "Pago de Domingo" },
  { value: "Domingo - Parcial", label: "Domingo - Parcial" },
  { value: "otro", label: "Otro (Especificar)" }
];

export default function RegistrarPagoModal({
  isOpen,
  onClose,
  barberId,
  barberName,
  periodEarnings,
  currentPeriodLabel
}: RegistrarPagoModalProps) {
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [monto, setMonto] = useState<string>("");
  const [concepto, setConcepto] = useState<string>("Pago Semanal");
  const [otroConcepto, setOtroConcepto] = useState<string>("");
  const [guardando, setGuardando] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!barberId || !isOpen) return;

    const bankRef = doc(db, "bank", barberId);
    const unsubscribe = onSnapshot(bankRef, (docSnap) => {
      if (docSnap.exists()) {
        setBankAccount({
          id: docSnap.id,
          ...docSnap.data()
        } as BankAccount);
      } else {
        setBankAccount({
          id: barberId,
          userId: barberId,
          userName: barberName,
          balance: 0,
          totalEarned: 0,
          totalPaid: 0,
          lastUpdated: new Date()
        } as BankAccount);
      }
    });

    // Resetear campos
    setMonto("");
    // Asignar concepto predeterminado según el período
    if (currentPeriodLabel.toLowerCase().includes("domingo")) {
      setConcepto("Pago de Domingo");
    } else {
      setConcepto("Pago Semanal");
    }
    setOtroConcepto("");
    setErrorMsg(null);

    return () => unsubscribe();
  }, [barberId, barberName, isOpen, currentPeriodLabel]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  const balanceActual = bankAccount?.balance ?? 0;
  const montoNum = parseFloat(monto) || 0;
  const saldoRestante = balanceActual - montoNum;
  const esConceptoOtro = concepto === "otro";

  const handlePagarTodo = () => {
    setMonto(balanceActual.toFixed(2));
  };

  const handlePagarPeriodo = () => {
    setMonto(periodEarnings.toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoNum <= 0) {
      setErrorMsg("El monto a pagar debe ser mayor a 0");
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

    try {
      // 1. Actualizar cuenta bancaria del barbero
      const bankRef = doc(db, "bank", barberId);
      const bankDoc = await getDoc(bankRef);

      if (!bankDoc.exists()) {
        // Inicializar si no existe por alguna razón
        await updateDoc(bankRef, {
          userId: barberId,
          userName: barberName,
          balance: -montoNum,
          totalEarned: 0,
          totalPaid: montoNum,
          lastUpdated: new Date()
        });
      } else {
        await updateDoc(bankRef, {
          balance: increment(-montoNum),
          totalPaid: increment(montoNum),
          lastUpdated: new Date()
        });
      }

      // 2. Registrar la transacción
      await addDoc(collection(db, "bank_transactions"), {
        userId: barberId,
        userName: barberName,
        type: "withdrawal",
        amount: montoNum,
        description: descripcionFinal,
        date: getLocalDateString(),
        createdAt: new Date()
      });

      setGuardando(false);
      onClose();
    } catch (error) {
      console.error("Error al registrar el pago:", error);
      setErrorMsg("Ocurrió un error al procesar el pago. Intente de nuevo.");
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
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Wallet size={20} />
          </div>
          <div>
            <h2 className="font-display text-2xl text-white tracking-widest uppercase">REGISTRAR PAGO</h2>
            <p className="text-text-muted text-xs font-body tracking-wider">{barberName}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-surface-high/40 p-4 rounded-xl border border-white/5">
            <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Saldo Acumulado</p>
            <p className="font-display text-2xl text-white mt-1">${balanceActual.toFixed(2)}</p>
          </div>
          <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
            <p className="text-primary text-[10px] font-bold uppercase tracking-widest leading-tight">{currentPeriodLabel}</p>
            <p className="font-display text-2xl text-primary mt-1">${periodEarnings.toFixed(2)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
              Monto a Pagar ($)
            </label>
            <div className="relative">
              <input 
                type="number"
                step="0.01"
                min="0.01"
                className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 pr-28 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none font-display tracking-wider"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                required
                disabled={guardando}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {periodEarnings > 0 && (
                  <button
                    type="button"
                    onClick={handlePagarPeriodo}
                    className="px-2 py-1 bg-primary/10 text-primary text-[9px] font-bold rounded hover:bg-primary/20 transition-colors border border-primary/20"
                    title="Cargar el monto ganado en el período"
                  >
                    Período
                  </button>
                )}
                {balanceActual > 0 && (
                  <button
                    type="button"
                    onClick={handlePagarTodo}
                    className="px-2 py-1 bg-white/5 text-text-secondary text-[9px] font-bold rounded hover:bg-white/10 transition-colors border border-white/10"
                    title="Cargar el balance acumulado total"
                  >
                    Todo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
              Concepto de Pago
            </label>
            <Select
              options={CONCEPT_OPTIONS}
              value={concepto}
              onChange={(val) => setConcepto(val)}
              className="bg-void/50 border-white/10 rounded-md"
              disabled={guardando}
            />
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

          {/* Mostrar visualización del saldo restante */}
          {montoNum > 0 && (
            <div className={`p-3.5 rounded-lg flex items-center gap-3 border text-xs ${
              saldoRestante < 0 
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                : "bg-surface-high/30 border-white/5 text-text-secondary"
            }`}>
              {saldoRestante < 0 ? (
                <AlertTriangle size={16} className="shrink-0" />
              ) : (
                <ArrowDownRight size={16} className="shrink-0 text-green-400" />
              )}
              <div>
                <span className="font-body">Saldo restante tras pago: </span>
                <span className={`font-display font-bold ${saldoRestante < 0 ? "text-amber-400" : "text-white"}`}>
                  ${saldoRestante.toFixed(2)}
                </span>
                {saldoRestante < 0 && (
                  <p className="text-[10px] text-amber-500/80 mt-0.5">
                    El pago supera el saldo disponible. La cuenta quedará en negativo (adelanto).
                  </p>
                )}
              </div>
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
                <><Loader2 size={16} className="animate-spin" /> Procesando...</>
              ) : (
                <><Check size={16} /> REGISTRAR PAGO</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
