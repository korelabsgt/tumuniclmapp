"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import type { Alumno } from "@/components/educacion/lib/esquemas";
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

export function useNivelData(nivelId: string | number) {
  const fetchData = useInvalidarEducacion();
  const enabled = Boolean(nivelId);

  const nivelQuery = useQuery({
    queryKey: educacionKeys.programa(nivelId),
    queryFn: () => fetchProgramaPorId(nivelId),
    enabled,
    staleTime: FIVE_MINUTES,
  });

  const alumnosQuery = useQuery({
    queryKey: educacionKeys.inscripcionesPrograma(nivelId),
    queryFn: async (): Promise<Alumno[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("alumnos_inscripciones")
        .select("*, alumnos(*)")
        .eq("programa_id", nivelId);
      if (error) {
        toast.error("Error al cargar los alumnos del nivel.");
        throw new Error(error.message);
      }
      return mapInscripciones(data as InscripcionConAlumno[]);
    },
    enabled,
    staleTime: FIVE_MINUTES,
  });

  const maestrosQuery = useMaestrosEducacion();

  return {
    nivel: nivelQuery.data ?? null,
    alumnosDelNivel: alumnosQuery.data ?? [],
    maestros: maestrosQuery.data ?? [],
    loading:
      (nivelQuery.isLoading ||
        alumnosQuery.isLoading ||
        maestrosQuery.isLoading) &&
      enabled,
    fetchData,
  };
}
