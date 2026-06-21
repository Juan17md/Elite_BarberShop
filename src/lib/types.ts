export interface Usuario {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: 'superadmin' | 'admin' | 'barber';
  bloqueado: boolean;
  primerInicio: boolean;
  creadoEn: string;
  creadoPor?: string;
}

export type RolUsuario = 'superadmin' | 'admin' | 'barber';

export interface Service {
  id: string;
  name: string;
  price: number;       // precio en BCV (bolívares a tasa BCV)
  priceDivisa?: number; // precio en divisa física / USDT (promoción)
  duration: number; // minutos
  description?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string; // uid del barbero/admin
}

export type CategoriaInventario = "equipos" | "materiales";

export type EstadoEquipo = "nuevo" | "regular" | "malo";

export interface InventoryItem {
  id: string;
  name: string;
  quantity?: number;
  minQuantity?: number; // umbral para alerta de stock bajo
  price: number;
  estado?: EstadoEquipo;
  addedAt: Date;
  addedBy: string;
  categoria?: CategoriaInventario; // legacy docs pueden no tenerla
  unit?: string; // legacy field kept for backward compat
}

export interface Objective {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  endDate: Date;
  createdAt: Date;
  // legacy fields (kept for backward compat with existing docs)
  type?: 'weekly' | 'monthly';
  barberoId?: string;
  startDate?: Date;
  createdByName?: string;
}

export type PaymentMethod = "bcv" | "divisa";

export interface FinancialRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  barberId: string;
  barberName: string;
  clientName: string;
  totalAmount: number;
  barberShare: number; // 60%
  barberiaShare: number; // 40%
  date: string;
  createdAt: Date;
  paymentMethod?: PaymentMethod; // método de pago: bcv (bolívares) o divisa (físico/USDT)
  bcvRate?: number; // tasa BCV al momento del pago (solo si paymentMethod = "bcv")
}

export interface BankAccount {
  id: string;
  userId: string;
  userName: string;
  balance: number;
  totalEarned: number;
  totalPaid: number;
  lastUpdated: Date;
}

export interface BankTransaction {
  id: string;
  userId: string;
  userName: string;
  type: 'earning' | 'withdrawal' | 'adjustment';
  amount: number;
  description: string;
  date: string;
  createdAt: Date;
}

export interface DailyStats {
  date: string;
  totalServices: number;
  totalRevenue: number;
  barberRevenue: { [barberId: string]: number };
  serviceRevenue: { [serviceId: string]: number };
}

export const SERVICES: Service[] = [
  { id: '1', name: 'Corte de Cabello', price: 7, priceDivisa: 5, duration: 45 },
  { id: '2', name: 'Barba', price: 4, priceDivisa: 2, duration: 45 },
  { id: '3', name: 'Corte de Cabello + Barba', price: 10, priceDivisa: 8, duration: 45 },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bcv", label: "BCV (Bolívares)" },
  { value: "divisa", label: "Divisa ($ / USDT)" },
];

export const ROLES: { value: RolUsuario; label: string }[] = [
  { value: 'superadmin', label: 'Super Administrador' },
  { value: 'admin', label: 'Administrador' },
  { value: 'barber', label: 'Barbero' },
];


