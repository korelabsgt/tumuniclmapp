"use client";

import { useQuery } from "@tanstack/react-query";
import { obtenerAsuetosRango, Asueto } from "@/lib/asuetos/acciones";

export type { Asueto };

export type ParentByDependenciaId = Map<string, string | null>;

const FIVE_MINUTES = 1000 * 60 * 5;

export const asuetosQueryKey = (fechaInicio: string, fechaFin: string) =>
  ["asuetos", fechaInicio, fechaFin] as const;

export function buildParentByDependenciaId(
  dependencias: { id: string; parent_id: string | null }[],
): ParentByDependenciaId {
  const map: ParentByDependenciaId = new Map();
  dependencias.forEach((d) => map.set(d.id, d.parent_id));
  return map;
}

export function dependenciaEstaExcluidaDelAsueto(
  dependenciaId: string | null | undefined,
  excluidas: string[] | null | undefined,
  parentById?: ParentByDependenciaId,
): boolean {
  if (!dependenciaId || !excluidas?.length) return false;
  const set = new Set(excluidas);
  let current: string | null | undefined = dependenciaId;
  const vistos = new Set<string>();
  while (current) {
    if (set.has(current)) return true;
    if (vistos.has(current)) break;
    vistos.add(current);
    current = parentById?.get(current) ?? null;
  }
  return false;
}

export function useAsuetos(fechaInicio: string, fechaFin: string) {
  const enabled = Boolean(fechaInicio && fechaFin);

  const { data, isLoading, refetch } = useQuery({
    queryKey: asuetosQueryKey(fechaInicio, fechaFin),
    queryFn: () => obtenerAsuetosRango(fechaInicio, fechaFin),
    enabled,
    staleTime: FIVE_MINUTES,
  });

  return {
    asuetos: data ?? [],
    loading: isLoading && enabled,
    recargar: refetch,
  };
}

export function getAsuetoPorFecha(
  asuetos: Asueto[],
  diaString: string,
  dependenciaId?: string | null,
  parentById?: ParentByDependenciaId,
): Asueto | null {
  return (
    asuetos.find((a) => {
      if (diaString < a.fecha_inicio || diaString > a.fecha_fin) return false;
      if (
        dependenciaEstaExcluidaDelAsueto(
          dependenciaId,
          a.dependencias_excluidas,
          parentById,
        )
      ) {
        return false;
      }
      return true;
    }) || null
  );
}
