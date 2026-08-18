import React from 'react';
import { PublicHeader } from './ui/PublicHeader';
import { PublicHero } from './ui/PublicHero';
import { PublicContent } from './ui/PublicContent';
import { PublicFooter } from './ui/PublicFooter';
import { RequisitosTramites } from './RequisitosTramites';
import { ClimaWidget } from './ClimaWidget';
import { MapComponent } from './MapComponent';
import type { ConfiguracionPortal } from './lib/actions';
import './home.css';

interface HomePublicoProps {
  configuracion: ConfiguracionPortal | null;
}

export default function HomePublico({ configuracion }: HomePublicoProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 font-sans">
      <PublicHeader configuracion={configuracion} />
      <PublicHero configuracion={configuracion} />
      <PublicContent />
      <RequisitosTramites />
      <ClimaWidget />
      <MapComponent />
      <PublicFooter />
    </div>
  );
}
