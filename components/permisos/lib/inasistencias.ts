import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { parseISO, format, eachDayOfInterval } from "date-fns";
import { PermisoEmpleado } from "../types";
import {
  parseDiasAcuerdo,
  acuerdoAplicaEnFecha,
} from "../acuerdos/dias-acuerdo";
import {
  useAsuetos,
  getAsuetoPorFecha,
  buildParentByDependenciaId,
} from "@/hooks/asistencia/useAsuetos";
import { useDependencias } from "@/hooks/dependencias/useDependencias";

export interface DatosInasistenciasEmpleado {
  userId: string;
  nombre: string;
  oficina: string;
  puesto?: string;
  fechas: string[];
}

function permisoJustificaDia(permiso: PermisoEmpleado, diaString: string): boolean {
  if (permiso.estado?.toLowerCase().includes("rechazado")) return false;
  const dias = parseDiasAcuerdo(permiso.dias);
  return acuerdoAplicaEnFecha(dias, permiso.inicio, permiso.fin, diaString);
}

export function useInasistenciasEmpleados(
  fechaInicio?: string,
  fechaFin?: string,
  userIds?: string[],
) {
  const inicio = fechaInicio || format(new Date(), "yyyy-MM-dd");
  const fin = fechaFin || format(new Date(), "yyyy-MM-dd");

  const { dependencias } = useDependencias();
  const { asuetos } = useAsuetos(inicio, fin);

  const parentByDependenciaId = useMemo(
    () => buildParentByDependenciaId(dependencias),
    [dependencias],
  );

  // 1. Días laborales del rango hasta el día de hoy
  const diasLaborales = useMemo(() => {
    if (!inicio || !fin) return [];
    try {
      const hoyStr = format(new Date(), "yyyy-MM-dd");
      const dias = eachDayOfInterval({
        start: parseISO(inicio),
        end: parseISO(fin),
      });

      return dias
        .filter((d) => {
          const day = d.getDay();
          return day >= 1 && day <= 5; // Lunes a Viernes
        })
        .map((d) => format(d, "yyyy-MM-dd"))
        .filter((dStr) => dStr <= hoyStr);
    } catch (e) {
      return [];
    }
  }, [inicio, fin]);

  // Serializar lista de userIds para la query key
  const userIdsKey = useMemo(() => (userIds || []).slice().sort().join(","), [userIds]);

  // 2. Consulta ultra-rápida y paralelizada por usuario específico
  const { data: datosCalculo, isLoading } = useQuery({
    queryKey: ["inasistencias-calculo-optimizado", inicio, fin, userIdsKey],
    queryFn: async () => {
      const supabase = createClient();
      const targetUserIds = (userIds || []).filter(Boolean);

      // Si no hay usuarios específicos, no hacemos consultas innecesarias
      if (targetUserIds.length === 0) {
        return {
          marcasSet: new Set<string>(),
          permisosMap: {} as Record<string, PermisoEmpleado[]>,
          comisionesMap: {} as Record<string, Set<string>>,
        };
      }

      // Consulta de marcajes completa y paginada (para no ser truncado por el límite de 1,000 filas de Supabase)
      const fetchMarcajesPorUsuario = async () => {
        let pInicio = inicio;
        let pFin = fin;

        if (inicio && !inicio.includes("T")) {
          const [yI, mI, dI] = inicio.split("-").map(Number);
          pInicio = new Date(yI, mI - 1, dI, 0, 0, 0).toISOString();
        }
        if (fin && !fin.includes("T")) {
          const [yF, mF, dF] = fin.split("-").map(Number);
          pFin = new Date(yF, mF - 1, dF, 23, 59, 59, 999).toISOString();
        }

        try {
          const allRegistros: { userId: string; created_at: string }[] = [];
          let from = 0;
          const step = 1000;
          let hasMore = true;

          while (hasMore) {
            const { data: chunk, error } = await supabase
              .from("registros_asistencia")
              .select("user_id, created_at")
              .in("user_id", targetUserIds)
              .gte("created_at", pInicio)
              .lte("created_at", pFin)
              .range(from, from + step - 1);

            if (error) {
              console.warn("Error en consulta paginada registros_asistencia, fallback a RPC:", error);
              break;
            }

            if (chunk && chunk.length > 0) {
              for (let i = 0; i < chunk.length; i++) {
                allRegistros.push({
                  userId: chunk[i].user_id,
                  created_at: chunk[i].created_at,
                });
              }
              if (chunk.length < step) {
                hasMore = false;
              } else {
                from += step;
              }
            } else {
              hasMore = false;
            }
          }

          if (allRegistros.length > 0 || !hasMore) {
            return allRegistros;
          }
        } catch (err) {
          console.warn("Fallback a RPC asistencias_usuario:", err);
        }

        // Respaldo por RPC si fuera necesario
        const promesas = targetUserIds.map(async (uid) => {
          const { data, error } = await supabase.rpc("asistencias_usuario", {
            p_user_id: uid,
            p_fecha_inicio: pInicio,
            p_fecha_final: pFin,
          });
          if (error) {
            console.error(`Error al consultar asistencias de usuario ${uid}:`, error);
            return [];
          }
          return (data || []).map((r: any) => ({
            userId: uid,
            created_at: r.created_at,
          }));
        });

        const resultados = await Promise.all(promesas);
        return resultados.flat();
      };

      // Consulta de permisos filtrada únicamente a los IDs de usuarios presentes
      const fetchPermisos = async () => {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from("permisos_empleado")
            .select("id, user_id, inicio, fin, tipo, estado, dias")
            .in("user_id", targetUserIds)
            .gte("fin", inicio)
            .lte("inicio", `${fin}T23:59:59`)
            .range(from, from + step - 1);

          if (error) {
            console.error("Error al consultar permisos_empleado:", error);
            break;
          }
          if (data && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < step) hasMore = false;
            else from += step;
          } else {
            hasMore = false;
          }
        }
        return allData;
      };

      // Consulta de comisiones del rango
      const fetchComisiones = async () => {
        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from("comisiones")
            .select("id, fecha_hora, aprobado, comision_asistentes(asistente_id)")
            .eq("aprobado", true)
            .gte("fecha_hora", inicio)
            .lte("fecha_hora", `${fin}T23:59:59`)
            .range(from, from + step - 1);

          if (error) {
            console.error("Error al consultar comisiones:", error);
            break;
          }
          if (data && data.length > 0) {
            allData = allData.concat(data);
            if (data.length < step) hasMore = false;
            else from += step;
          } else {
            hasMore = false;
          }
        }
        return allData;
      };

      const [marcajesList, permisosList, comisionesList] = await Promise.all([
        fetchMarcajesPorUsuario(),
        fetchPermisos(),
        fetchComisiones(),
      ]);

      // Set de marcas optimizado
      const marcasSet = new Set<string>();
      marcajesList.forEach((reg) => {
        if (reg.userId && reg.created_at) {
          const diaStr = format(new Date(reg.created_at), "yyyy-MM-dd");
          const uid = String(reg.userId).trim();
          marcasSet.add(`${uid}_${diaStr}`);
        }
      });

      // Permisos por usuario
      const permisosMap: Record<string, PermisoEmpleado[]> = {};
      permisosList.forEach((p: any) => {
        if (!p.user_id) return;
        const uid = String(p.user_id).trim();
        if (!permisosMap[uid]) permisosMap[uid] = [];
        permisosMap[uid].push(p as PermisoEmpleado);
      });

      // Comisiones por usuario
      const comisionesMap: Record<string, Set<string>> = {};
      comisionesList.forEach((c: any) => {
        const diaComision = c.fecha_hora?.substring(0, 10);
        if (!diaComision) return;
        (c.comision_asistentes || []).forEach((asist: any) => {
          if (asist.asistente_id) {
            const uid = String(asist.asistente_id).trim();
            if (!comisionesMap[uid]) {
              comisionesMap[uid] = new Set<string>();
            }
            comisionesMap[uid].add(diaComision);
          }
        });
      });

      return {
        marcasSet,
        permisosMap,
        comisionesMap,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de caché
    enabled: Boolean(inicio && fin && userIds && userIds.length > 0),
  });

  // 3. Función para calcular inasistencias de un usuario
  const calcularInasistenciasUsuario = (
    userId: string,
    dependenciaId?: string | null,
  ): string[] => {
    if (!datosCalculo || diasLaborales.length === 0) return [];

    const uid = String(userId).trim();
    const { marcasSet, permisosMap, comisionesMap } = datosCalculo;
    const permisosUsuario = permisosMap[uid] || [];
    const comisionesUsuario = comisionesMap[uid];

    const inasistencias: string[] = [];

    for (const diaStr of diasLaborales) {
      // Si tiene al menos una marca (entrada o salida), NO es inasistencia
      if (marcasSet.has(`${uid}_${diaStr}`)) {
        continue;
      }

      // Si tiene permiso o acuerdo aprobado en ese día, NO es inasistencia
      if (permisosUsuario.some((p) => permisoJustificaDia(p, diaStr))) {
        continue;
      }

      // Si tiene comisión aprobada en ese día, NO es inasistencia
      if (comisionesUsuario && comisionesUsuario.has(diaStr)) {
        continue;
      }

      // Si es asueto oficial o de su dependencia, NO es inasistencia
      if (
        getAsuetoPorFecha(
          asuetos,
          diaStr,
          dependenciaId,
          parentByDependenciaId,
        )
      ) {
        continue;
      }

      // Es inasistencia
      inasistencias.push(diaStr);
    }

    return inasistencias;
  };

  return {
    diasLaborales,
    isLoading,
    calcularInasistenciasUsuario,
  };
}
