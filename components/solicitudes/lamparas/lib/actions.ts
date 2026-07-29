'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { SolicitudLampara, CrearSolicitudLamparaValues, crearSolicitudLamparaSchema } from './zod';

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

/**
 * Obtiene todas las solicitudes de tipo "lamparas" para la vista de recepcionista.
 * Incluye todos los estados.
 */
export const getSolicitudesLamparas = async (): Promise<SolicitudLampara[]> => {
  const supabase = await createClient();

  const { data: solicitudesData, error } = await supabase
    .from('solicitudes_municipales')
    .select('*')
    .eq('tipo_solicitud', 'lamparas')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching solicitudes de lámparas:", error);
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
  })) as unknown as SolicitudLampara[];
};

/**
 * Obtiene las solicitudes asignadas a un electricista específico,
 * filtradas por estado "pendiente" o "en_proceso".
 */
export const getSolicitudesElectricista = async (): Promise<SolicitudLampara[]> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: solicitudesData, error } = await supabase
    .from('solicitudes_municipales')
    .select(`*`)
    .eq('tipo_solicitud', 'lamparas')
    .eq('asignado_a_uid', user.id)
    .in('estado', ['pendiente'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching solicitudes del electricista:", error);
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
  })) as unknown as SolicitudLampara[];
};

/**
 * Crea una nueva solicitud de lámparas.
 * Solo la recepcionista usa esta función.
 */
export const crearSolicitudLampara = async (values: CrearSolicitudLamparaValues) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { success: false, error: 'Usuario no autenticado.' };

  const parsed = crearSolicitudLamparaSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: 'Datos inválidos en la solicitud.' };
  }

  const { nombre_responsable, telefono_contacto, ubicacion, cantidad_elementos, comentarios, asignado_a_uid, checklists, aldea, caserio } = parsed.data;

  const { error } = await supabase
    .from('solicitudes_municipales')
    .insert({
      tipo_solicitud: 'lamparas',
      estado: 'pendiente',
      fecha_solicitud: new Date().toISOString(),
      solicitante_uid: user.id,
      nombre_responsable,
      telefono_contacto,
      ubicacion,
      cantidad_elementos,
      comentarios: comentarios || null,
      asignado_a_uid: asignado_a_uid || null,
      checklists: checklists || null,
      aldea: aldea || null,
      caserio: caserio || null,
    });

  if (error) {
    console.error('Error al crear solicitud de lámparas:', error);
    return { success: false, error: error.message };
  }

  await asegurarComunidadExistente(supabase, aldea, caserio);

  revalidatePath('/solicitudes/lamparas');
  return { success: true };
};

/**
 * Asigna un electricista a una solicitud existente.
 */
export const asignarElectricista = async (solicitudId: string, electricistaUid: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from('solicitudes_municipales')
    .update({ asignado_a_uid: electricistaUid })
    .eq('id', solicitudId);

  if (error) {
    console.error('Error asignando electricista:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/solicitudes/lamparas');
  return { success: true };
};

/**
 * Actualiza el estado de una solicitud.
 * Usado por electricistas para marcar como "en_proceso", "completado", o "en_revision".
 */
export const actualizarEstadoSolicitud = async (
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

  revalidatePath('/solicitudes/lamparas');
  return { success: true };
};

/**
 * Obtiene la lista de electricistas disponibles para asignar.
 * Busca usuarios con rol "electricista" o un criterio similar.
 */
export const getElectricistas = async () => {
  const supabase = await createClient();

  const { data: depts, error: deptError } = await supabase
    .from('dependencias')
    .select('id')
    .in('nombre', [
      'CONSERVACION RED DE ALUMBRADO PUBLICO PARA EL AÑO 2026 DEL AREA URBANA Y RURAL DEL MUNICIPIO DE CONCEPCION LAS MINAS, CHIQUIMULA'
    ]);

  if (deptError || !depts || depts.length === 0) {
    console.error('No se encontraron los departamentos:', deptError);
    return [];
  }

  const deptIds = depts.map(d => d.id);

  // 2. Obtener los puestos (hijos) que cuelgan de esos departamentos
  const { data: puestos } = await supabase
    .from('dependencias')
    .select('id')
    .in('parent_id', deptIds);

  if (!puestos || puestos.length === 0) {
    console.error('No se encontraron puestos bajo el departamento de alumbrado.');
    return [];
  }

  const puestoIds = puestos.map(p => p.id);

  // 3. Obtener los usuarios cuyo dependencia_id coincida con alguno de esos puestos
  const { data, error } = await supabase
    .from('info_usuario')
    .select('user_id, nombre')
    .in('dependencia_id', puestoIds)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error obteniendo electricistas:', error);
    return [];
  }

  return (data || []).map((u: any) => ({
    user_id: u.user_id,
    nombre: u.nombre
  }));
};

/**
 * Edita una solicitud de lámparas existente.
 */
