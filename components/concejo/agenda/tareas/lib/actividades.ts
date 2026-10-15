'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { ActividadConcejo, ActividadConcejoConContexto, UsuarioAsignable } from '../../lib/esquemas';

interface ChecklistItemInput {
  title: string;
  is_completed: boolean;
}

export interface MiembroInput {
  userId: string;
  asignaciones?: { title: string; is_complete: boolean }[];
}

interface CrearActividadInput {
  tareaConcejoId: string;
  title: string;
  description?: string | null;
  due_date: string;
  assigned_to: string;
  checklist?: ChecklistItemInput[];
  miembros?: MiembroInput[];
}

interface EditarActividadInput {
  title: string;
  description?: string | null;
  due_date: string;
  assigned_to: string;
  nuevosMiembros?: MiembroInput[];
}

export async function obtenerUsuariosAsignables(): Promise<UsuarioAsignable[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('info_usuario')
    .select('user_id, nombre')
    .eq('activo', true)
    .order('nombre');

  if (error) {
    console.error('Error obteniendo usuarios asignables:', error.message);
    return [];
  }

  return (data || []).map((u) => ({ user_id: u.user_id, nombre: u.nombre }));
}

export async function obtenerActividadesDeAgenda(
  agendaConcejoId: string,
): Promise<Record<string, ActividadConcejo[]>> {
  const supabase = await createClient();

  const { data: puntos, error: errorPuntos } = await supabase
    .from('tareas_concejo')
    .select('id')
    .eq('agenda_concejo_id', agendaConcejoId);

  if (errorPuntos || !puntos || puntos.length === 0) return {};

  const puntoIds = puntos.map((p) => p.id);

  const { data: enlaces, error: errorEnlaces } = await supabase
    .from('tareas_concejo_actividades')
    .select('tarea_concejo_id, task_id')
    .in('tarea_concejo_id', puntoIds);

  if (errorEnlaces || !enlaces || enlaces.length === 0) return {};

  const taskIds = Array.from(new Set(enlaces.map((e) => e.task_id)));

  const { data: tasks, error: errorTasks } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds);

  if (errorTasks || !tasks) return {};

  const assignedIds = Array.from(
    new Set(tasks.map((t) => t.assigned_to).filter((id): id is string => !!id)),
  );

  const { data: rawMiembros } = await supabase
    .from('act_miembros')
    .select('*')
    .in('id_act', taskIds)
    .order('created_at', { ascending: true });

  const memberUserIds = (rawMiembros || []).map((m: any) => m.id_user);
  const allUserIds = Array.from(new Set([...assignedIds, ...memberUserIds]));

  const { data: usuarios } = allUserIds.length
    ? await supabase.from('info_usuario').select('user_id, nombre').in('user_id', allUserIds)
    : { data: [] as { user_id: string; nombre: string }[] };

  const nombrePorId = new Map((usuarios || []).map((u) => [u.user_id, u.nombre]));
  const taskMapAgenda = new Map(tasks.map((t) => [t.id, t]));

  const miembrosPorTask = new Map<string, any[]>();
  (rawMiembros || []).forEach((m: any) => {
    const list = miembrosPorTask.get(m.id_act) || [];
    list.push({
      ...m,
      nombre_usuario: nombrePorId.get(m.id_user) || 'Desconocido',
    });
    miembrosPorTask.set(m.id_act, list);
  });

  const resultado: Record<string, ActividadConcejo[]> = {};

  enlaces.forEach((enlace) => {
    const t = taskMapAgenda.get(enlace.task_id);
    if (!t) return;

    const actividad: ActividadConcejo = {
      id: t.id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      status: t.status,
      assigned_to: t.assigned_to,
      confirmed_at: t.confirmed_at,
      updated_at: t.updated_at ?? null,
      assignee_nombre: t.assigned_to ? nombrePorId.get(t.assigned_to) || 'Sin asignar' : 'Sin asignar',
      checklist: t.checklist as ActividadConcejo['checklist'],
      archivos: (t.archivos as ActividadConcejo['archivos']) ?? null,
      created_at: t.created_at,
      miembros: miembrosPorTask.get(t.id) || [],
      revisado_por: t.revisado_por as { nombre: string; fecha: string } | null,
    };

    if (!resultado[enlace.tarea_concejo_id]) resultado[enlace.tarea_concejo_id] = [];
    resultado[enlace.tarea_concejo_id].push(actividad);
  });

  Object.values(resultado).forEach((lista) => {
    lista.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  });

  return resultado;
}

