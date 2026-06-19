"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { 
  collection, 
  onSnapshot,
  query,
  orderBy,
  where,
  doc,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Shield, Users, TrendingUp, DollarSign, Calendar, Award, Activity, Wallet } from "lucide-react";
import { getPeriodFromPosition } from "@/lib/utils";
import RegistrarPagoModal from "@/components/RegistrarPagoModal";

interface BarberWithStats {
  uid: string;
  name: string;
  email: string;
  role: "admin" | "barber";
  totalServices: number;
  totalRevenue: number;
  balance: number;
  periodEarnings: number;
  lastActivity?: string;
}

export default function PersonalPage() {
  const { userRole } = useAuth();
  const isAdmin = userRole?.role === "admin";
  const [barbers, setBarbers] = useState<BarberWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"equipo" | "configuracion">("equipo");
  const [selectedBarberForPayout, setSelectedBarberForPayout] = useState<BarberWithStats | null>(null);

  // Calcular el período actual para la cabecera / modal
  const currentPeriod = useMemo(() => {
    const hoy = new Date();
    const fechaCaracas = new Date(hoy.toLocaleString("en-US", { timeZone: "America/Caracas" }));
    const diaSemana = fechaCaracas.getDay();
    const currentPeriodPosition = diaSemana === 0 ? 1 : 0;
    return getPeriodFromPosition(currentPeriodPosition);
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      const timer = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(timer);
    }

    const usersQuery = query(collection(db, "users"), orderBy("name"));
    
    const unsubscribe = onSnapshot(usersQuery, async (usersSnapshot) => {
      const barbersData: BarberWithStats[] = [];
      
      for (const docSnap of usersSnapshot.docs) {
        const userData = docSnap.data();
        const uid = docSnap.id;
        
        const bankRef = doc(db, "bank", uid);
        const bankSnap = await getDoc(bankRef);
        const bankData = bankSnap.exists() ? bankSnap.data() : null;
        
        barbersData.push({
          uid,
          name: userData.name || "Sin nombre",
          email: userData.email || "",
          role: userData.role || "barber",
          totalServices: 0,
          totalRevenue: bankData ? (bankData.totalEarned || 0) : 0,
          balance: bankData ? (bankData.balance || 0) : 0,
          periodEarnings: 0
        });
      }
      
      setBarbers(barbersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin || barbers.length === 0) return;

    const financesQuery = query(collection(db, "finances"), orderBy("date", "desc"));
    
    const unsubscribe = onSnapshot(financesQuery, (snapshot) => {
      const statsByBarber = snapshot.docs.reduce((acc, doc) => {
        const data = doc.data();
        const barberId = data.barberId;
        const date = data.date;
        const isWithinPeriod = date >= currentPeriod.inicio && date <= currentPeriod.fin;

        if (!acc[barberId]) {
          acc[barberId] = { services: 0, periodEarnings: 0 };
        }
        
        acc[barberId].services++;
        if (isWithinPeriod) {
          acc[barberId].periodEarnings += data.barberShare || 0;
        }
        return acc;
      }, {} as Record<string, { services: number; periodEarnings: number }>);

      setBarbers(prev => prev.map(b => ({
        ...b,
        totalServices: statsByBarber[b.uid]?.services || 0,
        periodEarnings: statsByBarber[b.uid]?.periodEarnings || 0
      })));
    });

    return () => unsubscribe();
  }, [isAdmin, barbers.length, currentPeriod]);

  const totalTeamServices = barbers.reduce((acc, b) => acc + b.totalServices, 0);
  const totalTeamRevenue = barbers.reduce((acc, b) => acc + b.totalRevenue, 0);
  const avgServicesPerBarber = barbers.length > 0 ? Math.round(totalTeamServices / barbers.length) : 0;

  if (!isAdmin) {
    return (
      <div className="space-y-8">
        

        <div className="card-premium p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="font-display text-3xl text-primary">
                {userRole?.name?.[0] || "U"}
              </span>
            </div>
            <div>
              <h2 className="font-display text-2xl text-white">{userRole?.name}</h2>
              <p className="text-text-secondary">Barbero</p>
            </div>
          </div>
          <p className="text-text-muted">Dirígete a la sección de Perfil para más opciones.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-primary animate-pulse font-display text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      

      <div className="flex gap-2 border-b border-white/5 pb-1">
        <button
          onClick={() => setActiveTab("equipo")}
          className={`px-6 py-3 font-display text-lg tracking-widest uppercase transition-all ${
            activeTab === "equipo" 
              ? "text-primary border-b-2 border-primary" 
              : "text-text-muted hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Users size={18} />
            Equipo
          </span>
        </button>
        <button
          onClick={() => setActiveTab("configuracion")}
          className={`px-6 py-3 font-display text-lg tracking-widest uppercase transition-all ${
            activeTab === "configuracion" 
              ? "text-primary border-b-2 border-primary" 
              : "text-text-muted hover:text-white"
          }`}
        >
          <span className="flex items-center gap-2">
            <Shield size={18} />
            Configuración
          </span>
        </button>
      </div>

      {activeTab === "equipo" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card-premium p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Total Equipo</p>
                <p className="font-display text-3xl text-white">{barbers.length}</p>
              </div>
            </div>
            
            <div className="card-premium p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Activity className="text-green-500" size={24} />
              </div>
              <div>
                <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Servicios Totales</p>
                <p className="font-display text-3xl text-white">{totalTeamServices}</p>
              </div>
            </div>
            
            <div className="card-premium p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="text-blue-500" size={24} />
              </div>
              <div>
                <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Promedio x Barbero</p>
                <p className="font-display text-3xl text-white">{avgServicesPerBarber}</p>
              </div>
            </div>
            
            <div className="card-premium p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                <DollarSign className="text-cyan-500" size={24} />
              </div>
              <div>
                <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Ingresos Equipo</p>
                <p className="font-display text-3xl text-green-400">${totalTeamRevenue.toFixed(0)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbers.map((barber) => (
              <div key={barber.uid} className="card-premium overflow-hidden group hover:-translate-y-1 transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center font-display text-3xl text-primary border border-primary/20">
                      {barber.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-xl text-white truncate">{barber.name}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase rounded-md mt-1 ${
                        barber.role === "admin" 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          : "bg-surface-high text-text-secondary border border-white/5"
                      }`}>
                        {barber.role === "admin" && <Shield size={10} />}
                        {barber.role === "admin" ? "Admin" : "Barbero"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-text-muted text-xs uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={14} /> Servicios
                      </span>
                      <span className="font-display text-xl text-white">{barber.totalServices}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-text-muted text-xs uppercase tracking-widest flex items-center gap-2">
                        <DollarSign size={14} /> Ingresos
                      </span>
                      <span className="font-display text-xl text-green-400">${barber.totalRevenue.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-text-muted text-xs uppercase tracking-widest flex items-center gap-2">
                        <Award size={14} /> Balance
                      </span>
                      <span className={`font-display text-xl ${barber.balance > 0 ? "text-cyan-400" : "text-text-secondary"}`}>
                        ${barber.balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-text-muted text-[10px] uppercase tracking-widest flex items-center gap-2">
                        <Activity size={14} className="text-primary" /> {currentPeriod.isSunday ? "Ingreso Domingo" : "Semana Actual"}
                      </span>
                      <span className="font-display text-base text-primary">
                        ${(barber.periodEarnings || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-white/5">
                    <button
                      onClick={() => setSelectedBarberForPayout(barber)}
                      className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2 tracking-wider uppercase font-bold"
                    >
                      <Wallet size={14} /> Registrar Pago
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {barbers.length === 0 && (
            <div className="card-premium p-12 text-center">
              <Users size={48} className="text-text-muted mx-auto mb-4" />
              <p className="text-text-muted">No hay barberos registrados</p>
              <p className="text-text-muted text-sm mt-2">Crea usuarios desde Firebase Authentication</p>
            </div>
          )}
        </>
      )}

      {activeTab === "configuracion" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card-premium p-8">
            <h3 className="font-display text-2xl text-white mb-2 flex items-center gap-3">
              <Shield className="text-primary" size={24} />
              Distribución de Comisiones
            </h3>
            <p className="text-text-muted text-sm mb-8">
              Configura el porcentaje de ganancias para barberos y barbería.
            </p>
            
            <div className="space-y-6">
              <div className="bg-surface-high rounded-xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white font-display text-lg">Barbero</span>
                  <span className="text-green-400 font-display text-3xl">60%</span>
                </div>
                <div className="h-3 bg-surface-low rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" style={{ width: "60%" }} />
                </div>
                <p className="text-text-muted text-xs mt-3">
                  Por cada servicio realizado, el barbero recibe el 60% del valor.
                </p>
              </div>

              <div className="bg-surface-high rounded-xl p-6 border border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white font-display text-lg">Barbería</span>
                  <span className="text-blue-400 font-display text-3xl">40%</span>
                </div>
                <div className="h-3 bg-surface-low rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: "40%" }} />
                </div>
                <p className="text-text-muted text-xs mt-3">
                  El 40% restante va directo a los ingresos de la barbería.
                </p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-surface-high/50 rounded-lg border border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="text-primary" size={20} />
                </div>
                <div>
                  <p className="text-white font-display text-sm">Distribución Actual</p>
                  <p className="text-text-muted text-xs">60% Barbero / 40% Barbería</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card-premium p-8">
            <h3 className="font-display text-2xl text-white mb-2 flex items-center gap-3">
              <Award className="text-primary" size={24} />
              Resumen Financiero
            </h3>
            <p className="text-text-muted text-sm mb-8">
              Vista general de las métricas del equipo.
            </p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-surface-high rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <Users className="text-text-muted" size={20} />
                  <span className="text-text-secondary text-sm">Total Especialistas</span>
                </div>
                <span className="font-display text-2xl text-white">{barbers.length}</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-surface-high rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <Calendar className="text-text-muted" size={20} />
                  <span className="text-text-secondary text-sm">Servicios Realizados</span>
                </div>
                <span className="font-display text-2xl text-white">{totalTeamServices}</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-surface-high rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <DollarSign className="text-text-muted" size={20} />
                  <span className="text-text-secondary text-sm">Ingresos Totales</span>
                </div>
                <span className="font-display text-2xl text-green-400">${totalTeamRevenue.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-surface-high rounded-lg border border-white/5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="text-text-muted" size={20} />
                  <span className="text-text-secondary text-sm">Promedio por Barbero</span>
                </div>
                <span className="font-display text-2xl text-cyan-400">${avgServicesPerBarber > 0 ? (totalTeamRevenue / barbers.length || 0).toFixed(2) : "0.00"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBarberForPayout && (
        <RegistrarPagoModal
          isOpen={!!selectedBarberForPayout}
          onClose={() => setSelectedBarberForPayout(null)}
          barberId={selectedBarberForPayout.uid}
          barberName={selectedBarberForPayout.name}
          periodEarnings={selectedBarberForPayout.periodEarnings || 0}
          currentPeriodLabel={currentPeriod.isSunday ? "Ganado este Domingo" : "Ganado esta Semana"}
        />
      )}
    </div>
  );
}