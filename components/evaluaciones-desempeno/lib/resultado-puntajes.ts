import { normalizarACien, rangoParaPuntaje } from "./rangos";
import type { PendienteEvaluacion, RangoActuacion, ResultadoPersona } from "./zod";

const PUNTAJE_MAX_ASPECTO = 20;

export const COLOR_PILL_AUTO = "#0066cc";
export const COLOR_PILL_EXTERNO = "#059669";

export type TipoPillResultado = "auto" | "externo" | "total";

export type PillResultadoResumen = {
  tipo: TipoPillResultado;
  etiqueta: string;
  puntaje: number;
  rangoNombre: string;
  color: string;
  colorFondo: string;
};

export function colorFondoSuave(color: string): string {
  return `${color}18`;
}

export function maximoResultadoPersona(resultado: ResultadoPersona): number {
  return resultado.aspectos.length * PUNTAJE_MAX_ASPECTO;
}

export function rangoDesdeTotalResultado(
  total: number,
  resultado: ResultadoPersona,
): RangoActuacion | null {
  const max = maximoResultadoPersona(resultado);
  return rangoParaPuntaje(normalizarACien(total, max));
}

export function etiquetaEvaluacionExterna(resultado: ResultadoPersona): string {
  return resultado.evaluado_es_jefe ? "Promedio equipo" : "Evaluación jefe";
}

export function formatoEtiquetaRango(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

export function resumenPillsResultado(
  resultado: ResultadoPersona,
): PillResultadoResumen[] {
  const pills: PillResultadoResumen[] = [];

  if (resultado.auto_total != null) {
    const rango = rangoDesdeTotalResultado(resultado.auto_total, resultado);
    if (rango) {
      pills.push({
        tipo: "auto",
        etiqueta: "Autoevaluación",
        puntaje: resultado.auto_total,
        rangoNombre: formatoEtiquetaRango(rango.nombre),
        color: COLOR_PILL_AUTO,
        colorFondo: colorFondoSuave(COLOR_PILL_AUTO),
      });
    }
  }

  if (resultado.empleados_total != null) {
    const rango = rangoDesdeTotalResultado(resultado.empleados_total, resultado);
    if (rango) {
      pills.push({
        tipo: "externo",
        etiqueta: etiquetaEvaluacionExterna(resultado),
        puntaje: resultado.empleados_total,
        rangoNombre: formatoEtiquetaRango(rango.nombre),
        color: COLOR_PILL_EXTERNO,
        colorFondo: colorFondoSuave(COLOR_PILL_EXTERNO),
      });
    }
  }

  const tieneAuto = resultado.auto_total != null;
  const tieneExterno = resultado.empleados_total != null;

  if (resultado.rango && tieneAuto && tieneExterno) {
    pills.push({
      tipo: "total",
      etiqueta: "Promedio total",
      puntaje: resultado.total_promedio,
      rangoNombre: formatoEtiquetaRango(resultado.rango.nombre),
      color: resultado.rango.color,
      colorFondo: colorFondoSuave(resultado.rango.color),
    });
  }

  return pills;
}

export function pillTotalResultado(
  resultado: ResultadoPersona,
): PillResultadoResumen | null {
  return resumenPillsResultado(resultado).find((pill) => pill.tipo === "total") ?? null;
}

export function pillPrincipalResultado(
  resultado: ResultadoPersona,
): PillResultadoResumen | null {
  const pills = resumenPillsResultado(resultado);
  const pill =
    pills.find((item) => item.tipo === "total") ??
    pills.find((item) => item.tipo === "auto") ??
    pills.find((item) => item.tipo === "externo");
  if (pill) {
    const rango = rangoDesdeTotalResultado(pill.puntaje, resultado);
    const color = rango?.color ?? pill.color;
    return {
      ...pill,
      rangoNombre: rango
        ? formatoEtiquetaRango(rango.nombre)
        : pill.rangoNombre,
      color,
      colorFondo: colorFondoSuave(color),
    };
  }
  if (!resultado.rango) return null;
  return {
    tipo: "total",
    etiqueta: "Total",
    puntaje: resultado.total_promedio,
    rangoNombre: formatoEtiquetaRango(resultado.rango.nombre),
    color: resultado.rango.color,
    colorFondo: colorFondoSuave(resultado.rango.color),
  };
}

export function pillDesdePendienteCompletado(
  pendiente: PendienteEvaluacion,
): { puntaje: number; rangoNombre: string; color: string } | null {
  if (!pendiente.esta_completada || pendiente.puntaje_total == null) {
    return null;
  }
  return {
    puntaje: pendiente.puntaje_total,
    rangoNombre: pendiente.rango_nombre
      ? formatoEtiquetaRango(pendiente.rango_nombre)
      : "—",
    color: pendiente.rango_color ?? COLOR_PILL_AUTO,
  };
}
