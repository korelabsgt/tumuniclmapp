"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText } from "lucide-react";
import { useTheme } from "next-themes";
import Swal from "sweetalert2";
import { PERMISO_MENSAJE_REFRESH } from "@/components/push/Listener";
import { confirmarMensajePermiso } from "./lib/mensajes";
import {
  useMensajePendientePermiso,
  MENSAJE_PERMISO_PENDIENTE_KEY,
} from "./lib/hooks-queries";
import { useQueryClient } from "@tanstack/react-query";

interface MensajePendiente {
  id: string;
  permiso_id: string;
  evento: string;
  titulo: string;
  mensaje: string;
  created_at: string;
  empleado_nombre?: string | null;
  permiso_tipo?: string | null;
}

const formatearFechaHora = (fechaISO: string) => {
  const d = new Date(fechaISO);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const diaSemana = dias[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  let hora = d.getHours();
  const minutos = String(d.getMinutes()).padStart(2, "0");
  const period = hora >= 12 ? "PM" : "AM";
  hora = hora % 12;
  hora = hora ? hora : 12;
  return `${diaSemana} ${day}/${month}/${year}, ${hora}:${minutos} ${period}`;
};

export default function BloqueoPermisoMensaje() {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const { data, isLoading: loading, refetch } = useMensajePendientePermiso();
  const mensaje = (data as MensajePendiente | null) ?? null;
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const onRefresh = () => {
      void refetch();
    };

    window.addEventListener(PERMISO_MENSAJE_REFRESH, onRefresh);
    return () => {
      window.removeEventListener(PERMISO_MENSAJE_REFRESH, onRefresh);
    };
  }, [refetch]);

  if (loading || !mensaje) return null;

  const isDark = resolvedTheme === "dark";
  const swalTheme = {
    background: isDark ? "#18181b" : "#ffffff",
    color: isDark ? "#f4f4f5" : "#1e293b",
    confirmButtonColor: "#059669",
  };

  const handleConfirm = async () => {
    if (confirming || !mensaje) return;

    setConfirming(true);

    try {
      const result = await confirmarMensajePermiso(mensaje.id);

      if (!result.success) {
        await Swal.fire({
          title: "Error",
          text:
            result.error ||
            "Ocurrió un error al confirmar. Por favor intente nuevamente.",
          icon: "error",
          ...swalTheme,
        });
        return;
      }

      const leidoAt = result.leido_at || new Date().toISOString();
      queryClient.setQueryData(MENSAJE_PERMISO_PENDIENTE_KEY, null);

      await Swal.fire({
        title: "Enterado registrado",
        html: `
          <p style="margin-bottom: 12px;">Su confirmación de lectura ha sido registrada en el sistema.</p>
          <p style="font-size: 0.875rem; font-weight: 600; color: ${isDark ? "#4ade80" : "#16a34a"};">
            Lectura: ${formatearFechaHora(leidoAt)}
          </p>
        `,
        icon: "success",
        ...swalTheme,
      });

      await refetch();
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9996] flex items-center justify-center p-4 bg-zinc-100/95 dark:bg-zinc-900/95 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-auto bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="w-full h-6 bg-gradient-to-r from-[#1a95d3] to-[#5ec8f0]" />

        <div className="p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#1a95d3] dark:text-[#5ec8f0]" />
          </div>

          <h1 className="mb-2 text-2xl font-black tracking-tight text-[#1a95d3] dark:text-[#5ec8f0] uppercase">
            {mensaje.titulo}
          </h1>

          <p className="mb-6 text-sm font-medium text-muted-foreground">
            Tiene un aviso pendiente sobre permisos o acuerdos municipales. Debe
            leerlo y confirmar para continuar.
          </p>

          <div className="w-full bg-zinc-50 dark:bg-zinc-900 rounded-xl border-2 border-[#1a95d3]/30 p-5 mb-8 text-left">
            {(mensaje.empleado_nombre || mensaje.permiso_tipo) && (
              <div className="mb-4 rounded-lg border border-[#1a95d3]/20 bg-sky-50/60 dark:bg-sky-950/30 px-3 py-2">
                {mensaje.empleado_nombre && (
                  <p className="text-sm font-bold text-foreground">
                    {mensaje.empleado_nombre}
                  </p>
                )}
                {mensaje.permiso_tipo && (
                  <p className="text-xs font-semibold text-[#1a95d3] dark:text-[#5ec8f0] mt-0.5">
                    {mensaje.permiso_tipo}
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap mb-4">
              {mensaje.mensaje}
            </p>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Recibido: {formatearFechaHora(mensaje.created_at)}
            </p>
          </div>

          <div className="flex flex-col w-full gap-3">
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="w-full h-12 text-sm font-bold border-2 border-emerald-600 dark:border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl cursor-pointer disabled:cursor-not-allowed"
            >
              {confirming ? (
                <div className="w-5 h-5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  MARCAR COMO LEÍDO
                </>
              )}
            </Button>
            <p className="text-[10px] text-muted-foreground">
              Al hacer clic, se registrará digitalmente su lectura con fecha y
              hora.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
