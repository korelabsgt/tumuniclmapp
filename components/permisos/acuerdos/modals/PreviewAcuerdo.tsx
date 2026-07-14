"use client";

import React from "react";
import { X, CalendarClock } from "lucide-react";
import { AcuerdoEmpleado } from "../types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { formatearDiasSemana } from "../utilidades";
import {
  parseDiasAcuerdo,
  getModalidadAcuerdo,
  normalizarSemanaRegistro,
} from "../dias-acuerdo";
import { getCategoriaAcuerdo, getCategoriaAcuerdoBadgeClass } from "../categorias";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type PerfilUsuario } from "@/components/permisos/acciones";
import { TipoVistaAcuerdos } from "../hooks";

interface Props {
  acuerdo: AcuerdoEmpleado | null;
  isOpen: boolean;
  onClose: () => void;
  tipoVista?: TipoVistaAcuerdos;
  perfilUsuario?: PerfilUsuario | null;
  onElegirDias?: (acuerdo: AcuerdoEmpleado) => void;
}

export default function PreviewAcuerdo({
  acuerdo,
  isOpen,
  onClose,
  tipoVista,
  perfilUsuario,
  onElegirDias,
}: Props) {
  if (!isOpen || !acuerdo) return null;

  const fechaInicio = parseISO(acuerdo.inicio);
  const fechaFin = parseISO(acuerdo.fin);
  const codigo = `${acuerdo.id.substring(0, 3)}-${acuerdo.id.substring(3, 6)}`.toUpperCase();
  const cat = getCategoriaAcuerdo(acuerdo);
  const diasParsed = parseDiasAcuerdo(acuerdo.dias);
  const esSemanalFlexible = getModalidadAcuerdo(diasParsed) === "semanal";
  const ultimoAsignador =
    diasParsed &&
    !Array.isArray(diasParsed) &&
    diasParsed.modo === "semanal"
      ? [...Object.values(diasParsed.semanas)]
          .map((s) => normalizarSemanaRegistro(s)?.asignadoPor)
          .filter((n): n is string => !!n && n !== "—")
          .at(-1) ?? null
      : null;
  const puedeAsignarDias =
    esSemanalFlexible &&
    acuerdo.estado === "aprobado" &&
    tipoVista === "gestion_rrhh";

  const estadoLabel =
    acuerdo.estado === "aprobado"
      ? "Aprobado RRHH"
      : acuerdo.estado.includes("rechazado")
        ? "Rechazado"
        : "Pendiente RRHH";

  const estadoColor =
    acuerdo.estado === "aprobado"
      ? "bg-emerald-600 text-white"
      : acuerdo.estado.includes("rechazado")
        ? "bg-red-600 text-white"
        : "bg-amber-500 text-white";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-blue-600">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-muni.png"
              alt="Logo"
              className="h-12 object-contain"
            />
            <div>
              <p className="text-[10px] font-bold text-neutral-500 tracking-wider uppercase leading-tight">
                Municipalidad de Concepción Las Minas
              </p>
              <h2 className="text-base font-black text-blue-700 dark:text-blue-400">
                Acuerdo Municipal
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded font-mono tracking-wider",
                getCategoriaAcuerdoBadgeClass(cat),
              )}
            >
              Cód: {codigo}
            </span>
            <span
              className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded",
                estadoColor,
              )}
            >
              {estadoLabel}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                Empleado
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {acuerdo.usuario?.nombre || "—"}
              </p>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                Tipo
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                {acuerdo.tipo}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  Vigencia desde
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {format(fechaInicio, "d MMM yyyy, h:mm a", { locale: es })}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  Vigencia hasta
                </p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {format(fechaFin, "d MMM yyyy, h:mm a", { locale: es })}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                Días de la semana
              </p>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {formatearDiasSemana(acuerdo.dias)}
              </p>
              {ultimoAsignador && (
                <p className="text-xs text-muted-foreground mt-1">
                  Última asignación por:{" "}
                  <span className="font-semibold text-foreground">
                    {ultimoAsignador}
                  </span>
                </p>
              )}
            </div>

            {acuerdo.descripcion && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  Descripción
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {acuerdo.descripcion}
                </p>
              </div>
            )}

            {acuerdo.estado === "aprobado" && acuerdo.remunerado !== null && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  Remuneración
                </p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {acuerdo.remunerado ? "Remunerado" : "No remunerado"}
                </p>
              </div>
            )}

            {acuerdo.aprobado_rrhh_nombre && (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">
                  Aprobado por RRHH
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {acuerdo.aprobado_rrhh_nombre}
                  {acuerdo.aprobado_rrhh_at &&
                    ` — ${format(parseISO(acuerdo.aprobado_rrhh_at), "d MMM yyyy", { locale: es })}`}
                </p>
              </div>
            )}

            {puedeAsignarDias && onElegirDias && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onElegirDias(acuerdo);
                }}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
              >
                <CalendarClock className="w-4 h-4" />
                Asignar días de la semana
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
