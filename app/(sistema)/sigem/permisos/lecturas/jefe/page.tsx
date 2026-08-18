import { Suspense } from "react";
import VerLecturasNotificaciones from "@/components/permisos/VerLecturasNotificaciones";
import Cargando from "@/components/ui/animations/Cargando";

export default function LecturasJefePage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VerLecturasNotificaciones tipoVista="gestion_jefe" />
    </Suspense>
  );
}
