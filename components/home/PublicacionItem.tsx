'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { FileText, ChevronLeft, ChevronRight, ZoomIn, X, Loader2 } from 'lucide-react';
import type { Publicacion } from '@/components/home/lib/actions';
import dynamic from 'next/dynamic';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;
const PdfFlipbookViewer = dynamic(() => import('./PdfFlipbookViewer'), { ssr: false });

interface Props {
  publicacion: Publicacion;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const BUCKET = 'home_imagenes';

function resolverUrl(path: string): string {
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
      onClick={() => { if (!isDragging) onClose(); }}
      onWheel={(e) => {
        setScale(s => Math.min(Math.max(0.5, s - e.deltaY * 0.005), 5));
      }}
    >
      <button className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors" onClick={onClose}>
        <X className="w-5 h-5" />
      </button>
      <motion.img
        drag
        dragConstraints={scale > 1 ? { top: -1500, left: -1500, right: 1500, bottom: 1500 } : { top: 0, left: 0, right: 0, bottom: 0 }}
        dragElastic={scale > 1 ? 0.8 : 0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={() => setTimeout(() => setIsDragging(false), 150)}
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain drop-shadow-2xl cursor-grab active:cursor-grabbing"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

// ─── Sub-componente: Carrusel de Imágenes ─────────────────────────────────────
function CarruselImagenes({ imagenes }: { imagenes: string[] }) {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState(0);
  const [visorSrc, setVisorSrc] = useState<string | null>(null);
  const [isManual, setIsManual] = useState(false);

  const next = React.useCallback((manual = false) => {
    setIsManual(manual);
    setDirection(1);
    setIdx(i => (i + 1) % imagenes.length);
  }, [imagenes.length]);

  const prev = React.useCallback((manual = false) => {
    setIsManual(manual);
    setDirection(-1);
    setIdx(i => (i - 1 + imagenes.length) % imagenes.length);
  }, [imagenes.length]);

  // Autoplay
  useEffect(() => {
    // No hacer auto-avance si solo hay una imagen o si el visor está abierto
    if (imagenes.length <= 1 || visorSrc !== null) return;
    const interval = setInterval(() => next(false), 5000);
    return () => clearInterval(interval);
  }, [imagenes.length, next, visorSrc, idx]);

  const url = resolverUrl(imagenes[idx]);

  const variants = {
    enter: {
      opacity: 0,
    },
    center: {
      zIndex: 1,
      opacity: 1,
    },
    exit: {
      zIndex: 0,
      opacity: 0,
    },
  };

  return (
    <>
      <div className="w-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl overflow-hidden shadow-sm">
        {/* Título (como en Card de Antd) */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-700 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
          Desliza para ver más o toca la imagen para ampliar 🤳
        </div>

        {/* Contenedor de la imagen */}
        <div className="relative w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-transparent overflow-hidden p-2 sm:p-4 md:p-6">
          <div 
            className="relative w-full h-[50vh] min-h-[380px] md:h-[75vh] md:min-h-[550px] md:max-h-[900px] overflow-hidden bg-transparent flex items-center justify-center"
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.img
                key={idx}
                src={url}
                alt={`Imagen ${idx + 1}`}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  opacity: { duration: isManual ? 0.5 : 1.5, ease: "easeInOut" },
                }}
                onClick={() => setVisorSrc(url)}
                title="Toca para ampliar"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.01]"
                loading="lazy"
              />
            </AnimatePresence>
          </div>
          
          {/* Dots / Puntos indicadores (sin barra de desplazamiento) */}
          {imagenes.length > 1 && (
            <div className="absolute bottom-2.5 md:bottom-3.5 flex items-center justify-center gap-1.5 z-10 pointer-events-auto max-w-[85%] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
              {imagenes.map((_, i) => (
                <button 
                  key={i} 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsManual(true); setIdx(i); }} 
                  aria-label={`Ir a imagen ${i + 1}`}
                  className={`w-3.5 sm:w-4 h-1 shrink-0 rounded-full transition-colors duration-200 ${i === idx ? 'bg-[#0066cc] dark:bg-blue-400' : 'bg-gray-300/80 dark:bg-neutral-600/80 hover:bg-gray-400 dark:hover:bg-neutral-500'}`} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Controles (solo si hay más de 1 imagen) */}
        {imagenes.length > 1 && (
          <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-100 dark:border-neutral-700 bg-white dark:bg-neutral-800">
            <button 
              onClick={() => prev(true)} 
              className="px-4 py-1.5 bg-[#1677ff] hover:bg-[#0066cc] text-white rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              Anterior
            </button>
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 select-none">
              {idx + 1} / {imagenes.length}
            </span>
            <button 
              onClick={() => next(true)} 
              className="px-4 py-1.5 bg-[#1677ff] hover:bg-[#0066cc] text-white rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Visor en pantalla completa */}
      {visorSrc && (
        <Lightbox
          src={visorSrc}
          alt="Vista ampliada"
          onClose={() => setVisorSrc(null)}
        />
      )}
    </>
  );
}

// ─── Sub-componente: Gráfica de Barras ───────────────────────────────────────
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const concepto = payload[0].payload.concepto;
    return (
      <div className="bg-[#222222] text-white p-3 rounded-lg shadow-xl border border-gray-700 text-[13px] min-w-[200px]">
        <p className="font-bold mb-3 pb-2 border-b border-gray-600 text-sm leading-tight text-white">{concepto}</p>
        <div className="flex flex-col gap-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }}></div>
              <span className="text-gray-100 flex-1">
                {entry.name}: 
              </span>
              <span className="font-semibold text-white whitespace-nowrap">
                Q {Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function GraficaBarras({ datos }: { datos: { concepto: string; presupuestado: number; ejecutado: number }[] }) {
  const [tipoGrafica, setTipoGrafica] = useState<'vertical' | 'horizontal'>('vertical');

  const formatQ = (v: number) =>
    v >= 1_000_000
      ? `${(v / 1_000_000).toFixed(1)}M`
      : v >= 1_000
      ? `${(v / 1_000).toFixed(0)}K`
      : `${v}`;

  const formatCurrency = (v: number) => 
    v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalPresupuestado = datos.reduce((acc, d) => acc + d.presupuestado, 0);
  const totalEjecutado = datos.reduce((acc, d) => acc + d.ejecutado, 0);

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Contenedor Principal de Gráfica con Switch */}
      <div className="w-full rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-4 shadow-sm">
        
        {/* Cabecera con Switch */}
        <div className="flex justify-center items-center mb-6">
          <div className="flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg">
            <button 
              onClick={() => setTipoGrafica('vertical')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${tipoGrafica === 'vertical' ? 'bg-white dark:bg-neutral-700 text-[#0066cc] dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              Vertical
            </button>
            <button 
              onClick={() => setTipoGrafica('horizontal')}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${tipoGrafica === 'horizontal' ? 'bg-white dark:bg-neutral-700 text-[#0066cc] dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
            >
              Horizontal
            </button>
          </div>
        </div>

        {tipoGrafica === 'vertical' ? (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={datos} margin={{ top: 30, right: 10, left: -20, bottom: 35 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="concepto"
                interval={0}
                tick={({ x, y, payload }) => {
                  const label = payload.value;
                  const words = label.split(' ');
                  let line1 = label;
                  let line2 = '';
                  
                  if (label.length > 15 && words.length > 1) {
                    const half = Math.ceil(words.length / 2);
                    line1 = words.slice(0, half).join(' ');
                    line2 = words.slice(half).join(' ');
                    
                    if (line1.length > 18) line1 = line1.substring(0, 16) + '...';
                    if (line2.length > 18) line2 = line2.substring(0, 16) + '...';
                  } else if (label.length > 15) {
                    line1 = label.substring(0, 15) + '...';
                  }

                  return (
                    <g transform={`translate(${x},${y})`}>
                      <title>{label}</title>
                      <text x={0} y={10} dy={0} textAnchor="middle" fill="#9ca3af" fontSize={10} fontWeight={600}>
                        <tspan x="0" dy="0">{line1}</tspan>
                        {line2 && <tspan x="0" dy="14">{line2}</tspan>}
                      </text>
                    </g>
                  );
                }}
                axisLine={false}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis 
                tickFormatter={formatQ} 
                tick={{ fontSize: 11, fill: '#9ca3af' }} 
                axisLine={false} 
                tickLine={false} 
                width={60} 
              />
              <Tooltip content={<CustomTooltip />} cursor={false} shared={false} />
              <Legend 
                verticalAlign="top" 
                iconType="circle" 
                wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingBottom: '20px', color: '#4b5563' }} 
              />
              <Bar dataKey="presupuestado" name="Presupuestado" fill="#0066cc" radius={[6, 6, 0, 0]} barSize={40}>
                <LabelList dataKey="presupuestado" position="top" formatter={formatQ} className="fill-gray-700 dark:fill-gray-300" style={{ fontSize: 11, fontWeight: 'bold' }} />
              </Bar>
              <Bar dataKey="ejecutado" name="Ejecutado" fill="#33ccff" radius={[6, 6, 0, 0]} barSize={40}>
                <LabelList dataKey="ejecutado" position="top" formatter={formatQ} className="fill-gray-700 dark:fill-gray-300" style={{ fontSize: 11, fontWeight: 'bold' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full flex flex-col gap-4 mt-2 px-2 md:px-4">
            {datos.map((d, i) => {
              const maxVal = Math.max(...datos.flatMap(x => [x.presupuestado, x.ejecutado]));
              const pctPresupuesto = maxVal > 0 ? (d.presupuestado / maxVal) * 100 : 0;
              const pctEjecutado = maxVal > 0 ? (d.ejecutado / maxVal) * 100 : 0;

              return (
                <div key={i} className="flex flex-col gap-3 border-b border-gray-100 dark:border-neutral-800 pb-4 last:border-0 last:pb-0">
                  <h4 className="font-bold text-gray-700 dark:text-gray-200 text-[13px] uppercase tracking-wide">{d.concepto}</h4>
                  
                  <div className="flex flex-col gap-2.5">
                    {/* Barra Presupuesto */}
                    <div className="flex flex-col gap-1.5">
                       <div className="flex justify-between items-center text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#0066cc]" />
                            <span className="text-gray-500 font-bold uppercase tracking-wider">Presupuestado</span>
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">Q {formatCurrency(d.presupuestado)}</span>
                       </div>
                       <div className="w-full h-2 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0066cc] rounded-full transition-all duration-1000" style={{ width: `${pctPresupuesto}%` }} />
                       </div>
                    </div>

                    {/* Barra Ejecutado */}
                    <div className="flex flex-col gap-1.5">
                       <div className="flex justify-between items-center text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#33ccff]" />
                            <span className="text-gray-500 font-bold uppercase tracking-wider">Ejecutado</span>
                          </div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">Q {formatCurrency(d.ejecutado)}</span>
                       </div>
                       <div className="w-full h-2 bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-[#33ccff] rounded-full transition-all duration-1000" style={{ width: `${pctEjecutado}%` }} />
                       </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de Barras de Progreso (Permanente debajo de la gráfica) */}
      <div className="w-full rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 p-6 shadow-sm">
        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-wider uppercase mb-6 px-2">
          <span className="text-[#0066cc] w-1/3 text-left">Presupuestado</span>
          <span className="w-1/3 text-center">Concepto</span>
          <span className="text-[#33ccff] w-1/3 text-right">Ejecutado</span>
        </div>
        
        <div className="flex flex-col gap-6">
          {datos.map((d, i) => {
            const totalRow = d.presupuestado + d.ejecutado;
            const pctPresupuesto = totalRow > 0 ? (d.presupuestado / totalRow) * 100 : 50;
            const pctEjecutado = totalRow > 0 ? (d.ejecutado / totalRow) * 100 : 50;
            
            return (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between items-center px-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] md:text-[13px] w-1/3 text-left">Q {formatCurrency(d.presupuestado)}</span>
                  <span className="font-bold text-gray-700 dark:text-gray-200 text-[10px] md:text-xs uppercase tracking-wide w-1/3 text-center break-words">{d.concepto}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] md:text-[13px] w-1/3 text-right">Q {formatCurrency(d.ejecutado)}</span>
                </div>
                <div className="flex h-2.5 w-full rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden gap-1">
                  <div className="h-full bg-[#0066cc]" style={{ width: `${pctPresupuesto}%` }}></div>
                  <div className="h-full bg-[#33ccff]" style={{ width: `${pctEjecutado}%` }}></div>
                </div>
              </div>
            );
          })}

          <div className="pt-6 mt-2 border-t border-gray-100 dark:border-neutral-800 flex flex-col gap-2">
             <div className="flex justify-between items-center px-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs md:text-sm w-1/3 text-left">Q {formatCurrency(totalPresupuestado)}</span>
                <span className="font-bold text-gray-800 dark:text-white text-[11px] md:text-xs uppercase tracking-wide w-1/3 text-center">Total</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs md:text-sm w-1/3 text-right">Q {formatCurrency(totalEjecutado)}</span>
              </div>
              <div className="flex h-3.5 w-full rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden gap-1">
                <div className="h-full bg-[#0066cc]" style={{ width: `${(totalPresupuestado / (totalPresupuestado + totalEjecutado || 1)) * 100}%` }}></div>
                <div className="h-full bg-[#33ccff]" style={{ width: `${(totalEjecutado / (totalPresupuestado + totalEjecutado || 1)) * 100}%` }}></div>
              </div>
          </div>
        </div>
      </div>

      {/* Tabla Adicional (Estilo Horizontal Minimalista) */}
      <div className="w-full overflow-x-auto rounded-2xl bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 shadow-sm mt-6 p-2 md:p-4">
        <table className="w-full text-sm text-center whitespace-nowrap min-w-max border-collapse">
          <thead>
            <tr className="border-b border-gray-100 dark:border-neutral-800">
              <th className="px-4 py-3 font-bold text-gray-400 dark:text-gray-500 text-xs tracking-wider uppercase text-left">
                Concepto
              </th>
              {datos.map((d, i) => (
                <th key={i} className="px-4 py-3 font-bold text-gray-500 dark:text-gray-400 text-xs tracking-wider uppercase">
                  {d.concepto}
                </th>
              ))}
              <th className="px-4 py-3 font-bold text-gray-500 dark:text-gray-400 text-xs tracking-wider uppercase">
                Total General
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Presupuesto */}
            <tr className="border-b border-gray-50 dark:border-neutral-800/50">
              <td className="px-4 py-4 text-gray-700 dark:text-gray-300 font-bold text-[11px] tracking-wider uppercase text-left">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0066cc]"></span>
                  Presupuesto (Q)
                </div>
              </td>
              {datos.map((d, i) => (
                <td key={i} className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200 text-[15px]">
                  {formatCurrency(d.presupuestado)}
                </td>
              ))}
              <td className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200 text-[15px] bg-gray-50/50 dark:bg-neutral-800/20">
                {formatCurrency(totalPresupuestado)}
              </td>
            </tr>
            
            {/* Ejecutado */}
            <tr className="border-b border-gray-50 dark:border-neutral-800/50">
              <td className="px-4 py-4 text-gray-700 dark:text-gray-300 font-bold text-[11px] tracking-wider uppercase text-left">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#33ccff]"></span>
                  Ejecutado (Q)
                </div>
              </td>
              {datos.map((d, i) => (
                <td key={i} className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200 text-[15px]">
                  {formatCurrency(d.ejecutado)}
                </td>
              ))}
              <td className="px-4 py-4 font-bold text-slate-800 dark:text-slate-200 text-[15px] bg-gray-50/50 dark:bg-neutral-800/20">
                {formatCurrency(totalEjecutado)}
              </td>
            </tr>

            {/* Porcentaje */}
            <tr>
              <td className="px-4 py-4 text-gray-500 dark:text-gray-400 font-bold text-[11px] tracking-wider uppercase text-left">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                  Porcentaje (%)
                </div>
              </td>
              {datos.map((d, i) => {
                const pct = d.presupuestado > 0 ? (d.ejecutado / d.presupuestado) * 100 : 0;
                return (
                  <td key={i} className="px-4 py-4 text-gray-500 dark:text-gray-400 text-sm font-medium">
                    {pct.toFixed(2)}%
                  </td>
                );
              })}
              <td className="px-4 py-4 text-gray-500 dark:text-gray-400 text-sm font-medium bg-gray-50/50 dark:bg-neutral-800/20">
                {totalPresupuestado > 0 ? ((totalEjecutado / totalPresupuestado) * 100).toFixed(2) : '0.00'}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Componente Principal: PublicacionItem ────────────────────────────────────
export function PublicacionItem({ publicacion }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visorPdfSrc, setVisorPdfSrc] = useState<string | null>(null);

  // Función para resaltar hashtags
  const renderDescripcion = (texto: string) => {
    if (!texto) return null;
    return texto.split(/(#\S+)/g).map((part, i) => {
      if (part.startsWith('#')) {
        return <span key={i} className="font-bold">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <article
      ref={ref}
      className="w-full py-10 border-b border-gray-100 dark:border-neutral-700 last:border-none animate-in fade-in slide-in-from-bottom-4 duration-500"
    >
      {/* Badge de Política */}
      {publicacion.politicas?.nombre && (
        <p className="text-sm font-semibold uppercase tracking-widest text-[#5f656f] dark:text-gray-400 mb-2">
          {publicacion.politicas.nombre}
        </p>
      )}

      {/* Título principal — estilo referencia: azul marino oscuro, muy grande */}
      <h2 className="text-3xl md:text-[2.5rem] font-bold text-[#02245b] dark:text-blue-400 leading-tight mb-10">
        {publicacion.nombre}
      </h2>

      {/* Año — estilo referencia: centrado, bold, grande */}
      <p className="text-2xl md:text-[1.75rem] font-bold text-gray-800 dark:text-gray-200 text-center mb-8">
        Año {publicacion.año}
      </p>

      {/* Descripción — estilo referencia: texto grande, gris oscuro, centrado, con soporte para hashtags */}
      {publicacion.descripcion && publicacion.descripcion.trim() && (
        <p className="text-[1.1rem] md:text-[1.25rem] text-[#555] dark:text-gray-300 leading-[1.8] text-center whitespace-pre-wrap mb-10 max-w-5xl mx-auto">
          {renderDescripcion(publicacion.descripcion)}
        </p>
      )}

      {/* ── Galería de Imágenes ── */}
      {publicacion.imagenes && publicacion.imagenes.length > 0 && !publicacion.imagenes.includes('__HIDDEN__') && (
        <div className="w-full mb-6">
          <CarruselImagenes imagenes={publicacion.imagenes} />
        </div>
      )}

      {/* ── Gráfica ── */}
      {publicacion.grafica_data && publicacion.grafica_data.length > 0 && !publicacion.grafica_data.some(d => d.concepto === '__HIDDEN__') && (
        <div className="mb-6">
          <GraficaBarras datos={publicacion.grafica_data.filter(d => d.concepto !== '__HIDDEN__')} />
        </div>
      )}

      {/* ── Documentos PDF ── */}
      {publicacion.documentos && publicacion.documentos.length > 0 && !publicacion.documentos.some(d => d.nombre === '__HIDDEN__') && (
        <div className="flex flex-wrap justify-center gap-4 mt-6">
          {publicacion.documentos.map((doc, i) => (
            <div 
              key={i}
              onClick={() => setVisorPdfSrc(doc.url)}
              className={`relative group cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-neutral-700 shadow-sm hover:shadow-lg transition-all transform hover:-translate-y-1 bg-white dark:bg-neutral-800 ${
                publicacion.documentos!.length === 1 
                  ? 'w-[200px]' 
                  : 'w-[calc(50%-0.5rem)] sm:w-[180px] md:w-[200px]'
              }`}
            >
              <div className="flex items-center justify-center min-h-[160px] md:min-h-[180px] bg-gray-50 dark:bg-neutral-900/50">
                <Document 
                  file={doc.url} 
                  loading={<Loader2 className="w-6 h-6 animate-spin text-blue-500" />}
                >
                  <Page 
                    pageNumber={1} 
                    renderTextLayer={false} 
                    renderAnnotationLayer={false}
                    className="opacity-90 group-hover:opacity-100 transition-opacity [&>canvas]:!w-full [&>canvas]:!h-auto"
                  />
                </Document>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-black/70 p-2 backdrop-blur-md">
                <p className="text-[11px] text-white truncate text-center font-medium flex items-center justify-center gap-1">
                  <FileText className="w-3 h-3" />
                  {doc.nombre}
                </p>
              </div>
            </div>
          ))}
          <PdfFlipbookViewer 
            isOpen={visorPdfSrc !== null}
            pdfUrl={visorPdfSrc || ''}
            onClose={() => setVisorPdfSrc(null)}
          />
        </div>
      )}
    </article>
  );
}
