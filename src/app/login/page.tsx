"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Scissors, Loader2, Clock, Activity, BarChart3, ChevronRight, Sparkles, Star, Eye, EyeOff } from "lucide-react";
import { Input, Label, Button } from "@/components/ui";
import { toSpanishUserMessage } from "@/components/notifications";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      const token = await userCredential.user.getIdToken();
      document.cookie = `firebase-token=${token}; path=/; max-age=3600`;
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      const errorCode = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : 'unknown';
      console.error('Error de autenticación:', errorCode, err);
      setError(
        toSpanishUserMessage(
          err,
          "Credenciales inválidas. Por favor, inténtalo de nuevo."
        )
      );
      setLoading(false);
    }
  };

  const features = [
    { icon: Clock, title: "Agenda Inteligente", desc: "Gestiona tus citas y disponibilidad" },
    { icon: Activity, title: "Estadísticas de Barberos", desc: "Mide el rendimiento y productividad de tu equipo" },
    { icon: BarChart3, title: "Análisis Financiero", desc: "Control de ganancias y reportes" },
  ];

  return (
    <main className="min-h-screen bg-void flex">
      {/* Left Side - Brand Presentation */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-surface via-void to-void" />
          
          {/* Glowing Orbs */}
          <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
          
          {/* Diagonal Line Accent */}
          <div className="absolute top-0 right-0 w-full h-full overflow-hidden">
            <div className="absolute top-[-50%] right-[-30%] w-[100%] h-[200%] bg-gradient-to-l from-primary/3 to-transparent rotate-12" />
          </div>
          
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-[0.015]" 
            style={{ 
              backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
                               linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
              backgroundSize: '50px 50px'
            }} 
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between px-16 xl:px-20 py-16 w-full">
          {/* Top Section */}
          <div>
            {/* Logo */}
            <div className="mb-20">
              <img 
                src="https://ik.imagekit.io/h5w0cdkit/elite_barber_shop/loogo1.png" 
                alt="Elite BarberShop Logo" 
                className="h-28 max-w-full object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-transform hover:scale-105 duration-500"
              />
            </div>

            {/* Hero Text */}
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Star size={12} className="text-primary" />
                <span className="text-primary text-xs font-medium tracking-wide">SISTEMA PREMIUM</span>
              </div>
              <h2 className="font-hero text-6xl xl:text-7xl text-text-primary leading-[0.95] mb-8">
                GESTIÓN<br />
                <span className="text-primary">PROFESIONAL</span>
              </h2>
              <p className="text-text-secondary text-lg leading-relaxed max-w-md">
                Optimiza tu barbería con herramientas diseñadas para maximizar tu productividad y ganancias.
              </p>
            </div>
          </div>

          {/* Bottom - Features */}
          <div className="grid grid-cols-3 gap-6 pt-12 border-t border-white/5 mt-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="group">
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 group-hover:border-primary/30 flex items-center justify-center mb-3 transition-colors">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <h3 className="font-display text-lg text-text-primary tracking-wide">{feature.title}</h3>
                  <p className="text-text-muted text-xs mt-1 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Footer Badge */}
          <div className="flex items-center gap-3 mt-8 pt-8">
            <Sparkles size={14} className="text-primary" />
            <span className="text-text-muted text-sm">Diseñado para profesionales</span>
            <span className="text-border-default">•</span>
            <span className="text-text-muted text-sm">Actualizado 2026</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 lg:p-16 relative">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-surface via-surface-low to-void" />
          <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-primary/3 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 w-full max-w-sm sm:max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-12">
            <img 
              src="https://ik.imagekit.io/h5w0cdkit/elite_barber_shop/loogo1.png" 
              alt="Elite BarberShop Logo" 
              className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
            />
          </div>

          {/* Desktop Welcome Text - Hidden on mobile */}
          <div className="hidden lg:block mb-10">
            <h2 className="font-display text-4xl text-text-primary tracking-wide mb-3">
              BIENVENIDO
            </h2>
            <p className="text-text-muted">
              Accede a tu panel de gestión
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-surface/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 sm:p-10">
            {/* Mobile Welcome Text */}
            <div className="lg:hidden mb-8 text-center">
              <h2 className="font-display text-3xl text-text-primary tracking-wide mb-2">
                BIENVENIDO
              </h2>
              <p className="text-text-muted text-sm">
                Accede a tu panel de gestión  
              </p>    
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <Label className="mb-2">Correo Electrónico</Label>
                <Input 
                  id="login-email"
                  type="email" 
                  placeholder="correo@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-none border-0 border-b border-border-subtle bg-transparent px-0 py-3 text-base text-[#FAFAFA] [color:#FAFAFA!important] [-webkit-text-fill-color:#FAFAFA!important] [caret-color:#FAFAFA!important] focus:border-primary focus:ring-0 focus-visible:ring-0 autofill:bg-transparent [&:-webkit-autofill]:[color:#FAFAFA!important] [&:-webkit-autofill]:[-webkit-text-fill-color:#FAFAFA!important] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out_0s] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_transparent_inset]"
                />
              </div>

              <div>
                <Label className="mb-2">Contraseña</Label>
                <div className="relative">
                  <Input 
                    id="login-password"
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="rounded-none border-0 border-b border-border-subtle bg-transparent px-0 py-3 pr-12 text-base text-[#FAFAFA] [color:#FAFAFA!important] [-webkit-text-fill-color:#FAFAFA!important] [caret-color:#FAFAFA!important] focus:border-primary focus:ring-0 focus-visible:ring-0 autofill:bg-transparent [&:-webkit-autofill]:[color:#FAFAFA!important] [&:-webkit-autofill]:[-webkit-text-fill-color:#FAFAFA!important] [&:-webkit-autofill]:[transition:background-color_9999s_ease-out_0s] [&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_transparent_inset]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-text-muted hover:text-primary transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary-light text-white font-semibold tracking-wide shadow-[0_10px_30px_rgba(139,0,0,0.35)] hover:scale-[1.01] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Autenticando...</span>
                  </>
                ) : (
                  <span>INICIAR SESIÓN</span>
                )}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-center text-xs text-text-muted">
              © 2026 Elite BarberShop
            </p>
            <p className="text-center text-xs text-text-muted/60 mt-2 flex items-center justify-center gap-1">
              Designed by <span className="text-primary font-medium">Juan17md</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
