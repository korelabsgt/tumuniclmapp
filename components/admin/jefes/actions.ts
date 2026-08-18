'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function obtenerEstructuraCompleta() {
  const supabase = await createClient();
  
  const { data: deps } = await supabase
    .from('dependencias')
    .select('*, jefe:info_usuario!jefe_id(nombre)')
    .order('no', { ascending: true });

  const { data: users } = await supabase
    .from('info_usuario')
    .select('user_id, nombre, esjefe') // Agregado esjefe
    .eq('activo', true)
    .order('nombre');

  return { 
    dependencias: deps || [], 
    usuarios: users || [] 
  };
}

export async function asignarJefeDirecto(depId: string, nuevoJefeId: string) {
  const supabase = await createClient();

  const { data: depActual } = await supabase
    .from('dependencias')
    .select('jefe_id')
    .eq('id', depId)
    .single();

  const jefeAnteriorId = depActual?.jefe_id;

  const { error: errorUpdate } = await supabase
    .from('dependencias')
    .update({ jefe_id: nuevoJefeId })
    .eq('id', depId);

  if (errorUpdate) throw new Error(errorUpdate.message);

  await supabase
    .from('info_usuario')
    .update({ esjefe: true })
    .eq('user_id', nuevoJefeId);

  if (jefeAnteriorId && jefeAnteriorId !== nuevoJefeId) {
    const { count } = await supabase
      .from('dependencias')
      .select('*', { count: 'exact', head: true })
      .eq('jefe_id', jefeAnteriorId);

    if (count === 0) {
      await supabase
        .from('info_usuario')
        .update({ esjefe: false })
        .eq('user_id', jefeAnteriorId);
    }
  }

  revalidatePath('/sigem/jefes');
}

export async function removerJefe(depId: string) {
  const supabase = await createClient();

  const { data: depActual } = await supabase
    .from('dependencias')
    .select('jefe_id')
    .eq('id', depId)
    .single();

  const jefeAnteriorId = depActual?.jefe_id;

  if (!jefeAnteriorId) return;

  const { error } = await supabase
    .from('dependencias')
    .update({ jefe_id: null })
    .eq('id', depId);

  if (error) throw new Error(error.message);

  const { count } = await supabase
    .from('dependencias')
    .select('*', { count: 'exact', head: true })
    .eq('jefe_id', jefeAnteriorId);

  if (count === 0) {
    await supabase
      .from('info_usuario')
      .update({ esjefe: false })
      .eq('user_id', jefeAnteriorId);
  }

  revalidatePath('/sigem/jefes');
}