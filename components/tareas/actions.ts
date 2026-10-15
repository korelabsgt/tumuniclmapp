'use server'

import { createClient } from '@/utils/supabase/server';
import supabaseAdmin from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import { ChecklistItem, NewTaskState, Tarea, Usuario, PerfilUsuario, TipoVistaTareas, AsignacionMiembro, ActMiembro } from './types';
import {
  notificarActividadConcejoCompletada,
  notificarActividadConcejoRevisada,
} from '@/components/concejo/agenda/tareas/lib/notificaciones'; 

// ─── Helpers internos ────────────────────────────────────────────────────────

async function getRolInterno(userId: string, supabase: any) {
  const { data } = await supabase.from('usuarios_roles').select(`roles (nombre)`).eq('user_id', userId);
  const rolesUsuario = data?.map((item: any) => item.roles?.nombre) || [];
  const rolesPermitidos = ['RRHH', 'SECRETARIO', 'SUPER', 'ADMINISTRADOR'];
  return rolesUsuario.find((rol: string) => rolesPermitidos.includes(rol)) || null;
}

async function obtenerPerfilCompleto(userId: string, supabase: any): Promise<PerfilUsuario> {
  const rol = await getRolInterno(userId, supabase);
  const { data: info } = await supabase.from('info_usuario').select('nombre, esjefe').eq('user_id', userId).single();
  const { data: oficinas } = await supabase.from('dependencias').select('id, nombre').eq('jefe_id', userId);

  return {
    id: userId,
    nombre: info?.nombre || 'Usuario',
    rol: rol,
    esJefe: info?.esjefe || (oficinas && oficinas.length > 0) || false,
    oficinasACargo: oficinas?.map((o: any) => ({ id: o.id, nombre: o.nombre })) || []
  };
}

/**
 * Envía notificación push a uno o varios usuarios.
 * Función utilitaria reutilizada por crearTarea y agregarMiembro.
 */
async function enviarNotificacion(titulo: string, mensaje: string, userIds: string[]) {
  try {
    if (userIds.length === 0) return;
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/push/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titulo,
        message: mensaje,
        url: '/protected/actividades',
        targetIds: userIds,
      }),
    });
  } catch (error) {
    console.error('Error enviando notificación push:', error);
  }
}

// ─── Query principal ─────────────────────────────────────────────────────────

