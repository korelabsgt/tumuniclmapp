'use server';

import { createClient } from '@/utils/supabase/server';

export async function crearLlamadaAtencion(
  id_usuario: string, 
  tipo: string, 
  descripcion: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('llamada_atencion')
    .insert({
      id_usuario,
      tipo,
      descripcion,
    });

  if (error) {
    console.error('Insert error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function obtenerLlamadasAtencion(id_usuario: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('llamada_atencion')
    .select('*')
    .eq('id_usuario', id_usuario)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch error:', error);
    return { success: false, error: error.message, data: null };
  }

  return { success: true, data };
}

export async function obtenerTodasFaltas() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'No autorizado', data: null };
  }

  const { data, error } = await supabase
    .from('llamada_atencion')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch error todas faltas:', error);
    return { success: false, error: 'No se pudieron cargar las faltas', data: null };
  }

  return { success: true, data: data ?? [] };
}

export async function actualizarLlamadaAtencion(
  id: string, 
  tipo: string, 
  descripcion: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('llamada_atencion')
    .update({ tipo, descripcion })
    .eq('id', id);

  if (error) {
    console.error('Update error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function eliminarLlamadaAtencion(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('llamada_atencion')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
