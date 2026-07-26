"use client";

import { useState, useEffect, useCallback } from "react";
import { obtenerAsuetosRango, Asueto } from "@/lib/asuetos/acciones";

export type { Asueto };

export type ParentByDependenciaId = Map<string, string | null>;

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
  const [asuetos, setAsuetos] = useState<Asueto[]>([]);
  const [loading, setLoading] = useState(!!(fechaInicio && fechaFin));

  const cargar = useCallback(async () => {
    if (!fechaInicio || !fechaFin) return;
    setLoading(true);
    try {
      const data = await obtenerAsuetosRango(fechaInicio, fechaFin);
      setAsuetos(data);
    } catch {
      setAsuetos([]);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { asuetos, loading, recargar: cargar };
}

/**
 * Asueto del día para la dependencia indicada.
 * Si la dependencia (o un ancestro) está en dependencias_excluidas, no aplica.
 */
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
