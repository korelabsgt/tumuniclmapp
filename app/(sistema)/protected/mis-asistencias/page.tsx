import { Suspense } from "react";
import Asistencia from "@/components/asistencia/Asistencia";
import Cargando from "@/components/ui/animations/Cargando";

export default function MisAsistenciasPage() {
  return (
    <Suspense fallback={<Cargando texto="Cargando asistencia..." />}>
      <Asistencia />
    </Suspense>
  );
}