export async function obtenerDatosGestor(tipoVista: TipoVistaTareas) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const perfil = await obtenerPerfilCompleto(user.id, supabase);

  // 1. OBTENER DEPENDENCIAS (Para resolver nombres y jerarquías)
  // Traemos 'parent_id' para saber si un usuario pertenece a una sub-dependencia (puesto) de mi oficina
  const { data: dependencias } = await supabase
    .from('dependencias')
    .select('id, nombre, parent_id');
  
  // Mapa para búsqueda rápida: ID -> Objeto Dependencia
  const depMap = new Map(dependencias?.map((d: any) => [d.id, d]));

  // Helper para obtener el nombre de la OFICINA (Padre) si es un puesto
  const getNombreOficinaReal = (depId: string | null) => {
      if (!depId) return 'Sin Oficina Asignada';
      const dep = depMap.get(depId);
      if (!dep) return 'Oficina Desconocida';
      
      // Si tiene padre, asumimos que el padre es la Oficina y el actual es el Puesto
      if (dep.parent_id) {
          const padre = depMap.get(dep.parent_id);
          return padre ? padre.nombre : dep.nombre;
      }
      // Si no tiene padre, es la oficina principal
      return dep.nombre;
  };

  // Helper para obtener el ID de la OFICINA (Padre) para comparar con el jefe
  const getIdOficinaReal = (depId: string | null) => {
      if (!depId) return null;
      const dep = depMap.get(depId);
      if (!dep) return null;
      return dep.parent_id ? dep.parent_id : dep.id;
  };

  // 2. OBTENER USUARIOS (Solo columnas existentes en tu diagrama)
  const { data: rawUsuarios, error: errorUsuarios } = await supabase
    .from('info_usuario')
    .select('user_id, nombre, esjefe, activo, dependencia_id') 
    .order('nombre');

  if (errorUsuarios) {
      console.error("Error crítico cargando usuarios:", errorUsuarios);
      return { perfil, tareas: [], usuarios: [] };
  }

  // Enriquecemos usuarios calculando su oficina real
  const todosLosUsuarios = (rawUsuarios || []).map((u: any) => ({
      ...u,
      oficina_nombre: getNombreOficinaReal(u.dependencia_id),
      // Guardamos el ID de la oficina real para filtrar fácil abajo
      oficina_real_id: getIdOficinaReal(u.dependencia_id) 
  }));

  // 3. QUERY DE TAREAS
  let rawTareas: any[] = [];
  let alcancePorTarea = new Map<string, 'equipo' | 'externa'>();

  if (tipoVista === 'mis_actividades') {
      const { data: asignadasAMi, error: errorAsignadas } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', user.id)
        .order('due_date', { ascending: true });

      const { data: asignadasPorMi, error: errorCreadas } = await supabase
        .from('tasks')
        .select('*')
        .eq('created_by', user.id)
        .neq('assigned_to', user.id)
        .order('due_date', { ascending: true });

      // También traer tareas donde el usuario es miembro (pero no encargado)
      const { data: tareasComoMiembro } = await supabase
        .from('act_miembros')
        .select('id_act')
        .eq('id_user', user.id);

      const idsComoMiembro = (tareasComoMiembro || []).map((m: any) => m.id_act);

      let tareasGrupales: any[] = [];
      if (idsComoMiembro.length > 0) {
        const { data } = await supabase
          .from('tasks')
          .select('*')
          .in('id', idsComoMiembro)
          .neq('assigned_to', user.id) // Evitar duplicados si también es encargado
          .order('due_date', { ascending: true });
        tareasGrupales = data || [];
      }

      if (errorAsignadas || errorCreadas) {
          console.error('Error fetching tasks:', errorAsignadas || errorCreadas);
          return { perfil, tareas: [], usuarios: [] };
      }

      const porId = new Map<string, any>();
      [...(asignadasAMi || []), ...(asignadasPorMi || []), ...tareasGrupales].forEach((t) => porId.set(t.id, t));
      rawTareas = Array.from(porId.values());
  } 
  else if (tipoVista === 'gestion_jefe') {
      if (!perfil.esJefe) return { perfil, tareas: [], usuarios: [] };

      const misOficinasIds = perfil.oficinasACargo.map(o => o.id);

      const misEmpleadosIds = todosLosUsuarios
        .filter((u: any) => u.oficina_real_id && misOficinasIds.includes(u.oficina_real_id))
        .map((u: any) => u.user_id);

      if (misEmpleadosIds.length > 0) {
          const { data: tareasEquipo, error: errorEquipo } = await supabase
            .from('tasks')
            .select('*')
            .in('assigned_to', misEmpleadosIds)
            .neq('assigned_to', user.id)
            .order('due_date', { ascending: true });

          if (errorEquipo) {
              console.error("Error fetching team tasks:", errorEquipo);
              return { perfil, tareas: [], usuarios: [] };
          }

          (tareasEquipo || []).forEach((t: any) => alcancePorTarea.set(t.id, 'equipo'));
          rawTareas.push(...(tareasEquipo || []));
      }

      const { data: tareasCreadas, error: errorCreadas } = await supabase
        .from('tasks')
        .select('*')
        .eq('created_by', user.id)
        .neq('assigned_to', user.id)
        .order('due_date', { ascending: true });

      if (errorCreadas) {
          console.error("Error fetching external tasks:", errorCreadas);
          return { perfil, tareas: [], usuarios: [] };
      }

      const idsEquipo = new Set(rawTareas.map((t: any) => t.id));
      (tareasCreadas || [])
        .filter((t: any) => !misEmpleadosIds.includes(t.assigned_to) && !idsEquipo.has(t.id))
        .forEach((t: any) => {
          alcancePorTarea.set(t.id, 'externa');
          rawTareas.push(t);
        });

      const idsActuales = new Set(rawTareas.map((t: any) => t.id));
      const { data: tareasQueAsigne, error: errorAsignaciones } = await supabase
        .from('tasks')
        .select('*')
        .eq('created_by', user.id)
        .order('due_date', { ascending: true });

      if (errorAsignaciones) {
          console.error('Error fetching assigned tasks:', errorAsignaciones);
      } else {
        (tareasQueAsigne || [])
          .filter((t: any) => !idsActuales.has(t.id))
          .forEach((t: any) => {
            if (t.assigned_to === user.id || misEmpleadosIds.includes(t.assigned_to)) {
              alcancePorTarea.set(t.id, 'equipo');
            } else {
              alcancePorTarea.set(t.id, 'externa');
            }
            rawTareas.push(t);
          });
      }
  }
  else if (tipoVista === 'gestion_rrhh') {
      const esRRHH = ['RRHH', 'SUPER', 'SECRETARIO', 'ADMINISTRADOR'].includes(perfil.rol || '');
      if (!esRRHH) return { perfil, tareas: [], usuarios: [] };

      const { data, error } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: false });

      if (error) {
          console.error("Error fetching tasks:", error);
          return { perfil, tareas: [], usuarios: [] };
      }
      rawTareas = data || [];
  }

  // 4. TRAER MIEMBROS GRUPALES (batch único para todas las tareas)
  const taskIds = rawTareas.map((t: { id: string }) => t.id);
  const miembrosPorTarea = new Map<string, ActMiembro[]>();

  if (taskIds.length > 0) {
    let rawMiembros: any[] = [];
    
      if (tipoVista === 'gestion_rrhh') {
        try {
          // Chunking para evitar 414 URI Too Long (max ~200 uuids)
          const chunkSize = 100;
          for (let i = 0; i < taskIds.length; i += chunkSize) {
            const chunk = taskIds.slice(i, i + chunkSize);
            const { data, error } = await supabaseAdmin
              .from('act_miembros')
              .select('*')
              .in('id_act', chunk)
              .order('created_at', { ascending: true });
            
            if (error) console.error("Error chunk rrhh:", error);
            if (data) rawMiembros.push(...data);
          }
        } catch (err) {
          console.error("Error fetching admin miembros:", err);
        }
      } else {
        // Chunking para vista normal
        const chunkSize = 100;
        for (let i = 0; i < taskIds.length; i += chunkSize) {
          const chunk = taskIds.slice(i, i + chunkSize);
          const { data, error } = await supabase
            .from('act_miembros')
            .select('*')
            .in('id_act', chunk)
            .order('created_at', { ascending: true });
            
          if (error) console.error("Error chunk normal:", error);
          if (data) rawMiembros.push(...data);
        }
      }

    if (rawMiembros && rawMiembros.length > 0) {
      // Resolver nombres de usuarios de miembros
      const userIdsMiembros = Array.from(new Set(rawMiembros.map((m: any) => m.id_user)));
      const nombresMap = new Map<string, string>();
      todosLosUsuarios
        .filter((u: any) => userIdsMiembros.includes(u.user_id))
        .forEach((u: any) => nombresMap.set(u.user_id, u.nombre));

      rawMiembros.forEach((m: any) => {
        const miembro: ActMiembro = {
          ...m,
          nombre_usuario: nombresMap.get(m.id_user) || 'Usuario',
        };
        const lista = miembrosPorTarea.get(m.id_act) || [];
        lista.push(miembro);
        miembrosPorTarea.set(m.id_act, lista);
      });
    }
  }

  // 5. CONTEXTO CONCEJO
  const concejoContexto = new Map<string, { punto_titulo: string; agenda_titulo: string; agenda_fecha: string }>();

  if (taskIds.length > 0) {
    const clientToUse = tipoVista === 'gestion_rrhh' ? supabaseAdmin : supabase;
    const chunkSize = 100;
    const enlaces: any[] = [];

    for (let i = 0; i < taskIds.length; i += chunkSize) {
      const chunk = taskIds.slice(i, i + chunkSize);
      const { data: enlacesChunk, error: errEnlaces } = await clientToUse
        .from('tareas_concejo_actividades')
        .select('task_id, tarea_concejo_id, es_origen')
        .in('task_id', chunk);

      if (errEnlaces) console.error('Error fetching concejo enlaces:', errEnlaces);
      if (enlacesChunk) enlaces.push(...enlacesChunk);
    }

    if (enlaces.length > 0) {
      const puntoIds = Array.from(new Set(enlaces.map((e: any) => e.tarea_concejo_id)));
      const puntos: any[] = [];
      for (let i = 0; i < puntoIds.length; i += chunkSize) {
        const chunk = puntoIds.slice(i, i + chunkSize);
        const { data: puntosChunk, error: errPuntos } = await clientToUse
          .from('tareas_concejo')
          .select('id, titulo_item, agenda_concejo_id')
          .in('id', chunk);

        if (errPuntos) console.error('Error fetching concejo puntos:', errPuntos);
        if (puntosChunk) puntos.push(...puntosChunk);
      }

      const puntoMap = new Map((puntos || []).map((p: any) => [p.id, p]));
      const agendaIds = Array.from(
        new Set((puntos || []).map((p: any) => p.agenda_concejo_id).filter((id: any): id is string => !!id))
      );

      const agendas: any[] = [];
      for (let i = 0; i < agendaIds.length; i += chunkSize) {
        const chunk = agendaIds.slice(i, i + chunkSize);
        const { data: agendasChunk, error: errAgendas } = await clientToUse
          .from('agenda_concejo')
          .select('id, titulo, fecha_reunion')
          .in('id', chunk);

        if (errAgendas) console.error('Error fetching concejo agendas:', errAgendas);
        if (agendasChunk) agendas.push(...agendasChunk);
      }

      const agendaMap = new Map((agendas || []).map((a: any) => [a.id, a]));

      const enlacePorTask = new Map<string, any>();
      enlaces.forEach((e: any) => {
        const actual = enlacePorTask.get(e.task_id);
        if (!actual || (e.es_origen !== false && actual.es_origen === false)) {
          enlacePorTask.set(e.task_id, e);
        }
      });

      enlacePorTask.forEach((e) => {
        const punto = puntoMap.get(e.tarea_concejo_id);
        const agenda = punto ? agendaMap.get(punto.agenda_concejo_id) : undefined;
        concejoContexto.set(e.task_id, {
          punto_titulo: punto?.titulo_item || 'Punto desconocido',
          agenda_titulo: agenda?.titulo || 'Sesión desconocida',
          agenda_fecha: agenda?.fecha_reunion || '',
        });
      });
    }
  }

  // 6. MAPEAR TAREAS
  const tareas: Tarea[] = rawTareas.map((t: any) => {
    const creador = todosLosUsuarios.find((u: any) => u.user_id === t.created_by); 
    const asignado = todosLosUsuarios.find((u: any) => u.user_id === t.assigned_to);
    const contexto = concejoContexto.get(t.id);

    return {
      ...t,
      es_concejo: !!contexto,
      punto_titulo: contexto?.punto_titulo,
      agenda_titulo: contexto?.agenda_titulo,
      agenda_fecha: contexto?.agenda_fecha,
      alcance: alcancePorTarea.get(t.id),
      creator: { nombre: creador?.nombre || 'Desconocido' }, 
      assignee: { 
          nombre: asignado?.nombre || 'Sin asignar',
          oficina_nombre: asignado?.oficina_nombre || 'Sin Oficina Asignada' 
      },
      miembros: miembrosPorTarea.get(t.id) || [],
    };
  });

  return { perfil, tareas, usuarios: todosLosUsuarios as Usuario[] };
}