export const editarSolicitudLampara = async (
  solicitudId: string,
  values: Partial<CrearSolicitudLamparaValues>
) => {
  const supabase = await createClient();

  const updateData: Record<string, any> = {};
  if (values.nombre_responsable !== undefined) updateData.nombre_responsable = values.nombre_responsable;
  if (values.telefono_contacto !== undefined) updateData.telefono_contacto = values.telefono_contacto;
  if (values.ubicacion !== undefined) updateData.ubicacion = values.ubicacion;
  if (values.cantidad_elementos !== undefined) updateData.cantidad_elementos = values.cantidad_elementos;
  if (values.comentarios !== undefined) updateData.comentarios = values.comentarios || null;
  if (values.asignado_a_uid !== undefined) updateData.asignado_a_uid = values.asignado_a_uid || null;
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

  revalidatePath('/solicitudes/lamparas');
  return { success: true };
};

/**
 * Elimina una solicitud de lámparas.
 */
export const eliminarSolicitudLampara = async (solicitudId: string) => {
  const supabase = await createClient();

  const { error } = await supabase
    .from('solicitudes_municipales')
    .delete()
    .eq('id', solicitudId);

  if (error) {
    console.error('Error al eliminar solicitud:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/solicitudes/lamparas');
  return { success: true };
};

/**
 * Obtiene los usuarios de la Unidad de Atención al Vecino.
 * Estos tienen permisos de administración (crear y ver todo).
 */
export const getUsuariosAtencionVecino = async () => {
  const supabase = await createClient();

  // 1. Obtener los departamentos o puestos con permisos administrativos
  const { data: depts, error: deptError } = await supabase
    .from('dependencias')
    .select('id')
    .in('nombre', ['Unidad de Atención al Vecino', 'Director de Servicios Públicos']);

  if (deptError || !depts || depts.length === 0) {
    console.error('No se encontraron departamentos administrativos:', deptError);
    return [];
  }

  const deptIds = depts.map(d => d.id);

  // 2. Obtener puestos hijos
  const { data: puestos } = await supabase
    .from('dependencias')
    .select('id')
    .in('parent_id', deptIds);

  const puestoIds = puestos ? [...deptIds, ...puestos.map(p => p.id)] : [...deptIds];

  // 3. Obtener usuarios
  const { data, error } = await supabase
    .from('info_usuario')
    .select('user_id, nombre')
    .in('dependencia_id', puestoIds)
    .order('nombre', { ascending: true });

  if (error) {
    console.error('Error obteniendo usuarios de atención al vecino:', error);
    return [];
  }

  return (data || []).map((u: any) => ({
    user_id: u.user_id,
    nombre: u.nombre
  }));
};

/**
 * Verifica de forma robusta si un dependencia_id pertenece a la familia de
 * "Unidad de Atención al Vecino" (ya sea él mismo, o un hijo/nieto).
 */
export const checkIsAtencionVecino = async (dependenciaId: string | null): Promise<boolean> => {
  if (!dependenciaId) return false;

  const supabase = await createClient();
  let currentId: string | null = dependenciaId;
  let depth = 0;
  const MAX_DEPTH = 5;

  while (currentId && depth < MAX_DEPTH) {
    const { data, error }: { data: any, error: any } = await supabase
      .from('dependencias')
      .select('id, nombre, parent_id')
      .eq('id', currentId)
      .single();

    if (error || !data) break;

    // Buscamos cualquier variación del nombre, sin importar tildes o mayúsculas
    const nombre = (data.nombre || '').toLowerCase();
    if (nombre.includes('atención al vecino') || nombre.includes('atencion al vecino')) {
      return true;
    }

    currentId = data.parent_id;
    depth++;
  }

  return false;
};

export const checkIsElectricista = async (dependenciaId: string | null): Promise<boolean> => {
  if (!dependenciaId) return false;

  const supabase = await createClient();
  let currentId: string | null = dependenciaId;
  let depth = 0;
  const MAX_DEPTH = 5;

  while (currentId && depth < MAX_DEPTH) {
    const { data, error }: { data: any, error: any } = await supabase
      .from('dependencias')
      .select('id, nombre, parent_id')
      .eq('id', currentId)
      .single();

    if (error || !data) break;

    const nombre = (data.nombre || '').toLowerCase();
    if (nombre.includes('alumbrado')) {
      return true;
    }

    currentId = data.parent_id;
    depth++;
  }

  return false;
};

export const checkIsDirectorServiciosPublicos = async (dependenciaId: string | null): Promise<boolean> => {
  if (!dependenciaId) return false;

  const supabase = await createClient();
  let currentId: string | null = dependenciaId;
  let depth = 0;
  const MAX_DEPTH = 5;

  while (currentId && depth < MAX_DEPTH) {
    const { data, error }: { data: any, error: any } = await supabase
      .from('dependencias')
      .select('id, nombre, parent_id')
      .eq('id', currentId)
      .single();

    if (error || !data) break;

    const nombre = (data.nombre || '').toLowerCase();
    if (nombre.includes('servicios públicos') || nombre.includes('servicios publicos')) {
      return true;
    }

    currentId = data.parent_id;
    depth++;
  }

  return false;
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
