'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { ChecklistItem, NewTaskState, Tarea, Usuario, PerfilUsuario, TipoVistaTareas } from './types'; 

async function getRolInterno(userId: string, supabase: any) {
  const { data } = await supabase.from('usuarios_roles').select(`roles (nombre)`).eq('user_id', userId);
  const rolesUsuario = data?.map((item: any) => item.roles?.nombre) || [];
  const rolesPermitidos = ['RRHH', 'SECRETARIO', 'SUPER'];
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

      if (errorAsignadas || errorCreadas) {
          console.error('Error fetching tasks:', errorAsignadas || errorCreadas);
          return { perfil, tareas: [], usuarios: [] };
      }

      const porId = new Map<string, any>();
      [...(asignadasAMi || []), ...(asignadasPorMi || [])].forEach((t) => porId.set(t.id, t));
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
      const esRRHH = ['RRHH', 'SUPER', 'SECRETARIO'].includes(perfil.rol || '');
      if (!esRRHH) return { perfil, tareas: [], usuarios: [] };

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true })
        .limit(500);

      if (error) {
          console.error("Error fetching tasks:", error);
          return { perfil, tareas: [], usuarios: [] };
      }
      rawTareas = data || [];
  }

  // 4. MAPEAR TAREAS
  const taskIds = rawTareas.map((t: { id: string }) => t.id);
  const concejoContexto = new Map<string, { punto_titulo: string; agenda_titulo: string; agenda_fecha: string }>();

  if (taskIds.length > 0) {
    const { data: enlacesConcejo } = await supabase
      .from('tareas_concejo_actividades')
      .select('task_id, tarea_concejo_id')
      .in('task_id', taskIds);

    const enlaces = enlacesConcejo || [];

    if (enlaces.length > 0) {
      const puntoIds = Array.from(new Set(enlaces.map((e: any) => e.tarea_concejo_id)));

      const { data: puntos } = await supabase
        .from('tareas_concejo')
        .select('id, titulo_item, agenda_concejo_id')
        .in('id', puntoIds);

      const puntoMap = new Map((puntos || []).map((p: any) => [p.id, p]));
      const agendaIds = Array.from(
        new Set((puntos || []).map((p: any) => p.agenda_concejo_id).filter((id: any): id is string => !!id))
      );

      const { data: agendas } = agendaIds.length
        ? await supabase.from('agenda_concejo').select('id, titulo, fecha_reunion').in('id', agendaIds)
        : { data: [] as any[] };

      const agendaMap = new Map((agendas || []).map((a: any) => [a.id, a]));

      enlaces.forEach((e: any) => {
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
      }
    };
  });

  return { perfil, tareas, usuarios: todosLosUsuarios as Usuario[] };
}

// --- MUTACIONES (IGUALES, SOLO ASEGURANDO REVALIDATE) ---

export async function crearTarea(formData: NewTaskState) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const perfil = await obtenerPerfilCompleto(user.id, supabase);
  let asignadoFinal = formData.assigned_to || user.id;

  if (!perfil.esJefe && asignadoFinal !== user.id) {
    asignadoFinal = user.id;
  }

  const { error } = await supabase.from('tasks').insert({
    title: formData.title,
    description: formData.description,
    due_date: formData.due_date,
    assigned_to: asignadoFinal,
    created_by: user.id,
    checklist: formData.checklist, 
    status: 'Asignado' 
  });

  if (error) throw new Error(error.message);
  revalidatePath('/sigem/actividades');
  revalidatePath('/sigem/actividades/jefe');
  revalidatePath('/sigem/actividades/rrhh');
}

export async function actualizarTarea(id: string, updates: any) {
  const supabase = await createClient();
  const { error } = await supabase.from('tasks').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/sigem/actividades', 'layout'); 
}

export async function actualizarArchivosTarea(taskId: string, nuevosArchivos: any[]) {
  const supabase = await createClient();
  const { error } = await supabase.from('tasks').update({ archivos: nuevosArchivos }).eq('id', taskId);
  if (error) throw new Error(error.message);
  revalidatePath('/sigem/actividades', 'layout');
}

export async function updateChecklist(taskId: string, newChecklist: ChecklistItem[]) {
  const supabase = await createClient();
  const { error } = await supabase.from('tasks').update({ checklist: newChecklist }).eq('id', taskId);
  if (error) throw new Error(error.message);
  revalidatePath('/sigem/actividades', 'layout');
}

export async function cambiarEstado(taskId: string, nuevoEstado: string) {
  const supabase = await createClient();
  if (nuevoEstado === 'Completado') {
    const { data: tarea } = await supabase.from('tasks').select('checklist').eq('id', taskId).single();
    if (tarea && tarea.checklist) {
      const lista = tarea.checklist as unknown as ChecklistItem[];
      if (lista.some(item => !item.is_completed)) throw new Error("Faltan items por completar.");
    }
  }
  const { error } = await supabase.from('tasks').update({ status: nuevoEstado }).eq('id', taskId);
  if (error) throw new Error(error.message);
  revalidatePath('/sigem/actividades', 'layout');
}

export async function eliminarTarea(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);
  revalidatePath('/sigem/actividades', 'layout');
}

export async function duplicarTarea(datos: NewTaskState) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from('tasks').insert([{
        title: datos.title,
        description: datos.description || null,
        due_date: datos.due_date,
        assigned_to: datos.assigned_to || user.id,
        created_by: user.id,
        status: 'Asignado',
        checklist: datos.checklist?.map(i => ({ title: String(i.title), is_completed: false })) || []
  }]);

  if (error) throw new Error(error.message);
  revalidatePath('/sigem/actividades', 'layout');
}

export async function obtenerActividadPendienteConfirmacion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, data: null };

  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, created_by, assigned_to')
    .eq('assigned_to', user.id)
    .is('confirmed_at', null)
    .neq('status', 'Completado')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching pending activity:', error);
    return { success: false, data: null };
  }

  if (!data) return { success: true, data: null };

  const { data: enlaceConcejo } = await supabase
    .from('tareas_concejo_actividades')
    .select('id')
    .eq('task_id', data.id)
    .maybeSingle();

  const esConcejo = !!enlaceConcejo;

  const { data: creador } = await supabase
    .from('info_usuario')
    .select('nombre')
    .eq('user_id', data.created_by)
    .single();

  return {
    success: true,
    data: {
      ...data,
      creador_nombre: esConcejo ? 'El Concejo Municipal' : creador?.nombre || 'Desconocido',
      es_concejo: esConcejo,
    },
  };
}

export async function confirmarActividad(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'No autenticado' };

  const confirmedAt = new Date().toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .update({ confirmed_at: confirmedAt })
    .eq('id', id)
    .eq('assigned_to', user.id)
    .is('confirmed_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Error confirming activity:', error);
    return { success: false, error: error.message };
  }

  if (!data) {
    return { success: false, error: 'No se pudo confirmar la actividad' };
  }

  revalidatePath('/sigem/actividades', 'layout');
  return { success: true, confirmed_at: confirmedAt };
}