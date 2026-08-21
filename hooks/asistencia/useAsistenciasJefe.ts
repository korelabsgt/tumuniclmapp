import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

export interface AsistenciaTableData {
  id: number;
  created_at: string;
  tipo_registro: "Entrada" | "Salida" | null;
  ubicacion: any;
  notas: string | null;
  user_id: string;
  nombre: string;
  puesto_nombre: string | null;
  oficina_nombre: string;
  oficina_path_orden: string;
  email: string;
  rol: string;
  programas: string[];
}

export default function useAsistenciasJefe(
  jefeId: string | null,
  fechaInicio: string | null,
  fechaFinal: string | null,
  filtroOficinaId: string | null = null,
) {
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "asistencias_jefe_global",
      jefeId,
      filtroOficinaId,
      fechaInicio,
      fechaFinal,
    ],

    queryFn: async () => {
      if (!jefeId) return { registros: [], dependenciasPermitidas: [] };
      const supabase = createClient();
      const { data: allDependencias, error: errDep } = await supabase
        .from("dependencias")
        .select("id, nombre, parent_id, jefe_id, es_puesto");

      if (errDep) throw new Error(errDep.message);

      let rootIds: string[] = [];
      if (filtroOficinaId) {
        rootIds = [filtroOficinaId];
      } else {
        rootIds = allDependencias?.filter((d) => d.jefe_id === jefeId).map((d) => d.id) || [];
      }

      if (rootIds.length === 0) return { registros: [], dependenciasPermitidas: [] };

      const todosIdsSet = new Set<string>();
      const agregarDescendientes = (id: string) => {
        if (todosIdsSet.has(id)) return;
        todosIdsSet.add(id);
        allDependencias?.filter((d) => d.parent_id === id).forEach((d) => agregarDescendientes(d.id));
      };

      rootIds.forEach((id) => agregarDescendientes(id));
      const todosIds = Array.from(todosIdsSet);

      if (todosIds.length === 0) return { registros: [], dependenciasPermitidas: [] };

      const { data: usuarios, error: errUsuarios } = await supabase
        .from("info_usuario")
        .select("user_id, nombre, dependencia_id")
        .in("dependencia_id", todosIds);

      if (errUsuarios) throw new Error(errUsuarios.message);

      const userIds = usuarios?.map((u) => u.user_id) || [];

      if (userIds.length === 0) return { registros: [], dependenciasPermitidas: [] };

      const mapaUsuarios = new Map(usuarios?.map((u) => [u.user_id, u]));

      let allRegistros: any[] = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("registros_asistencia")
          .select("id, created_at, tipo_registro, ubicacion, notas, user_id")
          .in("user_id", userIds)
          .order("created_at", { ascending: false })
          .range(from, from + step - 1);

        if (fechaInicio) query = query.gte("created_at", fechaInicio);
        if (fechaFinal) query = query.lte("created_at", fechaFinal);

        const { data: chunk, error: errReg } = await query;
        if (errReg) throw new Error(errReg.message);

        if (chunk && chunk.length > 0) {
          allRegistros = allRegistros.concat(chunk);
          if (chunk.length < step) hasMore = false;
          else from += step;
        } else {
          hasMore = false;
        }
      }

      const mapaDependencias = new Map(allDependencias?.map((d) => [d.id, d]));

      const registrosMap = allRegistros.map((reg: any) => {
        const userInfo = mapaUsuarios.get(reg.user_id);
        const depId = userInfo?.dependencia_id;

        let nombreOficina = "Desconocida";
        let nombrePuesto = null;
        let idOrden = depId;

        if (depId && mapaDependencias.has(depId)) {
          const dep = mapaDependencias.get(depId);
          if (dep?.es_puesto) {
            nombrePuesto = dep.nombre;
            const parent = dep.parent_id ? mapaDependencias.get(dep.parent_id) : null;
            nombreOficina = parent ? parent.nombre : "Oficina Superior";
            idOrden = dep.parent_id || depId;
          } else {
            nombreOficina = dep?.nombre || "Desconocida";
            idOrden = dep?.id || depId;
          }
        }

        return {
          id: reg.id as unknown as number,
          created_at: reg.created_at,
          tipo_registro: reg.tipo_registro as "Entrada" | "Salida" | null,
          ubicacion: reg.ubicacion,
          notas: reg.notas,
          user_id: reg.user_id,
          nombre: userInfo?.nombre || "Sin Nombre",
          email: "",
          rol: "Usuario",
          programas: [],
          puesto_nombre: nombrePuesto,
          oficina_nombre: nombreOficina,
          oficina_path_orden: idOrden,
        } as AsistenciaTableData;
      });

      return {
        registros: registrosMap,
        dependenciasPermitidas: todosIds
      };
    },
    enabled: !!jefeId,
    staleTime: 1000 * 60 * 5,
  });

  return { 
    registros: data?.registros || [], 
    dependenciasPermitidas: data?.dependenciasPermitidas || [], 
    loading: isLoading, 
    error 
  };
}
