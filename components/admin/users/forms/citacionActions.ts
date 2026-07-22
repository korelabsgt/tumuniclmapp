'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function crearCitacion(
  id_usuario: string,
  motivo: string,
  fecha_cita: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('citaciones')
    .insert({
      id_usuario,
      motivo,
      fecha_cita,
      estado: 'Pendiente'
    });

  if (error) {
    console.error('Insert error citaciones:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function obtenerCitacionesUsuario(id_usuario: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado', data: null };
  }

  const { data, error } = await supabase
    .from('citaciones')
    .select('*')
    .eq('id_usuario', id_usuario)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch error citaciones:', error);
    return { success: false, error: 'No se pudieron cargar las citaciones', data: null };
  }

  return { success: true, data };
}

export async function obtenerTodasCitaciones() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado', data: null };
  }

  const { data, error } = await supabase
    .from('citaciones')
    .select('*')
    .order('fecha_cita', { ascending: false });

  if (error) {
    console.error('Fetch error todas citaciones:', error);
    return { success: false, error: 'No se pudieron cargar las citaciones', data: null };
  }

  return { success: true, data: data ?? [] };
}

export async function obtenerCitacionPendienteActual() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    return { success: false, data: null };
  }

  const userId = userData.user.id;

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin
    .from('citaciones')
    .select('*')
    .eq('id_usuario', userId)
    .eq('estado', 'Pendiente')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Fetch pending citacion error:', error);
    return { success: false, error: error.message, data: null };
  }

  return { success: true, data: data || null };
}

export async function confirmarCitacion(id: string) {
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabaseAdmin
    .from('citaciones')
    .update({
      estado: 'Confirmada',
      fecha_confirmado: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Update citacion error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function actualizarCitacion(
  id: string,
  motivo: string,
  fecha_cita: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('citaciones')
    .update({
      motivo,
      fecha_cita
    })
    .eq('id', id);

  if (error) {
    console.error('Update error citaciones:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function eliminarCitacion(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('citaciones')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error citaciones:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
