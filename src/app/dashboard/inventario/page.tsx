"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  type CategoriaInventario,
  type EstadoEquipo,
  type InventoryItem,
} from "@/lib/types";
import { toast } from "sonner";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  AlertTriangle,
  Check,
  Package,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  SelectField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";

const CATEGORIAS_INVENTARIO: { valor: CategoriaInventario; etiqueta: string }[] = [
  { valor: "equipos", etiqueta: "Equipos" },
  { valor: "materiales", etiqueta: "Materiales" },
];

const FILTROS_ESTADO = ["all", "low", "out"] as const;
const ESTADOS_EQUIPO: { valor: EstadoEquipo; etiqueta: string }[] = [
  { valor: "nuevo", etiqueta: "Nuevo" },
  { valor: "regular", etiqueta: "Regular" },
  { valor: "malo", etiqueta: "Malo" },
];
const OPCIONES_ESTADO_EQUIPO = ESTADOS_EQUIPO.map((estado) => ({
  value: estado.valor,
  label: estado.etiqueta,
}));
type FiltroEstado = (typeof FILTROS_ESTADO)[number];

export default function InventarioPage() {
  const { datosUsuario, authLoading, rolLoading } = useAuth();
  const isAdmin = (datosUsuario?.rol === "admin" || datosUsuario?.rol === "superadmin");

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FiltroEstado>("all");
  const [categoriaActiva, setCategoriaActiva] =
    useState<CategoriaInventario>("materiales");
  const [formData, setFormData] = useState({
    categoria: "materiales" as CategoriaInventario,
    name: "",
    quantity: "",
    minQuantity: "",
    price: "",
    estado: "nuevo" as EstadoEquipo,
  });

  useEffect(() => {
    const consultaInventario = query(
      collection(db, "inventory"),
      orderBy("name")
    );

    const unsubscribe = onSnapshot(consultaInventario,
      (snapshot) => {
        const data = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
          categoria:
            (documento.data().categoria as CategoriaInventario | undefined) ??
            "materiales",
          addedAt: documento.data().addedAt?.toDate(),
        })) as InventoryItem[];

        setItems(data);
      },
      (error) => {
        console.error("Error cargando inventario:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const resetForm = (categoria: CategoriaInventario = categoriaActiva) => {
    setFormData({
      categoria,
      name: "",
      quantity: "",
      minQuantity: "",
      price: "",
      estado: "nuevo",
    });
  };

  const getStockStatus = (item: InventoryItem) => {
    if ((item.categoria ?? "materiales") === "equipos") {
      if (item.estado === "malo") return "out";
      if (item.estado === "regular") return "low";
      return "ok";
    }

    const cantidad = item.quantity ?? 0;
    const cantidadMinima = item.minQuantity ?? 0;

    if (cantidad === 0) return "out";
    if (cantidad <= cantidadMinima) return "low";
    return "ok";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const esEquipo = formData.categoria === "equipos";
    const datosComunes = {
      categoria: formData.categoria,
      name: formData.name,
      quantity: esEquipo ? 0 : Number(formData.quantity || 0),
      minQuantity: esEquipo ? 0 : Number(formData.minQuantity || 0),
      price: Number(formData.price || 0),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "inventory", editingId), {
          ...datosComunes,
          ...(esEquipo ? { estado: formData.estado } : {}),
        });
      } else {
        await addDoc(collection(db, "inventory"), {
          ...datosComunes,
          ...(esEquipo ? { estado: formData.estado } : {}),
          addedAt: new Date(),
          addedBy: datosUsuario?.uid || "",
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error("Error al guardar inventario:", error);
      toast.error("Error al guardar el item");
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData({
      categoria: item.categoria ?? "materiales",
      name: item.name,
      quantity: String(item.quantity ?? ""),
      minQuantity: String(item.minQuantity ?? ""),
      price: String(item.price),
      estado: item.estado ?? "nuevo",
    });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      try {
        await deleteDoc(doc(db, "inventory", deletingId));
        setDeletingId(null);
      } catch (error) {
        console.error("Error al eliminar item:", error);
        toast.error("Error al eliminar el item");
      }
    }
  };

  const handleChangeCategoria = (categoria: CategoriaInventario) => {
    setCategoriaActiva(categoria);
    setFilter("all");
    if (!editingId) {
      resetForm(categoria);
    }
  };

  const itemsPorCategoria = {
    equipos: items.filter((item) => (item.categoria ?? "materiales") === "equipos"),
    materiales: items.filter(
      (item) => (item.categoria ?? "materiales") === "materiales"
    ),
  };

  const getItemsFiltrados = (categoria: CategoriaInventario) =>
    itemsPorCategoria[categoria].filter((item) => {
      const status = getStockStatus(item);
      if (filter === "all") return true;
      if (filter === "low") return status === "low";
      if (filter === "out") return status === "out";
      return true;
    });

  const resumenPorCategoria = {
    equipos: {
      total: itemsPorCategoria.equipos.length,
      low: itemsPorCategoria.equipos.filter(
        (item) => getStockStatus(item) === "low"
      ).length,
      out: itemsPorCategoria.equipos.filter(
        (item) => getStockStatus(item) === "out"
      ).length,
    },
    materiales: {
      total: itemsPorCategoria.materiales.length,
      low: itemsPorCategoria.materiales.filter(
        (item) => getStockStatus(item) === "low"
      ).length,
      out: itemsPorCategoria.materiales.filter(
        (item) => getStockStatus(item) === "out"
      ).length,
    },
  };

  const totalItems = items.length;
  const lowStockCount = items.filter((item) => getStockStatus(item) === "low").length;
  const outOfStockCount = items.filter((item) => getStockStatus(item) === "out").length;

  const opcionesFiltroEstado = FILTROS_ESTADO.map((estado) => ({
    value: estado,
    label:
      estado === "all"
        ? `Todos (${totalItems})`
        : estado === "low"
        ? `Bajo (${lowStockCount})`
        : `Agotado (${outOfStockCount})`,
  }));

  const renderTablaInventario = (
    categoria: CategoriaInventario,
    titulo: string
  ) => {
    const itemsFiltrados = getItemsFiltrados(categoria);
    const resumenCategoria = resumenPorCategoria[categoria];

    return (
      <div className="card-premium overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/5">
          <div>
            <h3 className="font-display text-xl text-white tracking-[0.2em] uppercase">
              {titulo}
            </h3>
            <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70 mt-1">
              Total: {resumenCategoria.total} · Bajo: {resumenCategoria.low} · Agotado:{" "}
              {resumenCategoria.out}
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setCategoriaActiva(categoria);
                setEditingId(null);
                resetForm(categoria);
                setIsModalOpen(true);
              }}
              className="btn-primary w-auto px-4 py-2 md:px-5 md:py-3"
            >
              <Plus size={20} className="mr-2" /> NUEVO{" "}
              {categoria === "equipos" ? "EQUIPO" : "MATERIAL"}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead>Producto</TableHead>
                {categoria === "materiales" && <TableHead>Cantidad</TableHead>}
                {categoria === "materiales" && <TableHead>Mínimo</TableHead>}
                <TableHead>Precio</TableHead>
                {categoria === "equipos" && <TableHead>Estado</TableHead>}
                {isAdmin && (
                  <TableHead align="right" className="w-24">
                    Acciones
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsFiltrados.map((item) => {
                const status = getStockStatus(item);

                return (
                  <TableRow key={item.id} className="group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary tracking-wide">
                          {item.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-text-muted opacity-70">
                          {item.categoria ?? "materiales"}
                        </span>
                      </div>
                    </TableCell>
                    {categoria === "materiales" && (
                      <TableCell className="text-text-secondary font-display text-xl tracking-tighter">
                        {item.quantity ?? 0}
                      </TableCell>
                    )}
                    {categoria === "materiales" && (
                      <TableCell className="text-text-muted">
                        {item.minQuantity ?? 0}
                      </TableCell>
                    )}
                    <TableCell className="text-text-primary font-display text-xl tracking-widest">
                      ${item.price.toFixed(2)}
                    </TableCell>
                    {categoria === "equipos" && (
                      <TableCell>
                        {status === "out" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 font-display text-[11px] font-bold uppercase tracking-widest border border-red-500/20">
                            MALO
                          </span>
                        )}
                        {status === "low" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 font-display text-[11px] font-bold uppercase tracking-widest border border-amber-500/20">
                            REGULAR
                          </span>
                        )}
                        {status === "ok" && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-display text-[11px] font-bold uppercase tracking-widest border border-emerald-500/20">
                            NUEVO
                          </span>
                        )}
                      </TableCell>
                    )}
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center justify-end gap-2 opacity-30 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            aria-label={`Editar ${item.name}`}
                            title={`Editar ${item.name}`}
                            className="p-2 text-text-muted hover:text-primary transition-colors"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            aria-label={`Eliminar ${item.name}`}
                            title={`Eliminar ${item.name}`}
                            className="p-2 text-text-muted hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {itemsFiltrados.length === 0 && (
            <div className="text-center py-24 text-text-muted uppercase tracking-[0.3em] text-[10px] font-bold opacity-50">
              No se encontraron {categoria === "equipos" ? "equipos" : "materiales"}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="hidden">
        {CATEGORIAS_INVENTARIO.map((categoria) => (
          <button
            key={categoria.valor}
            onClick={() => handleChangeCategoria(categoria.valor)}
            className={`px-6 py-3 rounded-md font-display text-[13px] font-bold tracking-widest uppercase transition-all border ${
              categoriaActiva === categoria.valor
                ? "bg-primary text-white border-primary shadow-red-glow"
                : "bg-surface-high text-text-muted border-white/5 hover:border-primary/30 hover:text-white"
            }`}
          >
            {categoria.etiqueta}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="card-premium p-6 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 transition-colors">
              <Package size={24} className="text-primary" />
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
                Inventario Total
              </p>
              <p className="font-display text-5xl text-white tracking-tight leading-none">
                {totalItems}
              </p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6 border-amber-500/20 bg-amber-500/3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <AlertTriangle size={24} className="text-amber-500" />
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
                Stock Bajo
              </p>
              <p className="font-display text-5xl text-white tracking-tight leading-none">
                {lowStockCount}
              </p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6 border-red-500/20 bg-red-500/3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <XCircle size={24} className="text-red-500" />
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
                Agotados
              </p>
              <p className="font-display text-5xl text-white tracking-tight leading-none">
                {outOfStockCount}
              </p>
            </div>
          </div>
        </div>

        <div className="card-premium p-6 border-emerald-500/20 bg-emerald-500/4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Check size={24} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-text-muted text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
                En Stock
              </p>
              <p className="font-display text-5xl text-white tracking-tight leading-none">
                {Math.max(0, totalItems - lowStockCount - outOfStockCount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          label="Filtrar por estado"
          options={opcionesFiltroEstado}
          value={filter}
          onValueChange={(value) => setFilter(value as FiltroEstado)}
          selectClassName="w-full"
        />
      </div>

      <div className="space-y-8">
        {renderTablaInventario("equipos", "Equipos de la barbería")}
        {renderTablaInventario("materiales", "Materiales de la barbería")}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-void/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="card-premium p-8 w-full max-w-md border-primary/20 shadow-red-strong">
            <h2 className="font-display text-3xl text-white mb-8 tracking-widest uppercase">
              {editingId
                ? formData.categoria === "equipos"
                  ? "Editar Equipo"
                  : "Editar Material"
                : formData.categoria === "equipos"
                  ? "Nuevo Equipo"
                  : "Nuevo Material"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  {formData.categoria === "equipos"
                    ? "Nombre del Equipo"
                    : "Nombre del Material"}
                </label>
                <input
                  type="text"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                  placeholder={
                    formData.categoria === "equipos"
                      ? "Ej: Máquina Wahl Senior"
                      : "Ej: Cuchillas Derby"
                  }
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              {formData.categoria === "materiales" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 outline-none"
                      placeholder="Ej: 10"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                      Mínimo
                    </label>
                    <input
                      type="number"
                      className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 outline-none"
                      placeholder="Ej: 5"
                      value={formData.minQuantity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minQuantity: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
              ) : (
                <SelectField
                  label="Estado"
                  value={formData.estado}
                  onValueChange={(valor) =>
                    setFormData({
                      ...formData,
                      estado: valor as EstadoEquipo,
                    })
                  }
                  options={OPCIONES_ESTADO_EQUIPO}
                  required
                  selectClassName="bg-void/50 border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 font-normal"
                />
              )}

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">
                  Precio
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-void/50 border border-white/10 rounded-md px-4 py-3 text-white focus:border-primary/50 outline-none font-display tracking-widest"
                  placeholder="Ej: 3.50"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
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
                <button type="submit" className="flex-1 btn-primary">
                  {editingId ? "GUARDAR" : "CREAR"}
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
            <h3 className="font-display text-2xl mb-2 text-white tracking-wider">
              ¿ELIMINAR <span className="text-red-500">PRODUCTO</span>?
            </h3>
            <p className="text-text-muted text-sm mb-8 font-body">
              Esta acción no se puede deshacer y los datos se perderán permanentemente.
            </p>
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
