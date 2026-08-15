"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarEvaluacion,
  cambiarActivoEvaluacion,
  crearEvaluacion,
  duplicarEvaluacion,
  eliminarEvaluacion,
  guardarAspectos,
  guardarEvaluacion,
  listarEvaluaciones,
  listarPendientesEnvio,
  obtenerEvaluacionPorId,
  obtenerEvaluacionPorSlug,
  obtenerParaLlenar,
  obtenerPendientes,
  obtenerPerfilEvaluaciones,
  obtenerResultados,
} from "./actions";
import type {
  ActualizarEvaluacionValues,
  CambiarActivoEvaluacionValues,
  CrearEvaluacionValues,
  DuplicarEvaluacionValues,
  EvaluacionPlantilla,
  GuardarAspectosValues,
  GuardarEvaluacionValues,
  TipoVistaEvaluaciones,
} from "./zod";

const ROOT = ["evaluaciones-desempeno"] as const;

export const evaluacionesKeys = {
  perfil: [...ROOT, "perfil"] as const,
  plantillas: [...ROOT, "plantillas"] as const,
  pendientes: (vista: TipoVistaEvaluaciones) =>
    [...ROOT, "pendientes", vista] as const,
  resultados: (vista: TipoVistaEvaluaciones, evaluado?: string | null) =>
    [...ROOT, "resultados", vista, evaluado ?? "todos"] as const,
  pendientesEnvio: [...ROOT, "pendientes-envio"] as const,
  llenar: (vista: TipoVistaEvaluaciones, formularioId: string, evaluadoId: string) =>
    [...ROOT, "llenar", vista, formularioId, evaluadoId] as const,
};

const STALE = 1000 * 60 * 2;

export function usePerfilEvaluaciones() {
  return useQuery({
    queryKey: evaluacionesKeys.perfil,
    queryFn: obtenerPerfilEvaluaciones,
    staleTime: STALE,
  });
}

export function useEvaluacionesPlantilla(enabled: boolean) {
  return useQuery({
    queryKey: evaluacionesKeys.plantillas,
    queryFn: listarEvaluaciones,
    enabled,
    staleTime: STALE,
  });
}

