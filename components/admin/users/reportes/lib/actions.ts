"use server";

import { createClient } from "@/utils/supabase/server";

export interface ReporteNominaFila {
  id: string;
  nombre: string;
  puesto: string;
  dependencia_id: string;
  dependencia_nombre: string;
  path_orden: string;
  renglon: string;

  salario_unitario: number;
  bonificacion_unitaria: number;

  prima: boolean;
  plan_prestaciones: boolean;
  isr: number;

  fecha_inicio: string | null;
  fecha_fin: string | null;
}

function normalizarFecha(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const soloFecha = valor.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(soloFecha)) return soloFecha;
  return null;
}

export async function obtenerReporteNomina(): Promise<ReporteNominaFila[]> {
  const supabase = await createClient();

  const { data: usuarios, error } = await supabase
    .from("info_usuario")
    .select(
      `
      user_id,
      nombre,
      dependencia_id,
      dependencias!info_usuario_dependencia_id_fkey (
        id, nombre, parent_id, renglon, salario, bonificacion, 
        prima, plan_prestaciones, isr, no
      )
    `,
    )
    .eq("activo", true)
    .not("dependencia_id", "is", null);

  if (error || !usuarios) {
    return [];
  }

  const dependenciaIds = [
    ...new Set(
      usuarios
        .map((u) => u.dependencia_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const contratoPorDependencia = new Map<
    string,
    { user_id: string; fecha_inicio: string | null; fecha_fin: string | null }
  >();
  const contratoPorUsuarioDep = new Map<
    string,
    { fecha_inicio: string | null; fecha_fin: string | null }
  >();

  if (dependenciaIds.length > 0) {
    const { data: contratos } = await supabase
      .from("contrato")
      .select("user_id, dependencia_id, fecha_inicio, fecha_fin, created_at")
      .in("dependencia_id", dependenciaIds)
      .order("created_at", { ascending: false });

    for (const c of contratos ?? []) {
      if (!c.dependencia_id) continue;

      const fechas = {
        fecha_inicio: normalizarFecha(c.fecha_inicio),
        fecha_fin: normalizarFecha(c.fecha_fin),
      };

      const claveUsuarioDep = `${c.user_id}:${c.dependencia_id}`;
      if (!contratoPorUsuarioDep.has(claveUsuarioDep)) {
        contratoPorUsuarioDep.set(claveUsuarioDep, fechas);
      }

      if (!contratoPorDependencia.has(c.dependencia_id)) {
        contratoPorDependencia.set(c.dependencia_id, {
          user_id: c.user_id,
          ...fechas,
        });
      }
    }
  }

  const { data: todasDependencias } = await supabase
    .from("dependencias")
    .select("id, nombre, parent_id, no");

  const depMap = new Map(todasDependencias?.map((d) => [d.id, d]));

  const procesarJerarquia = (depId: string) => {
    const numeros: string[] = [];
    const nombres: string[] = [];
    let currentId: string | null = depId;
    let safety = 0;
    while (currentId && safety < 15) {
      const dep = depMap.get(currentId);
      if (dep) {
        numeros.unshift(dep.no.toString());
        nombres.unshift(dep.nombre);
        currentId = dep.parent_id;
      } else {
        break;
      }
      safety++;
    }
    const pathOrden = numeros.join(".");
    let nombreAgrupador = "";
    if (nombres.length > 1) {
      nombreAgrupador = nombres.slice(0, -1).join(" > ");
    } else {
      nombreAgrupador = nombres[0] || "SIN UBICACIÓN";
    }
    return { path_orden: pathOrden, dependencia_nombre: nombreAgrupador };
  };

  const reporte: ReporteNominaFila[] = usuarios
    .map((u) => {
      const dep = u.dependencias;
      const d = Array.isArray(dep) ? dep[0] : dep;

      if (!d) return null;

      const jerarquia = procesarJerarquia(d.id);
      const contrato =
        contratoPorUsuarioDep.get(`${u.user_id}:${d.id}`) ??
        (u.dependencia_id
          ? contratoPorDependencia.get(u.dependencia_id)
          : undefined);

      return {
        id: u.user_id,
        nombre: u.nombre ?? "",
        puesto: d.nombre,
        dependencia_id: d.id,
        dependencia_nombre: jerarquia.dependencia_nombre,
        path_orden: jerarquia.path_orden,
        renglon: d.renglon || "---",

        salario_unitario: d.salario || 0,
        bonificacion_unitaria: d.bonificacion || 0,

        prima: !!d.prima,
        plan_prestaciones: d.plan_prestaciones || false,
        isr: d.isr || 0,

        fecha_inicio: contrato?.fecha_inicio ?? null,
        fecha_fin: contrato?.fecha_fin ?? null,
      };
    })
    .filter((item): item is ReporteNominaFila => item !== null);

  return reporte.sort((a, b) =>
    a.path_orden.localeCompare(b.path_orden, undefined, { numeric: true }),
  );
}

export async function obtenerFirmasAutoridades() {
  const supabase = await createClient();
  const { data: empleados } = await supabase
    .from("info_usuario")
    .select(`nombre, dependencias!info_usuario_dependencia_id_fkey (nombre)`)
    .eq("activo", true);

  if (!empleados) return { rrhh: "", dafim: "" };

  let nombreRRHH = "";
  let nombreDAFIM = "";

  for (const emp of empleados) {
    const dep = Array.isArray(emp.dependencias)
      ? emp.dependencias[0]
      : emp.dependencias;
    if (!dep || !dep.nombre) continue;
    const puesto = dep.nombre.toUpperCase();
    if (
      puesto.includes("RECURSOS HUMANOS") &&
      (puesto.includes("COORDINADOR") ||
        puesto.includes("DIRECTOR") ||
        puesto.includes("ENCARGADO"))
    ) {
      nombreRRHH = emp.nombre || "";
    }
    if (
      (puesto.includes("DAFIM") || puesto.includes("FINANCIERA")) &&
      (puesto.includes("DIRECTOR") || puesto.includes("COORDINADOR"))
    ) {
      nombreDAFIM = emp.nombre || "";
    }
  }
  return { rrhh: nombreRRHH, dafim: nombreDAFIM };
}