// ─── Mutaciones de tareas ────────────────────────────────────────────────────

export async function crearTarea(formData: NewTaskState) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const perfil = await obtenerPerfilCompleto(user.id, supabase);
  let asignadoFinal = formData.assigned_to || user.id;

  if (!perfil.esJefe && asignadoFinal !== user.id) {
    asignadoFinal = user.id;
  }

  const { data: nuevaTarea, error } = await supabase.from('tasks').insert({
    title: formData.title,
    description: formData.description,
    due_date: formData.due_date,
    assigned_to: asignadoFinal,
    created_by: user.id,
    checklist: formData.checklist, 
    status: 'Asignado' 
  }).select('id').single();

  if (error) throw new Error(error.message);

  // Insertar miembros grupales si los hay
  if (formData.miembros && formData.miembros.length > 0 && nuevaTarea) {
    const registrosMiembros = formData.miembros.map(m => ({
      id_act: nuevaTarea.id,
      id_user: m.userId,
      asignaciones: m.asignaciones,
    }));

    const { error: errorMiembros } = await supabase
      .from('act_miembros')
      .insert(registrosMiembros);

    if (errorMiembros) {
      console.error('Error insertando miembros:', errorMiembros);
    }
  }


  revalidatePath('/protected/actividades');
  revalidatePath('/protected/actividades/jefe');
  revalidatePath('/protected/actividades/rrhh');
}

