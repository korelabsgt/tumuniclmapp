'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { ActividadConcejo, ActividadConcejoConContexto, UsuarioAsignable } from '../../lib/esquemas';

interface ChecklistItemInput {
  title: string;
  is_completed: boolean;
}

interface CrearActividadInput {
  tareaConcejoId: string;
  title: string;
  description?: string | null;
  due_date: string;
  assigned_to: string;
  checklist?: ChecklistItemInput[];
}

interface EditarActividadInput {
  title: string;
  description?: string | null;
  due_date: string;
  assigned_to: string;
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

  const { data: usuarios } = assignedIds.length
    ? await supabase.from('info_usuario').select('user_id, nombre').in('user_id', assignedIds)
    : { data: [] as { user_id: string; nombre: string }[] };

  const nombrePorId = new Map((usuarios || []).map((u) => [u.user_id, u.nombre]));
  const tareaPorTask = new Map(enlaces.map((e) => [e.task_id, e.tarea_concejo_id]));

  const resultado: Record<string, ActividadConcejo[]> = {};

  tasks
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .forEach((t) => {
      const tareaConcejoId = tareaPorTask.get(t.id);
      if (!tareaConcejoId) return;

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
      };

      if (!resultado[tareaConcejoId]) resultado[tareaConcejoId] = [];
      resultado[tareaConcejoId].push(actividad);
    });

  return resultado;
}

export async function obtenerTodasActividadesConcejo(): Promise<ActividadConcejoConContexto[]> {
  const supabase = await createClient();

  const { data: enlaces, error: errorEnlaces } = await supabase
    .from('tareas_concejo_actividades')
    .select('tarea_concejo_id, task_id');

  if (errorEnlaces || !enlaces || enlaces.length === 0) return [];

  const taskIds = Array.from(new Set(enlaces.map((e) => e.task_id)));
  const puntoIds = Array.from(new Set(enlaces.map((e) => e.tarea_concejo_id)));

  const { data: tasks, error: errorTasks } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds);

  if (errorTasks || !tasks) return [];

  const { data: puntos } = await supabase
    .from('tareas_concejo')
    .select('id, titulo_item, agenda_concejo_id')
    .in('id', puntoIds);

  const puntoMap = new Map((puntos || []).map((p) => [p.id, p]));

  const agendaIds = Array.from(
    new Set((puntos || []).map((p) => p.agenda_concejo_id).filter((id): id is string => !!id)),
  );

  const { data: agendas } = agendaIds.length
    ? await supabase
        .from('agenda_concejo')
        .select('id, titulo, fecha_reunion, estado, descripcion')
        .in('id', agendaIds)
    : { data: [] as { id: string; titulo: string; fecha_reunion: string; estado: string; descripcion: string }[] };

  const agendaMap = new Map((agendas || []).map((a) => [a.id, a]));

  const assignedIds = Array.from(
    new Set(tasks.map((t) => t.assigned_to).filter((id): id is string => !!id)),
  );

  const { data: usuarios } = assignedIds.length
    ? await supabase.from('info_usuario').select('user_id, nombre').in('user_id', assignedIds)
    : { data: [] as { user_id: string; nombre: string }[] };

  const nombrePorId = new Map((usuarios || []).map((u) => [u.user_id, u.nombre]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const resultado: ActividadConcejoConContexto[] = [];

  enlaces.forEach((enlace) => {
    const t = taskMap.get(enlace.task_id);
    if (!t) return;
    const punto = puntoMap.get(enlace.tarea_concejo_id);
    const agenda = punto ? agendaMap.get(punto.agenda_concejo_id || '') : undefined;

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
      punto_id: enlace.tarea_concejo_id,
      punto_titulo: punto?.titulo_item || 'Punto desconocido',
      agenda_id: punto?.agenda_concejo_id || '',
      agenda_titulo: agenda?.titulo || 'Sesión desconocida',
      agenda_fecha: agenda?.fecha_reunion || '',
      agenda_estado: agenda?.estado || '',
      agenda_descripcion: agenda?.descripcion || '',
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

  const { data: usuarios } = assignedIds.length
    ? await supabase.from('info_usuario').select('user_id, nombre').in('user_id', assignedIds)
    : { data: [] as { user_id: string; nombre: string }[] };

  const nombrePorId = new Map((usuarios || []).map((u) => [u.user_id, u.nombre]));

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
    .insert({ tarea_concejo_id: input.tareaConcejoId, task_id: task.id });

  if (errorEnlace) {
    await supabase.from('tasks').delete().eq('id', task.id);
    throw new Error(errorEnlace.message);
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

  revalidatePath('/protected/actividades', 'layout');
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
