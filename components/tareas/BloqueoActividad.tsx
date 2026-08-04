'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Calendar, ClipboardList } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { obtenerActividadPendienteConfirmacion, confirmarActividad } from './actions';
import { ACTIVIDAD_PENDIENTE_REFRESH } from '@/components/push/Listener';
import Swal from 'sweetalert2';
import { useTheme } from 'next-themes';

const formatearFechaHora = (fechaISO: string) => {
  const d = new Date(fechaISO);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diaSemana = dias[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  let hora = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, '0');
  const period = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12;
  hora = hora ? hora : 12;
  return `${diaSemana} ${day}/${month}/${year}, ${hora}:${minutos} ${period}`;
};

interface ActividadPendiente {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  created_by: string;
  assigned_to: string;
  creador_nombre: string;
  es_concejo?: boolean;
}

export default function BloqueoActividad() {
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [actividad, setActividad] = useState<ActividadPendiente | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const fetchActividad = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const result = await obtenerActividadPendienteConfirmacion();
      if (result.success && result.data) {
        setActividad(result.data as ActividadPendiente);
      } else {
        setActividad(null);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActividad();
  }, [fetchActividad]);

  useEffect(() => {
    if (pathname === '/sigem/actividades') {
      fetchActividad(true);
    }
  }, [pathname, fetchActividad]);

  useEffect(() => {
    const onRefresh = () => fetchActividad(true);

    window.addEventListener(ACTIVIDAD_PENDIENTE_REFRESH, onRefresh);
    window.addEventListener('focus', onRefresh);

    return () => {
      window.removeEventListener(ACTIVIDAD_PENDIENTE_REFRESH, onRefresh);
      window.removeEventListener('focus', onRefresh);
    };
  }, [fetchActividad]);

  if (loading || !actividad) return null;

  const esAutoAsignada = actividad.created_by === actividad.assigned_to;
  const isDark = resolvedTheme === 'dark';

  const swalTheme = {
    background: isDark ? '#18181b' : '#ffffff',
    color: isDark ? '#f4f4f5' : '#1e293b',
    confirmButtonColor: '#2563eb',
  };

  const handleConfirm = async () => {
    if (confirming || !actividad) return;

    setConfirming(true);

    try {
      const result = await confirmarActividad(actividad.id);

      if (!result.success) {
        await Swal.fire({
          title: 'Error',
          text: result.error || 'Ocurrió un error al confirmar. Por favor intente nuevamente.',
          icon: 'error',
          ...swalTheme,
        });
        return;
      }

      const confirmedAt = result.confirmed_at || new Date().toISOString();
      setActividad(null);

      await Swal.fire({
        title: 'Confirmado',
        html: `
          <p style="margin-bottom: 12px;">Su confirmación de enterado ha sido registrada en el sistema.</p>
          <p style="font-size: 0.875rem; font-weight: 600; color: ${isDark ? '#4ade80' : '#16a34a'};">
            Confirmación: ${formatearFechaHora(confirmedAt)}
          </p>
        `,
        icon: 'success',
        ...swalTheme,
      });

      queryClient.invalidateQueries({ queryKey: ['gestor-tareas'] });
      await fetchActividad(true);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-gray-50/95 dark:bg-neutral-950/95 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-auto bg-white border dark:bg-neutral-900 rounded-2xl border-gray-100 dark:border-neutral-800 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="w-full h-6 bg-gradient-to-r from-indigo-600 to-blue-600" />

        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
            <ClipboardList className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>

          <h1 className="mb-2 text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 uppercase">
            📋 Actividad Asignada
          </h1>

          <p className="mb-6 text-sm font-medium text-gray-500 dark:text-gray-400">
            {actividad.es_concejo ? (
              <>
                El{' '}
                <span className="font-bold text-blue-600 dark:text-blue-400">Concejo Municipal</span>{' '}
                te asignó una actividad. Confirma que estás enterado.
              </>
            ) : esAutoAsignada ? (
              'Te asignaste una actividad. Confirma que estás enterado.'
            ) : (
              `${actividad.creador_nombre} te asignó una actividad. Confirma que estás enterado.`
            )}
          </p>

          <div className="w-full bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50 p-5 mb-8 text-left">
            <h3 className="text-xs font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wider mb-2">
              Actividad:
            </h3>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {actividad.title}
            </p>
            {actividad.description && (
              <p className="text-sm text-gray-800 dark:text-gray-200 mb-4 whitespace-pre-wrap">
                {actividad.description}
              </p>
            )}

            <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-3 rounded-lg border border-indigo-100 dark:border-neutral-800">
              <Calendar className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Fecha límite:</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {formatearFechaHora(actividad.due_date)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col w-full gap-3">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full h-12 text-sm font-bold text-white transition-all bg-indigo-600 rounded-xl hover:bg-indigo-700"
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
              Al hacer clic, se registrará digitalmente su confirmación con fecha y hora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
