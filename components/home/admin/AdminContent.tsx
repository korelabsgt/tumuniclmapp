'use client';

import React, { useState } from 'react';
import { Settings, LayoutDashboard, Shield, Activity } from 'lucide-react';
import { GestorPublicacionesView } from './GestorPublicacionesView';
import { ConfiguracionPortalView } from './ConfiguracionPortalView';
import type { Publicacion, Politica, ConfiguracionPortal } from '@/components/home/lib/actions';

interface Props {
  publicacionesIniciales: Publicacion[];
  politicasIniciales: Politica[];
  configuracionInicial: ConfiguracionPortal | null;
}

type MainTab = 'gestor' | 'ajustes';

export function AdminContent({ publicacionesIniciales, politicasIniciales, configuracionInicial }: Props) {
  const [activeTab, setActiveTab] = useState<MainTab>('gestor');

  const tabs = [
    { key: 'gestor' as MainTab, label: 'Gestor de Publicaciones', icon: LayoutDashboard, desc: 'Contenido público' },
    { key: 'ajustes' as MainTab, label: 'Ajustes del Portal', icon: Settings, desc: 'Configuración general' },
  ];

  return (
    <section className="relative -mt-[250px] z-30 w-full sm:w-[95%] lg:w-[88%] mx-auto pb-24">
      <div className="rounded-none sm:rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.4)] overflow-hidden border-0 sm:border border-white/10">

        {/* ── Header con gradiente premium ── */}
        <div className="relative bg-gradient-to-br from-[#02245b] via-[#03306e] to-[#041f4a] px-6 md:px-10 py-8 overflow-hidden">
          {/* Decoración de fondo */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-blue-600/10 blur-3xl" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
            {/* Grid decorativo */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="admin-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#admin-grid)" />
            </svg>
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* Info del panel */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 bg-blue-400/20 border border-blue-400/30 rounded-full px-3 py-1">
                  <Shield className="w-3 h-3 text-blue-300" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">Modo Administrador</span>
                </div>
                <div className="flex items-center gap-1.5 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1">
                  <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">En línea</span>
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
                Panel de Administración
              </h1>
              <p className="mt-2 text-blue-200/70 text-sm max-w-md leading-relaxed">
                Gestiona el contenido que ven los ciudadanos. Los cambios se reflejan inmediatamente en el portal público.
              </p>
            </div>

            {/* Tabs de navegación principal */}
            <div className="flex gap-2 self-start md:self-auto shrink-0">
              {tabs.map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`group relative flex flex-col items-start gap-0.5 px-5 py-3 rounded-xl text-left transition-all duration-200 border ${
                    activeTab === key
                      ? 'bg-white/15 border-white/30 shadow-lg shadow-black/20 backdrop-blur-sm'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 transition-colors ${activeTab === key ? 'text-white' : 'text-blue-300 group-hover:text-white'}`} />
                    <span className={`text-sm font-semibold transition-colors ${activeTab === key ? 'text-white' : 'text-blue-200 group-hover:text-white'}`}>{label}</span>
                  </div>
                  <span className={`text-[10px] pl-6 transition-colors ${activeTab === key ? 'text-blue-300' : 'text-blue-400/60 group-hover:text-blue-300/80'}`}>{desc}</span>
                  {activeTab === key && (
                    <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Área de Contenido ── */}
        <div className="bg-gray-50 dark:bg-neutral-900 flex-1 p-6 md:p-10 min-h-[500px]">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeTab === 'gestor' && (
              <GestorPublicacionesView
                publicacionesIniciales={publicacionesIniciales}
                politicasIniciales={politicasIniciales}
              />
            )}
            {activeTab === 'ajustes' && (
              <ConfiguracionPortalView
                configuracionInicial={configuracionInicial}
              />
            )}
          </div>
        </div>

      </div>
    </section>
  );
}
