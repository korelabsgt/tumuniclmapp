'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Home, Info, LayoutDashboard } from 'lucide-react';
import { FaFacebook, FaTiktok, FaInstagram, FaYoutube, FaBars } from 'react-icons/fa6';
import { ThemeSwitcher } from '@/components/themes/theme-switcher';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetDescription } from '@/components/ui/sheet';
import { useAuthPublico } from '@/components/home/lib/hooks';
import { VisorImagen } from '@/components/home/ui/VisorImagen';
import type { ConfiguracionPortal } from '@/components/home/lib/actions';


const NAV_LINKS = [
  { label: 'Inicio', href: '/', icon: Home },
  { label: 'Albergues', href: '/albergues', icon: Info },
];

interface PublicHeaderProps {
  configuracion?: ConfiguracionPortal | null;
  modoAdmin?: boolean;
}

export function PublicHeader({ configuracion, modoAdmin = false }: PublicHeaderProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { verificar } = useAuthPublico();


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
        className={`fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center transition-all duration-300 ${
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
        <div className="flex items-center gap-4">
          <div className="scale-75 origin-right drop-shadow-md">
            <ThemeSwitcher />
          </div>

          {/* Menú Lateral (Sheet) */}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button 
                className={`p-2 rounded-md transition-colors drop-shadow-md ${
                  scrolled 
                    ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-neutral-800' 
                    : 'text-white hover:bg-white/20'
                }`}
              >
                <FaBars className="w-10 h-10" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-80 bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-700 p-0 flex flex-col"
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
              <nav className="flex-1 px-4 py-4 space-y-1">
                {NAV_LINKS.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    onClick={() => setSheetOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-neutral-800 hover:text-blue-700 dark:hover:text-blue-400 transition-colors font-medium text-sm"
                  >
                    <Icon className="w-5 h-5 opacity-70" />
                    {label}
                  </a>
                ))}
              </nav>

              {/* Zona inferior: Ajustes (solo si autenticado) */}
              {(autenticado || modoAdmin) && (
                <div className="px-4 py-4 border-t border-gray-200 dark:border-neutral-700 space-y-1">
                  {modoAdmin ? (
                    <a
                      href="/"
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-gray-100 text-gray-900 dark:bg-neutral-800 dark:text-white transition-colors font-medium text-sm"
                    >
                      <Home className="w-5 h-5" />
                      Ir al Sitio Público
                    </a>
                  ) : (
                    <a
                      href="/admin-portal"
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-[#02245b] hover:bg-blue-900 text-white transition-colors font-medium text-sm"
                    >
                      <LayoutDashboard className="w-5 h-5" />
                      Panel de Administración
                    </a>
                  )}
                </div>
              )}

            </SheetContent>
          </Sheet>
        </div>
      </header>

    </>
  );
}
