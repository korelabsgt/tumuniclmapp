"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { toast } from "react-toastify";
import type {
  Programa,
  Alumno,
  Maestro,
} from "@/components/educacion/lib/esquemas";

const FIVE_MINUTES = 1000 * 60 * 5;

export const EDUCACION_QUERY_ROOT = ["educacion"] as const;

export const educacionKeys = {
  all: EDUCACION_QUERY_ROOT,
  programas: [...EDUCACION_QUERY_ROOT, "programas"] as const,
  programa: (id: string | number) =>
    [...EDUCACION_QUERY_ROOT, "programas", String(id)] as const,
  hijos: (parentId: string | number) =>
    [...EDUCACION_QUERY_ROOT, "programas", "hijos", String(parentId)] as const,
  inscripciones: [...EDUCACION_QUERY_ROOT, "inscripciones"] as const,
  inscripcionesPrograma: (id: string | number) =>
    [...EDUCACION_QUERY_ROOT, "inscripciones", String(id)] as const,
  maestros: [...EDUCACION_QUERY_ROOT, "maestros"] as const,
  anios: [...EDUCACION_QUERY_ROOT, "anios"] as const,
  alumnos: [...EDUCACION_QUERY_ROOT, "alumnos"] as const,
};

type InscripcionConAlumno = {
  programa_id: number;
  alumnos: Alumno | null;
};

export function mapInscripciones(
  rows: InscripcionConAlumno[] | null | undefined,
): Alumno[] {
  if (!rows) return [];
  return rows.flatMap((inscripcion) => {
    if (!inscripcion.alumnos) return [];
    return [{ ...inscripcion.alumnos, programa_id: inscripcion.programa_id }];
  });
}

export async function fetchMaestrosEducacion(): Promise<Maestro[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("maestros_municipales").select("*");
  if (error) {
    toast.error("Error al cargar los maestros.");
    throw new Error(error.message);
  }
  return (data as Maestro[]) || [];
}

export async function fetchProgramaPorId(
  programaId: string | number,
): Promise<Programa> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("programas_educativos")
    .select("*")
    .eq("id", programaId)
    .single();
  if (error) {
    toast.error("Error al cargar el programa.");
    throw new Error(error.message);
  }
  return data as Programa;
}

export function useInvalidarEducacion() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: EDUCACION_QUERY_ROOT });
}

export function useMaestrosEducacion() {
  return useQuery({
    queryKey: educacionKeys.maestros,
    queryFn: fetchMaestrosEducacion,
    staleTime: FIVE_MINUTES,
  });
}

export function useTodosAlumnos() {
  return useQuery({
    queryKey: educacionKeys.alumnos,
    queryFn: async (): Promise<Alumno[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.from("alumnos").select("*");
      if (error) {
        throw new Error(error.message);
      }
      return (data as Alumno[]) || [];
    },
    staleTime: FIVE_MINUTES,
  });
}

export function useEducacionData() {
  const invalidar = useInvalidarEducacion();

  const programasQuery = useQuery({
    queryKey: educacionKeys.programas,
    queryFn: async (): Promise<Programa[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("programas_educativos")
        .select("*")
        .order("nombre");
      if (error) {
        toast.error("Error al cargar los programas.");
        throw new Error(error.message);
      }
      return (data as Programa[]) || [];
    },
    staleTime: FIVE_MINUTES,
  });

  const alumnosQuery = useQuery({
    queryKey: educacionKeys.inscripciones,
    queryFn: async (): Promise<Alumno[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("alumnos_inscripciones")
        .select("*, alumnos(*)");
      if (error) {
        toast.error("Error al cargar los alumnos inscritos.");
        throw new Error(error.message);
      }
      return mapInscripciones(data as InscripcionConAlumno[]);
    },
    staleTime: FIVE_MINUTES,
  });

  const maestrosQuery = useMaestrosEducacion();

  const aniosQuery = useQuery({
    queryKey: educacionKeys.anios,
    queryFn: async (): Promise<number[]> => {
      const supabase = createClient();
      const { data } = await supabase.rpc("obtener_anios_programas");
      const anioActual = new Date().getFullYear();
      const aniosRpc = Array.isArray(data)
        ? data.filter((anio): anio is number => typeof anio === "number")
        : [];
      return [...new Set([anioActual, ...aniosRpc])].sort((a, b) => b - a);
    },
    staleTime: FIVE_MINUTES,
  });

  return {
    programas: programasQuery.data ?? [],
    alumnos: alumnosQuery.data ?? [],
    maestros: maestrosQuery.data ?? [],
    loading:
      programasQuery.isLoading ||
      alumnosQuery.isLoading ||
      maestrosQuery.isLoading,
    fetchData: invalidar,
    aniosDisponibles: aniosQuery.data ?? [new Date().getFullYear()],
  };
}
