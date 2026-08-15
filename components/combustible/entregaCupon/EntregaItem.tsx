import React from 'react';
import { SolicitudEntrega } from './lib/schemas';
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  XCircle,
  Printer,
  Calendar,
  Layers,
} from 'lucide-react';
import { EntregaResumenBody } from './EntregaResumen';

interface Props {
  sol: SolicitudEntrega;
  isOpen: boolean;
  onToggle: () => void;
  onClick?: (sol: SolicitudEntrega) => void;
  onPrint?: (sol: SolicitudEntrega) => void;
  onPrintMasivo?: (sol: SolicitudEntrega) => void;
  onValidar?: (sol: SolicitudEntrega) => void;
}

const getStatusColor = (status: string) => {
  if (status.includes('aprobado') || status.includes('aprobada')) return 'emerald';
  if (status.includes('rechazado') || status.includes('rechazada')) return 'red';
  return 'amber';
};

export const EntregaItem: React.FC<Props> = ({
  sol,
  isOpen,
  onToggle,
  onClick,
  onPrint,
  onPrintMasivo,
  onValidar,
}) => {
  const color = getStatusColor(sol.estado);
  const isApproved = color === 'emerald';

  return (
    <div
      className={`
        group w-full bg-white dark:bg-neutral-900 rounded-2xl border transition-all duration-300 overflow-hidden
        ${
          color === 'emerald' ? 'border-emerald-500/80 dark:border-emerald-400/80' :
          color === 'amber' ? 'border-amber-500/80 dark:border-amber-400/80' :
          'border-red-500/80 dark:border-red-400/80'
        }
        ${isOpen ? 'bg-slate-50/50 dark:bg-neutral-800/50' : 'hover:bg-slate-50/50 dark:hover:bg-neutral-800/50'}
      `}
    >
      <div onClick={onToggle} className="p-5 cursor-pointer select-none relative z-10">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <div className="flex items-start gap-4 overflow-hidden">

            <div className="flex flex-col min-w-0 gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={`
                    text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border
                    ${
                      sol.correlativo
                        ? 'text-white bg-blue-600 border-blue-600 shadow-sm shadow-blue-500/50'
                        : 'text-slate-400 dark:text-neutral-500 bg-slate-50 dark:bg-neutral-800 border-slate-100 dark:border-neutral-700'
                    }
                  `}
                >
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
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {sol.usuario?.nombre}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
            {isApproved && onPrint && (
              <div className="flex items-center gap-1">
                {sol.liquidacion?.lote_masivo_id && onPrintMasivo && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrintMasivo(sol);
                    }}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-full transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                    title="Parte del Reporte Masivo. Clic para reimprimir reporte."
                  >
                    <Layers size={20} />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrint(sol);
                  }}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                  title="Imprimir Vale de Entrega"
                >
                  <Printer size={20} />
                </button>
              </div>
            )}

            <ChevronDown
              size={20}
              className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
            />
          </div>
        </div>
      </div>

      <div
        className={`
          overflow-hidden transition-all duration-500 ease-in-out border-t border-dashed border-slate-200 dark:border-neutral-800
          ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0 border-none'}
        `}
      >
        <EntregaResumenBody
          sol={sol}
          showActionButton
          onValidar={onValidar}
          onClick={onClick}
        />
      </div>
    </div>
  );
};
