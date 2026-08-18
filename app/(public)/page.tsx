import { Suspense } from 'react';
import HomePublico from "@/components/home/HomePublico";
import { getConfiguracionPortal } from "@/components/home/lib/actions";

export default async function Home() {
  // Cargar la configuración del portal desde Supabase en el servidor
  const configuracion = await getConfiguracionPortal();

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <HomePublico configuracion={configuracion} />
    </Suspense>
  );
}