export async function actualizarTarea(id: string, updates: any) {
  const supabase = await createClient();
  
  // Obtener estado actual
  const { data: actual } = await supabase
    .from('tasks')
    .select('due_date, status, assigned_to')
    .eq('id', id)
    .single();

  // Si se edita la tarea (ej. cambio de fecha, título, etc), se invalida la revisión anterior
  updates.revisado_por = null;

  if (actual) {
    const cambioAsignado = updates.assigned_to && actual.assigned_to !== updates.assigned_to;
    const cambioFecha = updates.due_date && actual.due_date !== updates.due_date;
    const estabaCompletada = actual.status === 'Completado';

    if (cambioAsignado) {
      updates.confirmed_at = null;
      updates.status = 'Asignado';
      updates.updated_at = null;
    } else if (cambioFecha) {
      if (estabaCompletada) {
        updates.status = 'Asignado';
        updates.updated_at = null;
      }
    }
  }

  const { error } = await supabase.from('tasks').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout'); 
}

export async function actualizarArchivosTarea(taskId: string, nuevosArchivos: any[]) {
  const supabase = await createClient();
  const { error } = await supabase.from('tasks').update({ 
    archivos: nuevosArchivos, 
    revisado_por: null 
  }).eq('id', taskId);
  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout');
}

