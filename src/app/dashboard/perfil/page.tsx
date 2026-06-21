"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type BankAccount, type BankTransaction } from "@/lib/types";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  User,
  Mail,
  Lock,
  Save,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
} from "lucide-react";
import { getLocalDateString } from "@/lib/utils";

export default function PerfilPage() {
  const { datosUsuario } = useAuth();
  const esBarbero = datosUsuario?.rol === "barber";
  const [editando, setEditando] = useState(false);
  const [formData, setFormData] = useState({ nombre: "", email: "", telefono: "" });
  const [passwordData, setPasswordData] = useState({ nueva: "" });
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [modalRetiroAbierto, setModalRetiroAbierto] = useState(false);
  const [montoRetiro, setMontoRetiro] = useState(0);

  useEffect(() => {
    if (datosUsuario) {
      const timer = setTimeout(() => {
        setFormData((prev) => {
          if (
            prev.nombre === datosUsuario.nombre &&
            prev.email === datosUsuario.email &&
            prev.telefono === (datosUsuario.telefono || "")
          )
            return prev;
          return {
            nombre: datosUsuario.nombre,
            email: datosUsuario.email,
            telefono: datosUsuario.telefono || "",
          };
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [datosUsuario]);

  useEffect(() => {
    if (!datosUsuario?.uid) return;

    const bankRef = doc(db, "bank", datosUsuario.uid);
    const unsubBank = onSnapshot(bankRef, (docSnap) => {
      if (docSnap.exists()) {
        setBankAccount({
          id: docSnap.id,
          ...docSnap.data(),
          lastUpdated: docSnap.data().lastUpdated?.toDate
            ? docSnap.data().lastUpdated.toDate()
            : docSnap.data().lastUpdated
            ? new Date(docSnap.data().lastUpdated)
            : undefined,
        } as BankAccount);
      } else {
        setBankAccount(null);
      }
    });

    const q = query(
      collection(db, "bank_transactions"),
      where("userId", "==", datosUsuario.uid),
      orderBy("createdAt", "desc")
    );
    const unsubTx = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate
          ? doc.data().createdAt.toDate()
          : doc.data().createdAt
          ? new Date(doc.data().createdAt)
          : undefined,
      })) as BankTransaction[];
      setTransactions(data);
    });

    return () => {
      unsubBank();
      unsubTx();
    };
  }, [datosUsuario?.uid]);

  const handleGuardarPerfil = async () => {
    if (!datosUsuario?.uid) return;
    try {
      await updateDoc(doc(db, "users", datosUsuario.uid), {
        name: formData.nombre,
        phone: formData.telefono,
      });
      setEditando(false);
      alert("Perfil actualizado");
    } catch (error) {
      console.error("Error guardando perfil:", error);
    }
  };

  const handleRetiro = async () => {
    if (!datosUsuario?.uid || !bankAccount || montoRetiro <= 0) return;
    if (montoRetiro > bankAccount.balance) {
      alert("No tienes suficiente saldo");
      return;
    }

    try {
      await updateDoc(doc(db, "bank", datosUsuario.uid), {
        balance: bankAccount.balance - montoRetiro,
        totalPaid: bankAccount.totalPaid + montoRetiro,
        lastUpdated: new Date(),
      });

      await addDoc(collection(db, "bank_transactions"), {
        userId: datosUsuario.uid,
        userName: datosUsuario.nombre,
        type: "withdrawal",
        amount: montoRetiro,
        description: "Retiro de ganancias",
        date: getLocalDateString(),
        createdAt: new Date(),
      });

      setModalRetiroAbierto(false);
      setMontoRetiro(0);
      alert("Retiro realizado exitosamente");
    } catch (error) {
      console.error("Error al procesar retiro:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end w-full">
        {!editando && (
          <button
            onClick={() => setEditando(true)}
            className="btn-primary w-full sm:w-auto py-3 sm:py-2.5"
          >
            Editar Perfil
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-premium p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <User size={40} className="text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-white">{datosUsuario?.nombre}</h2>
              <p className="text-text-secondary">
                {datosUsuario?.rol === "superadmin"
                  ? "Super Administrador"
                  : datosUsuario?.rol === "admin"
                  ? "Administrador"
                  : "Barbero"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">
                Nombre
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="text"
                  className="input-premium bg-surface pl-12 w-full"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  disabled={!editando}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="email"
                  className="input-premium bg-surface pl-12 w-full"
                  value={formData.email}
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="tel"
                  className="input-premium bg-surface pl-12 w-full"
                  placeholder="+58 412 1234567"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  disabled={!editando}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                <input
                  type="password"
                  className="input-premium bg-surface pl-12 w-full"
                  placeholder="••••••••"
                  value={passwordData.nueva}
                  onChange={(e) => setPasswordData({ ...passwordData, nueva: e.target.value })}
                />
              </div>
            </div>

            {editando && (
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <button
                  onClick={() => {
                    setEditando(false);
                    setFormData({
                      nombre: datosUsuario?.nombre || "",
                      email: datosUsuario?.email || "",
                      telefono: datosUsuario?.telefono || "",
                    });
                  }}
                  className="flex-1 px-4 py-3.5 rounded-xl border border-white/10 text-text-secondary hover:bg-surface-high transition-colors text-sm uppercase tracking-widest font-bold"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardarPerfil}
                  className="flex-1 btn-primary py-3.5 flex items-center justify-center gap-2 text-sm uppercase tracking-widest"
                >
                  <Save size={18} /> Guardar
                </button>
              </div>
            )}
          </div>
        </div>

        {esBarbero && (
          <div className="card-premium p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <h3 className="font-display text-xl text-white flex items-center gap-2">
                <Wallet size={20} className="text-primary" />
                Tu Banca
              </h3>
              <button
                onClick={() => setModalRetiroAbierto(true)}
                disabled={!bankAccount || bankAccount.balance <= 0}
                className="btn-primary w-full sm:w-auto text-xs py-3 sm:py-2 disabled:opacity-50 uppercase tracking-widest"
              >
                Retirar
              </button>
            </div>

            {bankAccount ? (
              <div className="space-y-4">
                <div className="bg-surface-high/50 p-6 rounded-xl">
                  <p className="text-text-secondary text-sm">Balance Disponible</p>
                  <p className="font-display text-4xl text-white">
                    ${bankAccount.balance.toFixed(2)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-500/10 p-4 rounded-xl">
                    <p className="text-text-secondary text-xs">Total Ganado</p>
                    <p className="font-display text-xl text-green-400">
                      ${bankAccount.totalEarned.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-red-500/10 p-4 rounded-xl">
                    <p className="text-text-secondary text-xs">Total Retirado</p>
                    <p className="font-display text-xl text-red-400">
                      ${bankAccount.totalPaid.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">
                <p>No tienes cuenta bancaria registrada.</p>
                <p className="text-sm mt-2">Registra tu primer servicio para comenzar.</p>
              </div>
            )}

            {transactions.length > 0 && (
              <div className="mt-6">
                <h4 className="text-text-secondary text-sm mb-3">Historial Reciente</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transactions.slice(0, 5).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 bg-surface-high/30 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {t.type === "earning" ? (
                          <ArrowUpRight size={16} className="text-green-400" />
                        ) : (
                          <ArrowDownRight size={16} className="text-red-400" />
                        )}
                        <div>
                          <p className="text-white text-sm">{t.description}</p>
                          <p className="text-text-muted text-xs">{t.date}</p>
                        </div>
                      </div>
                      <span
                        className={t.type === "earning" ? "text-green-400" : "text-red-400"}
                      >
                        {t.type === "earning" ? "+" : "-"}${t.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Retiro */}
      {modalRetiroAbierto && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-6 sm:p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">
              Retirar Ganancias
            </h2>
            <div className="mb-6">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                Balance disponible
              </p>
              <p className="font-display text-4xl text-white">
                ${bankAccount?.balance.toFixed(2)}
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                Monto a retirar
              </label>
              <input
                type="number"
                className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none font-display tracking-widest"
                placeholder="0.00"
                value={montoRetiro}
                onChange={(e) => setMontoRetiro(Number(e.target.value))}
              />
            </div>
            <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setModalRetiroAbierto(false)}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
              >
                Cancelar
              </button>
              <button onClick={handleRetiro} className="flex-1 btn-primary">
                CONFIRMAR RETIRO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
