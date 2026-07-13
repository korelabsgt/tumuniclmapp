"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  X,
  Loader2,
  Upload,
  Camera,
  Trash2,
  CalendarDays,
} from "lucide-react";
import ImageUploader, {
  ImageUploaderHandle,
} from "@/components/imgs/ImageUploader";
import { toast } from "react-toastify";
import { actualizarComprobantePermiso } from "@/components/permisos/acciones";
import { AcuerdoEmpleado } from "../types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatearDiasSemana } from "../utilidades";

interface Props {
  acuerdo: AcuerdoEmpleado | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  soloLectura?: boolean;
}

const BUCKET = "Permisos_empleados";

export default function JustificacionAcuerdo({
  acuerdo,
  isOpen,
  onClose,
  onSaved,
  soloLectura = false,
}: Props) {
  const uploaderRef = useRef<ImageUploaderHandle>(null);
  const [imgPath, setImgPath] = useState<string | null>(
    acuerdo?.comprobante_url ?? null,
  );
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    setImgPath(acuerdo?.comprobante_url ?? null);
  }, [acuerdo?.id, acuerdo?.comprobante_url]);

  if (!isOpen || !acuerdo) return null;

  const guardarPath = async (path: string | null) => {
    setGuardando(true);
    try {
      await actualizarComprobantePermiso(acuerdo.id, path);
      setImgPath(path);
      toast.success(
        path ? "Comprobante guardado correctamente." : "Comprobante eliminado.",
      );
      await onSaved?.();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar el comprobante.",
      );
      throw err;
    } finally {
      setGuardando(false);
    }
  };

  const codigo =
    `${acuerdo.id.substring(0, 3)}-${acuerdo.id.substring(3, 6)}`.toUpperCase();
  const procesando = guardando || subiendo || eliminando;
  const tieneImagen = !!imgPath;
  const fechaInicio = parseISO(acuerdo.inicio);
  const fechaFin = parseISO(acuerdo.fin);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[95vh]">
        <div className="px-5 py-3 border-b border-gray-200 dark:border-neutral-700 flex justify-between items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Acuerdo · Cód.{" "}
              <span className="text-blue-600 dark:text-blue-400">{codigo}</span>
            </p>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate mt-0.5">
              {acuerdo.usuario?.nombre || "Sin nombre"}
            </h2>
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 capitalize mt-1 truncate">
              {acuerdo.tipo}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 min-w-0 flex-wrap">
              <CalendarDays className="w-3 h-3 shrink-0 text-blue-500/70" />
              <span className="truncate capitalize">
                {format(fechaInicio, "d MMM yyyy", { locale: es })} —{" "}
                {format(fechaFin, "d MMM yyyy", { locale: es })}
              </span>
            </div>
            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
              Días: {formatearDiasSemana(acuerdo.dias)}
            </p>
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
