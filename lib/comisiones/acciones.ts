'use server';

import supabaseAdmin from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function marcarAsistenciaComision(
  userId: string,
  comisionId: string,
  tipo: string,
  ubicacion: { lat: number; lng: number },
  notas: string
) {
  if (!userId || !comisionId || !tipo || !ubicacion) {
    throw new Error('Faltan datos para marcar la asistencia.');
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('registros_comision')
      .insert({
        user_id: userId,
        comision_id: comisionId,
        tipo_registro: tipo,
        ubicacion: ubicacion,
        notas: notas,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/sigem/dashboard'); // O la ruta donde se encuentre el componente
    return data;
  } catch (error) {
    console.error('Error al marcar asistencia de comisión:', error);
    return null;
  }
}