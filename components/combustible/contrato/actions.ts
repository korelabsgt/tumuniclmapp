'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { ContratoExtendido, DetalleContrato } from './types' 

export async function getContratos(): Promise<ContratoExtendido[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ContratoCombustible')
    .select(`
      *,
      detalles:DetalleContrato(*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data as unknown as ContratoExtendido[]
}

export interface DetalleItem {
  producto: string
  denominacion: number
  cantidad: number
}

export interface NuevoContratoMultiplexDTO {
  anio: number
  estacion: string
  numero_contrato: string
  detalles: DetalleItem[] | string 
}

export async function createContrato(data: NuevoContratoMultiplexDTO) {
  const supabase = await createClient()

  let detallesProcesados: DetalleItem[] = []

  if (typeof data.detalles === 'string') {
    try {
      detallesProcesados = JSON.parse(data.detalles)
    } catch (e) {
      return { success: false, error: 'Datos corruptos (JSON error).' }
    }
  } else if (Array.isArray(data.detalles)) {
    detallesProcesados = data.detalles
  }

  if (!detallesProcesados || detallesProcesados.length === 0) {
    return { success: false, error: 'El contrato debe tener al menos un cupón.' }
  }

  try {
    const { data: contratoData, error: contratoError } = await supabase
      .from('ContratoCombustible')
      .insert({
        anio: Number(data.anio),
        estacion: data.estacion,
        numero_contrato: data.numero_contrato,
      })
      .select('id')
      .single()

    if (contratoError) throw new Error(`Error BD Cabecera: ${contratoError.message}`)
    if (!contratoData) throw new Error('No se generó ID.')

    const contratoId = contratoData.id

    const detallesParaInsertar = detallesProcesados.map((d) => ({
      contrato_id: contratoId,      
      producto: d.producto || 'Gasolina', 
      denominacion: Number(d.denominacion),
      cantidad_inicial: Number(d.cantidad),
      cantidad_actual: Number(d.cantidad)
    }))

    const { error: detallesError } = await supabase
      .from('DetalleContrato')
      .insert(detallesParaInsertar)

    if (detallesError) {
      await supabase.from('ContratoCombustible').delete().eq('id', contratoId)
      throw new Error(`Error BD Detalles: ${detallesError.message}`)
    }

    revalidatePath('/sigem/combustible')
    return { success: true }

  } catch (error: any) {
    console.error('Error:', error)
    return { success: false, error: error.message }
  }
}

export async function registrarConsumo(idDetalle: string, cantidadConsumida: number) {
  const supabase = await createClient()

  if (cantidadConsumida <= 0) {
    return { success: false, error: 'La cantidad debe ser mayor a cero.' }
  }

  const { data: detalle, error: fetchError } = await supabase
    .from('DetalleContrato')
    .select('cantidad_actual')
    .eq('id', idDetalle)
    .single()

  if (fetchError || !detalle) {
    return { success: false, error: 'Cupón no encontrado.' }
  }

  const nuevaCantidad = detalle.cantidad_actual - cantidadConsumida

  if (nuevaCantidad < 0) {
    return { success: false, error: `Saldo insuficiente. Solo quedan ${detalle.cantidad_actual}.` }
  }

  const { error } = await supabase
    .from('DetalleContrato')
    .update({ cantidad_actual: nuevaCantidad })
    .eq('id', idDetalle)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/sigem/combustible')
  return { success: true }
}

export async function updateContrato(id: string, data: NuevoContratoMultiplexDTO) {
  const supabase = await createClient()

  let detallesProcesados: DetalleItem[] = []
  if (typeof data.detalles === 'string') {
      try { detallesProcesados = JSON.parse(data.detalles) } catch (e) {}
  } else if (Array.isArray(data.detalles)) {
      detallesProcesados = data.detalles
  }

  if (!detallesProcesados || detallesProcesados.length === 0) {
    return { success: false, error: 'No se puede dejar un contrato sin detalles.' }
  }
  
  try {
    const { error: headerError } = await supabase
      .from('ContratoCombustible')
      .update({
        anio: data.anio,
        estacion: data.estacion,
        numero_contrato: data.numero_contrato,
      })
      .eq('id', id)

    if (headerError) throw new Error(headerError.message)

    const { error: deleteError } = await supabase
      .from('DetalleContrato')
      .delete()
      .eq('contrato_id', id)
    
    if (deleteError) throw new Error(deleteError.message)

    const nuevosDetalles = detallesProcesados.map((d) => ({
      contrato_id: id,
      producto: d.producto || 'Gasolina',
      denominacion: d.denominacion,
      cantidad_inicial: d.cantidad,
      cantidad_actual: d.cantidad 
    }))

    const { error: insertError } = await supabase
      .from('DetalleContrato')
      .insert(nuevosDetalles)

    if (insertError) throw new Error(insertError.message)

    revalidatePath('/sigem/combustible')
    return { success: true }

  } catch (error: any) {
    console.error('Error actualizando contrato:', error)
    return { success: false, error: error.message }
  }
}

export async function deleteContrato(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('ContratoCombustible')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/sigem/combustible')
  return { success: true }
}

export async function getSiguienteCorrelativo(anio: number) {
  const supabase = await createClient(); 

  try {
    const { data: contratos, error } = await supabase
      .from('ContratoCombustible') 
      .select('numero_contrato')
      .eq('anio', anio);

    if (error) {
        console.error('Error obteniendo contratos:', error);
        throw error;
    }

    let maximoNumero = 0;

    if (contratos && contratos.length > 0) {
      contratos.forEach((fila) => {
        const textoContrato = fila.numero_contrato || ""; 
        const match = textoContrato.match(/^(\d+)-/);
        
        if (match) {
          const numeroActual = parseInt(match[1], 10);
          if (numeroActual > maximoNumero) {
            maximoNumero = numeroActual;
          }
        }
      });
    }

    const siguiente = maximoNumero + 1;
    const codigoFormateado = `${String(siguiente).padStart(4, '0')}-${anio}`;

    return { 
      success: true, 
      sequence: siguiente,
      formatted: codigoFormateado 
    }; 

  } catch (error) {
    console.error('Error calculando correlativo:', error);
    return { success: false, error: 'Error al obtener secuencia' };
  }
}