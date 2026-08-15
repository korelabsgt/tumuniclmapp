import { Suspense } from "react";
import RestablecerContrasena from "@/components/cambiar-contrasena/RestablecerContrasena";
import Cargando from "@/components/ui/animations/Cargando";

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <RestablecerContrasena />
    </Suspense>
  );
}
