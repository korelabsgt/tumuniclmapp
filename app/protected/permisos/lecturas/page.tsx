import { Suspense } from "react";
import VerLecturasNotificaciones from "@/components/permisos/VerLecturasNotificaciones";
import Cargando from "@/components/ui/animations/Cargando";

export default function LecturasPermisosPage() {
  return (
    <Suspense fallback={<Cargando />}>
      <VerLecturasNotificaciones tipoVista="mis_lecturas" />
    </Suspense>
  );
}
