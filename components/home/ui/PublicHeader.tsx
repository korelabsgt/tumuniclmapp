'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Home, Info, LayoutDashboard, MoreVertical, X, FileText } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { FaFacebook, FaTiktok, FaInstagram, FaYoutube } from 'react-icons/fa6';
import { ThemeSwitcher } from '@/components/themes/theme-switcher';
import AnimatedIcon from '@/components/ui/AnimatedIcon';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription } from '@/components/ui/sheet';
import { useAuthPublico } from '@/components/home/lib/hooks';
import { VisorImagen } from '@/components/home/ui/VisorImagen';
import type { ConfiguracionPortal } from '@/components/home/lib/actions';


const NAV_LINKS = [
  { label: 'Información Pública', href: '/informacionpublica', icon: FileText, iconBg: 'bg-[#0066cc]/10 text-[#0066cc] dark:bg-blue-900/40 dark:text-blue-400' },
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

function MenuSectionHeader({ titulo, colorClass, dotClass, className = "" }: any) {
  return (
    <div className={`mb-3 flex items-center gap-2 ${className}`}>
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
  forceSolid?: boolean;
}

export function PublicHeader({ configuracion, modoAdmin = false, forceSolid = false }: PublicHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [scrolledState, setScrolledState] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { verificar } = useAuthPublico();

  const scrolled = forceSolid || scrolledState;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };


  // Detectar scroll para fijar el header
  useEffect(() => {
    const getScrollTop = () => {
      // Intentamos leer el scroll de los posibles contenedores de la aplicación
      const main = document.querySelector('main');
      const chrome = document.getElementById('app-chrome-scroll');

      return Math.max(
        main?.scrollTop || 0,
        chrome?.scrollTop || 0,
        window.scrollY || 0
      );
    };

    const handleScroll = () => {
      // Aparece después de aproximadamente 4 "ticks" de la rueda del ratón (unos 400px)
      setScrolledState(getScrollTop() > 400);
    };

    // Usamos capture: true para atrapar el evento de scroll sin importar de qué contenedor venga
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    // Verificar estado inicial
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll, { capture: true } as any);
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
      {/* El encabezado principal se queda estático (absolute) arriba */}
      <header
        className={`absolute top-0 left-0 w-full z-[90] px-4 sm:px-8 flex justify-between items-center transition-all duration-300 ${
          forceSolid || sheetOpen
            ? 'bg-white dark:bg-neutral-900 h-[76px]'
            : 'bg-transparent h-[92px]'
        } ${forceSolid && !sheetOpen ? 'shadow-md' : ''}`}
      >
        {/* Left Side: Socials and Text */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5 sm:gap-3">
              <a href="https://www.facebook.com/tumuniclm" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaFacebook className="w-8 h-8 text-[#1877F2] drop-shadow-md" /></a>
              <a href="https://www.tiktok.com/@tumuniclm" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaTiktok className={`w-8 h-8 drop-shadow-md ${forceSolid ? 'text-black dark:text-white' : 'text-white'}`} /></a>
              <a href="https://www.instagram.com/tumuniclm?igsh=NWQ3dnZneGxmOThm" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaInstagram className="w-8 h-8 text-[#E4405F] drop-shadow-md" /></a>
              <a href="https://www.youtube.com/@tuMuniCLM" target="_blank" rel="noreferrer" className="hover:scale-110 transition-transform"><FaYoutube className="w-8 h-8 text-[#FF0000] drop-shadow-md" /></a>
            </div>
            <span className={`text-[12px] font-bold drop-shadow-md mt-1 hidden sm:block transition-colors ${forceSolid ? 'text-black dark:text-white' : 'text-white'}`}>Haz click para ver nuestras redes sociales</span>
          </div>

          <a href="/informacionpublica" className={`font-bold text-[12px] sm:text-[16px] leading-tight text-center cursor-pointer hover:opacity-80 drop-shadow-md transition-colors ${forceSolid ? 'text-[#0088ff] dark:text-[#3399ff]' : 'text-[#3399ff]'}`}>
            Información<br className="block sm:hidden" /> pública
          </a>
        </div>
        {/* Right Side: Empty in header, everything moved to fixed container for perfect alignment */}
        <div className="flex items-center">
        </div>
      </header>

      {/* Botones flotantes (fixed) que siempre siguen al usuario */}
      <div 
        className={`fixed z-[100] flex items-center gap-0 transition-all duration-300 ${
          scrolled && !sheetOpen
            ? 'top-3 right-3 sm:top-4 sm:right-6 h-auto' 
            : (forceSolid || sheetOpen) 
            ? 'top-0 right-4 sm:right-8 h-[76px]' 
            : 'top-0 right-4 sm:right-8 h-[92px]'
        }`}
      >
        {/* Contenedor animado para Sol y Recargar */}
        <div 
          className={`flex items-center gap-0 transition-all duration-300 origin-right ${
            scrolled && !sheetOpen 
              ? 'opacity-0 scale-75 w-0 pointer-events-none' 
              : 'opacity-100 scale-100 w-[4.5rem] sm:w-[5.5rem] mr-0 sm:mr-0'
          }`}
        >
          <div className="drop-shadow-md shrink-0 sm:mr-3">
            <ThemeSwitcher className="[&_svg]:size-6 w-8 h-9 sm:w-8 sm:h-10 hover:scale-110" />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Actualizar"
            className={`inline-flex items-center justify-center w-8 h-9 sm:w-8 sm:h-10 shrink-0 cursor-pointer drop-shadow-md hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 transition-opacity focus-visible:outline-none ${scrolled || forceSolid || sheetOpen ? 'text-gray-900 dark:text-white' : 'text-white'}`}
          >
            <AnimatedIcon
              iconKey="qzorewvq"
              trigger={isRefreshing ? "loop" : "hover"}
              className="w-7 h-7 sm:w-7 sm:h-7"
            />
          </button>
        </div>

        {/* Menú Lateral (Sheet) */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen} modal={false}>
            <SheetTrigger asChild>
              <button
                className={`inline-flex h-9 w-6 sm:h-10 sm:w-6 shrink-0 cursor-pointer items-center justify-center transition-all focus-visible:outline-none drop-shadow-md rounded-full ${
                  scrolled && !sheetOpen
                    ? 'text-[#0066cc] dark:text-blue-400 hover:opacity-80'
                    : sheetOpen || forceSolid
                    ? 'text-gray-900 dark:text-white hover:text-[#0066cc] dark:hover:text-blue-400'
                    : 'text-white hover:opacity-80'
                }`}
              >
                <span className="relative block h-6 w-6">
                  <AnimatePresence initial={false}>
                    {sheetOpen ? (
                      <motion.span
                        key="x"
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.55, rotate: -90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.55, rotate: 90 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <X className="h-6 w-6" strokeWidth={2.25} />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="dots"
                        className="absolute inset-0 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.55, rotate: 90 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.55, rotate: -90 }}
                        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <MoreVertical className="h-6 w-6" strokeWidth={2.25} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-80 bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-700 p-0 flex flex-col pt-16"
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
              <SheetHeader className="pt-4 pb-2 border-b border-gray-200 dark:border-neutral-700 flex justify-center items-center">
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
              <div className="flex-1 px-5 pt-3 pb-4 overflow-y-auto">
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
                      className="mt-4"
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
                          href="/sigem/admin-portal"
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

      {/* Custom Overlay for modal=false so header stays clickable */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-white/50 backdrop-blur-sm dark:bg-black/60 dark:backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setSheetOpen(false)}
        />
      )}
    </>
  );
}
