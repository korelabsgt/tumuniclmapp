"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getReportePorVehiculo } from "./lib/actions";
import type {
  ReporteVehiculos as ReporteVehiculosData,
  VehiculoReporte,
  EmpleadoVehiculo,
  ParamsReporteCombustible,
} from "./lib/actions";
import InformeBitacoraVehiculo from "./modals/InformeBitacoraVehiculo";
import SelectorPeriodoReporte, {
  BTN_TOOLBAR,
  paramsDesdeMeses,
  toMonthValue,
  etiquetaPeriodo,
} from "./SelectorPeriodoReporte";
import {
  guardarParamsReporte,
  leerParamsReporte,
  paramsReporteIguales,
} from "./lib/reportePeriodoStorage";
import {
  ArrowLeft,
  Car,
  Search,
  SearchX,
  ChevronsLeftRight,
  Fuel,
  ChevronRight,
  User,
  Printer,
} from "lucide-react";

// ─── Estilos reutilizados ───────────────────────────────────────────────────
const BORDE_TABLA = "border-slate-300 dark:border-neutral-500";
const FILA_TABLA = `border-b ${BORDE_TABLA}`;
const BTN_ICON =
  "flex items-center gap-1.5 px-3 py-2.5 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-all shadow-sm";

// Columnas de la sub-tabla de cupones (Nivel 3)
const GRID_CUPONES =
  "grid grid-cols-[2.5rem_4.5rem_4.5rem_1fr_5.5rem_5.5rem_5rem_5.5rem] items-stretch text-[11px]";
const CELDA_BASE = `px-2 py-2 border-r ${BORDE_TABLA} flex items-center`;

interface Props {
  initialData: ReporteVehiculosData;
  initialParams: ParamsReporteCombustible;
}

// ─── Colores por nivel ──────────────────────────────────────────────────────
const COLOR_VEHICULO = {
  badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  text: "text-blue-800 dark:text-blue-300",
  price: "text-blue-700 dark:text-blue-400",
  row: "bg-blue-50/50 dark:bg-blue-900/10",
  border: "border-b-2 border-blue-500",
};

const COLOR_EMPLEADO = {
  text: "text-yellow-800 dark:text-yellow-300",
  row: "bg-yellow-50/40 dark:bg-yellow-900/10",
  renglon: "text-yellow-600 dark:text-yellow-500",
};

const COLOR_CUPON = {
  header:
    "bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide font-bold",
  row: "bg-slate-50/70 dark:bg-slate-900/20 text-slate-600 dark:text-slate-300",
};

