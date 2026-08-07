'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { validarConfiguracionPortal, validarPolitica, validarPublicacion } from './zod';


export type ConfiguracionPortal = {
  id: string;
  eslogan: string | null;
  logo_url: string | null;
  portada_url: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Obtiene la configuración del portal (siempre hay 1 sola fila).
 * Usada desde Server Components para hidratar la portada con datos reales.
 */
export async function getConfiguracionPortal(): Promise<ConfiguracionPortal | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('configuracion_portal')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[getConfiguracionPortal] Error:', error.message);
    return null;
  }
  return data;
}

/**
 * Guarda (upsert) la configuración del portal.
 * Solo accesible por usuarios autenticados (validado por RLS).
 */
export async function guardarConfiguracionPortal(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const eslogan = formData.get('eslogan') as string | null;
  const logo_url = formData.get('logo_url') as string | null;
  const portada_url = formData.get('portada_url') as string | null;

  // Validar datos con Zod antes de guardar
  const validacion = validarConfiguracionPortal({ eslogan, logo_url, portada_url });
  if (!validacion.success) {
    const primerError = Object.values(validacion.errores)[0];
    return { success: false, error: primerError };
  }

  // Buscar si ya existe un registro
  const { data: existing } = await supabase
    .from('configuracion_portal')
    .select('id')
    .limit(1)
    .maybeSingle();

  const payload = {
    eslogan,
    logo_url,
    portada_url,
    updated_at: new Date().toISOString(),
  };

  let error;
  if (existing?.id) {
    // Actualizar registro existente
    ({ error } = await supabase
      .from('configuracion_portal')
      .update(payload)
      .eq('id', existing.id));
  } else {
    // Crear primer registro
    ({ error } = await supabase
      .from('configuracion_portal')
      .insert(payload));
  }

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// POLITICAS
// ─────────────────────────────────────────────────────────────────────────────

export type Politica = {
  id: string;
  nombre: string;
  created_at: string;
};

/** Obtiene todas las políticas del catálogo */
export async function getPoliticas(): Promise<Politica[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('politicas')
    .select('*')
    .order('nombre', { ascending: true });
  if (error) {
    console.error('[getPoliticas] Error:', error.message);
    return [];
  }
  return data ?? [];
}

/** Crea una nueva política en el catálogo */
export async function crearPolitica(
  nombre: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const validacion = validarPolitica({ nombre });
  if (!validacion.success) {
    return { success: false, error: Object.values(validacion.errores)[0] };
  }
  const { error } = await supabase.from('politicas').insert({ nombre });
  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

/** Elimina una política del catálogo */
export async function eliminarPolitica(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('politicas').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLICACIONES
// ─────────────────────────────────────────────────────────────────────────────

export type GraficaFila = {
  concepto: string;
  presupuestado: number;
  ejecutado: number;
};

export type DocumentoItem = {
  nombre: string;
  url: string;
};

export type Publicacion = {
  id: string;
  nombre: string;
  descripcion: string;
  año: number;
  orden: number;
  politica_id: string | null;
  imagenes: string[] | null;
  documentos: DocumentoItem[] | null;
  grafica_data: GraficaFila[] | null;
  created_at: string;
  updated_at: string;
  politicas?: { nombre: string } | null;
};

export type PublicacionPayload = Omit<Publicacion, 'id' | 'created_at' | 'updated_at' | 'politicas'> & { id?: string };

/** Obtiene publicaciones ordenadas. Permite filtrar por año y/o política. */
export async function getPublicaciones(
  año?: number,
  politica_id?: string | null
): Promise<Publicacion[]> {
  const supabase = await createClient();
  let query = supabase
    .from('publicaciones')
    .select('*, politicas(nombre)')
    .order('orden', { ascending: true });

  if (año) query = query.eq('año', año);
  if (politica_id) query = query.eq('politica_id', politica_id);

  const { data, error } = await query;
  if (error) {
    console.error('[getPublicaciones] Error:', error.message);
    return [];
  }
  return data ?? [];
}

/** Crea una nueva publicación */
export async function crearPublicacion(
  payload: PublicacionPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const validacion = validarPublicacion(payload);
  if (!validacion.success) {
    return { success: false, error: Object.values(validacion.errores)[0] };
  }
  const { error } = await supabase.from('publicaciones').insert(payload);
  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

/** Actualiza una publicación existente */
export async function actualizarPublicacion(
  id: string,
  payload: Partial<PublicacionPayload>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('publicaciones')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { success: false, error: error.message };
  revalidatePath('/');
  return { success: true };
}

/** Elimina una publicación */
export async function eliminarPublicacion(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Obtener la publicación para conocer los archivos adjuntos
  const { data: pub, error: fetchError } = await supabase
    .from('publicaciones')
    .select('imagenes, documentos')
    .eq('id', id)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  // 2. Eliminar imágenes del Storage
  if (pub?.imagenes && Array.isArray(pub.imagenes)) {
    const paths = pub.imagenes.filter(i => i !== '__HIDDEN__').map(url => {
      const parts = url.split(`/home_imagenes/`);
      return parts.length > 1 ? parts[1] : null;
    }).filter(Boolean) as string[];

    if (paths.length > 0) {
      await supabase.storage.from('home_imagenes').remove(paths);
    }
  }

  // 3. Eliminar documentos (PDFs) del Storage
  if (pub?.documentos && Array.isArray(pub.documentos)) {
    const paths = (pub.documentos as DocumentoItem[]).filter(d => d.nombre !== '__HIDDEN__').map(d => {
      const parts = d.url.split(`/home_pdf/`);
      return parts.length > 1 ? parts[1] : null;
    }).filter(Boolean) as string[];

    if (paths.length > 0) {
      await supabase.storage.from('home_pdf').remove(paths);
    }
  }

  // 4. Eliminar el registro de la base de datos
  const { error } = await supabase.from('publicaciones').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  
  revalidatePath('/');
  return { success: true };
}
