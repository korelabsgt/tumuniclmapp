'use client';

import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Loader2, X, FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import * as htmlToImage from 'html-to-image';
import Swal from 'sweetalert2';
import type { VehiculoReporte } from '../lib/actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehiculo: VehiculoReporte | null;
}

const fmtKm = (n: number) => (n > 0 ? n.toLocaleString('es-GT') : '-');
const fmtQ  = (n: number) =>
  n > 0
    ? new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(n)
    : '-';

export default function InformeBitacoraVehiculo({ isOpen, onClose, vehiculo }: Props) {
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleAction = async (action: 'download' | 'print') => {
    if (!printRef.current || !vehiculo) return;
    setIsPrinting(true);
    try {
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'in', format: [13, 8.5] });
      const pages = Array.from(printRef.current.querySelectorAll('.pdf-page-container'));

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const dataUrl = await htmlToImage.toJpeg(pageEl, {
          quality: 1.0,
          backgroundColor: '#ffffff',
          pixelRatio: 2.5,
        });

        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      if (action === 'print') {
        pdf.autoPrint();
        const blob = pdf.output('bloburl');
        window.open(blob, '_blank');
      } else {
        pdf.save(`Bitacora_${vehiculo.placa}.pdf`);
      }
    } catch (err) {
      console.error('Error generando documento', err);
      Swal.fire('Error', 'No se pudo generar el documento.', 'error');
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen || !vehiculo) return null;

  const esD = vehiculo.tipoCombustible?.toLowerCase().includes('diesel');

  // Aplanar los items (empleados y cupones) para poder paginarlos
  type TableItem = 
    | { type: 'employee'; emp: any }
    | { type: 'cupon'; cupon: any; globalIndex: number };

  const allItems: TableItem[] = [];
  let globalCuponIndex = 0;
  vehiculo.empleados.forEach((emp) => {
    allItems.push({ type: 'employee', emp });
    emp.cupones.forEach((cupon) => {
      globalCuponIndex++;
      allItems.push({ type: 'cupon', cupon, globalIndex: globalCuponIndex });
    });
  });

  // Dividir en páginas (aprox 17 unidades por página para que quepa bien en Oficio horizontal)
  const MAX_UNITS_PER_PAGE = 17;
  const pages: TableItem[][] = [];
  let currentPage: TableItem[] = [];
  let currentUnits = 0;

  allItems.forEach((item) => {
    const cost = item.type === 'employee' ? 1.5 : 1;
    if (currentUnits + cost > MAX_UNITS_PER_PAGE && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
      currentUnits = 0;
    }
    currentPage.push(item);
    currentUnits += cost;
  });
  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  // Contador global de filas para el No.
  let rowCounter = 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0 bg-gray-100 dark:bg-neutral-900 text-black border-none overflow-hidden [&>button]:hidden">

        {/* ── Barra superior ───────────────────────────────────────────── */}
        <DialogHeader className="p-4 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
              <FileText size={20} />
            </div>
            <div className="flex flex-col text-left">
              <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Bitácora de Control de Combustible
              </DialogTitle>
              <DialogDescription className="text-xs text-gray-500 dark:text-gray-400">
                {vehiculo.placa} — {vehiculo.modelo} — Vista previa
              </DialogDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAction('print')}
              disabled={isPrinting}
              className="flex items-center gap-2 px-4 py-2 border border-purple-500 text-purple-400 bg-transparent rounded-lg hover:bg-purple-500/10 font-medium transition-colors shadow-sm disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{isPrinting ? 'Generando...' : 'Imprimir Directo'}</span>
            </button>
            <button
              onClick={() => handleAction('download')}
              disabled={isPrinting}
              className="flex items-center gap-2 px-4 py-2 bg-[#12192b] text-white rounded-lg hover:bg-[#1a233a] font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar PDF</span>
            </button>
            <button
              onClick={onClose}
              disabled={isPrinting}
              className="p-2 border border-neutral-700 text-neutral-400 rounded-lg hover:bg-neutral-800 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-4 md:p-8 flex items-start justify-center bg-gray-200/50 dark:bg-black/20">
          <div className="transform scale-[0.42] sm:scale-75 md:scale-[0.85] origin-top h-fit mb-[-60%] sm:mb-[-20%] md:mb-0 transition-transform duration-200 shadow-2xl bg-transparent">
            
            <div ref={printRef} className="flex flex-col gap-8">
              
              {pages.map((pageItems, pageIndex) => (
                <div key={pageIndex} className="pdf-page-container w-[1248px] h-[816px] bg-white text-black flex flex-col px-10 pt-4 pb-10 box-border shrink-0 overflow-hidden">
                  
                  <div className="h-28 w-full shrink-0"></div>

                  <table className="w-full text-[10px] border-collapse border border-black mb-4 shrink-0">
                    <tbody>
                      <tr>
                        <td colSpan={4} className="bg-[#8faadc] text-center font-bold text-[12px] py-1.5 border-b border-black">
                          BITÁCORA DE REGISTRO DE CONTROL DE COMBUSTIBLE MUNICIPAL
                        </td>
                      </tr>
                      <tr className="bg-[#d9e1f2]">
                        <td className="border-r border-black p-1.5 w-[20%] align-top font-bold text-center">
                          CLASIFICACIÓN:
                          <div className="text-blue-800 text-sm mt-2 underline decoration-black underline-offset-4 uppercase">
                            {vehiculo.tipo}
                          </div>
                        </td>
                        
                        <td className="border-r border-black p-1.5 w-[25%] align-top font-bold text-center">
                          MATRÍCULA DE<br />VEHÍCULO:
                          <div className="text-blue-800 font-mono text-base mt-2 underline decoration-black underline-offset-4">{vehiculo.placa}</div>
                        </td>
                        
                        <td className="border-r border-black p-1.5 w-[35%] align-top font-bold text-center">
                          TIPO DEL VEHÍCULO:
                          <div className="text-blue-800 text-sm mt-2 underline decoration-black underline-offset-4">{vehiculo.modelo}</div>
                        </td>
                        
                        <td className="p-1.5 w-[20%] align-middle font-bold text-center">
                          TIPO DE COMBUSTIBLE
                          <div className="flex justify-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5">
                              D <span className="border border-black w-3.5 h-3.5 bg-white flex items-center justify-center text-xs">{esD ? '✓' : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              G <span className="border border-black w-3.5 h-3.5 bg-white flex items-center justify-center text-xs">{!esD ? '✓' : ''}</span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <table className="w-full text-[9px] border-collapse border border-black bg-white mb-auto">
                    <thead className="bg-blue-100/50 font-bold uppercase border-b border-black h-8">
                      <tr>
                        <th className="border-r border-black p-1.5 w-8 text-center">No.</th>
                        <th className="border-r border-black p-1.5 w-14 text-center">No. Cupón</th>
                        <th className="border-r border-black p-1.5 w-14 text-center">Valor Q.</th>
                        <th className="border-r border-black p-1.5 text-left">Justificación / Comisión</th>
                        <th className="border-r border-black p-1.5 w-16 text-center">Km Inicio</th>
                        <th className="border-r border-black p-1.5 w-16 text-center">Km Final</th>
                        <th className="border-r border-black p-1.5 w-14 text-center">Total Km</th>
                        <th className="border-r border-black p-1.5 w-14 text-center">Fecha</th>
                        <th className="p-1.5 w-24 text-center">Firma</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item, idx) => {
                        if (item.type === 'employee') {
                          const emp = item.emp;
                          return (
                            <tr key={`emp-${emp.userId}-${idx}`}>
                              <td colSpan={9} className="border-b border-black p-0">
                                <div className="flex items-baseline gap-3 bg-yellow-50 px-3 py-2 border-y border-yellow-300">
                                  <span className="text-[10px] font-bold uppercase text-gray-600 whitespace-nowrap">Empleado:</span>
                                  <span className="text-[11px] font-extrabold text-gray-900">{emp.nombre}</span>
                                  {emp.renglon && (
                                    <span className="text-[10px] font-semibold text-yellow-700 whitespace-nowrap">
                                      · Renglón {emp.renglon}
                                    </span>
                                  )}
                                  {emp.dependenciaNombre && (
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                      — {emp.dependenciaNombre}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        } else {
                          const c = item.cupon;
                          return (
                            <tr key={`cupon-${c.numeroCupon}-${idx}`} className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                              <td className="border-r border-b border-black p-1.5 text-center font-semibold">{item.globalIndex}</td>
                              <td className="border-r border-b border-black p-1.5 text-center font-mono font-bold text-blue-700">{c.numeroCupon}</td>
                              <td className="border-r border-b border-black p-1.5 text-center font-mono">{fmtQ(c.valorQ)}</td>
                              <td className="border-r border-b border-black p-1.5 text-left leading-snug">{c.justificacion}</td>
                              <td className="border-r border-b border-black p-1.5 text-center font-mono">{fmtKm(c.kmInicial)}</td>
                              <td className="border-r border-b border-black p-1.5 text-center font-mono">{fmtKm(c.kmFinal)}</td>
                              <td className="border-r border-b border-black p-1.5 text-center font-mono font-bold text-green-700">{fmtKm(c.totalKm)}</td>
                              <td className="border-r border-b border-black p-1.5 text-center text-[9px]">{c.fecha || '-'}</td>
                              <td className="border-b border-black p-1.5 text-center"></td>
                            </tr>
                          );
                        }
                      })}
                    </tbody>
                  </table>

                  <div className="w-full flex mt-4 text-[9px] text-gray-400 shrink-0">
                    <span>Página {pageIndex + 1} de {pages.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
