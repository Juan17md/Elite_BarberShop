"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { type Client } from "@/lib/types";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot,
  query,
  orderBy,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Pencil, Trash2, Phone, Mail, User, Check, Search, X } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";

export default function ClientesPage() {
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const [clientes, setClientes] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", notes: "" });

  useEffect(() => {
    if (!datosUsuario?.uid) return;
    let q;
    if (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin") {
      q = query(collection(db, "clients"), orderBy("name"));
    } else {
      q = query(collection(db, "clients"), where("createdBy", "==", datosUsuario?.uid), orderBy("name"));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      })) as Client[];
      setClientes(data);
    });
    return () => unsubscribe();
  }, [datosUsuario?.rol, datosUsuario?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clientData = {
      ...formData,
      createdAt: new Date(),
      createdBy: datosUsuario?.uid || ""
    };

    if (editingId) {
      await updateDoc(doc(db, "clients", editingId), formData);
    } else {
      await addDoc(collection(db, "clients"), clientData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: "", phone: "", email: "", notes: "" });
  };

  const handleEdit = (cliente: Client) => {
    setFormData({ name: cliente.name, phone: cliente.phone, email: cliente.email || "", notes: cliente.notes || "" });
    setEditingId(cliente.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteDoc(doc(db, "clients", deletingId));
      setDeletingId(null);
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end w-full">
        <button 
          onClick={() => { setIsModalOpen(true); setEditingId(null); setFormData({ name: "", phone: "", email: "", notes: "" }); }}
          className="btn-primary w-full sm:w-auto flex items-center justify-center gap-2 text-sm py-3 sm:py-2.5 px-6"
        >
          <Plus size={18} /> Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <input 
          type="text"
          placeholder="Buscar por nombre o teléfono..."
          className="w-full bg-surface-high border border-white/10 rounded-lg px-4 py-3 pl-12 text-white outline-none focus:border-primary/50 transition-colors font-body text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead>Cliente</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead align="right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <User size={18} className="text-primary" />
                    </div>
                    <span className="font-medium text-white">{cliente.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">{cliente.phone}</TableCell>
                <TableCell className="text-text-secondary">{cliente.email || "-"}</TableCell>
                <TableCell className="text-text-secondary max-w-xs truncate">{cliente.notes || "-"}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => handleEdit(cliente)} className="p-2 text-text-muted hover:text-primary transition-colors">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(cliente.id)} className="p-2 text-text-muted hover:text-primary transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredClientes.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            No hay clientes registrados
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm">
          <div className="card-premium w-full max-w-md p-8 relative border-t-2 border-t-primary border-primary/20">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-text-muted hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="font-display text-3xl mb-6">
              {editingId ? "EDITAR " : "NUEVO "}
              <span className="text-primary italic">CLIENTE</span>
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Nombre</label>
                <input 
                  type="text" 
                  className="w-full bg-surface-high border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors font-body text-sm"
                  placeholder="Juan Pérez"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Teléfono</label>
                <input 
                  type="tel" 
                  className="w-full bg-surface-high border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors font-body text-sm"
                  placeholder="+57 300 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Email (opcional)</label>
                <input 
                  type="email" 
                  className="w-full bg-surface-high border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors font-body text-sm"
                  placeholder="juan@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary uppercase tracking-wider mb-2">Notas (opcional)</label>
                <textarea 
                  className="w-full bg-surface-high border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-primary/50 transition-colors font-body text-sm h-24 resize-none"
                  placeholder="Notas sobre el cliente..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 rounded-xl border border-outline text-text-muted hover:text-white transition-colors uppercase tracking-widest text-xs font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="w-full btn-primary py-3 flex justify-center items-center uppercase tracking-widest text-xs font-bold gap-2"
                >
                  <Check size={16} /> {editingId ? "GUARDAR" : "CREAR"}
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
            <h3 className="font-display text-2xl mb-2 text-white tracking-wider">¿ELIMINAR <span className="text-red-500">CLIENTE</span>?</h3>
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
