import React from 'react';
import { PublicHero } from '@/components/home/ui/PublicHero';
import { AdminContent } from '@/components/home/admin/AdminContent';
import { getPoliticas, getPublicaciones, type ConfiguracionPortal } from '@/components/home/lib/actions';
import '@/components/home/home.css';

interface AdminPortalProps {
  configuracion: ConfiguracionPortal | null;
}

export default async function AdminPortal({ configuracion }: AdminPortalProps) {
  // Carga de datos en el servidor para hidratación inicial rápida
  const [publicaciones, politicas] = await Promise.all([
    getPublicaciones(),
    getPoliticas(),
  ]);

  return (
    <div className="-mt-2 sm:-mt-5 min-h-screen bg-gray-50 dark:bg-neutral-950 font-sans w-full">
      <PublicHero configuracion={configuracion} />
      <AdminContent 
        publicacionesIniciales={publicaciones}
        politicasIniciales={politicas}
        configuracionInicial={configuracion}
      />
    </div>
  );
}
