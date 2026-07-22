'use client'

import React, { useState, useEffect } from 'react';
import { SolicitudLampara } from '../lib/zod';
import { useSolicitudMutations } from '../lib/hooks';
import Swal from 'sweetalert2';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (nuevoEstado: 'completado' | 'en_revision', comentarios?: string) => void;
  solicitud: SolicitudLampara;
  isElectricista?: boolean;
}

export default function CambioEstadoModal({ isOpen, onClose, onSuccess, solicitud, isElectricista = false }: Props) {
  const [step, setStep] = useState<'menu' | 'rechazar'>('menu');
  const [comentarios, setComentarios] = useState('');
  
  const { actualizarEstado } = useSolicitudMutations();
  const loading = actualizarEstado.isPending;

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const handleCompletar = async () => {
    try {
        const res = await actualizarEstado.mutateAsync({
            solicitudId: solicitud.id,
            nuevoEstado: 'completado'
        });

        if (res.success) {
            Swal.fire({ title: '¡Completada!', text: 'Solicitud marcada como completada.', icon: 'success', timer: 1500, showConfirmButton: false });
            onSuccess('completado'); 
        } else {
            Swal.fire('Error', res.error || 'No se pudo completar la solicitud', 'error');
        }
    } catch (error: any) {
        Swal.fire('Error', error.message || 'Error de red o servidor', 'error');
    }
  };

  const handleRechazar = async () => {
    if (!comentarios.trim()) {
        Swal.fire('Atención', 'Debe ingresar un motivo para enviarla a revisión.', 'warning');
        return;
    }

    try {
        const res = await actualizarEstado.mutateAsync({ 
            solicitudId: solicitud.id, 
            nuevoEstado: 'en_revision',
            comentarios
        }); 
        
        if (res.success) {
            Swal.fire({ title: 'En Revisión', text: 'La solicitud ha sido puesta en revisión.', icon: 'info', timer: 1500, showConfirmButton: false });
            onSuccess('en_revision', comentarios); 
        } else {
            Swal.fire('Error', res.error || 'No se pudo enviar a revisión', 'error');
        }
    } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al enviar a revisión', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-neutral-800 relative transition-all duration-300 w-full max-w-2xl overflow-hidden">
        
        <div className="flex justify-between items-start sm:items-center px-4 sm:px-8 py-4 sm:py-5 border-b border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0 rounded-t-2xl">
          <div>
            <div className="flex flex-row items-center gap-2 sm:gap-3 flex-wrap">
                <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">Solicitud de Lámparas</h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-300 text-[9px] sm:text-xs font-bold border border-slate-200 dark:border-neutral-700 uppercase">
                    CÓD: {solicitud.id.slice(0, 3)}-{solicitud.id.slice(3, 6)}
                </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Gestión del estado de la solicitud.</p>
          </div>
          
          <button onClick={onClose} className="p-2 -mr-1 sm:mr-0 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 transition-colors">
             <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {step === 'menu' && (
            <div className="p-4 sm:p-10 flex flex-col gap-4 sm:gap-6 items-center justify-center min-h-[300px]">
                <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white mb-2 text-center">¿Qué acción desea realizar con esta solicitud?</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6 w-full max-w-lg mx-auto">
                    <button 
                        onClick={handleCompletar}
                        disabled={loading}
                        className="flex flex-col items-center justify-center gap-2 sm:gap-3 p-5 sm:p-8 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:border-emerald-300 transition-all group disabled:opacity-50 disabled:cursor-not-allowed w-full"
                    >
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 dark:text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 text-base sm:text-lg text-center">Completar Solicitud</span>
                        <span className="text-[10px] sm:text-xs text-emerald-600/70 text-center">Marcar el trabajo como finalizado.</span>
                    </button>

                    <button 
                        onClick={() => setStep('rechazar')} 
                        className="flex flex-col items-center justify-center gap-2 sm:gap-3 p-5 sm:p-8 rounded-xl border-2 border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-300 transition-all group w-full"
                    >
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <svg className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 dark:text-red-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </div>
                        <span className="font-bold text-red-700 dark:text-red-300 text-base sm:text-lg text-center">Mandar a Revisión</span>
                        <span className="text-[10px] sm:text-xs text-red-600/70 text-center">Denegar la petición y registrar el motivo.</span>
                    </button>
                </div>
            </div>
        )}

        {step === 'rechazar' && (
            <div className="flex flex-col">
                <div className="p-8 pb-4">
                    <button onClick={() => setStep('menu')} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-1 mb-6">← Volver al menú</button>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Motivo de Revisión</label>
                    <textarea 
                        className="w-full bg-white dark:bg-neutral-900 border border-gray-300 dark:border-neutral-700 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all min-h-[120px] resize-none"
                        placeholder="Explique por qué se rechaza la solicitud..."
                        value={comentarios}
                        onChange={(e) => setComentarios(e.target.value)}
                        autoFocus
                    ></textarea>
                </div>
                <div className="p-6 border-t border-gray-100 dark:border-neutral-800 flex justify-end gap-3 bg-gray-50 dark:bg-neutral-900 shrink-0 rounded-b-2xl">
                   <button 
                        onClick={() => setStep('menu')} 
                        className="px-6 py-3 rounded-xl border-2 border-red-100 text-red-600 font-bold text-sm hover:bg-red-50 hover:border-red-200 transition-colors dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                        Cancelar
                    </button>
                   <button 
                        onClick={handleRechazar} 
                        disabled={loading || !comentarios.trim()} 
                        className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xl shadow-red-200 dark:shadow-none flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Procesando...' : 'Confirmar Revisión'}
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
