import React from 'react';
import { PublicHeader } from '@/components/home/ui/PublicHeader';
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
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 font-sans">
      <PublicHeader configuracion={configuracion} modoAdmin={true} />
      <PublicHero configuracion={configuracion} />
      <AdminContent 
        publicacionesIniciales={publicaciones}
        politicasIniciales={politicas}
        configuracionInicial={configuracion}
      />
    </div>
  );
}
