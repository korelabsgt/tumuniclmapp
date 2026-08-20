'use client';

import React from 'react';
import Wave from 'react-wavify';
import { Parallax } from 'react-parallax';
import type { ConfiguracionPortal } from '@/components/home/lib/actions';

const FALLBACK_PORTADA = "https://images.unsplash.com/photo-1542224566-6e85f2e10624?q=80&w=1920&auto=format&fit=crop";
const FALLBACK_ESLOGAN = "¡Hoy! Concepción Avanza";

interface PublicHeroProps {
  configuracion?: ConfiguracionPortal | null;
}

export function PublicHero({ configuracion }: PublicHeroProps) {
  let portadaUrl = FALLBACK_PORTADA;
  if (configuracion?.portada_url) {
    // Convierte el nombre de archivo guardado en la base de datos a una URL pública real de Supabase
    portadaUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/home_imagenes/${configuracion.portada_url}`;
  }

  const eslogan = configuracion?.eslogan || FALLBACK_ESLOGAN;

  return (
    <>
      <Parallax 
        bgImage={portadaUrl} 
        strength={80}
        bgImageStyle={{
          objectFit: 'cover',
          objectPosition: 'center 30%',
        }}
      >
        <section
          className="relative w-full h-[700px] md:h-[825px] flex flex-col justify-start items-center text-center overflow-hidden bg-transparent"
        >
          {/* Hero Content */}
          <div className="relative z-10 w-full px-4 flex flex-col items-center text-black pt-[100px] sm:pt-[110px] md:pt-[90px] lg:pt-[80px]">
            <h1 className="font-blacksword text-[30px] sm:text-[40px] md:text-[56px] lg:text-[66px] leading-tight mb-2 sm:mb-3 md:mb-4 whitespace-nowrap drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
              {eslogan}
            </h1>
            <h2 className="text-[19px] sm:text-[23px] md:text-[34px] lg:text-[40px] font-bold tracking-tight leading-snug drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]">
              Gobierno Municipal
              <span className="block font-semibold text-[17px] sm:text-[21px] md:text-[30px] lg:text-[36px] mt-0.5 sm:mt-1">
                2024-2028
              </span>
            </h2>
          </div>
        </section>
      </Parallax>

      {/* Ondas Animadas (Franjas Inferiores) */}
      <div className="relative w-full h-[20px] z-20 pointer-events-none">
        <Wave
          fill="#00ccff"
          paused={false}
          style={{ position: "absolute", top: -50, left: 0, right: 0 }}
          options={{ height: 5, amplitude: 5, speed: 0.25, points: 5 }}
        />
        <Wave
          fill="#0066cc"
          paused={false}
          style={{ position: "absolute", top: -45, left: 0, right: 0 }}
          options={{ height: 3, amplitude: 20, speed: 0.1, points: 5 }}
        />
        <div className="absolute top-0 left-0 right-0 text-gray-50 dark:text-neutral-950">
          <Wave
            fill="currentColor"
            paused={false}
            options={{ height: 5, amplitude: 1, speed: 0.25, points: 3 }}
          />
        </div>
      </div>
    </>
  );
}