export async function updateChecklist(taskId: string, newChecklist: ChecklistItem[]) {
  const supabase = await createClient();

  // Verificar si la tarea estaba completada
  const { data: tarea } = await supabase.from('tasks').select('status').eq('id', taskId).single();
  let newStatus = tarea?.status;

  if (tarea?.status === 'Completado') {
    const allCompleted = newChecklist.length === 0 || newChecklist.every(c => c.is_completed);
    if (!allCompleted) {
      newStatus = 'En Proceso';
    }
  }

  const updateData: any = { 
    checklist: newChecklist,
    revisado_por: null
  };
  
  if (newStatus !== tarea?.status) {
    updateData.status = newStatus;
  }

  const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout');
}

export async function cambiarEstado(taskId: string, nuevoEstado: string) {
  const supabase = await createClient();

  let estadoPrevio: string | null = null;

  if (nuevoEstado === 'Completado') {
    const { data: tarea } = await supabase.from('tasks').select('checklist, status').eq('id', taskId).single();
    estadoPrevio = tarea?.status ?? null;
    if (tarea && tarea.checklist) {
      const lista = tarea.checklist as unknown as ChecklistItem[];
      if (lista.some(item => !item.is_completed)) {
        throw new Error("El encargado aún tiene pendientes en su checklist.");
      }
    }

    // Validar miembros grupales: todos deben tener completed_at
    const { data: miembros } = await supabase
      .from('act_miembros')
      .select('id, completed_at, nombre_usuario:id_user')
      .eq('id_act', taskId);

    if (miembros && miembros.length > 0) {
      const pendientes = miembros.filter((m: any) => !m.completed_at);
      if (pendientes.length > 0) {
        throw new Error(`Hay ${pendientes.length} miembro(s) que aún no han completado su parte.`);
      }
    }
  }

  const completadaEn = new Date().toISOString();
  const { error } = await supabase
    .from('tasks')
    .update(
      nuevoEstado === 'Completado'
        ? { status: nuevoEstado, updated_at: completadaEn }
        : { status: nuevoEstado, updated_at: null, revisado_por: null },
    )
    .eq('id', taskId);
  if (error) throw new Error(error.message);

  if (nuevoEstado === 'Completado' && estadoPrevio !== 'Completado') {
    const { data: { user } } = await supabase.auth.getUser();
    await notificarActividadConcejoCompletada(taskId, completadaEn, user?.id ?? null);
  }

  revalidatePath('/protected/actividades', 'layout');
}

export async function eliminarTarea(taskId: string) {
  const supabase = await createClient();
  // Los registros de act_miembros se eliminan en cascada (ON DELETE CASCADE)
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout');
}

