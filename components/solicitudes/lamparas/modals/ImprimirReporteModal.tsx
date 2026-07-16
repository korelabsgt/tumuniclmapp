'use client';

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, X, FileText, Download, Loader2 } from 'lucide-react';
import { SolicitudLampara } from '../lib/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import Swal from 'sweetalert2';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  solicitudes: SolicitudLampara[];
  prioridadUid?: string | null;
}

const GT_OFFSET_MS = -6 * 60 * 60 * 1000;
const getGTDate = (dateString: string) => {
  const utc = new Date(dateString);
  return new Date(utc.getTime() + GT_OFFSET_MS);
};

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const formatTinyDate = (date: Date) => {
  let dayName = date.toLocaleDateString('es-GT', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
  dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return { dayName, dateStr: `${day}/${month}` };
};

const ReportPage = ({ solicitudes, nombreElectricista, numPag, totalPag }: { solicitudes: SolicitudLampara[], nombreElectricista: string, numPag: number, totalPag: number }) => {
  return (
    <div className="report-page-container w-[816px] min-h-[1248px] bg-white text-black p-10 flex flex-col print:p-8 print:break-after-page mb-12 last:mb-0 shadow-2xl print:shadow-none relative overflow-hidden">

      {/* Encabezado Institucional */}
      <div className="flex justify-between items-center mb-2 pb-2">
        <div className="w-[20%] flex justify-start">
          <img src="/images/logo-muni.png" alt="Logo" className="h-[90px] object-contain" />
        </div>

        <div className="flex-1 flex flex-col items-center text-center px-2">
          <div className="w-fit flex flex-col items-center">
            <h2 className="text-lg font-black text-[#204184] tracking-tighter leading-tight whitespace-nowrap">
              Municipalidad de Concepción Las Minas
            </h2>
            <p className="text-[10px] font-bold text-blue-600 tracking-wider mt-1 whitespace-nowrap">
              Departamento de Chiquimula, Guatemala C.A.
            </p>
            <div className="w-full h-[3px] flex rounded-full overflow-hidden mt-1.5">
              <div className="w-1/4 h-full bg-[#204184]"></div>
              <div className="w-1/4 h-full bg-[#366ac9]"></div>
              <div className="w-1/4 h-full bg-[#68a6f2]"></div>
              <div className="w-1/4 h-full bg-[#c2dafb]"></div>
            </div>
          </div>
        </div>

        <div className="w-[5%] flex flex-col items-end text-right">
          {totalPag > 1 && (
            <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 whitespace-nowrap -translate-x-12">
              PÁG. {numPag} / {totalPag}
            </span>
          )}
        </div>
      </div>

      <div className="text-center mb-2">
        <h1 className="text-sm font-black tracking-[0.2em] text-gray-800">
          Reporte de Lámparas Dañadas
        </h1>
        <div className="flex justify-between items-center mt-1 px-2 text-[11px] font-bold text-gray-600 py-2">
          <span>Responsable: <span className="text-black">{nombreElectricista}</span></span>
          <span>Fecha de Impresión: <span className="text-black">{format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}</span></span>
        </div>
      </div>

      {/* Tabla Principal */}
      <table className="w-full border-collapse border border-black text-[12px] table-fixed">
        <thead>
          <tr className="bg-blue-100/50 font-bold text-center border-b border-black">
            <th className="border border-black px-0.25 py-0.25 w-[6.5%] text-[10px]">CÓD</th>
            <th className="border border-black px-0.25 py-0.25 w-[6%] text-[10px]">FECHA</th>
            <th className="border border-black px-0.25 py-0.25 w-[4.5%] text-[10px]">CANT</th>
            <th className="border border-black px-2 py-0.25 w-[28%] text-center">LUGAR DEL REPORTE</th>
            <th className="border border-black px-2 py-0.25 w-[12%]">REPORTA</th>
            <th className="border border-black px-1 py-0.25 w-[9%] text-[11px]">TELÉFONO</th>
            <th className="border border-black px-1 py-0.25 w-[14%] text-[10px]">Acción Requerida</th>
            <th className="border border-black px-2 py-0.25 w-[20%] text-center">Comentario</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map((sol) => {
            const toTitleCase = (str: string) => {
              return str.trim().split(/\s+/).map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ');
            };

            const locParts = [];
            if (sol.aldea) locParts.push(toTitleCase(sol.aldea));
            if (sol.caserio) locParts.push(toTitleCase(sol.caserio));
            if (sol.ubicacion) {
              const u = sol.ubicacion.trim();
              locParts.push(u.charAt(0).toUpperCase() + u.slice(1).toLowerCase());
            }

            const lugar = locParts.length > 0 ? locParts.join(', ') : 'Sin ubicación';

            const actions = [];
            if (sol.checklists?.cambio_bombilla) actions.push('Cambio de Bombilla');
            if (sol.checklists?.revision_lampara) actions.push('Revisión de Lámpara');
            if (sol.checklists?.cambio_lampara) actions.push('Cambio de Lámpara');
            if (sol.checklists?.lampara_nueva) actions.push('Lámpara Nueva');

            const { dayName, dateStr } = formatTinyDate(getGTDate(sol.created_at));
            const cod = sol.id.slice(0, 3).toUpperCase() + '-' + sol.id.slice(3, 6).toUpperCase();

            return (
              <tr key={sol.id} className="border-b border-black">
                <td className="border border-black px-1 py-0.25 font-bold text-center text-[8px] break-all">{cod}</td>
                <td className="border border-black px-1 py-0.25 text-center text-[10px] leading-tight">
                  <div className="font-bold">{dayName}</div>
                  <div>{dateStr}</div>
                </td>
                <td className="border border-black px-1 py-0.25 text-center font-bold">{sol.cantidad_elementos || 1}</td>
                <td className="border border-black px-1 py-0.25 text-justify leading-tight overflow-hidden text-[11px]">{lugar}</td>
                <td className="border border-black px-0.5 py-0.25 text-center overflow-hidden leading-tight">{sol.nombre_responsable || '--'}</td>
                <td className="border border-black px-0.5 py-0.25 text-center">{sol.telefono_contacto || '--'}</td>
                <td className="border border-black px-0.5 py-0.25 text-center italic text-[10px] leading-tight">
                  {actions.map((act, i) => (
                    <div key={i} className="whitespace-nowrap overflow-hidden">{act}</div>
                  ))}
                  {actions.length === 0 && 'No especificada'}
                </td>
                <td className="border border-black px-2 py-2 h-12"></td>
              </tr>
            );
          })}
          {/* Sin filas vacías */}
        </tbody>
      </table>

      {/* Pie de página (Espacio para balance) */}
      <div className="mt-auto py-4 text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest">
        Municipalidad de Concepción Las Minas - {new Date().getFullYear()}
      </div>

    </div>
  );
};

