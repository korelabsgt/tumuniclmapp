'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Home, Info, LayoutDashboard, MoreVertical, X } from 'lucide-react';
import { FaFacebook, FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa6';
import { ThemeSwitcher } from '@/components/themes/theme-switcher';
import AnimatedIcon from '@/components/ui/AnimatedIcon';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription } from '@/components/ui/sheet';
import { useAuthPublico } from '@/components/home/lib/hooks';
import { VisorImagen } from '@/components/home/ui/VisorImagen';
import type { ConfiguracionPortal } from '@/components/home/lib/actions';


const NAV_LINKS = [
  { label: 'Albergues', href: '/albergues', icon: Info, iconBg: 'bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400' },
];

function MenuCard({ label, href, icon: Icon, onClick, iconBg, className = '' }: any) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-3.5 rounded-2xl text-left cursor-pointer bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-700/80 hover:border-[#0066cc]/35 dark:hover:border-blue-500/35 transition-colors group ${className}`}
    >
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${iconBg} transition-transform group-hover:scale-105`}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-gray-100 flex-1">
        {label}
      </span>
    </a>
  );
}

function MenuSectionHeader({ titulo, colorClass, dotClass }: any) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
      <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${colorClass}`}>
        {titulo}
      </p>
      <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
    </div>
  );
}

interface PublicHeaderProps {
  configuracion?: ConfiguracionPortal | null;
  modoAdmin?: boolean;
}

export function PublicHeader({ configuracion, modoAdmin = false }: PublicHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { verificar } = useAuthPublico();

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };


  // Detectar scroll para fijar el header
  useEffect(() => {
    const handleScroll = () => {
      // 250px permite hacer un poco de scroll (varios toques/ruedas) antes de que se ponga sólido
      setScrolled(window.scrollY > 250);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Verificar sesión silenciosamente al montar
  useEffect(() => {
    verificar().then(setAutenticado);
  }, [verificar]);



  let logoUrl = null;
  if (configuracion?.logo_url) {
    logoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/home_imagenes/${configuracion.logo_url}`;
  }

  return (
    <>
      <header 
        className={`fixed top-0 left-0 w-full z-[100] px-6 py-4 flex justify-between items-center transition-all duration-300 ${
          scrolled 
            ? 'bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-md py-3' 
            : 'bg-transparent'
        }`}
      >
        
        {/* Left Side: Socials and Text */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-3">
              <a href="https://www.facebook.com/tumuniclm" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaFacebook className="w-8 h-8 text-[#1877F2] drop-shadow-md" /></a>
              <a href="https://www.tiktok.com/@tumuniclm" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaTiktok className="w-8 h-8 text-black dark:text-white drop-shadow-md" /></a>
              <a href="https://www.instagram.com/tumuniclm?igsh=NWQ3dnZneGxmOThm" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaInstagram className="w-8 h-8 text-[#E4405F] drop-shadow-md" /></a>
              <a href="https://www.youtube.com/@tuMuniCLM" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaYoutube className="w-8 h-8 text-[#FF0000] drop-shadow-md" /></a>
            </div>
            <span className="text-[11px] font-medium drop-shadow-md text-gray-800 dark:text-white mt-1 hidden sm:block">Haz click para ver nuestras redes sociales</span>
          </div>
          
          <a href="/informacionpublica" className="font-bold text-base cursor-pointer hover:underline text-[#0066cc] dark:text-[#3399ff] drop-shadow-md hidden sm:block">
            Información pública
          </a>
        </div>

        {/* Right Side: Theme Switcher + Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="drop-shadow-md">
            <ThemeSwitcher className="[&_svg]:size-6 w-10 h-10 sm:w-10 sm:h-10 hover:scale-110" />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Actualizar"
            className={`inline-flex items-center justify-center w-10 h-10 cursor-pointer drop-shadow-md hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 transition-opacity focus-visible:outline-none ${
              scrolled ? 'text-[#0066cc] dark:text-blue-400' : 'text-white'
            }`}
          >
            <AnimatedIcon
              iconKey="qzorewvq"
              trigger={isRefreshing ? "loop" : "hover"}
              className="w-8 h-8"
            />
          </button>

          {/* Menú Lateral (Sheet) */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
            <SheetTrigger asChild>
              <button 
                className={`p-2 rounded-md transition-colors drop-shadow-md ${
                  scrolled 
                    ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-800' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                {sheetOpen ? (
                  <X className="w-8 h-8" strokeWidth={2.25} />
                ) : (
                  <MoreVertical className="w-8 h-8" strokeWidth={2.25} />
                )}
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-80 bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-700 p-0 flex flex-col pt-[88px]"
              onInteractOutside={(e) => {
                if ((e.target as Element).closest('header')) {
                  e.preventDefault();
                }
              }}
            >
              {/* Para evitar warnings de accesibilidad de Radix UI (el mensaje de tu terminal) */}
              <SheetDescription className="sr-only">
                Menú de navegación y ajustes del portal público
              </SheetDescription>

              {/* Header del Sheet con padding y márgenes similares al original */}
              <SheetHeader className="p-4 mt-4 mb-2 border-b border-gray-200 dark:border-neutral-700 flex justify-center items-center">
                <SheetTitle className="text-center text-gray-900 dark:text-white font-bold text-lg m-0 w-full">
                  {logoUrl ? (
                    <VisorImagen 
                      src={logoUrl} 
                      alt="Logo Municipal" 
                      className="w-[280px] mx-auto"
                    />
                  ) : (
                    <div className="px-6 py-5">
                      Municipalidad de<br />
                      <span className="text-blue-600 dark:text-blue-400">Concepción Las Minas</span>
                    </div>
                  )}
                </SheetTitle>
              </SheetHeader>

              {/* Navegación principal */}
              <div className="flex-1 px-5 py-4 overflow-y-auto">
                <MenuSectionHeader 
                  titulo="Páginas" 
                  colorClass="text-[#0066cc] dark:text-blue-400" 
                  dotClass="bg-[#0066cc] dark:bg-blue-400" 
                />
                
                <div className="flex flex-col gap-2.5">
                  {NAV_LINKS.map((link) => (
                    <MenuCard
                      key={link.label}
                      label={link.label}
                      href={link.href}
                      icon={link.icon}
                      iconBg={link.iconBg}
                      onClick={() => setSheetOpen(false)}
                    />
                  ))}
                </div>

                {/* Zona inferior: Ajustes (solo si autenticado) */}
                {(autenticado || modoAdmin) && (
                  <>
                    <MenuSectionHeader 
                      titulo="Administración" 
                      colorClass="text-violet-500 dark:text-violet-400" 
                      dotClass="bg-violet-500 dark:bg-violet-400" 
                    />
                    <div className="flex flex-col gap-2.5">
                      {modoAdmin ? (
                        <MenuCard
                          label="Ir al Sitio Público"
                          href="/"
                          icon={Home}
                          iconBg="bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                          onClick={() => setSheetOpen(false)}
                        />
                      ) : (
                        <MenuCard
                          label="Panel de Administración"
                          href="/admin-portal"
                          icon={LayoutDashboard}
                          iconBg="bg-[#02245b] text-white dark:bg-blue-900 dark:text-white"
                          onClick={() => setSheetOpen(false)}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>

            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Custom Overlay for modal=false so header stays clickable */}
      {sheetOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 animate-in fade-in duration-300"
          onClick={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
