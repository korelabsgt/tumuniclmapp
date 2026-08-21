import { InformacionPublicaView } from '@/components/home/informacionpublica/InformacionPublicaView';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Información Pública | Gobierno Abierto',
  description: 'Información Pública de Oficio y COMUDE',
};

import { PublicHeader } from '@/components/home/ui/PublicHeader';
import { getConfiguracionPortal } from '@/components/home/lib/actions';

export default async function InformacionPublicaPage() {
  const configuracion = await getConfiguracionPortal();

  return (
    <>
      <PublicHeader forceSolid={true} configuracion={configuracion} />
      <InformacionPublicaView />
    </>
  );
}