export default function ImprimirReporteModal({ isOpen, onClose, solicitudes, prioridadUid }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Agrupación y Paginación por electricista
  const paginasARenderizar = React.useMemo(() => {
    let pendientes = solicitudes.filter(s => s.estado === 'pendiente');

    if (prioridadUid) {
      pendientes = pendientes.filter(s => (s.asignado_a_uid || 'sin_asignar') === prioridadUid);
    }

    const itemsPorPagina = 11;
    const paginas: { id: string, nombre: string, items: SolicitudLampara[], numPag: number, totalPag: number }[] = [];

    const grupos: Record<string, { id: string, nombre: string, items: SolicitudLampara[] }> = {};
    pendientes.forEach(s => {
      const id = s.asignado_a_uid || 'sin_asignar';
      if (!grupos[id]) {
        grupos[id] = { id, nombre: s.asignado?.nombre || 'Sin asignar', items: [] };
      }
      grupos[id].items.push(s);
    });

    Object.values(grupos).forEach(grupo => {
      const totalPaginas = Math.ceil(grupo.items.length / itemsPorPagina) || 1;
      for (let i = 0; i < totalPaginas; i++) {
        paginas.push({
          id: `${grupo.id}-p${i}`,
          nombre: grupo.nombre,
          items: grupo.items.slice(i * itemsPorPagina, (i + 1) * itemsPorPagina),
          numPag: i + 1,
          totalPag: totalPaginas
        });
      }
    });

    return paginas;
  }, [solicitudes, prioridadUid]);

  const handleAction = async (action: 'download' | 'print') => {
    if (!containerRef.current || paginasARenderizar.length === 0) return;

    setIsProcessing(true);
    try {
      const pages = containerRef.current.querySelectorAll('.report-page-container');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [8.5, 13] });

      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage([8.5, 13], 'portrait');

        const dataUrl = await htmlToImage.toJpeg(pages[i] as HTMLElement, {
          quality: 1.0,
          backgroundColor: '#ffffff',
          pixelRatio: 2.5
        });

        pdf.addImage(dataUrl, 'JPEG', 0, 0, 8.5, 13);
      }

      if (action === 'print') {
        pdf.autoPrint();
        const blob = pdf.output('bloburl');
        window.open(blob, '_blank');
      } else {
        pdf.save('Reporte_General_Lamparas_Pendientes.pdf');
      }
    } catch (error) {
      console.error('Error generando documento', error);
      Swal.fire('Error', 'No se pudo generar el documento', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0 bg-slate-100 dark:bg-neutral-900 border-none overflow-hidden [&>button]:hidden">

        {/* Header de Control (No se imprime) */}
        <DialogHeader className="p-3 sm:p-4 bg-white dark:bg-neutral-800 border-b flex flex-row items-center justify-between shrink-0 print:hidden gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400 shrink-0">
              <FileText size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="flex flex-col text-left min-w-0">
              <DialogTitle className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight truncate">Reporte Lámparas</DialogTitle>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium italic truncate">
                {paginasARenderizar.length} electricista(s) con pendientes
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 sm:gap-2 items-center shrink-0">
            <Button
              variant="outline"
              onClick={() => handleAction('print')}
              disabled={isProcessing}
              className="hidden sm:flex gap-1.5 sm:gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/30 font-bold uppercase text-[10px] sm:text-xs tracking-tighter h-8 sm:h-9 px-2 sm:px-4"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Printer size={14} className="sm:w-[18px] sm:h-[18px]" />}
              <span className="hidden sm:inline">Imprimir Directo</span>
              <span className="sm:hidden">Imprimir</span>
            </Button>

            <Button
              onClick={() => handleAction('download')}
              disabled={isProcessing}
              className="bg-slate-900 text-white hover:bg-slate-800 gap-1.5 sm:gap-2 font-bold uppercase text-[10px] sm:text-xs tracking-tighter h-8 sm:h-9 px-2 sm:px-4"
            >
              {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} className="sm:w-[18px] sm:h-[18px]" />}
              <span className="hidden sm:inline">Descargar PDF</span>
              <span className="sm:hidden">PDF</span>
            </Button>

            <Button variant="outline" onClick={onClose} disabled={isProcessing} className="h-8 sm:h-9 px-2 dark:text-white dark:border-neutral-600 dark:hover:bg-neutral-700">
              <X size={16} />
            </Button>
          </div>
        </DialogHeader>

        {/* Área de Previsualización */}
        <div className="flex-1 overflow-auto p-4 md:p-8 flex items-start justify-center bg-gray-200/50 dark:bg-black/20 print:p-0 print:bg-white">

          <div ref={containerRef} className="w-fit mx-auto transform scale-[0.4] sm:scale-[0.45] md:scale-100 origin-top transition-transform duration-200 shadow-none print:scale-100 print:m-0 flex flex-col gap-12">

            {paginasARenderizar.map((pagina) => (
              <ReportPage
                key={pagina.id}
                solicitudes={pagina.items}
                nombreElectricista={pagina.nombre}
                numPag={pagina.numPag}
                totalPag={pagina.totalPag}
              />
            ))}

            {paginasARenderizar.length === 0 && (
              <div className="w-[816px] min-h-[400px] bg-white text-gray-400 flex items-center justify-center font-bold italic">
                No hay solicitudes pendientes para mostrar.
              </div>
            )}

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
