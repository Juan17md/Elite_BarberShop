"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import type { Usuario } from "@/lib/types";
import { ROLES } from "@/lib/types";
import {
  Plus,
  Pencil,
  Trash2,
  User,
  Shield,
  Scissors,
  ShieldCheck,
  Loader2,
  Lock,
  Unlock,
} from "lucide-react";
import { Select } from "@/components/ui";

export default function UsuariosPage() {
  const { datosUsuario } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoUid, setEditandoUid] = useState<string | null>(null);
  const [eliminandoUid, setEliminandoUid] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "barber" as "superadmin" | "admin" | "barber",
  });

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name"));
    const unsub = onSnapshot(q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          uid: doc.id,
          ...doc.data(),
        })) as Usuario[];
        setUsuarios(data);
        setLoading(false);
      },
      (error) => {
        console.error("Error cargando usuarios:", error);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const abrirCrearModal = () => {
    setEditandoUid(null);
    setFormData({ email: "", password: "", name: "", phone: "", role: "barber" });
    setErrorMensaje(null);
    setModalAbierto(true);
  };

  const abrirEditarModal = (usuario: Usuario) => {
    setEditandoUid(usuario.uid);
    setFormData({
      email: usuario.email,
      password: "",
      name: usuario.name,
      phone: usuario.phone || "",
      role: usuario.role,
    });
    setErrorMensaje(null);
    setModalAbierto(true);
  };

  const toggleBloqueo = async (usuario: Usuario) => {
    if (!auth.currentUser) return;
    try {
      const token = await auth.currentUser.getIdToken();
      const respuesta = await fetch(`/api/usuarios/${usuario.uid}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bloqueado: !usuario.bloqueado }),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json();
        alert(datos.error || "Error al cambiar estado de bloqueo");
      }
    } catch (error) {
      console.error("Error cambiando bloqueo:", error);
      alert("Error al cambiar estado de bloqueo");
    }
  };

  const handleGuardar = async () => {
    if (!formData.name || !formData.email) {
      setErrorMensaje("Nombre y email son obligatorios");
      return;
    }
    if (!editandoUid && !formData.password) {
      setErrorMensaje("La contraseña es obligatoria para nuevos usuarios");
      return;
    }
    if (!editandoUid && formData.password.length < 6) {
      setErrorMensaje("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (!auth.currentUser) {
      setErrorMensaje("No se pudo autenticar. Recarga la página.");
      return;
    }

    setGuardando(true);
    setErrorMensaje(null);

    try {
      const token = await auth.currentUser.getIdToken();

      if (editandoUid) {
        const body: Record<string, unknown> = {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
        };
        if (formData.password && formData.password.length >= 6) {
          body.password = formData.password;
        }

        const respuesta = await fetch(`/api/usuarios/${editandoUid}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
          setErrorMensaje(datos.error || "Error al actualizar el usuario");
          return;
        }
      } else {
        const respuesta = await fetch("/api/usuarios", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            phone: formData.phone,
            role: formData.role,
          }),
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
          setErrorMensaje(datos.error || "Error al crear el usuario");
          return;
        }
      }

      setModalAbierto(false);
      setEditandoUid(null);
      setFormData({ email: "", password: "", name: "", phone: "", role: "barber" });
      setErrorMensaje(null);
    } catch (error) {
      console.error("Error guardando usuario:", error);
      setErrorMensaje("Error inesperado al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminandoUid || !auth.currentUser) return;
    setEliminando(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const respuesta = await fetch(`/api/usuarios/${eliminandoUid}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        alert(datos.error || "Error al eliminar el usuario");
        return;
      }
      setEliminandoUid(null);
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      alert("Error al eliminar el usuario");
    } finally {
      setEliminando(false);
    }
  };

  const iconoRol = (rol: string) => {
    switch (rol) {
      case "superadmin":
        return <ShieldCheck size={16} className="text-amber-400" />;
      case "admin":
        return <Shield size={16} className="text-primary" />;
      default:
        return <Scissors size={16} className="text-blue-400" />;
    }
  };

  const etiquetaRol = (rol: string) => {
    switch (rol) {
      case "superadmin":
        return "Super Admin";
      case "admin":
        return "Administrador";
      default:
        return "Barbero";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl text-white tracking-wide">
          GESTIÓN DE <span className="text-primary">USUARIOS</span>
        </h2>
        <button
          onClick={abrirCrearModal}
          className="btn-primary flex items-center gap-2 py-3 px-5 text-xs uppercase tracking-widest"
        >
          <Plus size={18} /> Nuevo Usuario
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {usuarios.map((usuario) => (
          <div
            key={usuario.uid}
            className={`bg-surface-high/50 p-5 rounded-xl border transition-all group ${
              usuario.bloqueado
                ? "border-red-500/30 bg-red-500/5"
                : "border-white/5 hover:border-primary/20"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 overflow-hidden">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border ${
                    usuario.bloqueado
                      ? "bg-red-500/10 border-red-500/20"
                      : "bg-primary/20 border-primary/10"
                  }`}
                >
                  <User size={20} className={usuario.bloqueado ? "text-red-400" : "text-primary"} />
                </div>
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <p className="font-display text-base text-white truncate tracking-wide">
                      {usuario.name}
                    </p>
                    {usuario.bloqueado && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase tracking-wider">
                        BLOQ
                      </span>
                    )}
                  </div>
                  <p className="text-text-muted text-[11px] truncate opacity-80">{usuario.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                {iconoRol(usuario.role)}
                {usuario.uid !== datosUsuario?.uid && (
                  <>
                    <button
                      onClick={() => abrirEditarModal(usuario)}
                      className="p-2 text-text-muted hover:text-primary transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setEliminandoUid(usuario.uid)}
                      className="p-2 text-text-muted hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  usuario.role === "superadmin"
                    ? "bg-amber-500/20 text-amber-400"
                    : usuario.role === "admin"
                    ? "bg-primary/20 text-primary"
                    : "bg-blue-500/20 text-blue-400"
                }`}
              >
                {etiquetaRol(usuario.role)}
              </span>
              {usuario.uid !== datosUsuario?.uid && (
                <button
                  onClick={() => toggleBloqueo(usuario)}
                  className={`p-2 rounded-lg transition-all ${
                    usuario.bloqueado
                      ? "text-emerald-400 hover:bg-emerald-500/10"
                      : "text-red-400 hover:bg-red-500/10"
                  }`}
                  title={usuario.bloqueado ? "Desbloquear usuario" : "Bloquear usuario"}
                >
                  {usuario.bloqueado ? <Unlock size={16} /> : <Lock size={16} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {usuarios.length === 0 && !loading && (
        <div className="text-center py-20 text-text-muted">
          <p className="text-lg">No hay usuarios registrados</p>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-6 sm:p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">
              {editandoUid ? "Editar Usuario" : "Nuevo Usuario"}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Nombre
                </label>
                <input
                  type="text"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                  placeholder="Nombre completo"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="email@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editandoUid}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Teléfono
                </label>
                <input
                  type="tel"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                  placeholder="+58 412 1234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                  placeholder={editandoUid ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Rol
                </label>
                <Select
                  options={ROLES}
                  value={formData.role}
                  onChange={(val) => setFormData({ ...formData, role: val as typeof formData.role })}
                  placeholder="Seleccionar rol..."
                  className="bg-void/50 border-white/10 rounded-md"
                />
              </div>
            </div>

            {errorMensaje && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {errorMensaje}
              </div>
            )}

            <div className="flex gap-4 mt-8 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setModalAbierto(false);
                  setErrorMensaje(null);
                }}
                className="flex-1 px-4 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest text-text-muted hover:text-white transition-colors border border-white/5 bg-white/5"
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
                disabled={guardando}
              >
                {guardando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Procesando...
                  </>
                ) : editandoUid ? (
                  "GUARDAR"
                ) : (
                  "CREAR"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminación */}
      {eliminandoUid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="card-premium w-full max-w-sm p-8 relative flex flex-col items-center text-center border-t-2 border-t-red-500 border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.1)]">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-red-500 border border-red-500/20">
              <Trash2 size={24} />
            </div>
            <h3 className="font-display text-2xl mb-2 text-white tracking-wider">
              ¿ELIMINAR <span className="text-red-500">USUARIO</span>?
            </h3>
            <p className="text-text-muted text-sm mb-8 font-body">
              Esta acción no se puede deshacer y el usuario perderá acceso permanentemente.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setEliminandoUid(null)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-text-muted hover:bg-surface-high hover:text-white transition-all font-bold text-xs tracking-widest uppercase"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 hover:border-red-500 hover:shadow-red-glow font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2"
                disabled={eliminando}
              >
                {eliminando ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Eliminando...
                  </>
                ) : (
                  "Eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