// ─── Sub-tabla de cupones ───────────────────────────────────────────────────
function TablaCupones({ cupones }: { cupones: EmpleadoVehiculo["cupones"] }) {
  return (
    <div className={`border-l-4 border-yellow-400 dark:border-yellow-600 ml-6`}>
      {/* Cabecera */}
      <div
        className={`${GRID_CUPONES} ${COLOR_CUPON.header} border-b ${BORDE_TABLA}`}
      >
        <div className={`${CELDA_BASE} justify-center`}>No.</div>
        <div className={`${CELDA_BASE} justify-center`}>No. Cupon</div>
        <div className={`${CELDA_BASE} justify-center`}>Valor Q.</div>
        <div className={`${CELDA_BASE}`}>Justificacion</div>
        <div className={`${CELDA_BASE} justify-center`}>Km Inicio</div>
        <div className={`${CELDA_BASE} justify-center`}>Km Final</div>
        <div className={`${CELDA_BASE} justify-center`}>Total Km</div>
        <div className={`${CELDA_BASE} justify-center`}>Fecha</div>
      </div>
      {/* Filas */}
      {cupones.map((c, idx) => (
        <div
          key={`${c.numeroCupon}-${idx}`}
          className={`${GRID_CUPONES} ${COLOR_CUPON.row} border-b ${BORDE_TABLA} hover:brightness-[0.98] dark:hover:brightness-110`}
        >
          <div
            className={`${CELDA_BASE} justify-center font-mono font-semibold`}
          >
            {idx + 1}
          </div>
          <div
            className={`${CELDA_BASE} justify-center font-mono font-bold text-blue-600 dark:text-blue-400`}
          >
            {c.numeroCupon}
          </div>
          <div
            className={`${CELDA_BASE} justify-center font-mono font-semibold text-violet-600 dark:text-violet-400`}
          >
            {c.valorQ > 0 ? `Q${c.valorQ.toLocaleString("es-GT")}` : "-"}
          </div>
          <div className={`${CELDA_BASE} text-xs leading-snug`}>
            {c.justificacion}
          </div>
          <div className={`${CELDA_BASE} justify-center font-mono`}>
            {c.kmInicial > 0 ? c.kmInicial.toLocaleString("es-GT") : "-"}
          </div>
          <div className={`${CELDA_BASE} justify-center font-mono`}>
            {c.kmFinal > 0 ? c.kmFinal.toLocaleString("es-GT") : "-"}
          </div>
          <div
            className={`${CELDA_BASE} justify-center font-mono font-bold text-emerald-700 dark:text-emerald-400`}
          >
            {c.totalKm > 0 ? c.totalKm.toLocaleString("es-GT") : "-"}
          </div>
          <div
            className={`${CELDA_BASE} justify-center text-slate-500 dark:text-slate-400`}
          >
            {c.fecha || "-"}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Fila de Empleado (Nivel 2) ─────────────────────────────────────────────
function FilaEmpleado({
  empleado,
  expandido,
  onToggle,
  onImprimir,
}: {
  empleado: EmpleadoVehiculo;
  expandido: boolean;
  onToggle: () => void;
  onImprimir: () => void;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer ${COLOR_EMPLEADO.row} border-b ${BORDE_TABLA} hover:brightness-[0.98] dark:hover:brightness-110`}
      >
        <User size={14} className={`shrink-0 ${COLOR_EMPLEADO.text}`} />

        <div className="flex items-baseline gap-2 flex-1 min-w-0">
          <span
            className={`font-bold underline decoration-2 underline-offset-[3px] decoration-current truncate ${COLOR_EMPLEADO.text}`}
          >
            {empleado.nombre}
          </span>
          {empleado.renglon && (
            <span
              className={`text-[11px] font-semibold shrink-0 ${COLOR_EMPLEADO.renglon}`}
            >
              Renglon {empleado.renglon}
            </span>
          )}
          {empleado.dependenciaNombre && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate hidden sm:inline">
              - {empleado.dependenciaNombre}
            </span>
          )}
        </div>

        <span className="shrink-0 text-[11px] font-semibold text-slate-400 dark:text-slate-500 mr-2">
          {empleado.cupones.length} cupon
          {empleado.cupones.length !== 1 ? "es" : ""}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onImprimir();
          }}
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
          title={`Imprimir bitacora de ${empleado.nombre}`}
        >
          <Printer size={15} />
        </button>

        <motion.span
          animate={{ rotate: expandido ? 90 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="inline-flex shrink-0"
        >
          <ChevronRight size={14} className={COLOR_EMPLEADO.text} />
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
        {expandido && (
          <motion.div
            key="cupones"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <TablaCupones cupones={empleado.cupones} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Fila de Vehiculo (Nivel 1) ──────────────────────────────────────────────
function FilaVehiculo({
  vehiculo,
  expandidos,
  onToggleVehiculo,
  onToggleEmpleado,
  onImprimir,
  onImprimirEmpleado,
}: {
  vehiculo: VehiculoReporte;
  expandidos: { vehiculo: boolean; empleados: Set<string> };
  onToggleVehiculo: () => void;
  onToggleEmpleado: (userId: string) => void;
  onImprimir: () => void;
  onImprimirEmpleado: (emp: EmpleadoVehiculo) => void;
}) {
  const totalCupones = vehiculo.empleados.reduce(
    (acc, e) => acc + e.cupones.length,
    0,
  );
  const esGasolina =
    vehiculo.tipoCombustible?.toLowerCase().includes("gasol") ?? false;

  return (
    <div className={`border-b ${BORDE_TABLA}`}>
      <div
        onClick={onToggleVehiculo}
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${COLOR_VEHICULO.row} hover:brightness-[0.98] dark:hover:brightness-110`}
      >
        <Car size={16} className={`shrink-0 ${COLOR_VEHICULO.text}`} />

        <div className="flex items-baseline gap-3 flex-1 min-w-0">
          <span
            className={`font-mono font-extrabold text-sm ${COLOR_VEHICULO.text}`}
          >
            {vehiculo.placa}
          </span>
          <span
            className={`text-sm font-semibold truncate ${COLOR_VEHICULO.text}`}
          >
            {vehiculo.modelo}
          </span>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md ${
            esGasolina
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
          }`}
        >
          <Fuel size={11} />
          {vehiculo.tipoCombustible}
        </span>

        <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
          {vehiculo.empleados.length} empleado
          {vehiculo.empleados.length !== 1 ? "s" : ""} &middot; {totalCupones}{" "}
          cupon{totalCupones !== 1 ? "es" : ""}
        </span>

        {/* Boton imprimir: detiene propagacion para no colapsar el acordeon */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onImprimir();
          }}
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors"
          title={`Imprimir bitacora de ${vehiculo.placa}`}
        >
          <Printer size={15} />
        </button>

        <motion.span
          animate={{ rotate: expandidos.vehiculo ? 90 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="inline-flex shrink-0"
        >
          <ChevronRight size={16} className={COLOR_VEHICULO.text} />
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
        {expandidos.vehiculo && (
          <motion.div
            key="empleados"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {vehiculo.empleados.map((emp) => (
              <FilaEmpleado
                key={emp.userId}
                empleado={emp}
                expandido={expandidos.empleados.has(emp.userId)}
                onToggle={() => onToggleEmpleado(emp.userId)}
                onImprimir={() => onImprimirEmpleado(emp)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-500 rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-300 dark:border-neutral-500 bg-slate-50/80 dark:bg-neutral-800/40">
        <div className="h-3 w-36 rounded bg-slate-200 dark:bg-neutral-700" />
        <div className="h-9 w-32 rounded-xl bg-slate-200 dark:bg-neutral-700" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className={`flex items-center gap-4 px-4 py-3.5 border-b ${BORDE_TABLA}`}
        >
          <div className="h-4 w-4 rounded bg-slate-200 dark:bg-neutral-700" />
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-neutral-700" />
          <div
            className="h-3 rounded bg-slate-200 dark:bg-neutral-700"
            style={{ width: `${30 + (i % 3) * 15}%` }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Componente Principal ───────────────────────────────────────────────────
export default function ReporteVehiculos({
  initialData,
  initialParams,
}: Props) {
  const mesInicial = initialParams.modoRango
    ? toMonthValue(initialParams.anioInicio, initialParams.mesInicio)
    : toMonthValue(initialParams.anio, initialParams.mes);
  const mesFinal = initialParams.modoRango
    ? toMonthValue(initialParams.anioFin, initialParams.mesFin)
    : toMonthValue(initialParams.anio, initialParams.mes);

  const [params, setParams] = useState<ParamsReporteCombustible>(initialParams);
  const [mesInicioValor, setMesInicioValor] = useState(mesInicial);
  const [mesFinValor, setMesFinValor] = useState(mesFinal);
  const [busqueda, setBusqueda] = useState("");
  const [expandidos, setExpandidos] = useState<
    Map<string, { vehiculo: boolean; empleados: Set<string> }>
  >(new Map());
  const [vehiculoParaImprimir, setVehiculoParaImprimir] =
    useState<VehiculoReporte | null>(null);

  const {
    data = initialData,
    isPending,
    isFetching,
  } = useQuery({
    queryKey: ["reporte-vehiculos", params],
    queryFn: () => getReportePorVehiculo(params),
    initialData: paramsReporteIguales(params, initialParams)
      ? initialData
      : undefined,
    staleTime: 5 * 60 * 1000,
  });

  const isLoadingData = isPending || isFetching;

  const sincronizarUiPeriodo = useCallback((p: ParamsReporteCombustible) => {
    if (!p.modoRango) {
      const v = toMonthValue(p.anio, p.mes);
      setMesInicioValor(v);
      setMesFinValor(v);
    } else {
      setMesInicioValor(toMonthValue(p.anioInicio, p.mesInicio));
      setMesFinValor(toMonthValue(p.anioFin, p.mesFin));
    }
  }, []);

  const cargar = useCallback(
    (nuevosParams?: ParamsReporteCombustible) => {
      const p = nuevosParams ?? paramsDesdeMeses(mesInicioValor, mesFinValor);
      setParams(p);
      guardarParamsReporte(p);
      setBusqueda("");
      setExpandidos(new Map());
    },
    [mesInicioValor, mesFinValor],
  );

  useEffect(() => {
    const guardado = leerParamsReporte();
    if (!guardado || paramsReporteIguales(guardado, initialParams)) return;
    sincronizarUiPeriodo(guardado);
    cargar(guardado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vehiculosFiltrados = useMemo(() => {
    if (!data?.vehiculos) return [];
    if (!busqueda.trim()) return data.vehiculos;
    const lower = busqueda.toLowerCase();
    return data.vehiculos.filter(
      (v) =>
        v.placa.toLowerCase().includes(lower) ||
        v.modelo.toLowerCase().includes(lower) ||
        v.empleados.some((e) => e.nombre.toLowerCase().includes(lower)),
    );
  }, [data, busqueda]);

  const toggleVehiculo = useCallback((placa: string) => {
    setExpandidos((prev) => {
      const next = new Map(prev);
      const entry = {
        ...(next.get(placa) ?? {
          vehiculo: false,
          empleados: new Set<string>(),
        }),
      };
      entry.vehiculo = !entry.vehiculo;
      if (!entry.vehiculo) entry.empleados = new Set();
      next.set(placa, entry);
      return next;
    });
  }, []);

  const toggleEmpleado = useCallback((placa: string, userId: string) => {
    setExpandidos((prev) => {
      const next = new Map(prev);
      const entry = {
        ...(next.get(placa) ?? {
          vehiculo: true,
          empleados: new Set<string>(),
        }),
      };
      const emps = new Set(entry.empleados);
      if (emps.has(userId)) {
        emps.delete(userId);
      } else {
        emps.add(userId);
      }
      entry.empleados = emps;
      next.set(placa, entry);
      return next;
    });
  }, []);

  const todoExpandido = useMemo(() => {
    if (vehiculosFiltrados.length === 0) return false;
    return vehiculosFiltrados.every((v) => {
      const e = expandidos.get(v.placa);
      return (
        e?.vehiculo && v.empleados.every((emp) => e.empleados.has(emp.userId))
      );
    });
  }, [vehiculosFiltrados, expandidos]);

  const toggleExpandirTodo = useCallback(() => {
    if (todoExpandido) {
      setExpandidos(new Map());
      return;
    }
    const next = new Map<
      string,
      { vehiculo: boolean; empleados: Set<string> }
    >();
    vehiculosFiltrados.forEach((v) => {
      next.set(v.placa, {
        vehiculo: true,
        empleados: new Set(v.empleados.map((e) => e.userId)),
      });
    });
    setExpandidos(next);
  }, [todoExpandido, vehiculosFiltrados]);

  const aplicarPeriodo = (ini: string, fin: string) => {
    setMesInicioValor(ini);
    setMesFinValor(fin);
    cargar(paramsDesdeMeses(ini, fin));
  };

  const hayDatos = vehiculosFiltrados.length > 0;

  return (
    <div className="space-y-4 md:space-y-6 w-full md:w-[91%] px-3 md:px-0 mx-auto animate-in fade-in duration-500 mt-2 md:mt-4 xl:mt-5 pb-20">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <Link
          href="/protected/combustible"
          className="mt-1 p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors print:hidden shrink-0"
          title="Volver"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight shrink-0">
              Reporte por Vehiculo
            </h1>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mt-1">
            Bitacora de control de combustible por vehiculo. Solo solicitudes
            liquidadas.
          </p>
        </div>
      </div>

      {/* Tabla */}
      <div className="relative">
        {isLoadingData ? (
          <Skeleton />
        ) : hayDatos ? (
          <div className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-500 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 px-4 py-3 border-b border-slate-300 dark:border-neutral-500 bg-slate-50/80 dark:bg-neutral-800/40">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide shrink-0">
                {vehiculosFiltrados.length} vehiculo
                {vehiculosFiltrados.length !== 1 ? "s" : ""} &mdash;{" "}
                {etiquetaPeriodo(params)}
              </p>

              <div className="print:hidden flex flex-col sm:flex-row items-stretch gap-2 w-full xl:w-auto xl:justify-end">
                <div className="relative flex-1 xl:w-72 group">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Buscar placa, modelo, empleado..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-700 dark:text-gray-200"
                  />
                </div>
                <div className="shrink-0">
                  <SelectorPeriodoReporte
                    inicio={mesInicioValor}
                    fin={mesFinValor}
                    onChange={aplicarPeriodo}
                  />
                </div>
                <button
                  onClick={toggleExpandirTodo}
                  className={`${BTN_ICON} px-2.5 shrink-0 justify-center`}
                  title={todoExpandido ? "Colapsar todo" : "Expandir todo"}
                >
                <motion.span
                  animate={{ rotate: todoExpandido ? 90 : 0 }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                  className="inline-flex"
                >
                  <ChevronsLeftRight
                    size={15}
                    className="text-slate-600 dark:text-slate-300"
                  />
                </motion.span>
              </button>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-300 dark:border-neutral-500 bg-slate-50 dark:bg-neutral-800/60 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <Car size={12} className="shrink-0" />
              <span>Vehiculo / Empleado / Cupones</span>
            </div>

            {vehiculosFiltrados.map((vehiculo) => {
              const entry = expandidos.get(vehiculo.placa) ?? {
                vehiculo: false,
                empleados: new Set<string>(),
              };
              return (
                <FilaVehiculo
                  key={vehiculo.placa}
                  vehiculo={vehiculo}
                  expandidos={entry}
                  onToggleVehiculo={() => toggleVehiculo(vehiculo.placa)}
                  onToggleEmpleado={(uid) =>
                    toggleEmpleado(vehiculo.placa, uid)
                  }
                  onImprimir={() => setVehiculoParaImprimir(vehiculo)}
                  onImprimirEmpleado={(emp) => setVehiculoParaImprimir({ ...vehiculo, empleados: [emp] })}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-50 dark:bg-neutral-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-neutral-800">
            <SearchX size={32} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-slate-900 dark:text-white font-bold">
              No hay registros liquidados
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              {busqueda.trim()
                ? "No hay vehiculos que coincidan con la busqueda."
                : `No se encontraron solicitudes liquidadas en ${etiquetaPeriodo(params)}.`}
            </p>
          </div>
        )}
      </div>

      <InformeBitacoraVehiculo
        isOpen={!!vehiculoParaImprimir}
        onClose={() => setVehiculoParaImprimir(null)}
        vehiculo={vehiculoParaImprimir}
      />
    </div>
  );
}
