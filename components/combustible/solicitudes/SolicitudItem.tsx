import React, { useState } from 'react';
import { SolicitudCombustible } from './types';
import { useSolicitudMutations } from './hook'; 
import SolicitudPrintModal from './modals/InformeEntregaCupones'; 
import LiquidarCupones from './modals/LiquidarCupones'; 
import Swal from 'sweetalert2';
import { formatFechaMes, formatHora } from './dateUtils';
import { 
  ChevronDown, 
  MapPin, 
  Gauge, 
  Car, 
  Fuel, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Edit,
  Trash2,
  Calendar,
  Printer,
  FileSignature, 
  Eye            
} from 'lucide-react';

interface Props {
  sol: SolicitudCombustible;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRefresh: () => void;
  onEdit: (sol: SolicitudCombustible) => void;
}

export const SolicitudItem: React.FC<Props> = ({ sol, isExpanded, onToggleExpand, onRefresh, onEdit }) => {
  const { eliminar } = useSolicitudMutations();
  const isDeleting = eliminar.isPending; 

  const [showPrintModal, setShowPrintModal] = useState(false); 
  const [showLiquidarModal, setShowLiquidarModal] = useState(false); 

  const totalKilometros = sol.detalles?.reduce((acc, curr) => acc + (Number(curr.kilometros_recorrer) || 0), 0) || 0;
  const isMaquinaria = ['maquinaria', 'retroexcavadora', 'tractor', 'patrulla de caminos', 'motoniveladora'].some(t => sol.vehiculo?.tipo_vehiculo?.toLowerCase().includes(t)) || sol.vehiculo?.tipo_vehiculo?.toLowerCase() === 'maquinaria';

  const getStatusColor = (status: string) => {
      if (status === 'aprobado') return 'emerald';
      if (status === 'rechazado') return 'red';
      return 'amber'; 
  };

  const color = getStatusColor(sol.estado);

  const getSimpleDate = (dateStr: string) => formatFechaMes(dateStr);
  const getSimpleTime = (dateStr: string) => formatHora(dateStr);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (sol.estado !== 'pendiente') {
        Swal.fire({
            title: 'Acción no permitida',
            text: 'Solo se pueden eliminar solicitudes en estado pendiente.',
            icon: 'error',
            confirmButtonColor: '#3b82f6',
        });
        return;
    }

    const isDark = document.documentElement.classList.contains('dark');

    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la solicitud. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#ef4444', 
      cancelButtonColor: '#6b7280', 
      background: isDark ? '#171717' : '#ffffff',
      color: isDark ? '#ffffff' : '#000000',
      reverseButtons: true,
      focusCancel: true
    });

    if (result.isConfirmed) {
      try {
        await eliminar.mutateAsync(sol.id);
        
        Swal.fire({
          title: 'Eliminado',
          text: 'La solicitud ha sido borrada correctamente.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          background: isDark ? '#171717' : '#ffffff',
          color: isDark ? '#ffffff' : '#000000',
        });

        onRefresh(); 
      } catch (error: any) {
        Swal.fire({
          title: 'Error',
          text: error.message || 'Hubo un error al intentar eliminar la solicitud.',
          icon: 'error',
          confirmButtonColor: '#3b82f6',
          background: isDark ? '#171717' : '#ffffff',
          color: isDark ? '#ffffff' : '#000000',
        });
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (sol.estado !== 'pendiente') {
          Swal.fire({
              title: 'Atención',
              text: 'No se puede editar una solicitud ya procesada.',
              icon: 'info',
              confirmButtonColor: '#3b82f6',
          });
          return;
      }
      onEdit(sol);
  };

  const handlePrint = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowPrintModal(true);
  };

  const handleLiquidar = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowLiquidarModal(true);
  };

  return (
    <>
    <div className={`
        group w-full bg-white dark:bg-neutral-900 rounded-2xl border transition-all duration-300 overflow-hidden
        ${
          color === 'emerald' ? 'border-emerald-500/80 dark:border-emerald-400/80' :
          color === 'amber' ? 'border-amber-500/80 dark:border-amber-400/80' :
          'border-red-500/80 dark:border-red-400/80'
        }
        ${isExpanded ? 'bg-slate-50/50 dark:bg-neutral-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-neutral-800/50'}
    `}>
        
        <div 
            onClick={onToggleExpand}
            className="p-5 cursor-pointer select-none relative z-10"
        >
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                
                <div className="flex items-start gap-4 overflow-hidden">

                    <div className="flex flex-col min-w-0 gap-1">
                        <div className="flex items-center gap-2">
                            
                            <span className={`
                                text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border 
                                ${sol.correlativo 
                                    ? 'text-white bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/50' 
                                    : 'text-slate-400 dark:text-neutral-500 bg-slate-50 dark:bg-neutral-800 border-slate-100 dark:border-neutral-700'
                                }
                            `}>
                                {sol.correlativo ? `No. ${sol.correlativo}` : `ID: ${sol.id}`}
                            </span>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                                {sol.municipio_destino}
                            </h3>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1 font-medium text-slate-500">
                                <Calendar size={12} />
                                {new Date(sol.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    
                    {sol.estado === 'pendiente' && (
                        <div className="flex items-center gap-1 mr-2">
                             <button 
                                onClick={handleEdit}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all"
                                title="Editar"
                            >
                                <Edit size={18} />
                            </button>
                            <button 
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                                title="Eliminar"
                            >
                                {isDeleting ? (
                                    <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Trash2 size={18} />
                                )}
                            </button>
                        </div>
                    )}

                    {sol.estado === 'aprobado' && (
                         <div className="flex items-center gap-2 mr-2">
                            
                            <button 
                                onClick={handlePrint}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all"
                                title="Imprimir Solicitud"
                            >
                                <Printer size={18} />
                            </button>

                            <button 
                                onClick={handleLiquidar}
                                className={`
                                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm
                                    ${sol.solvente 
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' 
                                        : 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 animate-pulse'
                                    }
                                `}
                                title={sol.solvente ? "Ver detalles de liquidación" : "Liquidar cupones pendientes"}
                            >
                                {sol.solvente ? <Eye size={14} /> : <FileSignature size={14} />}
                                <span className="hidden sm:inline">
                                    {sol.solvente ? 'Ver Liquidación' : 'Liquidar'}
                                </span>
                            </button>

                        </div>
                    )}

                    <ChevronDown 
                        size={20} 
                        className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} 
                    />
                </div>
            </div>
        </div>

        <div className={`
            overflow-hidden transition-all duration-500 ease-in-out border-t border-dashed border-slate-200 dark:border-neutral-800
            ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 border-none'}
        `}>
            <div className="p-5 bg-slate-50/50 dark:bg-neutral-950/30">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    <div className="lg:col-span-4 flex flex-col gap-4">
                        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 border border-slate-200 dark:border-neutral-800 shadow-sm space-y-5">
                            
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-100 dark:border-neutral-700">
                                <div className="flex-1 flex items-center gap-2 border-r border-slate-200 dark:border-neutral-700 pr-2 overflow-hidden">
                                    <Gauge size={14} className="text-slate-400 shrink-0" />
                                    <div className="text-xs truncate">
                                        <span className="font-bold text-slate-400 uppercase tracking-tight mr-1">{isMaquinaria ? "H. Inicial:" : "Inicial:"}</span>
                                        <span className="font-mono font-black text-slate-700 dark:text-slate-200">
                                            {sol.kilometraje_inicial.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 flex items-center gap-2 pl-1 overflow-hidden">
                                    <MapPin size={14} className="text-blue-500 shrink-0" />
                                    <div className="text-xs truncate">
                                        <span className="font-bold text-blue-400 uppercase tracking-tight mr-1">Total:</span>
                                        <span className="font-mono font-black text-blue-600 dark:text-blue-400">
                                            {totalKilometros} {isMaquinaria ? 'hr' : 'km'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
                                    <Car size={12} /> Vehículo
                                </h4>
                                
                                <div className="flex flex-row items-center justify-between gap-2 bg-slate-50 dark:bg-neutral-800/50 p-3 rounded-lg border border-slate-100 dark:border-neutral-700 overflow-hidden">
                                    <span className="font-bold text-xs text-slate-700 dark:text-white truncate">
                                        {sol.vehiculo?.modelo || 'N/A'} 
                                    </span>
                                    <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
                                        PLACA: {sol.vehiculo?.placa || 'N/A'}
                                    </span>
                                    {sol.vehiculo?.tipo_combustible && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <Fuel size={12} className={sol.vehiculo.tipo_combustible === 'Diesel' ? 'text-emerald-500' : 'text-orange-500'} />
                                            <span className={`text-[10px] font-black uppercase ${
                                                sol.vehiculo.tipo_combustible === 'Diesel' 
                                                ? 'text-emerald-600 dark:text-emerald-400' 
                                                : 'text-orange-600 dark:text-orange-400'}
                                            `}>
                                                {sol.vehiculo.tipo_combustible}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mb-2 flex items-center gap-2">
                                    <FileText size={12} /> Justificación
                                </h4>
                                <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-neutral-800 p-3 rounded-lg border border-slate-100 dark:border-neutral-700 leading-relaxed">
                                    "{sol.justificacion || 'Sin justificación'}"
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-8">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h4 className="text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-widest flex items-center gap-2">
                                <MapPin size={14} /> DATOS DE LA COMISION
                            </h4>
                            <span className="text-[10px] bg-white dark:bg-neutral-800 px-2 py-1 rounded-md text-slate-500 font-bold border border-slate-200 dark:border-neutral-700 shadow-sm">
                                {sol.detalles?.length || 0} destinos
                            </span>
                        </div>

                        <div className="space-y-4">
                            {sol.detalles?.map((det: any, idx: number) => (
                                <div key={idx} className="group bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-md transition-all">
                                    <div className="flex flex-col lg:flex-row gap-5 justify-between lg:items-center">
                                        
                                        <div className="flex items-start gap-3 w-full lg:w-auto">
                                            <div className="mt-1 w-2 h-2 shrink-0 rounded-full bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.1)]"></div>
                                            <div className="min-w-0">
                                                <h5 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase break-words">
                                                    {det.lugar_visitar}
                                                </h5>
                                                <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-1 inline-block">
                                                    {isMaquinaria ? 'Horas:' : 'Distancia:'} {det.kilometros_recorrer} {isMaquinaria ? 'hr' : 'km'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="w-full lg:w-auto flex-shrink-0">
                                            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-neutral-700 border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 rounded-lg overflow-hidden w-full lg:min-w-[320px]">
                                                <div className="p-3 flex flex-col items-center justify-center text-center">
                                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Salida</span>
                                                    <span className="text-xs font-mono text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">
                                                        {getSimpleDate(det.fecha_inicio)}, {getSimpleTime(det.fecha_inicio)}
                                                    </span>
                                                </div>
                                                
                                                <div className="p-3 flex flex-col items-center justify-center text-center">
                                                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Retorno</span>
                                                    <span className="text-xs font-mono text-slate-700 dark:text-slate-200 font-medium whitespace-nowrap">
                                                        {getSimpleDate(det.fecha_fin)}, {getSimpleTime(det.fecha_fin)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            ))}
                            
                            {(!sol.detalles || sol.detalles.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm bg-slate-50/50 dark:bg-neutral-900 rounded-xl border border-dashed border-slate-300 dark:border-neutral-800">
                                    <MapPin size={24} className="mb-2 opacity-50" />
                                    <p>No hay detalles de comision.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
    
    {showPrintModal && (
        <SolicitudPrintModal 
            isOpen={showPrintModal} 
            onClose={() => setShowPrintModal(false)} 
            solicitudId={sol.id} 
        />
    )}

    {showLiquidarModal && (
        <LiquidarCupones 
            isOpen={showLiquidarModal} 
            onClose={() => setShowLiquidarModal(false)}
            onSuccess={() => onRefresh()} 
            initialSolicitudId={sol.id}   
            mode={sol.solvente ? 'view' : 'create'} 
        />
    )}
    </>
  );
};