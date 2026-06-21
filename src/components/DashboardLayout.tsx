"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { datosUsuario, authLoading, rolLoading } = useAuth();

  if (authLoading || rolLoading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <p className="text-text-muted text-[10px] font-bold tracking-widest uppercase">Cargando Sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void flex text-text-primary relative overflow-hidden font-body">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      </div>
      
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-void/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar 
        collapsed={false}
        isOpen={sidebarOpen}
        onToggleCollapse={() => {}}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10 lg:ml-64">
        {/* Header */}
        <Header onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Page content */}
        <div className="flex-1 overflow-y-auto w-full flex flex-col">
          <div className="flex-1 p-8 lg:p-12 max-w-7xl mx-auto w-full animate-fade-in">
            {children}
          </div>
          
          {/* Footer sutil */}
          <Footer />
        </div>
      </main>
    </div>
  );
}