export async function duplicarTarea(datos: NewTaskState) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: nuevaTarea, error } = await supabase.from('tasks').insert([{
        title: datos.title,
        description: datos.description || null,
        due_date: datos.due_date,
        assigned_to: datos.assigned_to || user.id,
        created_by: user.id,
        status: 'Asignado',
        checklist: datos.checklist?.map(i => ({ title: String(i.title), is_completed: false })) || []
  }]).select('id').single();

  if (error) throw new Error(error.message);

  if (datos.miembros && datos.miembros.length > 0 && nuevaTarea) {
    const registrosMiembros = datos.miembros.map(m => ({
      id_act: nuevaTarea.id,
      id_user: m.userId,
      asignaciones: m.asignaciones || [],
    }));

    const { error: errorMiembros } = await supabase
      .from('act_miembros')
      .insert(registrosMiembros);

    if (errorMiembros) {
      console.error('Error insertando miembros duplicados:', errorMiembros);
    }
  }

  revalidatePath('/protected/actividades', 'layout');
}

// ─── Actividad pendiente de confirmación ────────────────────────────────────

export async function obtenerActividadPendienteConfirmacion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, data: null };

  let pendingData: any = null;
  let confirmRole: 'encargado' | 'miembro' = 'encargado';
  let actMiembroId: string | null = null;

  // 1. Buscar como encargado (assigned_to)
  const { data: taskData, error: taskErr } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, created_by, assigned_to')
    .eq('assigned_to', user.id)
    .is('confirmed_at', null)
    .neq('status', 'Completado')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (taskErr) {
    console.error('Error fetching pending activity (encargado):', taskErr);
    return { success: false, data: null };
  }

  if (taskData) {
    pendingData = taskData;
  } else {
    // 2. Si no hay como encargado, buscar como miembro grupal
    const { data: memberData, error: memberErr } = await supabase
      .from('act_miembros')
      .select('id, id_act')
      .eq('id_user', user.id)
      .is('confirmed_at', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (memberErr) {
      console.error('Error fetching pending activity (miembro):', memberErr);
      return { success: false, data: null };
    }

    if (memberData) {
      // Obtener detalles de la tarea a la que pertenece
      const { data: parentTask, error: parentErr } = await supabase
        .from('tasks')
        .select('id, title, description, due_date, created_by, assigned_to')
        .eq('id', memberData.id_act)
        .neq('status', 'Completado')
        .single();
        
      if (parentTask) {
        pendingData = parentTask;
        confirmRole = 'miembro';
        actMiembroId = memberData.id;
      }
    }
  }

  if (!pendingData) return { success: true, data: null };

  const { data: enlacesConcejo } = await supabase
    .from('tareas_concejo_actividades')
    .select('id')
    .eq('task_id', pendingData.id)
    .limit(1);

  const esConcejo = (enlacesConcejo || []).length > 0;

  const { data: creador } = await supabase
    .from('info_usuario')
    .select('nombre')
    .eq('user_id', pendingData.created_by)
    .single();

  return {
    success: true,
    data: {
      ...pendingData,
      creador_nombre: esConcejo ? 'El Concejo Municipal' : creador?.nombre || 'Desconocido',
      es_concejo: esConcejo,
      rol_confirmacion: confirmRole,
      id_miembro: actMiembroId
    },
  };
}

export async function confirmarActividad(id: string, rol_confirmacion: 'encargado' | 'miembro' = 'encargado', id_miembro?: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'No autenticado' };

  const confirmedAt = new Date().toISOString();

  if (rol_confirmacion === 'encargado') {
    const { data, error } = await supabase
      .from('tasks')
      .update({ confirmed_at: confirmedAt })
      .eq('id', id)
      .eq('assigned_to', user.id)
      .is('confirmed_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error confirming activity (encargado):', error);
      return { success: false, error: error.message };
    }
    if (!data) return { success: false, error: 'No se pudo confirmar la actividad' };
  } 
  else if (rol_confirmacion === 'miembro' && id_miembro) {
    const { data, error } = await supabase
      .from('act_miembros')
      .update({ confirmed_at: confirmedAt })
      .eq('id', id_miembro)
      .eq('id_user', user.id)
      .is('confirmed_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error confirming activity (miembro):', error);
      return { success: false, error: error.message };
    }
    if (!data) return { success: false, error: 'No se pudo confirmar la actividad grupal' };
  }

  revalidatePath('/protected/actividades', 'layout');
  return { success: true, confirmed_at: confirmedAt };
}

