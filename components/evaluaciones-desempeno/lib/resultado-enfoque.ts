import { rangoDesdeTotalResultado } from "./resultado-puntajes";
import type { ResultadoPersona, TipoEvaluacion } from "./zod";

export function resultadoConEnfoque(
  resultado: ResultadoPersona,
  tipoEnfoque: TipoEvaluacion,
  perfilId: string,
): ResultadoPersona {
  if (tipoEnfoque === "auto") {
    const total = resultado.auto_total ?? 0;
    return {
      ...resultado,
      filas_anonimas: [],
      filas_empleados: [],
      empleados_promedio: null,
      empleados_total: null,
      equipo: null,
      equipo_total: null,
      total_promedio: total,
      rango:
        resultado.auto_total != null
          ? rangoDesdeTotalResultado(resultado.auto_total, resultado)
          : null,
      tipos_evaluacion: ["auto"],
    };
  }

  if (tipoEnfoque === "jefe_a_subordinado") {
    const filas = resultado.filas_empleados.filter(
      (fila) => !fila.evaluador_id || fila.evaluador_id === perfilId,
    );
    const porAspecto =
      filas.length === 1
        ? filas[0]!.por_aspecto
        : (resultado.empleados_promedio ?? resultado.equipo);
    const total =
      filas.length === 1
        ? filas[0]!.total
        : (resultado.empleados_total ?? resultado.equipo_total);
    return {
      ...resultado,
      auto: null,
      auto_total: null,
      filas_anonimas: [],
      filas_empleados: filas,
      empleados_promedio: porAspecto,
      empleados_total: total,
      equipo: porAspecto,
      equipo_total: total,
      total_promedio: total ?? 0,
      rango:
        total != null ? rangoDesdeTotalResultado(total, resultado) : null,
      tipos_evaluacion: ["jefe_a_subordinado"],
    };
  }

  const filas = resultado.filas_empleados.filter(
    (fila) => fila.evaluador_id === perfilId,
  );
  const porAspecto = filas[0]?.por_aspecto ?? null;
  const total = filas[0]?.total ?? null;
  return {
    ...resultado,
    auto: null,
    auto_total: null,
    filas_anonimas: [],
    filas_empleados: filas,
    empleados_promedio: porAspecto,
    empleados_total: total,
    equipo: porAspecto,
    equipo_total: total,
    total_promedio: total ?? 0,
    rango: total != null ? rangoDesdeTotalResultado(total, resultado) : null,
    tipos_evaluacion: ["subordinado_a_jefe"],
  };
}
