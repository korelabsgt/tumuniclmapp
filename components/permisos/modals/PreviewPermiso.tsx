"use client";

import React, { useRef, useState } from "react";
import { X, Download, Loader2 } from "lucide-react";
import { getRemuneradoBadgeClass, getRemuneradoEtiqueta } from "../categorias";
import { PermisoEmpleado } from "../types";
import PermisoTemplate from "../PermisoTemplate";
import { toPng } from "html-to-image";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";

interface Props {
  permiso: PermisoEmpleado | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PreviewPermiso({ permiso, isOpen, onClose }: Props) {
  const templateRef = useRef<HTMLDivElement>(null);
  const [descargando, setDescargando] = useState(false);

  if (!isOpen || !permiso) return null;

  const fechaInicio = parseISO(permiso.inicio);
  const fechaFin = parseISO(permiso.fin);
  const codigo = `${permiso.id.substring(0, 3)}-${permiso.id.substring(3, 6)}`.toUpperCase();

  const estadoColor =
    permiso.estado === "aprobado"
      ? "bg-emerald-600 text-white"
      : permiso.estado.includes("rechazado")
      ? "bg-red-600 text-white"
      : "bg-amber-500 text-white";

  const handleDescargar = async () => {
    if (!templateRef.current) return;
    setDescargando(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const dataUrl = await toPng(templateRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#ffffff",
      });
      const link = document.createElement("a");
      link.download = `Permiso_${permiso.usuario?.nombre?.replace(/\s+/g, "_") || "Solicitud"}_${format(fechaInicio, "dd-MM-yyyy")}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Imagen descargada");
    } catch (error) {
      console.error(error);
      toast.error("Error al descargar");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* PermisoTemplate oculto — solo para generar la imagen al descargar */}
      <div style={{ position: "absolute", left: "-9999px", top: 0, opacity: 0, pointerEvents: "none" }}>
        <PermisoTemplate ref={templateRef} permiso={permiso} />
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* ── HEADER: Logo + Título (igual que la imagen) ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-blue-600">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-muni.png"
              alt="Logo"
              className="h-12 object-contain"
              crossOrigin="anonymous"
            />
            <div>
              <p className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase leading-tight">
                Municipalidad de Concepción Las Minas
              </p>
              <p className="text-[9px] text-neutral-400">Chiquimula, Guatemala</p>
            </div>
          </div>
          <div className="flex items-center gap-3">

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-neutral-800 rounded-xl transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[65vh]">

          {/* Fila 1: Datos empleado + Tipo permiso */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">

              <p className="text-[10px] font-bold text-neutral-800 dark:text-neutral-100 uppercase leading-snug">
                {permiso.usuario?.nombre || "—"}
              </p>
              <p className="text-[9px] font-semibold text-blue-600 uppercase">
                {permiso.usuario?.puesto_nombre || "Sin puesto asignado"}
              </p>
              <p className="text-[9px] text-neutral-500 italic">
                {permiso.usuario?.oficina_nombre || "General"}
              </p>
            </div>
            <div className="flex flex-col justify-center items-center bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 px-2 py-2 text-center">
              <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-0.5">Justificación</label>
              <p className="text-[9px] font-black text-blue-800 dark:text-blue-200 capitalize leading-snug">
                {permiso.tipo.replace(/_/g, " ")}
              </p>
            </div>
          </div>

          {/* Fila 2: Fechas inicio / fin */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-100 dark:border-neutral-700">
            <div className="pl-3 border-l-4 border-emerald-500">
              <label className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1 block">
                Fecha de Inicio
              </label>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 capitalize">
                {format(fechaInicio, "eee dd/MMM/yy", { locale: es }).replace('.', '')}
              </p>
              <p className="text-xs text-neutral-500">
                {format(fechaInicio, "h:mm a", { locale: es })}
              </p>
            </div>
            <div className="pl-3 border-l-4 border-orange-500">
              <label className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mb-1 block">
                Fecha de Finalización
              </label>
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100 capitalize">
                {format(fechaFin, "eee dd/MMM/yy", { locale: es }).replace('.', '')}
              </p>
              <p className="text-xs text-neutral-500">
                {format(fechaFin, "h:mm a", { locale: es })}
              </p>
            </div>
            <div className="col-span-2 mt-1">
                <p className="text-[9px] text-neutral-500 font-medium italic">
                  Solicitado: {format(parseISO(permiso.created_at), "eee dd/MMM/yy, h:mm a", { locale: es }).replace('.', '')}
                </p>
            </div>
          </div>

          {/* Descripción */}
          {permiso.descripcion && (
            <div>
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mb-1 block text-center">
                Motivo de la Solicitud
              </label>
              <div className="px-3 py-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl text-neutral-600 dark:text-neutral-300 text-[9px] leading-relaxed text-center italic border border-neutral-100 dark:border-neutral-700">
                "{permiso.descripcion}"
              </div>
            </div>
          )}

          {/* Aprobadores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 px-3 py-2 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-100 dark:border-neutral-700">
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Aprobado Jefe</label>
              <p className="text-[10px] font-bold text-neutral-700 dark:text-neutral-200">
                {permiso.aprobado_jefe_nombre || "--"}
              </p>
              {permiso.aprobado_jefe_at ? (
                <p className="text-[9px] text-neutral-400 italic">
                  {format(parseISO(permiso.aprobado_jefe_at), "eee dd/MM/yy, h:mm a", { locale: es })}
                </p>
              ) : (
                <p className="text-[9px] text-neutral-400 italic">--</p>
              )}
            </div>
            <div className="flex flex-col gap-1 px-3 py-2 bg-slate-50 dark:bg-neutral-800/50 rounded-xl border border-slate-100 dark:border-neutral-700">
              <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">Aprobado RRHH</label>
              <p className="text-[10px] font-bold text-neutral-700 dark:text-neutral-200">
                {permiso.aprobado_rrhh_nombre || "--"}
              </p>
              {permiso.aprobado_rrhh_at ? (
                <p className="text-[9px] text-neutral-400 italic">
                  {format(parseISO(permiso.aprobado_rrhh_at), "eee dd/MM/yy, h:mm a", { locale: es })}
                </p>
              ) : (
                <p className="text-[9px] text-neutral-400 italic">--</p>
              )}
            </div>
          </div>

          {/* Footer doc: Estado + Código */}
          <div className="flex justify-between items-end border-t border-neutral-100 dark:border-neutral-800 pt-3">
            <div className="flex flex-col gap-2">

              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${estadoColor}`}>
                  {permiso.estado.replace(/_/g, " ")}
                </span>
                {permiso.remunerado !== null && (
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-wider border ${getRemuneradoBadgeClass(permiso.remunerado)}`}>
                    {getRemuneradoEtiqueta(permiso.remunerado)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-[9px] font-bold text-neutral-400 tracking-wider">CÓDIGO</p>
              <p className="text-[9px] font-mono font-black text-neutral-500 tracking-widest">{codigo}</p>
            </div>
          </div>
        </div>

        {/* ── CINTILLO DE COLORES (igual que la imagen) ── */}
        <div className="flex h-2 w-full">
          <div className="flex-1 bg-blue-900" />
          <div className="flex-1 bg-blue-600" />
          <div className="flex-1 bg-blue-400" />
          <div className="flex-1 bg-blue-200" />
        </div>

        {/* ── Botón descargar ── */}
        <div className="px-5 py-3 bg-white dark:bg-neutral-900 flex justify-end border-t border-gray-100 dark:border-neutral-800">
          <Button
            onClick={handleDescargar}
            disabled={descargando}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 px-5 rounded-xl font-bold text-sm shadow-sm"
          >
            {descargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Descargar
          </Button>
        </div>
      </div>
    </div>
  );
}
