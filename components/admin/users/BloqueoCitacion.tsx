'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar } from 'lucide-react';
import { confirmarCitacion } from './forms/citacionActions';
import { useCitacionPendiente } from './forms/hooks';
import { BLOQUEOS_GLOBALES_KEY } from "@/components/layout/bloqueos/hooks";
import { useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

const formatearFecha = (fechaStr: string) => {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const d = new Date(fechaStr);
  const dia = d.getDate();
  const mes = meses[d.getMonth()];
  const anio = d.getFullYear().toString().substring(2);
  let hora = d.getHours();
  const minutos = d.getMinutes().toString().padStart(2, '0');
  const ampm = hora >= 12 ? 'pm' : 'am';
  hora = hora % 12;
  hora = hora ? hora : 12;
  return `${dia} ${mes}/${anio} a las ${hora}:${minutos} ${ampm}`;
};

export default function BloqueoCitacion() {
  const queryClient = useQueryClient();
  const { data: citacion, isLoading: loading } = useCitacionPendiente();
  const [confirming, setConfirming] = useState(false);

  if (loading || !citacion) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    const result = await confirmarCitacion(citacion.id);
    setConfirming(false);

    if (result.success) {
      Swal.fire({
        title: 'Confirmado',
        text: 'Su confirmación de enterado ha sido registrada en el sistema.',
        icon: 'success',
        confirmButtonColor: '#2563eb',
        background: '#18181b',
        color: '#ffffff'
      });
      queryClient.setQueryData(BLOQUEOS_GLOBALES_KEY, (prev: {
        citacion: unknown;
        actividad: unknown;
        mensajePermiso: unknown;
        solicitudJefe: unknown;
      } | undefined) =>
        prev ? { ...prev, citacion: null } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: BLOQUEOS_GLOBALES_KEY });
      void queryClient.invalidateQueries({ queryKey: ['citaciones'] });
    } else {
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al confirmar. Por favor intente nuevamente.',
        icon: 'error',
        background: '#18181b',
        color: '#ffffff'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-50/95 dark:bg-neutral-950/95 backdrop-blur-sm">
      
      <div className="w-full max-w-lg mx-auto bg-white border dark:bg-neutral-900 rounded-2xl border-gray-100 dark:border-neutral-800 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        
        {/* Header decoration */}
        <div className="w-full h-6 bg-gradient-to-r from-blue-600 to-cyan-600"></div>

        <div className="p-8 text-center flex flex-col items-center">
          <div className="relative w-full h-32 mx-auto mb-6"> 
            <Image 
              src="/images/logo-muni.png" 
              alt="Logo" 
              fill 
              className="relative z-10 object-contain" 
            />
          </div>

          <h1 className="mb-2 text-3xl font-black tracking-tight text-blue-600 dark:text-blue-500 uppercase">
            Citación Oficial
          </h1>
          
          <p className="mb-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            Recursos Humanos requiere su presencia
          </p>

          <div className="w-full bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/50 p-5 mb-8 text-left">
            <h3 className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider mb-2">
              Motivo de la Cita:
            </h3>
            <p className="text-sm text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">
              {citacion.motivo}
            </p>

            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-3 rounded-lg border border-red-100 dark:border-neutral-800">
              <Calendar className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Agendada para:</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatearFecha(citacion.fecha_cita)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col w-full gap-3">
            <Button
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full h-12 text-sm font-bold text-white transition-all bg-blue-600 rounded-xl hover:bg-blue-700"
            >
              {confirming ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  CONFIRMAR DE ENTERADO
                </>
              )}
            </Button>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Al hacer clic, se registrará digitalmente su confirmación con fecha y hora en su expediente.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
