import GestorInventario from "@/components/inventario/GestorInventario";
import { TipoVistaInventario } from "@/components/inventario/lib/schemas";
import { Suspense } from "react";
import Cargando from "@/components/ui/animations/Cargando";

import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    modo: string;
  }>;
}

export default async function ModoInventarioPage({ params }: PageProps) {
  const resolvedParams = await params;
  const modo = (resolvedParams.modo || 'propias') as TipoVistaInventario;

  // Handle variations in spelling so the route is more forgiving
  const normalizedModo = modo.toLowerCase();
  
  let tipoVista: TipoVistaInventario;
  
  if (['propias', 'propios', 'propia', 'propio', 'mis-bienes'].includes(normalizedModo)) {
    tipoVista = 'propia';
  } else if (['jefe', 'jefes', 'dependencia', 'dependencias'].includes(normalizedModo)) {
    tipoVista = 'dependencia';
  } else if (['general', 'todos'].includes(normalizedModo)) {
    tipoVista = 'general';
  } else {
    // Si escriben basura en la URL, los redirigimos a sus propios bienes
    redirect('/protected/inventario/propias');
  }

  return (
    <div className="h-full w-full bg-white dark:bg-neutral-950">
      <Suspense fallback={<Cargando texto="Cargando inventario..." />}>
        <GestorInventario tipoVista={tipoVista} />
      </Suspense>
    </div>
  );
}
