'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { SolicitudMobiliario, CrearSolicitudMobiliarioValues, crearSolicitudMobiliarioSchema } from './zod';

const asegurarComunidadExistente = async (supabase: any, aldea: string | null | undefined, caserio: string | null | undefined) => {
  if (!aldea) return;
  const safeAldea = aldea.trim();
  const safeCaserio = caserio ? caserio.trim() : '';

  const { data } = await supabase
    .from('comunidades_clm')
    .select('id')
    .ilike('aldea_casco', safeAldea)
    .ilike('barrio_caserio', safeCaserio)
    .limit(1)
    .maybeSingle();

  if (!data) {
    await supabase.from('comunidades_clm').insert({
      aldea_casco: safeAldea,
      barrio_caserio: safeCaserio
    });
  }
};


export const getSolicitudesMobiliario = async (): Promise<SolicitudMobiliario[]> => {
  const supabase = await createClient();

  const { data: solicitudesData, error } = await supabase
    .from('solicitudes_municipales')
    .select('*')
    .eq('tipo_solicitud', 'mobiliario')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching solicitudes de mobiliario:", error);
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
  })) as unknown as SolicitudMobiliario[];
};

/**
 * Obtiene las solicitudes asignadas a un operario específico,
 * filtradas por estado "pendiente".
 */
export const getSolicitudesOperario = async (): Promise<SolicitudMobiliario[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: solicitudesData, error } = await supabase
    .from('solicitudes_municipales')
    .select(`*`)
    .eq('tipo_solicitud', 'mobiliario')
    .eq('asignado_a_uid', user.id)
    .in('estado', ['pendiente'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching solicitudes del operario:", error);
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
  })) as unknown as SolicitudMobiliario[];
};

/**
 * Crea una nueva solicitud de mobiliario.
 * Solo la recepcionista usa esta función.
 */
export const crearSolicitudMobiliario = async (values: CrearSolicitudMobiliarioValues) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Usuario no autenticado.' };

  const parsed = crearSolicitudMobiliarioSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos en la solicitud.' };
  }

  const { nombre_responsable, telefono_contacto, ubicacion, fecha_inicio, fecha_fin, checklists, aldea, caserio } = parsed.data;

  const { error } = await supabase
    .from('solicitudes_municipales')
    .insert({
      tipo_solicitud: 'mobiliario',
      estado: 'pendiente',
      fecha_solicitud: new Date().toISOString(),
      solicitante_uid: user.id,
      nombre_responsable,
      telefono_contacto,
      ubicacion,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      checklists: checklists || null,
      aldea: aldea || null,
      caserio: caserio || null,
    });

  if (error) {
    console.error('Error al crear solicitud de mobiliario:', error);
    return { success: false, error: error.message };
  }

  await asegurarComunidadExistente(supabase, aldea, caserio);

  revalidatePath('/solicitudes/mobiliario');
  return { success: true };
};

/**
 * Asigna un operario a una solicitud existente.
 */
export const asignarOperario = async (solicitudId: string, operarioUid: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from('solicitudes_municipales')
    .update({ asignado_a_uid: operarioUid })
    .eq('id', solicitudId);

  if (error) {
    console.error('Error asignando operario:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/solicitudes/mobiliario');
  return { success: true };
};

/**
 * Actualiza el estado de una solicitud.
 * Usado por operarios para marcar como "completado" o "en_revision".
 */
export const actualizarEstadoSolicitudMobiliario = async (
  solicitudId: string,
  nuevoEstado: 'completado' | 'en_revision',
  comentarios?: string
) => {
  const supabase = await createClient();

  const updateData: Record<string, any> = { estado: nuevoEstado };

  if (nuevoEstado === 'completado' || nuevoEstado === 'en_revision') {
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

  revalidatePath('/solicitudes/mobiliario');
  return { success: true };
};

/**
 * Obtiene la lista de operarios disponibles para asignar.
 * De momento retorna todos los usuarios del sistema.
 */
export const getOperarios = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('info_usuario')
    .select('user_id, nombre')
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error obteniendo operarios:', error);
    return [];
  }

  return (data || []).map((u: any) => ({
    user_id: u.user_id,
    nombre: u.nombre
  }));
};

/**
 * Edita una solicitud de mobiliario existente.
 */
export const editarSolicitudMobiliario = async (
  solicitudId: string,
  values: Partial<CrearSolicitudMobiliarioValues>
) => {
  const supabase = await createClient();

  const updateData: Record<string, any> = {};
  if (values.nombre_responsable !== undefined) updateData.nombre_responsable = values.nombre_responsable;
  if (values.telefono_contacto !== undefined) updateData.telefono_contacto = values.telefono_contacto;
  if (values.ubicacion !== undefined) updateData.ubicacion = values.ubicacion;
  if (values.fecha_inicio !== undefined) updateData.fecha_inicio = values.fecha_inicio || null;
  if (values.fecha_fin !== undefined) updateData.fecha_fin = values.fecha_fin || null;
  if (values.checklists !== undefined) updateData.checklists = values.checklists || null;
  if (values.aldea !== undefined) updateData.aldea = values.aldea || null;
  if (values.caserio !== undefined) updateData.caserio = values.caserio || null;

  const { error } = await supabase
    .from('solicitudes_municipales')
    .update(updateData)
    .eq('id', solicitudId);

  if (error) {
    console.error('Error al editar solicitud:', error);
    return { success: false, error: error.message };
  }

  await asegurarComunidadExistente(supabase, updateData.aldea, updateData.caserio);

  revalidatePath('/solicitudes/mobiliario');
  return { success: true };
};

/**
 * Elimina una solicitud de mobiliario.
 */
export const eliminarSolicitudMobiliario = async (solicitudId: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from('solicitudes_municipales')
    .delete()
    .eq('id', solicitudId);

  if (error) {
    console.error('Error al eliminar solicitud:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/solicitudes/mobiliario');
  return { success: true };
};

/**
 * Obtiene los usuarios de la Unidad de Atención al Vecino.
 * De momento retorna lista vacía (todos los usuarios tienen acceso completo).
 */
export const getUsuariosAtencionVecino = async (): Promise<{ user_id: string; nombre: string }[]> => {
  return [];
};

/**
 * Obtiene el catálogo de comunidades.
 */
export const getComunidades = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comunidades_clm')
    .select('id, aldea_casco, barrio_caserio')
    .order('aldea_casco', { ascending: true })
    .order('barrio_caserio', { ascending: true });

  if (error) {
    console.error('Error fetching comunidades:', error);
    return [];
  }

  return data || [];
};