export function useEvaluacionPorId(id: string | null) {
  return useQuery({
    queryKey: [...evaluacionesKeys.plantillas, id] as const,
    queryFn: () => obtenerEvaluacionPorId(id!),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

export function useEvaluacionPorSlug(slug: string | null, enabled: boolean) {
  return useQuery({
    queryKey: [...evaluacionesKeys.plantillas, "slug", slug] as const,
    queryFn: () => obtenerEvaluacionPorSlug(slug!),
    enabled: enabled && Boolean(slug),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function usePendientesEvaluacion(tipoVista: TipoVistaEvaluaciones) {
  return useQuery({
    queryKey: evaluacionesKeys.pendientes(tipoVista),
    queryFn: () => obtenerPendientes(tipoVista),
    enabled: tipoVista !== "rrhh",
    staleTime: STALE,
  });
}

export function useResultadosEvaluacion(
  tipoVista: TipoVistaEvaluaciones,
  evaluadoId?: string | null,
) {
  return useQuery({
    queryKey: evaluacionesKeys.resultados(tipoVista, evaluadoId),
    queryFn: () => obtenerResultados(tipoVista, evaluadoId),
    staleTime: STALE,
  });
}

export function usePendientesEnvio(enabled: boolean) {
  return useQuery({
    queryKey: evaluacionesKeys.pendientesEnvio,
    queryFn: listarPendientesEnvio,
    enabled,
    staleTime: STALE,
  });
}

export function useParaLlenar(
  tipoVista: TipoVistaEvaluaciones,
  formularioId: string | null,
  evaluadoId: string | null,
) {
  return useQuery({
    queryKey: evaluacionesKeys.llenar(
      tipoVista,
      formularioId ?? "",
      evaluadoId ?? "",
    ),
    queryFn: () => obtenerParaLlenar(tipoVista, formularioId!, evaluadoId!),
    enabled: Boolean(formularioId && evaluadoId),
    staleTime: 0,
  });
}

export function useMutacionesEvaluacion() {
  const queryClient = useQueryClient();
  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: [...ROOT] });

  const crear = useMutation({
    mutationFn: (values: CrearEvaluacionValues) => crearEvaluacion(values),
    onSuccess: invalidar,
  });
  const actualizar = useMutation({
    mutationFn: (values: ActualizarEvaluacionValues) =>
      actualizarEvaluacion(values),
    onSuccess: invalidar,
  });
  const cambiarActivo = useMutation({
    mutationFn: (values: CambiarActivoEvaluacionValues) =>
      cambiarActivoEvaluacion(values),
    onMutate: async (values) => {
      await queryClient.cancelQueries({ queryKey: evaluacionesKeys.plantillas });

      const detalleKey = [...evaluacionesKeys.plantillas, values.id] as const;
      const prevDetalle =
        queryClient.getQueryData<EvaluacionPlantilla | null>(detalleKey);
      const prevPlantillas = queryClient.getQueryData<EvaluacionPlantilla[]>(
        evaluacionesKeys.plantillas,
      );

      if (prevDetalle) {
        queryClient.setQueryData(detalleKey, {
          ...prevDetalle,
          activo: values.activo,
        });
      }
      if (prevPlantillas) {
        queryClient.setQueryData(
          evaluacionesKeys.plantillas,
          prevPlantillas.map((p) =>
            p.id === values.id ? { ...p, activo: values.activo } : p,
          ),
        );
      }

      return { prevDetalle, prevPlantillas };
    },
    onError: (_err, values, ctx) => {
      const detalleKey = [...evaluacionesKeys.plantillas, values.id] as const;
      if (ctx?.prevDetalle !== undefined) {
        queryClient.setQueryData(detalleKey, ctx.prevDetalle);
      }
      if (ctx?.prevPlantillas) {
        queryClient.setQueryData(
          evaluacionesKeys.plantillas,
          ctx.prevPlantillas,
        );
      }
    },
    onSuccess: (res, values) => {
      if (!res.ok) return;
      const detalleKey = [...evaluacionesKeys.plantillas, values.id] as const;
      const detalle =
        queryClient.getQueryData<EvaluacionPlantilla | null>(detalleKey);
      if (detalle) {
        queryClient.setQueryData(detalleKey, {
          ...detalle,
          activo: values.activo,
        });
      }
      const plantillas = queryClient.getQueryData<EvaluacionPlantilla[]>(
        evaluacionesKeys.plantillas,
      );
      if (plantillas) {
        queryClient.setQueryData(
          evaluacionesKeys.plantillas,
          plantillas.map((p) =>
            p.id === values.id ? { ...p, activo: values.activo } : p,
          ),
        );
      }
    },
  });
  const eliminar = useMutation({
    mutationFn: (id: string) => eliminarEvaluacion(id),
    onSuccess: invalidar,
  });
  const duplicar = useMutation({
    mutationFn: (values: DuplicarEvaluacionValues) =>
      duplicarEvaluacion(values),
    onSuccess: invalidar,
  });
  const aspectos = useMutation({
    mutationFn: (values: GuardarAspectosValues) => guardarAspectos(values),
    onSuccess: (res) => {
      if (res.ok) invalidar();
    },
  });
  const evaluacion = useMutation({
    mutationFn: ({
      tipoVista,
      values,
    }: {
      tipoVista: TipoVistaEvaluaciones;
      values: GuardarEvaluacionValues;
    }) => guardarEvaluacion(tipoVista, values),
    onSuccess: invalidar,
  });

  return { crear, actualizar, cambiarActivo, eliminar, duplicar, aspectos, evaluacion };
}
