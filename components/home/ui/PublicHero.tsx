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
      <Parallax bgImage={portadaUrl} strength={200}>
        <section
          className="relative w-full h-[calc(100vh+50px)] min-h-[550px] flex flex-col justify-center items-center text-center overflow-hidden bg-transparent"
        >
          {/* Hero Content */}
          <div className="relative z-10 -mt-[320px] px-4 drop-shadow-lg text-gray-900">
            <h1 className="font-blacksword text-5xl md:text-6xl lg:text-7xl mb-12">
              {eslogan}
            </h1>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
              Gobierno Municipal
            </h2>
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-medium mt-1">
              2024-2028
            </h3>
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
