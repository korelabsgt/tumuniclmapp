'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { mensajeDevSchema, MensajeDev, MensajeDevFormData } from '../zod';

async function attachCreadores(mensajes: MensajeDev[]): Promise<MensajeDev[]> {
  if (mensajes.length === 0) return [];

  const userIds = [...new Set(mensajes.map((m) => m.user_id).filter(Boolean))] as string[];
  if (userIds.length === 0) {
    return mensajes.map((m) => ({ ...m, creador_nombre: null }));
  }

  const supabase = await createClient();
  const { data: usuarios } = await supabase
    .from('info_usuario')
    .select('user_id, nombre')
    .in('user_id', userIds);

  const nombres = new Map((usuarios ?? []).map((u) => [u.user_id, u.nombre]));

  return mensajes.map((m) => ({
    ...m,
    creador_nombre: m.user_id ? nombres.get(m.user_id) ?? null : null,
  }));
}

// ── Obtener todos los mensajes ──────────────────────────────────────────────
export async function getMensajesDev(): Promise<MensajeDev[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dev_mensajes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getMensajesDev]', error.message);
    return [];
  }

  return attachCreadores((data as MensajeDev[]) || []);
}

// ── Obtener mensajes activos vigentes (para mostrar en el layout) ───────────
export async function getMensajesActivosDev(): Promise<MensajeDev[]> {
  const supabase = await createClient();
  const ahora = new Date().toISOString();

  const { data, error } = await supabase
    .from('dev_mensajes')
    .select('*')
    .eq('activo', true)
    .lte('fecha_inicio', ahora)
    .gte('fecha_fin', ahora)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getMensajesActivosDev]', error.message);
    return [];
  }

  return (data as MensajeDev[]) || [];
}

// ── Crear mensaje ───────────────────────────────────────────────────────────
export async function crearMensajeDev(
  formData: MensajeDevFormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = mensajeDevSchema.safeParse(formData);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: 'Debe iniciar sesión para crear un mensaje.' };
  }

  const { error } = await supabase.from('dev_mensajes').insert({
    titulo: parsed.data.titulo,
    mensaje: parsed.data.mensaje,
    fecha_inicio: parsed.data.fecha_inicio,
    fecha_fin: parsed.data.fecha_fin,
    estado: parsed.data.estado,
    activo: parsed.data.activo,
    user_id: user.id,
  });

  if (error) {
    console.error('[crearMensajeDev]', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/sigem/dev');
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ── Editar mensaje ──────────────────────────────────────────────────────────
export async function editarMensajeDev(
  id: string,
  formData: MensajeDevFormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = mensajeDevSchema.safeParse(formData);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Datos inválidos' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('dev_mensajes')
    .update({
      titulo: parsed.data.titulo,
      mensaje: parsed.data.mensaje,
      fecha_inicio: parsed.data.fecha_inicio,
      fecha_fin: parsed.data.fecha_fin,
      estado: parsed.data.estado,
      activo: parsed.data.activo,
    })
    .eq('id', id);

  if (error) {
    console.error('[editarMensajeDev]', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/sigem/dev');
  revalidatePath('/', 'layout');
  return { ok: true };
}

// ── Eliminar mensaje ────────────────────────────────────────────────────────
export async function eliminarMensajeDev(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('dev_mensajes').delete().eq('id', id);

  if (error) {
    console.error('[eliminarMensajeDev]', error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath('/sigem/dev');
  revalidatePath('/', 'layout');
  return { ok: true };
}