export async function obtenerTodasActividadesConcejo(): Promise<ActividadConcejoConContexto[]> {
  const supabase = await createClient();

  const { data: enlaces, error: errorEnlaces } = await supabase
    .from('tareas_concejo_actividades')
    .select('tarea_concejo_id, task_id, es_origen');

  if (errorEnlaces || !enlaces || enlaces.length === 0) return [];

  const taskIds = Array.from(new Set(enlaces.map((e) => e.task_id)));
  const puntoIds = Array.from(new Set(enlaces.map((e) => e.tarea_concejo_id)));

  const { data: tasks, error: errorTasks } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds);

  if (errorTasks || !tasks) return [];

  const puntos: { id: string; titulo_item: string; agenda_concejo_id: string | null }[] = [];
  for (let i = 0; i < puntoIds.length; i += 80) {
    const chunk = puntoIds.slice(i, i + 80);
    const { data, error } = await supabase
      .from('tareas_concejo')
      .select('id, titulo_item, agenda_concejo_id')
      .in('id', chunk);
    if (error) console.error('Error cargando puntos de actividades:', error.message);
    if (data) puntos.push(...data);
  }

  const puntoMap = new Map(puntos.map((p) => [p.id, p]));

  const agendaIds = Array.from(
    new Set(puntos.map((p) => p.agenda_concejo_id).filter((id): id is string => !!id)),
  );

  const agendas: {
    id: string;
    titulo: string;
    fecha_reunion: string;
    estado: string;
    descripcion: string | null;
  }[] = [];

  for (let i = 0; i < agendaIds.length; i += 80) {
    const chunk = agendaIds.slice(i, i + 80);
    const { data, error } = await supabase
      .from('agenda_concejo')
      .select('id, titulo, fecha_reunion, estado, descripcion')
      .in('id', chunk);
    if (error) console.error('Error cargando sesiones de actividades:', error.message);
    if (data) agendas.push(...data);
  }

  const agendaMap = new Map(agendas.map((a) => [a.id, a]));

  const assignedIds = Array.from(
    new Set(tasks.map((t) => t.assigned_to).filter((id): id is string => !!id)),
  );

  const { data: rawMiembros } = await supabase
    .from('act_miembros')
    .select('*')
    .in('id_act', taskIds)
    .order('created_at', { ascending: true });

  const memberUserIds = (rawMiembros || []).map((m: any) => m.id_user);
  const allUserIds = Array.from(new Set([...assignedIds, ...memberUserIds]));

  const { data: usuarios } = allUserIds.length
    ? await supabase.from('info_usuario').select('user_id, nombre').in('user_id', allUserIds)
    : { data: [] as { user_id: string; nombre: string }[] };

  const nombrePorId = new Map((usuarios || []).map((u) => [u.user_id, u.nombre]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const miembrosPorTask = new Map<string, any[]>();
  (rawMiembros || []).forEach((m: any) => {
    const list = miembrosPorTask.get(m.id_act) || [];
    list.push({
      ...m,
      nombre_usuario: nombrePorId.get(m.id_user) || 'Desconocido',
    });
    miembrosPorTask.set(m.id_act, list);
  });

  const resultado: ActividadConcejoConContexto[] = [];

  enlaces.forEach((enlace) => {
    const t = taskMap.get(enlace.task_id);
    if (!t) return;
    const punto = puntoMap.get(enlace.tarea_concejo_id);
    const agenda = punto?.agenda_concejo_id ? agendaMap.get(punto.agenda_concejo_id) : undefined;

    resultado.push({
      id: t.id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      status: t.status,
      assigned_to: t.assigned_to,
      confirmed_at: t.confirmed_at,
      updated_at: t.updated_at ?? null,
      assignee_nombre: t.assigned_to ? nombrePorId.get(t.assigned_to) || 'Sin asignar' : 'Sin asignar',
      checklist: t.checklist as ActividadConcejo['checklist'],
      archivos: (t.archivos as ActividadConcejo['archivos']) ?? null,
      created_at: t.created_at,
      miembros: miembrosPorTask.get(t.id) || [],
      revisado_por: t.revisado_por as { nombre: string; fecha: string } | null,
      punto_id: enlace.tarea_concejo_id,
      punto_titulo: punto?.titulo_item || 'Punto desconocido',
      agenda_id: punto?.agenda_concejo_id || '',
      agenda_titulo: agenda?.titulo?.trim() || '',
      agenda_fecha: agenda?.fecha_reunion || '',
      agenda_estado: agenda?.estado || '',
      agenda_descripcion: agenda?.descripcion || '',
      agenda_acta: null,
      agenda_libro: null,
      es_enlace_origen: enlace.es_origen !== false,
    });
  });

  return resultado.sort((a, b) => {
    const fa = a.agenda_fecha ? new Date(a.agenda_fecha).getTime() : 0;
    const fb = b.agenda_fecha ? new Date(b.agenda_fecha).getTime() : 0;
    if (fb !== fa) return fb - fa;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });
}

export async function obtenerActividadesDePunto(
  tareaConcejoId: string,
): Promise<ActividadConcejo[]> {
  const supabase = await createClient();

  const { data: enlaces, error: errorEnlaces } = await supabase
    .from('tareas_concejo_actividades')
    .select('task_id')
    .eq('tarea_concejo_id', tareaConcejoId);

  if (errorEnlaces || !enlaces || enlaces.length === 0) return [];

  const taskIds = enlaces.map((e) => e.task_id);

  const { data: tasks, error: errorTasks } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds)
    .order('created_at', { ascending: true });

  if (errorTasks || !tasks) return [];

  const assignedIds = Array.from(
    new Set(tasks.map((t) => t.assigned_to).filter((id): id is string => !!id)),
  );

  const { data: rawMiembros } = await supabase
    .from('act_miembros')
    .select('*')
    .in('id_act', taskIds)
    .order('created_at', { ascending: true });

  const memberUserIds = (rawMiembros || []).map((m: any) => m.id_user);
  const allUserIds = Array.from(new Set([...assignedIds, ...memberUserIds]));

  const { data: usuarios } = allUserIds.length
    ? await supabase.from('info_usuario').select('user_id, nombre').in('user_id', allUserIds)
    : { data: [] as { user_id: string; nombre: string }[] };

  const nombrePorId = new Map((usuarios || []).map((u) => [u.user_id, u.nombre]));

  const miembrosPorTask = new Map<string, any[]>();
  (rawMiembros || []).forEach((m: any) => {
    const list = miembrosPorTask.get(m.id_act) || [];
    list.push({
      ...m,
      nombre_usuario: nombrePorId.get(m.id_user) || 'Desconocido',
    });
    miembrosPorTask.set(m.id_act, list);
  });

  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    due_date: t.due_date,
    status: t.status,
    assigned_to: t.assigned_to,
    confirmed_at: t.confirmed_at,
    updated_at: t.updated_at ?? null,
    assignee_nombre: t.assigned_to ? nombrePorId.get(t.assigned_to) || 'Sin asignar' : 'Sin asignar',
    checklist: t.checklist as ActividadConcejo['checklist'],
    archivos: (t.archivos as ActividadConcejo['archivos']) ?? null,
    created_at: t.created_at,
    miembros: miembrosPorTask.get(t.id) || [],
    revisado_por: t.revisado_por as { nombre: string; fecha: string } | null,
  }));
}