// ─── Server Actions para Miembros Grupales ───────────────────────────────────

/**
 * Trae todos los miembros de una tarea con su nombre resuelto.
 */
export async function obtenerMiembrosDeTarea(taskId: string): Promise<ActMiembro[]> {
  const supabase = await createClient();

  const { data: miembros, error } = await supabase
    .from('act_miembros')
    .select('*')
    .eq('id_act', taskId)
    .order('created_at', { ascending: true });

  if (error || !miembros) return [];

  // Resolver nombres de usuarios
  const userIds = miembros.map((m: any) => m.id_user);
  const { data: usuarios } = await supabase
    .from('info_usuario')
    .select('user_id, nombre')
    .in('user_id', userIds);

  const nombresMap = new Map((usuarios || []).map((u: any) => [u.user_id, u.nombre]));

  return miembros.map((m: any) => ({
    ...m,
    nombre_usuario: nombresMap.get(m.id_user) || 'Usuario',
  }));
}

/**
 * Agrega un nuevo miembro a una actividad grupal y envía la notificación.
 */
export async function agregarMiembro(
  taskId: string,
  userId: string,
  asignaciones: AsignacionMiembro[],
  tituloTarea: string
) {
  const supabase = await createClient();

  const { error } = await supabase.from('act_miembros').insert({
    id_act: taskId,
    id_user: userId,
    asignaciones,
  });

  if (error) throw new Error(error.message);

  // Notificar al miembro recién agregado
  await enviarNotificacion(
    '👥 Nueva Actividad Grupal',
    `Se te ha asignado como participante en: "${tituloTarea}"`,
    [userId]
  );

  revalidatePath('/protected/actividades', 'layout');
}

/**
 * Elimina un miembro de una actividad grupal.
 */
export async function eliminarMiembro(miembroId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('act_miembros').delete().eq('id', miembroId);
  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout');
}

/**
 * Actualiza las asignaciones (sub-tareas) de un miembro.
 * Si no están todas completas, limpia completed_at.
 */
export async function actualizarAsignacionesMiembro(
  miembroId: string,
  asignaciones: AsignacionMiembro[]
) {
  const supabase = await createClient();

  const todasCompletas = asignaciones.every(a => a.is_complete);
  const updateData: any = { asignaciones };
  if (!todasCompletas) {
    updateData.completed_at = null;
  }

  const { error } = await supabase
    .from('act_miembros')
    .update(updateData)
    .eq('id', miembroId);

  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout');
}

/**
 * Marca la parte del miembro como completada manualmente.
 */
export async function marcarParteMiembroCompletada(miembroId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('act_miembros')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', miembroId);

  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout');
}

/**
 * Actualiza el comentario final de un miembro.
 */
export async function actualizarComentarioMiembro(miembroId: string, comentario: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('act_miembros')
    .update({ comentario })
    .eq('id', miembroId);
  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout');
}

/**
 * Marca la actividad como revisada y guarda quién la revisó con fecha y hora.
 */
export async function marcarComoRevisado(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  
  const perfil = await obtenerPerfilCompleto(user.id, supabase);
  const revisadoPor = {
    nombre: perfil.nombre,
    fecha: new Date().toISOString()
  };

  const { error } = await supabase
    .from('tasks')
    .update({ revisado_por: revisadoPor })
    .eq('id', taskId);

  if (error) throw new Error(error.message);
  revalidatePath('/protected/actividades', 'layout');
}

/**
 * Marca la actividad como revisada por el Concejo Municipal.
 */
export async function marcarRevisadoPorConcejo(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: previa } = await supabase
    .from('tasks')
    .select('revisado_por')
    .eq('id', taskId)
    .maybeSingle();

  const yaRevisada = Boolean(previa?.revisado_por);
  const revisadoPor = {
    nombre: "Concejo Municipal",
    fecha: new Date().toISOString()
  };

  const { error } = await supabase
    .from('tasks')
    .update({ revisado_por: revisadoPor })
    .eq('id', taskId);

  if (error) throw new Error(error.message);

  if (!yaRevisada) {
    await notificarActividadConcejoRevisada(taskId, revisadoPor.fecha, user.id);
  }

  revalidatePath('/protected/actividades', 'layout');
  revalidatePath('/protected/concejo/agenda', 'layout');
}
