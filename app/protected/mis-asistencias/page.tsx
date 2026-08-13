import { Suspense } from "react";
import Asistencia from "@/components/asistencia/Asistencia";
import AsistenciaSkeleton from "@/components/asistencia/AsistenciaSkeleton";
import AsistenciaPageLayout from "@/components/asistencia/AsistenciaPageLayout";

export default function MisAsistenciasPage() {
  return (
    <AsistenciaPageLayout>
      <Suspense fallback={<AsistenciaSkeleton />}>
        <Asistencia />
      </Suspense>
    </AsistenciaPageLayout>
  );
}
