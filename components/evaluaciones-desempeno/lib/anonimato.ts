import type { FilaAnonima } from "./zod";

export function filasAnonimasDesdeTotales(
  filas: { evaluacion_id: string; por_aspecto: Record<string, number>; total: number }[],
): FilaAnonima[] {
  const ordenadas = [...filas].sort((a, b) =>
    a.evaluacion_id.localeCompare(b.evaluacion_id),
  );
  return ordenadas.map((fila, i) => ({
    indice: i + 1,
    por_aspecto: fila.por_aspecto,
    total: fila.total,
  }));
}

export function filasExternasDesdeTotales(
  filas: {
    evaluacion_id: string;
    evaluador_id: string;
    por_aspecto: Record<string, number>;
    total: number;
  }[],
  nombres: Map<string, string>,
): FilaAnonima[] {
  const ordenadas = [...filas].sort((a, b) =>
    a.evaluacion_id.localeCompare(b.evaluacion_id),
  );
  return ordenadas.map((fila, i) => ({
    indice: i + 1,
    por_aspecto: fila.por_aspecto,
    total: fila.total,
    evaluador_id: fila.evaluador_id,
    evaluador_nombre: nombres.get(fila.evaluador_id) ?? null,
  }));
}
