"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { useTheme } from "next-themes";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { BLOQUEOS_GLOBALES_KEY, useBloqueosGlobales } from "@/components/layout/bloqueos/hooks";
import { CONCEJO_ACTIVIDAD_MENSAJE_REFRESH } from "@/components/push/Listener";
import { confirmarMensajeActividadConcejo } from "./lib/notificaciones";
import type { MensajeActividadConcejo } from "./lib/notificaciones";

const formatearFechaHora = (fechaISO: string) => {
  const fecha = new Date(fechaISO);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const diaSemana = dias[fecha.getDay()];
  const day = String(fecha.getDate()).padStart(2, "0");
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const year = String(fecha.getFullYear()).slice(-2);
  let hora = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  const period = hora >= 12 ? "PM" : "AM";
  hora = hora % 12;
  hora = hora ? hora : 12;
  return `${diaSemana} ${day}/${month}/${year}, ${String(hora).padStart(2, "0")}:${minutos} ${period}`;
};

export default function BloqueoActividadConcejo() {
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const { data, isLoading, refetch } = useBloqueosGlobales();
  const mensaje = (data?.mensajeActividadConcejo as MensajeActividadConcejo | null) ?? null;
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    const alRecibir = () => {
      void refetch();
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") void refetch();
    };

    window.addEventListener(CONCEJO_ACTIVIDAD_MENSAJE_REFRESH, alRecibir);
    document.addEventListener("visibilitychange", alVolver);
    const intervalo = window.setInterval(alRecibir, 30000);
    return () => {
      window.removeEventListener(CONCEJO_ACTIVIDAD_MENSAJE_REFRESH, alRecibir);
      document.removeEventListener("visibilitychange", alVolver);
      window.clearInterval(intervalo);
    };
  }, [refetch]);

  if (isLoading || !mensaje) return null;

  const isDark = resolvedTheme === "dark";

  const handleConfirm = async () => {
    if (confirmando) return;
    setConfirmando(true);

    try {
      const result = await confirmarMensajeActividadConcejo(mensaje.id);
      if (!result.success) {
        await Swal.fire({
          title: "Error",
          text: result.error || "No se pudo confirmar la lectura.",
          icon: "error",
          background: isDark ? "#18181b" : "#f4f4f5",
          color: isDark ? "#f4f4f5" : "#18181b",
          confirmButtonColor: "#0066cc",
        });
        return;
      }

      const leidoAt = result.leido_at || new Date().toISOString();
      queryClient.setQueryData(
        BLOQUEOS_GLOBALES_KEY,
        (
          prev:
            | {
                citacion: unknown;
                actividad: unknown;
                mensajePermiso: unknown;
                solicitudJefe: unknown;
                mensajeActividadConcejo: unknown;
              }
            | undefined,
        ) => (prev ? { ...prev, mensajeActividadConcejo: null } : prev),
      );

      await Swal.fire({
        title: "Enterado registrado",
        html: `<p style="margin-bottom: 12px;">Su confirmación de lectura ha sido registrada.</p><p style="font-size: 0.875rem; font-weight: 600;">Lectura: ${formatearFechaHora(leidoAt)}</p>`,
        icon: "success",
        background: isDark ? "#18181b" : "#f4f4f5",
        color: isDark ? "#f4f4f5" : "#18181b",
        confirmButtonColor: "#0066cc",
      });

      await refetch();
    } finally {
      setConfirmando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9994] flex items-center justify-center bg-zinc-100/95 p-4 backdrop-blur-sm dark:bg-zinc-900/95">
      <div className="mx-auto w-full max-w-lg overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 shadow-xl dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-black/50">
        <div className="h-1.5 w-full bg-[#0066cc]" />
        <div className="flex flex-col items-center p-6 text-center sm:p-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-200 text-[#0066cc] dark:bg-zinc-700 dark:text-blue-400">
            <ClipboardList className="h-7 w-7" />
          </div>
          <h1 className="mb-2 text-xl font-bold tracking-tight text-[#0066cc] dark:text-blue-400">
            {mensaje.titulo}
          </h1>
          <p className="mb-5 text-sm text-muted-foreground">
            Tiene un aviso de una actividad del concejo. Debe leerlo y confirmar para continuar.
          </p>
          <div className="mb-6 w-full rounded-xl border border-zinc-200 bg-white p-4 text-left dark:border-zinc-700 dark:bg-zinc-900">
            <p className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-100">{mensaje.mensaje}</p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Recibido: {formatearFechaHora(mensaje.created_at)}
            </p>
          </div>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={confirmando}
            className="h-12 w-full cursor-pointer rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-900 hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
          >
            {confirmando ? (
              <span className="mx-auto block h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-800 dark:border-zinc-500 dark:border-t-white" />
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Marcar como leído
              </>
            )}
          </Button>
          <p className="mt-3 text-[10px] text-muted-foreground">
            Al confirmar se registra su lectura con fecha y hora.
          </p>
        </div>
      </div>
    </div>
  );
}
