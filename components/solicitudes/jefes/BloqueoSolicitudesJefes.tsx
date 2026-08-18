'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ClipboardList, Calendar, MapPin, AlignLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import CambioEstadoJefesModal from './modals/CambioEstadoJefesModal';
import { SolicitudJefe } from './lib/zod';
import { useSolicitudPendienteJefe } from './lib/hook';

const formatearFecha = (fechaString: string) => {
  if (!fechaString) return '';
  const datePart = fechaString.split('T')[0]; // Toma solo la parte YYYY-MM-DD
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

export default function BloqueoSolicitudesJefes() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { data, isLoading: loading, refetch } = useSolicitudPendienteJefe();
  const solicitud = data ?? null;
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/sigem/solicitudes/jefes') {
      void refetch();
    }
  }, [pathname, refetch]);

  if (loading || !solicitud) return null;

  const handleResponder = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    void refetch();
  };

  return (
    <>
      <div className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-gray-50/95 dark:bg-neutral-950/95 backdrop-blur-sm">
        <div className="w-full max-w-lg mx-auto bg-white border dark:bg-neutral-900 rounded-2xl border-gray-100 dark:border-neutral-800 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-full h-6 bg-gradient-to-r from-emerald-500 to-teal-500" />

          <div className="p-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            </div>

            <h1 className="mb-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 uppercase">
              📋 Solicitud Pendiente
            </h1>

            <p className="mb-6 text-sm font-medium text-gray-500 dark:text-gray-400">
              <span className="font-bold text-gray-700 dark:text-gray-200">{(solicitud as any).creador_nombre}</span> te ha enviado una solicitud de apoyo.
            </p>

            <div className="w-full bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-100 dark:border-emerald-900/50 p-5 mb-8 text-left">
              <div className="flex flex-col gap-3">

                <div>
                  <h3 className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    <MapPin className="w-3.5 h-3.5" /> Asunto / Título
                  </h3>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 pl-5">
                    {solicitud.ubicacion}
                  </p>
                </div>

                {solicitud.comentarios && (
                  <div>
                    <h3 className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider mb-1">
                      <AlignLeft className="w-3.5 h-3.5" /> Detalles
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap pl-5">
                      {solicitud.comentarios}
                    </p>
                  </div>
                )}

                <div className="mt-2 bg-white dark:bg-neutral-900 p-3 rounded-lg border border-emerald-100 dark:border-neutral-800 flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Fecha Requerida:</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      {formatearFecha(solicitud.fecha_solicitud ?? '')}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex flex-col w-full gap-3">
              <Button
                type="button"
                onClick={handleResponder}
                className="w-full h-12 text-sm font-bold text-white transition-all bg-emerald-600 rounded-xl hover:bg-emerald-700"
              >
                RESPONDER SOLICITUD
              </Button>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Debes confirmar o rechazar esta solicitud para continuar usando el sistema.
              </p>
            </div>
          </div>
        </div>
      </div>

      <CambioEstadoJefesModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        solicitud={solicitud}
      />
    </>
  );
}
