"use server";

import { createClient } from "@/utils/supabase/server";
import { PermisoEmpleado, EstadoPermiso, esTipoAcuerdo } from "./types";
import { revalidatePath } from "next/cache";
import {
  parseDiasAcuerdo,
  construirDiasRecurrente,
  construirDiasSemanal,
  construirDiasTodos,
  actualizarSemanaAcuerdo,
  esDiaLaboral,
  validarSeleccionSemanaAcuerdo,
  obtenerSemanaRegistro,
  type DiasAcuerdoSemanal,
  type DiaHorarioAcuerdo,
} from "./acuerdos/dias-acuerdo";
import {
  notificarCreacionPermiso,
  notificarModificacionPermiso,
  notificarGestionPermiso,
  notificarEliminacionPermiso,
} from "./lib/notificaciones";

export type OficinaInfo = { id: string; nombre: string };
export type PerfilUsuario = {
  id: string;
  nombre: string;
  rol: string | null;
  esJefe: boolean;
  dependenciaId: string | null;
  oficinasACargo: OficinaInfo[];
};

async function getRolInterno(userId: string, supabase: any) {
  const { data } = await supabase
    .from("usuarios_roles")
    .select(`roles (nombre)`)
    .eq("user_id", userId);
  const rolesUsuario = data?.map((item: any) => item.roles?.nombre) || [];
  const rolesPermitidos = ["RRHH", "SECRETARIO", "SUPER", "ADMINISTRADOR"];
  return (
    rolesUsuario.find((rol: string) => rolesPermitidos.includes(rol)) || null
  );
}

export async function obtenerPerfilUsuario(): Promise<PerfilUsuario | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const rolEncontrado = await getRolInterno(user.id, supabase);
  const { data: infoData } = await supabase
    .from("info_usuario")
    .select("nombre, esjefe, dependencia_id")
    .eq("user_id", user.id)
    .single();
  const { data: dependenciasJefe } = await supabase
    .from("dependencias")
    .select("id, nombre")
    .eq("jefe_id", user.id);
  const oficinasACargo =
    dependenciasJefe?.map((d: any) => ({ id: d.id, nombre: d.nombre })) || [];
  return {
    id: user.id,
    nombre: infoData?.nombre || "Usuario",
    rol: rolEncontrado,
    esJefe: infoData?.esjefe || oficinasACargo.length > 0,
    dependenciaId: infoData?.dependencia_id || null,
    oficinasACargo,
  };
}

export async function obtenerPermisos(mes: number, anio: number) {
  const supabase = await createClient();
  const fechaInicio = new Date(anio, mes - 1, 1).toISOString();
  const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999).toISOString();

  const { data, error } = await supabase
    .from("permisos_empleado")
    .select("*")
    .gte("created_at", fechaInicio)
    .lte("created_at", fechaFin)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data as unknown as PermisoEmpleado[];
}

export async function obtenerPermisosPorFecha(fecha: string) {
  const supabase = await createClient();
  // Buscamos permisos que cubran este día (que empiecen antes o el mismo día, y terminen después o el mismo día)
  const fechaInicio = `${fecha}T00:00:00-06:00`;
  const fechaFin = `${fecha}T23:59:59.999-06:00`;

  const { data, error } = await supabase
    .from("permisos_empleado")
    .select("*")
    // El permiso debe estar activo en este día:
    // inicio <= fechaFin AND fin >= fechaInicio
    .lte("inicio", fechaFin)
    .gte("fin", fechaInicio)
    .order("inicio", { ascending: false });

  if (error) throw new Error(error.message);
  return data as unknown as PermisoEmpleado[];
}

export async function obtenerPermisosPorRango(fechaDesde: string, fechaHasta: string) {
  const supabase = await createClient();
  const fechaInicio = `${fechaDesde}T00:00:00-06:00`;
  const fechaFin = `${fechaHasta}T23:59:59.999-06:00`;

  const { data, error } = await supabase
    .from("permisos_empleado")
    .select("*")
    .lte("inicio", fechaFin)
    .gte("fin", fechaInicio)
    .order("inicio", { ascending: false });

  if (error) throw new Error(error.message);
  return data as unknown as PermisoEmpleado[];
}

export async function obtenerTodosPendientes() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("permisos_empleado")
    .select("*")
    .in("estado", ["pendiente", "aprobado_jefe"])
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as unknown as PermisoEmpleado[];
}

