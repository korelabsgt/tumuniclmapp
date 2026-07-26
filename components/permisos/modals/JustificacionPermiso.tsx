"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Loader2,
  Upload,
  Camera,
  Trash2,
  CalendarDays,
  Clock,
} from "lucide-react";
import ImageUploader, {
  ImageUploaderHandle,
} from "@/components/imgs/ImageUploader";
import { toast } from "react-toastify";
import { actualizarComprobantePermiso } from "../acciones";
import { PermisoEmpleado } from "../types";
import { format, parseISO, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  permiso: PermisoEmpleado | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  soloLectura?: boolean;
}

const BUCKET = "Permisos_empleados";

export default function JustificacionPermiso({
  permiso,
  isOpen,
  onClose,
  onSaved,
  soloLectura = false,
}: Props) {
  const uploaderRef = useRef<ImageUploaderHandle>(null);
  const [imgPath, setImgPath] = useState<string | null>(
    permiso?.comprobante_url ?? null,
  );
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    setImgPath(permiso?.comprobante_url ?? null);
  }, [permiso?.id, permiso?.comprobante_url]);

  if (!isOpen || !permiso) return null;

  const guardarPath = async (path: string | null) => {
    setGuardando(true);
    try {
      await actualizarComprobantePermiso(permiso.id, path);
      setImgPath(path);
      toast.success(
        path ? "Comprobante guardado correctamente." : "Comprobante eliminado.",
      );
      await onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar el comprobante.");
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const codigo =
    `${permiso.id.substring(0, 3)}-${permiso.id.substring(3, 6)}`.toUpperCase();
  const procesando = guardando || subiendo || eliminando;
  const tieneImagen = !!imgPath;

  const fechaInicio = new Date(permiso.inicio.split("T")[0] + "T00:00:00");
  const fechaFin = new Date(permiso.fin.split("T")[0] + "T00:00:00");
  const fechaInicioConHora = parseISO(permiso.inicio);
  const fechaFinConHora = parseISO(permiso.fin);
  const esMismoDia = isSameDay(fechaInicio, fechaFin);

  const formatCustom = (date: Date) => {
    const str = format(date, "eee d MMM yyyy", { locale: es });
    return str
      .split(" ")
      .map((word) => {
        const cleaned = word.replace(".", "");
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      })
      .join(" ");
  };

  const textoFecha = esMismoDia
    ? formatCustom(fechaInicio)
    : `${formatCustom(fechaInicio)} — ${formatCustom(fechaFin)}`;
  const textoHora = `${format(fechaInicioConHora, "h:mm a", { locale: es })} - ${format(fechaFinConHora, "h:mm a", { locale: es })}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[95vh]">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-neutral-700 flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Permiso · Cód.{" "}
              <span className="text-blue-600 dark:text-blue-400">{codigo}</span>
            </p>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate mt-0.5">
              {permiso.usuario?.nombre || "Sin nombre"}
            </h2>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 capitalize mt-1 truncate">
              {permiso.tipo.replace(/_/g, " ")}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 min-w-0 flex-wrap">
              <CalendarDays className="w-3 h-3 shrink-0 text-blue-500/70" />
              <span className="truncate capitalize">{textoFecha}</span>
              <span className="text-gray-300 dark:text-neutral-600">·</span>
              <Clock className="w-3 h-3 shrink-0 text-orange-500/70" />
              <span className="shrink-0">{textoHora}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors shrink-0"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 relative min-h-0">
          {guardando && (
            <div className="absolute inset-0 z-10 bg-white/60 dark:bg-black/40 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
          )}

          <ImageUploader
            ref={uploaderRef}
            bucketName={BUCKET}
            currentImagePath={imgPath}
            onUploadSuccess={async (path) => {
              await guardarPath(path);
            }}
            onDeleteSuccess={async () => {
              await guardarPath(null);
            }}
            disabled={guardando || soloLectura}
            aspect={3 / 4}
            aspectLabel="Vertical 3:4"
            permitirTodos
            botonesExternos
            onEstadoChange={({ uploading, deleting }) => {
              setSubiendo(uploading);
              setEliminando(deleting);
            }}
          />
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-neutral-700 flex gap-2 justify-end flex-wrap">
          {!soloLectura && (
            <>
              {tieneImagen ? (
                <button
                  onClick={() => uploaderRef.current?.deleteImage()}
                  disabled={procesando}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {eliminando ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Eliminar
                </button>
              ) : (
                <>
                  <button
                    onClick={() => uploaderRef.current?.openGallery()}
                    disabled={procesando}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {subiendo ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Galería
                  </button>
                  <button
                    onClick={() => uploaderRef.current?.openCamera()}
                    disabled={procesando}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Camera size={14} />
                    Cámara
                  </button>
                </>
              )}
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-gray-200 dark:bg-neutral-700 hover:bg-gray-300 dark:hover:bg-neutral-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
