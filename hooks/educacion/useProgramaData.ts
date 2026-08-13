"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import type { Alumno, Programa } from "@/components/educacion/lib/esquemas";
import {
  educacionKeys,
  fetchProgramaPorId,
  mapInscripciones,
  useInvalidarEducacion,
  useMaestrosEducacion,
} from "@/hooks/educacion/useEducacionData";

const FIVE_MINUTES = 1000 * 60 * 5;

type InscripcionConAlumno = {
  programa_id: number;
  alumnos: Alumno | null;
};

interface MaestroAlumnos {
  id: number;
  nombre: string;
  ctd_alumnos: number;
  telefono?: string | null;
}

export function useProgramaData(programaId: string | number) {
  const fetchData = useInvalidarEducacion();
  const enabled = Boolean(programaId);

  const programaQuery = useQuery({
    queryKey: educacionKeys.programa(programaId),
    queryFn: () => fetchProgramaPorId(programaId),
    enabled,
    staleTime: FIVE_MINUTES,
  });

  const nivelesQuery = useQuery({
    queryKey: educacionKeys.hijos(programaId),
    queryFn: async (): Promise<Programa[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("programas_educativos")
        .select("*")
        .eq("parent_id", programaId);
      if (error) {
        toast.error("Error al cargar los niveles del programa.");
        throw new Error(error.message);
      }
      return (data as Programa[]) || [];
    },
    enabled,
    staleTime: FIVE_MINUTES,
  });

  const idsInscripcion = useMemo(() => {
    const ids = [Number(programaId)];
    for (const nivel of nivelesQuery.data ?? []) {
      ids.push(nivel.id);
    }
    return ids;
  }, [programaId, nivelesQuery.data]);

  const alumnosQuery = useQuery({
    queryKey: [
      ...educacionKeys.inscripcionesPrograma(programaId),
      "con-niveles",
      idsInscripcion.join(","),
    ],
    queryFn: async (): Promise<Alumno[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("alumnos_inscripciones")
        .select("*, alumnos(*)")
        .in("programa_id", idsInscripcion);
      if (error) {
        toast.error("Error al cargar los alumnos del programa.");
        throw new Error(error.message);
      }
      return mapInscripciones(data as InscripcionConAlumno[]);
    },
    enabled: enabled && idsInscripcion.length > 0 && !nivelesQuery.isLoading,
    staleTime: FIVE_MINUTES,
  });

  const maestrosQuery = useMaestrosEducacion();

  const maestrosDelPrograma = useMemo((): MaestroAlumnos[] => {
    const programa = programaQuery.data;
    const niveles = nivelesQuery.data ?? [];
    const maestros = maestrosQuery.data ?? [];
    if (!programa) return [];

    const maestrosIds = [
      programa.maestro_id,
      ...niveles.map((nivel) => nivel.maestro_id),
    ].filter((id): id is number => id !== null && id !== undefined);

    const uniqueIds = new Set(maestrosIds);
    return maestros
      .filter((maestro) => uniqueIds.has(maestro.id))
      .map((maestro) => ({
        id: maestro.id,
        nombre: maestro.nombre,
        ctd_alumnos: maestro.ctd_alumnos,
        telefono: maestro.telefono,
      }))
      .sort((a, b) => b.ctd_alumnos - a.ctd_alumnos);
  }, [programaQuery.data, nivelesQuery.data, maestrosQuery.data]);

  return {
    programa: programaQuery.data ?? null,
    nivelesDelPrograma: nivelesQuery.data ?? [],
    alumnosDelPrograma: alumnosQuery.data ?? [],
    maestrosDelPrograma,
    loading:
      (programaQuery.isLoading ||
        nivelesQuery.isLoading ||
        alumnosQuery.isLoading ||
        maestrosQuery.isLoading) &&
      enabled,
    fetchData,
  };
}
