import { Suspense } from "react";
import MisComisiones from "@/components/comisiones/asistencia/MisComisiones";
import Cargando from "@/components/ui/animations/Cargando";

export default function MisComisionesPage() {
  return (
    <Suspense fallback={<Cargando texto="Cargando comisiones..." />}>
      <MisComisiones />
    </Suspense>
  );
}
