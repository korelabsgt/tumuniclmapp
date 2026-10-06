"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";
import { PermisoEmpleado } from "../types";
import { gestionarPermiso, PerfilUsuario } from "../acciones";
import { toast } from "react-toastify";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  permiso: PermisoEmpleado | null;
  onSuccess: () => void;
  perfilUsuario: PerfilUsuario | null;
  tipoVista: string;
}

export default function GestionEstadoPermisoModal({
  isOpen,
  onClose,
  permiso,
  onSuccess,
  perfilUsuario,
  tipoVista,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [esRemunerado, setEsRemunerado] = useState(true);

  React.useEffect(() => {
    if (permiso) {
      setEsRemunerado(permiso.remunerado ?? true);
    }
  }, [permiso]);

  if (!isOpen || !permiso) return null;

  const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(
    perfilUsuario?.rol || ""
  );

  const esFaseJefe = permiso.estado === "pendiente";
  const esFaseRRHH = permiso.estado === "aprobado_jefe";

  const handleAccion = async (accion: "aprobar" | "rechazar") => {
    setLoading(true);
    try {
      await gestionarPermiso(permiso.id, accion, permiso.user_id);
      toast.success(
        `Solicitud ${accion === "aprobar" ? "aprobada" : "rechazada"} correctamente`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Error al procesar la solicitud");
    } finally {
      setLoading(false);
    }
  };

  const textoAprobar =
    tipoVista === "gestion_jefe" || esFaseJefe
      ? "Preaprobar como Jefe"
      : "Aprobar como RRHH";

  const codigoFormateado = `${permiso.id.substring(0, 3)}-${permiso.id.substring(3, 6)}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col border border-gray-200 dark:border-neutral-800 relative transition-all duration-300 w-full max-w-lg md:max-w-xl overflow-hidden">
        {/* Cabecera */}
        <div className="flex justify-between items-start px-3.5 sm:px-5 py-3.5 sm:py-4 border-b border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Gestionar Estado de Permiso
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-slate-300 text-[10px] sm:text-xs font-mono font-bold border border-slate-200 dark:border-neutral-700">
                CÓD: {codigoFormateado}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              {permiso.usuario?.nombre || "Empleado"}
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer shrink-0 -mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido / Botones de Estado estilo CambioEstadoModal */}
        <div className="p-3.5 sm:p-6 flex flex-col gap-4">
          <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white text-center">
            ¿Qué acción deseas realizar con esta solicitud?
          </h3>

          {/* Opción adicional para RRHH: Remunerado en la parte superior centrado sin fondo */}
          {esRRHH && (esFaseRRHH || tipoVista === "gestion_rrhh") && (
            <div className="flex items-center justify-center gap-2.5 mx-auto">
              <Switch
                id="modal-remunerado"
                checked={esRemunerado}
                onCheckedChange={setEsRemunerado}
                disabled={loading}
                className="data-[state=checked]:bg-emerald-600"
              />
              <label
                htmlFor="modal-remunerado"
                className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
              >
                Permiso Remunerado
              </label>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full mt-1">
            <button
              type="button"
              onClick={() => handleAccion("aprobar")}
              disabled={loading}
              className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-400 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-100 dark:bg-emerald-800/80 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                {loading ? (
                  <Loader2 className="w-6 h-6 text-emerald-600 dark:text-emerald-200 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-200" />
                )}
              </div>
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm sm:text-base text-center">
                {textoAprobar}
              </span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/70 text-center">
                Autorizar esta petición de permiso.
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleAccion("rechazar")}
              disabled={loading}
              className="flex flex-col items-center justify-center gap-2 p-4 sm:p-5 rounded-2xl border-2 border-red-200 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-400 transition-all group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-red-100 dark:bg-red-800/80 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                {loading ? (
                  <Loader2 className="w-6 h-6 text-red-600 dark:text-red-200 animate-spin" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-200" />
                )}
              </div>
              <span className="font-bold text-red-700 dark:text-red-300 text-sm sm:text-base text-center">
                Rechazar Permiso
              </span>
              <span className="text-[10px] text-red-600/80 dark:text-red-400/70 text-center">
                Denegar la petición del permiso.
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
