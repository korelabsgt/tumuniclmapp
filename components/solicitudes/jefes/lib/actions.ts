'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { SolicitudJefe, CrearSolicitudJefeValues, crearSolicitudJefeSchema } from './zod';

const toFechaActividadGT = (fecha: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return `${fecha}T12:00:00-06:00`;
  }
  return fecha;
};

export const getSolicitudesJefes = async (): Promise<SolicitudJefe[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: solicitudesData, error } = await supabase
    .from('solicitudes_municipales')
    .select('*')
    .eq('tipo_solicitud', 'oficinas')
    .or(`solicitante_uid.eq.${user.id},asignado_a_uid.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching solicitudes de jefes:", error);
    return [];
  }

  const solicitudes = solicitudesData || [];
  const userIds = Array.from(new Set(
    solicitudes.flatMap(s => [s.solicitante_uid, s.asignado_a_uid]).filter(Boolean)
  ));

  let usersMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await supabase
      .from('info_usuario')
      .select('user_id, nombre')
      .in('user_id', userIds);
      
    if (usersData) {
      usersData.forEach(u => { usersMap[u.user_id] = u.nombre || ''; });
    }
  }

  return solicitudes.map((item: any) => ({
    ...item,
    solicitante: item.solicitante_uid ? { nombre: usersMap[item.solicitante_uid] || 'Desconocido' } : null,
    asignado: item.asignado_a_uid ? { nombre: usersMap[item.asignado_a_uid] || 'Desconocido' } : null,
  })) as unknown as SolicitudJefe[];
};

export const crearSolicitudJefe = async (values: CrearSolicitudJefeValues) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Usuario no autenticado.' };

  const parsed = crearSolicitudJefeSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos en la solicitud.' };
  }

  const { titulo, descripcion, asignado_a_uid, fecha_actividad, subtareas } = parsed.data;

  const { error } = await supabase
    .from('solicitudes_municipales')
    .insert({
      tipo_solicitud: 'oficinas',
      estado: 'pendiente',
      fecha_solicitud: toFechaActividadGT(fecha_actividad),
      solicitante_uid: user.id,
      asignado_a_uid: asignado_a_uid || null,
      ubicacion: titulo, // Guardamos el titulo en ubicacion
      comentarios: descripcion, // Guardamos la descripción en comentarios
      checklists: { items: subtareas }, // Guardamos las subtareas en checklists
    });

  if (error) {
    console.error('Error al crear solicitud:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/solicitudes/jefes');
  return { success: true };
};

export const actualizarEstadoSolicitudJefe = async (
  solicitudId: string,
  nuevoEstado: 'completado' | 'rechazado',
  comentarios?: string
) => {
  const supabase = await createClient();

  const updateData: Record<string, any> = { estado: nuevoEstado };
  if (nuevoEstado === 'completado' || nuevoEstado === 'rechazado') {
    updateData.fecha_terminado = new Date().toISOString();
  }
  if (comentarios) {
    updateData.comentarios = comentarios;
  }

  const { error } = await supabase
    .from('solicitudes_municipales')
    .update(updateData)
    .eq('id', solicitudId);

  if (error) {
    console.error('Error actualizando estado:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/solicitudes/jefes');
  return { success: true };
};

export const editarSolicitudJefe = async (
  solicitudId: string,
  values: Partial<CrearSolicitudJefeValues>
) => {
  const supabase = await createClient();

  const updateData: Record<string, any> = {};
  if (values.titulo !== undefined) updateData.ubicacion = values.titulo;
  if (values.descripcion !== undefined) updateData.comentarios = values.descripcion;
  if (values.fecha_actividad !== undefined) {
    updateData.fecha_solicitud = toFechaActividadGT(values.fecha_actividad);
  }
  if (values.asignado_a_uid !== undefined) updateData.asignado_a_uid = values.asignado_a_uid;
  if (values.subtareas !== undefined) updateData.checklists = { items: values.subtareas };

  const { error } = await supabase
    .from('solicitudes_municipales')
    .update(updateData)
    .eq('id', solicitudId);

  if (error) {
    console.error('Error al editar solicitud:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/solicitudes/jefes');
  return { success: true };
};

export const eliminarSolicitudJefe = async (solicitudId: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from('solicitudes_municipales')
    .delete()
    .eq('id', solicitudId);

  if (error) {
    console.error('Error al eliminar solicitud:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/solicitudes/jefes');
  return { success: true };
};

export const getJefesList = async () => {
  const supabase = await createClient();
  
  // 1. Obtener Jefes directos
  const { data: jefesData, error: jefesError } = await supabase
    .from('info_usuario')
    .select('user_id, nombre')
    .eq('esjefe', true)
    .eq('activo', true);

  if (jefesError) {
    console.error('Error fetching jefes:', jefesError);
  }

  // 2. Obtener miembros de Unidad de Atención al Vecino
  // 2.1 Obtener el departamento
  const { data: dept } = await supabase
    .from('dependencias')
    .select('id')
    .eq('nombre', 'Unidad de Atención al Vecino')
    .single();

  let atencionVecinoData: any[] = [];
  if (dept) {
    // 2.2 Obtener puestos hijos
    const { data: puestos } = await supabase
      .from('dependencias')
      .select('id')
      .eq('parent_id', dept.id);

    const puestoIds = puestos ? [dept.id, ...puestos.map(p => p.id)] : [dept.id];

    // 2.3 Obtener usuarios
    const { data } = await supabase
      .from('info_usuario')
      .select('user_id, nombre')
      .in('dependencia_id', puestoIds)
      .eq('activo', true);
    
    if (data) atencionVecinoData = data;
  }

  // 3. Combinar y quitar duplicados
  const combined = [
    ...(jefesData || []),
    ...atencionVecinoData
  ];

  // Filtramos duplicados por user_id
  const uniqueUsers = combined.filter((user, index, self) =>
    index === self.findIndex((t) => t.user_id === user.user_id)
  );

  // 4. Ordenar y mapear
  return uniqueUsers
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map((u: any) => ({
      jefeId: u.user_id,
      jefeNombre: u.nombre
    }));
};
export const obtenerSolicitudPendienteJefe = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, data: null };

  const { data, error } = await supabase
    .from('solicitudes_municipales')
    .select('*')
    .eq('tipo_solicitud', 'oficinas')
    .eq('estado', 'pendiente')
    .eq('asignado_a_uid', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching pending solicitud de jefe:', error);
    return { success: false, data: null };
  }

  if (!data) return { success: true, data: null };

  let creadorNombre = 'Desconocido';
  if (data.solicitante_uid) {
    const { data: creadorData } = await supabase
      .from('info_usuario')
      .select('nombre')
      .eq('user_id', data.solicitante_uid)
      .single();
    if (creadorData) {
      creadorNombre = creadorData.nombre;
    }
  }

  return {
    success: true,
    data: {
      ...data,
      creador_nombre: creadorNombre,
    },
  };
};
