import type { RangoActuacion } from "./zod";

export const RANGOS_ACTUACION: RangoActuacion[] = [
  { nombre: "Deficiente", puntaje_hasta: 36, color: "#dc2626" },
  { nombre: "Regular", puntaje_hasta: 52, color: "#ea580c" },
  { nombre: "Bueno", puntaje_hasta: 68, color: "#ca8a04" },
  { nombre: "Muy Bueno", puntaje_hasta: 84, color: "#0284c7" },
  { nombre: "Excepcional", puntaje_hasta: 100, color: "#16a34a" },
];

export function maximoPosible(
  aspectos: { opciones: { valor_puntuacion: number }[] }[],
): number {
  return aspectos.reduce((acc, aspecto) => {
    const max = aspecto.opciones.reduce(
      (m, o) => (o.valor_puntuacion > m ? o.valor_puntuacion : m),
      0,
    );
    return acc + max;
  }, 0);
}

export function normalizarACien(suma: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((suma / max) * 1000) / 10;
}

export function rangoParaPuntaje(
  puntajeNormalizado: number,
): RangoActuacion | null {
  for (const rango of RANGOS_ACTUACION) {
    if (puntajeNormalizado <= rango.puntaje_hasta) return rango;
  }
  return RANGOS_ACTUACION[RANGOS_ACTUACION.length - 1] ?? null;
}

export function promedioPorClave(
  filas: Record<string, number>[],
): Record<string, number> {
  if (filas.length === 0) return {};
  const sumas: Record<string, number> = {};
  const conteos: Record<string, number> = {};
  for (const fila of filas) {
    for (const [clave, valor] of Object.entries(fila)) {
      sumas[clave] = (sumas[clave] ?? 0) + valor;
      conteos[clave] = (conteos[clave] ?? 0) + 1;
    }
  }
  const out: Record<string, number> = {};
  for (const clave of Object.keys(sumas)) {
    const n = conteos[clave] ?? 1;
    out[clave] = Math.round((sumas[clave] / n) * 10) / 10;
  }
  return out;
}

export function totalDeMapa(mapa: Record<string, number>): number {
  return Object.values(mapa).reduce((a, b) => a + b, 0);
}