export async function crearActividadConcejo(input: CrearActividadInput): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: task, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      description: input.description ?? null,
      due_date: input.due_date,
      assigned_to: input.assigned_to,
      created_by: user.id,
      checklist: input.checklist ?? [],
      status: 'Asignado',
    })
    .select('id')
    .single();

  if (error || !task) throw new Error(error?.message || 'No se pudo crear la actividad');

  const { error: errorEnlace } = await supabase
    .from('tareas_concejo_actividades')
    .insert({ tarea_concejo_id: input.tareaConcejoId, task_id: task.id, es_origen: true });

  if (errorEnlace) {
    await supabase.from('tasks').delete().eq('id', task.id);
    throw new Error(errorEnlace.message);
  }

  // Insertar miembros si los hay
  if (input.miembros && input.miembros.length > 0) {
    const miembrosInsert = input.miembros
      .filter((m) => m.userId !== input.assigned_to)
      .map((m) => ({
        id_act: task.id,
        id_user: m.userId,
        asignaciones: m.asignaciones || [],
      }));

    if (miembrosInsert.length > 0) {
      const { error: errorMiembros } = await supabase
        .from('act_miembros')
        .insert(miembrosInsert);

      if (errorMiembros) {
        console.error('Error insertando miembros en concejo:', errorMiembros);
      }
    }
  }

  revalidatePath('/protected/actividades', 'layout');
  return task.id;
}

