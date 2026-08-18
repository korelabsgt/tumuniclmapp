import { Suspense } from "react";
import { EvaluacionesDesempeno } from "@/components/evaluaciones-desempeno/EvaluacionesDesempeno";
import Cargando from "@/components/ui/animations/Cargando";

export default function Page() {
  return (
    <Suspense fallback={<Cargando />}>
      <EvaluacionesDesempeno tipoVista="rrhh" />
    </Suspense>
  );
}
