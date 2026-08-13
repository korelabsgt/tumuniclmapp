"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type HoraPartes = {
  hora: string;
  minutos: string;
  segundos: string;
  periodo: string;
};

function capitalizar(texto: string) {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

function formatearFecha(ahora: Date) {
  const partes = new Intl.DateTimeFormat("es-GT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "2-digit",
    timeZone: "America/Guatemala",
  }).formatToParts(ahora);

  const diaSemana = capitalizar(
    partes.find((p) => p.type === "weekday")?.value.replace(".", "") ?? "",
  );
  const dia = partes.find((p) => p.type === "day")?.value ?? "";
  const mes = capitalizar(
    partes.find((p) => p.type === "month")?.value.replace(".", "") ?? "",
  );
  const anio = partes.find((p) => p.type === "year")?.value ?? "";

  return `${diaSemana}, ${dia}/${mes}/${anio}`;
}

function obtenerHoraPartes(ahora: Date): HoraPartes {
  const partes = new Intl.DateTimeFormat("es-GT", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "America/Guatemala",
  }).formatToParts(ahora);

  const hora = partes.find((p) => p.type === "hour")?.value ?? "";
  const minutos = partes.find((p) => p.type === "minute")?.value ?? "";
  const segundos = partes.find((p) => p.type === "second")?.value ?? "";
  const periodo = (partes.find((p) => p.type === "dayPeriod")?.value ?? "")
    .replace(/[.\s]/g, "")
    .toUpperCase();

  return { hora, minutos, segundos, periodo };
}

function HoraConParpadeo({
  partes,
  mostrarSegundos,
  className,
  onClick,
}: {
  partes: HoraPartes;
  mostrarSegundos: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-baseline tabular-nums cursor-pointer ${className ?? ""}`}
      aria-label={mostrarSegundos ? "Ocultar segundos" : "Mostrar segundos"}
    >
      <span>{partes.hora}</span>
      <span className="animate-colon-blink mx-px">:</span>
      <span>{partes.minutos}</span>
      <AnimatePresence initial={false}>
        {mostrarSegundos && (
          <motion.span
            key="segundos"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="inline-flex items-baseline whitespace-nowrap"
          >
            <span className="animate-colon-blink mx-px">:</span>
            <span>{partes.segundos}</span>
          </motion.span>
        )}
      </AnimatePresence>
      <span className="ml-1 tracking-tight">{partes.periodo}</span>
    </button>
  );
}

export default function FechaHoraActual() {
  const [fecha, setFecha] = useState("");
  const [horaPartes, setHoraPartes] = useState<HoraPartes | null>(null);
  const [mostrarSegundos, setMostrarSegundos] = useState(false);

  useEffect(() => {
    const actualizar = () => {
      const ahora = new Date();
      setFecha(formatearFecha(ahora));
      setHoraPartes(obtenerHoraPartes(ahora));
    };

    actualizar();
    const interval = setInterval(actualizar, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!horaPartes) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#0066cc]/20 bg-gradient-to-r from-[#0066cc]/[0.06] to-transparent px-2.5 py-0.5 text-sm shadow-sm dark:border-blue-400/25 dark:from-blue-400/10">
      <time dateTime={fecha} className="font-semibold text-foreground/80">
        {fecha}
      </time>
      <span
        className="h-3.5 w-px shrink-0 bg-[#0066cc]/30 dark:bg-blue-400/35"
        aria-hidden
      />
      <HoraConParpadeo
        partes={horaPartes}
        mostrarSegundos={mostrarSegundos}
        onClick={() => setMostrarSegundos((v) => !v)}
        className="font-semibold text-[#0066cc] dark:text-blue-400"
      />
    </div>
  );
}