export async function editarActividadConcejo(
  taskId: string,
  input: EditarActividadInput,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: actual } = await supabase
    .from('tasks')
    .select('due_date, status, assigned_to')
    .eq('id', taskId)
    .single();

  const updates: Record<string, unknown> = {
    title: input.title,
    description: input.description ?? null,
    due_date: input.due_date,
    assigned_to: input.assigned_to,
    revisado_por: null,
  };

  if (actual) {
    const cambioAsignado = actual.assigned_to !== input.assigned_to;
    const cambioFecha = actual.due_date !== input.due_date;
    const estabaVencida = new Date(actual.due_date) < new Date();
    const estabaCompletada = actual.status === 'Completado';

    if (cambioAsignado) {
      updates.confirmed_at = null;
      updates.status = 'Asignado';
      updates.updated_at = null;
    } else if (cambioFecha && (estabaCompletada || estabaVencida)) {
      updates.status = 'Asignado';
      if (estabaCompletada) {
        updates.updated_at = null;
      }
    }
  }

  const { error } = await supabase.from('tasks').update(updates).eq('id', taskId);
  if (error) throw new Error(error.message);

  // Insertar nuevos miembros si se especificaron
  if (input.nuevosMiembros && input.nuevosMiembros.length > 0) {
    const { data: existing } = await supabase
      .from('act_miembros')
      .select('id_user')
      .eq('id_act', taskId);

    const existingUserIds = new Set((existing || []).map((e: any) => e.id_user));
    const toInsert = input.nuevosMiembros
      .filter((m) => m.userId !== (actual?.assigned_to || input.assigned_to) && !existingUserIds.has(m.userId))
      .map((m) => ({
        id_act: taskId,
        id_user: m.userId,
        asignaciones: m.asignaciones || [],
      }));

    if (toInsert.length > 0) {
      await supabase.from('act_miembros').insert(toInsert);
    }
  }

  revalidatePath('/protected/actividades', 'layout');
}

export async function obtenerActividadesPendientesRevisionConcejo(
  agendaConcejoId: string,
): Promise<ActividadConcejoConContexto[]> {
  const supabase = await createClient();

  const { data: puntosSesion } = await supabase
    .from('tareas_concejo')
    .select('id')
    .eq('agenda_concejo_id', agendaConcejoId);

  const puntosIdsSesion = new Set((puntosSesion || []).map((p) => p.id));

  const todas = await obtenerTodasActividadesConcejo();
  const yaEnSesion = new Set(
    todas.filter((a) => puntosIdsSesion.has(a.punto_id)).map((a) => a.id),
  );

  return todas.filter(
    (a) =>
      a.status === 'Completado' &&
      !a.revisado_por &&
      a.es_enlace_origen !== false &&
      !yaEnSesion.has(a.id),
  );
}