export async function gestionarPermiso(
  permisoId: string,
  accion: "aprobar" | "rechazar",
  idEmpleado: string,
) {
  const supabase = await createClient();
  const perfil = await obtenerPerfilUsuario();
  if (!perfil) throw new Error("No autorizado");

  const { data: permisoActual } = await supabase
    .from("permisos_empleado")
    .select("estado, user_id, tipo")
    .eq("id", permisoId)
    .single();
  if (!permisoActual) throw new Error("Permiso no encontrado");

  let nuevoEstado: EstadoPermiso | null = null;

  if (accion === "rechazar") {
    nuevoEstado =
      permisoActual.estado === "pendiente"
        ? "rechazado_jefe"
        : "rechazado_rrhh";
  } else if (accion === "aprobar") {
    if (permisoActual.estado === "pendiente") {
      nuevoEstado = "aprobado_jefe";
    } else if (permisoActual.estado === "aprobado_jefe") {
      nuevoEstado = "aprobado";
    }
  }

  if (nuevoEstado) {
    // Construir el update con el nombre del aprobador en el campo correcto
    const updateData: Record<string, any> = { estado: nuevoEstado };
    const nombreAprobador = perfil.nombre || "--";

    if (nuevoEstado === "aprobado_jefe" || nuevoEstado === "rechazado_jefe") {
      updateData.aprobado_jefe_nombre = nombreAprobador;
      updateData.aprobado_jefe_at = new Date().toISOString();
    } else if (nuevoEstado === "aprobado" || nuevoEstado === "rechazado_rrhh") {
      updateData.aprobado_rrhh_nombre = nombreAprobador;
      if (nuevoEstado === "aprobado") {
        updateData.aprobado_rrhh_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from("permisos_empleado")
      .update(updateData)
      .eq("id", permisoId);
    if (error) throw new Error(error.message);

    try {
      await notificarGestionPermiso({
        supabase,
        perfil,
        permisoId,
        empleadoId: permisoActual.user_id,
        tipo: permisoActual.tipo,
        nuevoEstado,
      });
    } catch (e) {
      console.error("Error notificando gestión permiso:", e);
    }

    revalidatePath("/sigem/permisos");
    revalidatePath("/sigem/permisos/acuerdos");
    return true;
  }

  return false;
}



export async function guardarPermiso(formData: FormData, id?: string) {
  const supabase = await createClient();
  const perfil = await obtenerPerfilUsuario();
  if (!perfil) throw new Error("No autorizado");

  const tipo = formData.get("tipo") as string;
  const inicio = formData.get("inicio") as string;
  const fin = formData.get("fin") as string;
  const descripcion = formData.get("descripcion") as string;
  const userIdSeleccionado = formData.get("user_id") as string;
  const estado = formData.get("estado") as string;
  const remunerado = formData.get("remunerado") === "on";
  const diasRaw = formData.get("dias") as string | null;
  const modoAcuerdo = formData.get("modo_acuerdo") as string | null;
  const cupoSemanalInput = Math.min(
    5,
    Math.max(1, Number(formData.get("cupo_semanal")) || 2),
  );
  const crearAprobadoRRHH = formData.get("crear_aprobado_rrhh") === "on";
  const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(perfil.rol || "");

  if (!userIdSeleccionado?.trim()) {
    throw new Error("Debe seleccionar un empleado.");
  }

  if (crearAprobadoRRHH && !esRRHH) {
    throw new Error("No autorizado para crear registros aprobados.");
  }

  let dias: unknown = null;
  let diasParsed = null;

  if (diasRaw && diasRaw !== "null") {
    try {
      diasParsed = parseDiasAcuerdo(JSON.parse(diasRaw) as unknown);
    } catch {
      dias = null;
      diasParsed = null;
    }
  }

  if (esTipoAcuerdo(tipo) && modoAcuerdo) {
    if (modoAcuerdo === "semanal") {
      if (id) {
        const { data: actual } = await supabase
          .from("permisos_empleado")
          .select("dias")
          .eq("id", id)
          .single();
        const existente = parseDiasAcuerdo(actual?.dias);
        if (
          existente &&
          typeof existente === "object" &&
          !Array.isArray(existente) &&
          existente.modo === "semanal"
        ) {
          dias = {
            ...existente,
            cupoSemanal: cupoSemanalInput,
          };
        } else {
          dias = construirDiasSemanal(cupoSemanalInput);
        }
      } else {
        dias = construirDiasSemanal(cupoSemanalInput);
      }
    } else if (modoAcuerdo === "todos") {
      if (
        diasParsed &&
        typeof diasParsed === "object" &&
        !Array.isArray(diasParsed) &&
        diasParsed.modo === "todos"
      ) {
        dias = construirDiasTodos({
          entrada: diasParsed.entrada,
          salida: diasParsed.salida,
        });
      } else {
        dias = null;
      }
    } else if (
      modoAcuerdo === "recurrente" &&
      diasParsed &&
      typeof diasParsed === "object" &&
      !Array.isArray(diasParsed) &&
      diasParsed.modo === "recurrente"
    ) {
      dias = construirDiasRecurrente(inicio, fin, diasParsed.diasSemana, {
        entrada: diasParsed.entrada,
        salida: diasParsed.salida,
      });
    }
  }

  if (dias === null && diasParsed) {
    if (
      typeof diasParsed === "object" &&
      !Array.isArray(diasParsed) &&
      diasParsed.modo === "recurrente" &&
      esTipoAcuerdo(tipo)
    ) {
      dias = construirDiasRecurrente(inicio, fin, diasParsed.diasSemana, {
        entrada: diasParsed.entrada,
        salida: diasParsed.salida,
      });
    } else if (
      typeof diasParsed === "object" &&
      !Array.isArray(diasParsed) &&
      diasParsed.modo === "semanal" &&
      esTipoAcuerdo(tipo)
    ) {
      dias = {
        modo: "semanal",
        cupoSemanal: cupoSemanalInput,
        semanas: diasParsed.semanas ?? {},
      };
    } else {
      dias = diasParsed;
    }
  }

  const datos: Record<string, unknown> = {
    tipo,
    inicio,
    fin,
    descripcion,
    user_id: userIdSeleccionado,
    remunerado: remunerado,
    dias,
  };

  if (crearAprobadoRRHH && !id) {
    const ahora = new Date().toISOString();
    const nombreAprobador = perfil.nombre || "--";
    datos.estado = "aprobado";
    if (esTipoAcuerdo(tipo)) {
      datos.aprobado_rrhh_nombre = nombreAprobador;
      datos.aprobado_rrhh_at = ahora;
    } else {
      datos.aprobado_jefe_nombre = nombreAprobador;
      datos.aprobado_jefe_at = ahora;
      datos.aprobado_rrhh_nombre = nombreAprobador;
      datos.aprobado_rrhh_at = ahora;
    }
  } else if (estado) {
    datos.estado = estado;
  } else if (!id) {
    datos.estado = "pendiente";
  }

  let permisoId = id;

  if (id) {
    const { error } = await supabase
      .from("permisos_empleado")
      .update(datos)
      .eq("id", id);

    if (error) throw new Error(error.message);

    try {
      await notificarModificacionPermiso({
        supabase,
        perfil,
        permisoId: id,
        empleadoId: userIdSeleccionado,
        tipo,
      });
    } catch (e) {
      console.error("Error notificando modificación permiso:", e);
    }
  } else {
    const { data: inserted, error } = await supabase
      .from("permisos_empleado")
      .insert(datos)
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    permisoId = inserted.id;

    try {
      await notificarCreacionPermiso({
        supabase,
        perfil,
        permisoId: inserted.id,
        empleadoId: userIdSeleccionado,
        tipo,
        crearAprobadoRRHH,
      });
    } catch (e) {
      console.error("Error notificando creación permiso:", e);
    }
  }

  revalidatePath("/sigem/permisos");
  revalidatePath("/sigem/permisos/acuerdos");
  return permisoId;
}

export async function eliminarPermiso(id: string) {
  const supabase = await createClient();
  const perfil = await obtenerPerfilUsuario();

  const { data: registro } = await supabase
    .from("permisos_empleado")
    .select("user_id, tipo")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("permisos_empleado")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  if (perfil && registro) {
    try {
      await notificarEliminacionPermiso({
        supabase,
        perfil,
        permisoId: id,
        empleadoId: registro.user_id,
        tipo: registro.tipo,
      });
    } catch (e) {
      console.error("Error notificando eliminación permiso:", e);
    }
  }

  revalidatePath("/sigem/permisos");
  revalidatePath("/sigem/permisos/acuerdos");
}

export async function actualizarComprobantePermiso(
  permisoId: string,
  path: string | null,
) {
  const perfil = await obtenerPerfilUsuario();
  const rolesPermitidos = ["RRHH", "ADMINISTRADOR", "SUPER", "SECRETARIO"];
  if (!perfil || !rolesPermitidos.includes(perfil.rol || "")) {
    throw new Error("No tiene permiso para subir justificaciones");
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("permisos_empleado")
    .update({ comprobante_url: path })
    .eq("id", permisoId);

  if (error) {
    throw new Error(`Error al actualizar el comprobante: ${error.message}`);
  }

  revalidatePath("/sigem/permisos");
  revalidatePath("/sigem/permisos/acuerdos");
  return { path };
}

export async function obtenerPermisosDelUsuario(userId: string): Promise<PermisoEmpleado[]> {
  const supabase = await createClient();
  
  const [{ data, error }, { data: infoUsuario }] = await Promise.all([
    supabase
      .from("permisos_empleado")
      .select("*")
      .eq("user_id", userId)
      .order("inicio", { ascending: false }),
    supabase
      .from("info_usuario")
      .select("nombre, dependencia_id")
      .eq("user_id", userId)
      .single(),
  ]);

  if (error || !data) return [];

  // Si tenemos info del usuario, obtener el nombre de su dependencia (puesto)
  let puestoNombre: string | null = null;
  let oficinaNombre: string | null = null;
  if (infoUsuario?.dependencia_id) {
    const { data: dep } = await supabase
      .from("dependencias")
      .select("nombre, parent_id")
      .eq("id", infoUsuario.dependencia_id)
      .single();
    if (dep) {
      puestoNombre = dep.nombre;
      // Obtener la oficina (parent de la dependencia)
      if (dep.parent_id) {
        const { data: parent } = await supabase
          .from("dependencias")
          .select("nombre")
          .eq("id", dep.parent_id)
          .single();
        oficinaNombre = parent?.nombre || dep.nombre;
      } else {
        oficinaNombre = dep.nombre;
      }
    }
  }

  const usuarioInfo = infoUsuario ? {
    id: userId,
    nombre: infoUsuario.nombre,
    puesto_nombre: puestoNombre,
    oficina_nombre: oficinaNombre,
    dependencia_id: infoUsuario.dependencia_id,
    oficina_path_orden: null,
  } : undefined;

  return data.map(p => ({ ...p, usuario: usuarioInfo })) as unknown as PermisoEmpleado[];
}

export async function actualizarDiasSemanaAcuerdo(
  acuerdoId: string,
  semanaKey: string,
  diasHorario: DiaHorarioAcuerdo[],
) {
  const supabase = await createClient();
  const perfil = await obtenerPerfilUsuario();
  if (!perfil) throw new Error("No autorizado");

  const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(perfil.rol || "");
  if (!esRRHH) {
    throw new Error("Solo RRHH puede asignar los días del acuerdo");
  }

  const { data: registro, error: fetchError } = await supabase
    .from("permisos_empleado")
    .select("id, user_id, tipo, dias, estado")
    .eq("id", acuerdoId)
    .single();

  if (fetchError || !registro) throw new Error("Acuerdo no encontrado");
  if (!esTipoAcuerdo(registro.tipo)) throw new Error("No es un acuerdo municipal");
  if (registro.estado !== "aprobado") {
    throw new Error("El acuerdo debe estar aprobado");
  }

  const diasParsed = parseDiasAcuerdo(registro.dias);
  if (
    !diasParsed ||
    typeof diasParsed !== "object" ||
    Array.isArray(diasParsed) ||
    diasParsed.modo !== "semanal"
  ) {
    throw new Error("Este acuerdo no usa modalidad semanal flexible");
  }

  if (diasHorario.length > diasParsed.cupoSemanal) {
    throw new Error(`Solo puede asignar ${diasParsed.cupoSemanal} días por semana`);
  }

  if (diasHorario.some((d) => !esDiaLaboral(d.fecha))) {
    throw new Error("Solo puede asignar días laborales (lun–vie)");
  }

  const anteriores =
    obtenerSemanaRegistro(diasParsed as DiasAcuerdoSemanal, semanaKey)?.dias ??
    [];

  validarSeleccionSemanaAcuerdo({
    dias: diasHorario,
    anteriores,
    cupoSemanal: diasParsed.cupoSemanal,
  });

  const diasActualizados = actualizarSemanaAcuerdo(
    diasParsed as DiasAcuerdoSemanal,
    semanaKey,
    diasHorario,
    perfil.nombre || "RRHH",
  );

  const { error } = await supabase
    .from("permisos_empleado")
    .update({ dias: diasActualizados })
    .eq("id", acuerdoId);

  if (error) throw new Error(error.message);

  revalidatePath("/sigem/permisos/acuerdos");
  return diasActualizados;
}