const tituloPuntoRevision = (tituloActividad: string) => {
  const base = `Revisión de actividad: ${tituloActividad.trim()}`;
  return base.length > 500 ? `${base.slice(0, 497)}…` : base;
};

export async function crearPuntoSeguimientoActividad(
  taskId: string,
  agendaConcejoId: string,
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: task, error: errorTask } = await supabase
    .from('tasks')
    .select('id, title, status, revisado_por')
    .eq('id', taskId)
    .single();

  if (errorTask || !task) throw new Error('Actividad no encontrada');
  if (task.status !== 'Completado') {
    throw new Error('Solo se puede crear seguimiento para actividades completadas');
  }
  if (task.revisado_por) {
    throw new Error('Esta actividad ya fue revisada');
  }

  const { data: puntosSesion } = await supabase
    .from('tareas_concejo')
    .select('id')
    .eq('agenda_concejo_id', agendaConcejoId);

  const puntosIdsSesion = new Set((puntosSesion || []).map((p) => p.id));

  const { data: enlacesActividad } = await supabase
    .from('tareas_concejo_actividades')
    .select('tarea_concejo_id')
    .eq('task_id', taskId);

  if ((enlacesActividad || []).some((enlace) => puntosIdsSesion.has(enlace.tarea_concejo_id))) {
    throw new Error('Esta actividad ya tiene un punto de revisión en esta sesión');
  }

  const nombreCategoriaRevision = 'Revisión de actividad';
  let { data: categoria } = await supabase
    .from('categorias_tareas_concejo')
    .select('id')
    .eq('nombre', nombreCategoriaRevision)
    .maybeSingle();

  if (!categoria?.id) {
    const { data: categoriaNueva, error: errorCategoria } = await supabase
      .from('categorias_tareas_concejo')
      .insert({ nombre: nombreCategoriaRevision })
      .select('id')
      .single();

    if (errorCategoria || !categoriaNueva?.id) {
      const { data: categoriaRespaldo } = await supabase
        .from('categorias_tareas_concejo')
        .select('id')
        .order('nombre', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!categoriaRespaldo?.id) {
        throw new Error('No hay categorías de agenda configuradas');
      }
      categoria = categoriaRespaldo;
    } else {
      categoria = categoriaNueva;
    }
  }

  const { data: nuevoPunto, error: errorPunto } = await supabase
    .from('tareas_concejo')
    .insert({
      titulo_item: tituloPuntoRevision(task.title),
      categoria_id: categoria.id,
      estado: 'No iniciado',
      votacion: 'No Emitido',
      notas: [],
      seguimiento: [],
      agenda_concejo_id: agendaConcejoId,
    })
    .select('id')
    .single();

  if (errorPunto || !nuevoPunto) {
    throw new Error(errorPunto?.message || 'No se pudo crear el punto de seguimiento');
  }

  const esPrimeraRelacion = (enlacesActividad || []).length === 0;

  const { error: errorInsert } = await supabase.from('tareas_concejo_actividades').insert({
    tarea_concejo_id: nuevoPunto.id,
    task_id: taskId,
    es_origen: esPrimeraRelacion,
  });

  if (errorInsert) {
    await supabase.from('tareas_concejo').delete().eq('id', nuevoPunto.id);
    throw new Error(errorInsert.message);
  }

  revalidatePath('/protected/concejo/agenda', 'layout');
  revalidatePath(`/protected/concejo/agenda/${agendaConcejoId}`);
  revalidatePath('/protected/actividades', 'layout');

  return nuevoPunto.id;
}

export async function eliminarActividadConcejo(taskId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw new Error(error.message);

  revalidatePath('/protected/actividades', 'layout');
}
