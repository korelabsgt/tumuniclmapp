'use client';

import React, { useState, useTransition, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import DetalleSolicitudModal from './modals/DetalleSolicitudModal';
import ExportarReportePdfModal from './modals/ExportarReportePdfModal';
import EstadisticasReporteModal from './modals/EstadisticasReporteModal';
import { FiltroConSugerencias } from './FiltroBusquedaReporte';
import { crearUrlPdfReporteDepartamento } from './lib/ReporteDepartamentoPdf';
import {
  debeSubrayarTotalReporte,
  datosSolicitudReporte,
  clasesColorDatoVehiculo,
  clasesColorCombustible,
  clasesColorFechaSolicitud,
  TipoFilaReporte,
} from './lib/formatoSolicitudReporte';
import {
  guardarParamsReporte,
  leerParamsReporte,
  paramsReporteIguales,
} from './lib/reportePeriodoStorage';
import {
  getReporteJerarquicoCombustible,
  ReporteJerarquicoCombustible,
  FilaReporteDependencia,
  ParamsReporteCombustible,
} from './lib/actions';
import SelectorPeriodoReporte, {
  BTN_TOOLBAR,
  paramsDesdeMeses,
  toMonthValue,
  etiquetaPeriodo,
} from './SelectorPeriodoReporte';
import {
  ArrowLeft,
  ExternalLink,
  SearchX,
  BarChart3,
  ChevronsLeftRight,
} from 'lucide-react';

const formatearQ = (monto: number) =>
  new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ' }).format(monto);

const GRID_TABLA = 'grid grid-cols-[5rem_1fr_8.5rem] items-stretch';
const BORDE_TABLA = 'border-slate-300 dark:border-neutral-500';
const FILA_TABLA = `border-b ${BORDE_TABLA}`;
const CELDA_NO = `px-3 py-2.5 border-r ${BORDE_TABLA} min-h-full`;
const CELDA_NOMBRE = `px-3 py-2.5 border-r ${BORDE_TABLA} min-w-0 min-h-full`;
const CELDA_TOTAL = `px-3 py-2.5 text-right min-h-full`;

interface NodoFila extends Omit<FilaReporteDependencia, 'tipo'> {
  tipo: FilaReporteDependencia['tipo'] | 'total-empleado';
  children: NodoFila[];
  tieneHijos: boolean;
  ocultarTotalFila?: boolean;
}

interface Props {
  initialData: ReporteJerarquicoCombustible;
  initialParams: ParamsReporteCombustible;
}

const encontrarPadrePorPrefix = (
  branchPrefix: string,
  porPrefix: Map<string, NodoFila>
): NodoFila | undefined => {
  if (porPrefix.has(branchPrefix)) return porPrefix.get(branchPrefix);
  if (!branchPrefix.includes('.')) return undefined;

  const partes = branchPrefix.split('.');
  while (partes.length > 1) {
    partes.pop();
    const candidato = partes.join('.');
    if (porPrefix.has(candidato)) return porPrefix.get(candidato);
  }
  return undefined;
};

const getColorNivel = (fila: { tipo: TipoFilaReporte; level: number; esPuesto?: boolean }) => {
  if (fila.tipo === 'solicitud') {
    return {
      badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      underline: '',
      text: 'text-slate-600 dark:text-slate-300',
      price: 'text-slate-700 dark:text-slate-400',
      row: 'bg-slate-50/70 dark:bg-slate-900/20',
    };
  }

  if (fila.tipo === 'empleado' || fila.tipo === 'total-empleado' || fila.esPuesto) {
    return {
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      underline: 'border-b-2 border-yellow-500',
      text: 'text-yellow-800 dark:text-yellow-300',
      price: 'text-yellow-700 dark:text-yellow-400',
      row: 'bg-yellow-50/40 dark:bg-yellow-900/10',
    };
  }

  const nivel = fila.level % 4;
  switch (nivel) {
    case 0:
      return {
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        underline: 'border-b-2 border-blue-500',
        text: 'text-blue-800 dark:text-blue-300',
        price: 'text-blue-700 dark:text-blue-400',
        row: 'bg-blue-50/50 dark:bg-blue-900/10',
      };
    case 1:
      return {
        badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        underline: 'border-b-2 border-red-500',
        text: 'text-red-800 dark:text-red-300',
        price: 'text-red-700 dark:text-red-400',
        row: 'bg-red-50/40 dark:bg-red-900/10',
      };
    case 2:
      return {
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        underline: 'border-b-2 border-purple-500',
        text: 'text-purple-800 dark:text-purple-300',
        price: 'text-purple-700 dark:text-purple-400',
        row: 'bg-purple-50/40 dark:bg-purple-900/10',
      };
    default:
      return {
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
        underline: 'border-b-2 border-orange-500',
        text: 'text-orange-800 dark:text-orange-300',
        price: 'text-orange-700 dark:text-orange-400',
        row: 'bg-orange-50/40 dark:bg-orange-900/10',
      };
  }
};

const empleadoEnRamaMatch = (branchPrefix: string, ramasMatcheadas: Set<string>) =>
  [...ramasMatcheadas].some(
    (p) => branchPrefix === p || branchPrefix.startsWith(`${p}.`)
  );

const agregarPrefijosCadena = (prefix: string, set: Set<string>) => {
  if (!prefix || prefix === '—') return;
  set.add(prefix);
  const partes = prefix.split('.');
  for (let i = partes.length - 1; i > 0; i--) {
    set.add(partes.slice(0, i).join('.'));
  }
};

const filtrarPorDepartamento = (filas: FilaReporteDependencia[], term: string) => {
  if (!term.trim()) return filas;

  const lower = term.toLowerCase();
  const visiblePrefixes = new Set<string>();
  const ramasMatcheadas = new Set<string>();

  filas.forEach((f) => {
    if (f.tipo !== 'dependencia' || !f.nombre.toLowerCase().includes(lower)) return;

    if (f.prefix && f.prefix !== '—') {
      visiblePrefixes.add(f.prefix);
      ramasMatcheadas.add(f.prefix);

      filas.forEach((other) => {
        if (
          other.tipo === 'dependencia' &&
          other.prefix?.startsWith(`${f.prefix}.`)
        ) {
          visiblePrefixes.add(other.prefix);
          ramasMatcheadas.add(other.prefix);
        }
      });
    }
    if (f.id === 'sin-dependencia') {
      visiblePrefixes.add('sin-dependencia');
      ramasMatcheadas.add('sin-dependencia');
    }
  });

  if (visiblePrefixes.size === 0) return [];

  return filas.filter((f) => {
    if (f.tipo === 'dependencia') {
      if (f.id === 'sin-dependencia') return visiblePrefixes.has('sin-dependencia');
      return f.prefix ? visiblePrefixes.has(f.prefix) : false;
    }
    if (f.tipo === 'empleado') return empleadoEnRamaMatch(f.branchPrefix, ramasMatcheadas);
    return false;
  });
};

const filtrarPorNombre = (filas: FilaReporteDependencia[], term: string) => {
  if (!term.trim()) return filas;

  const lower = term.toLowerCase();
  const visiblePrefixes = new Set<string>();
  const empleadosVisibles = new Set<string>();

  filas.forEach((f) => {
    if (f.tipo === 'empleado' && f.nombre.toLowerCase().includes(lower)) {
      empleadosVisibles.add(f.id);
      if (f.branchPrefix) agregarPrefijosCadena(f.branchPrefix, visiblePrefixes);
    }
  });

  if (empleadosVisibles.size === 0) return [];

  return filas.filter((f) => {
    if (f.tipo === 'empleado') return empleadosVisibles.has(f.id);
    if (f.tipo === 'dependencia') {
      if (f.id === 'sin-dependencia') return visiblePrefixes.has('sin-dependencia');
      return f.prefix ? visiblePrefixes.has(f.prefix) : false;
    }
    return false;
  });
};

const filtrarFilas = (
  filas: FilaReporteDependencia[],
  busquedaDep: string,
  busquedaNombre: string
) => {
  let resultado = filas;
  if (busquedaDep.trim()) resultado = filtrarPorDepartamento(resultado, busquedaDep);
  if (busquedaNombre.trim()) resultado = filtrarPorNombre(resultado, busquedaNombre);
  return resultado;
};

const buildTree = (filas: FilaReporteDependencia[]): NodoFila[] => {
  const roots: NodoFila[] = [];
  const porPrefix = new Map<string, NodoFila>();

  for (const fila of filas) {
    const nodo: NodoFila = { ...fila, children: [], tieneHijos: false };

    if (fila.tipo === 'dependencia' && fila.prefix && fila.prefix !== '—') {
      porPrefix.set(fila.prefix, nodo);
    }
    if (fila.id === 'sin-dependencia') {
      porPrefix.set('sin-dependencia', nodo);
    }

    if (fila.tipo === 'empleado') {
      const padre = encontrarPadrePorPrefix(fila.branchPrefix, porPrefix);
      if (padre) {
        padre.children.push(nodo);
        padre.tieneHijos = true;
      }

      if (fila.solicitudes?.length) {
        fila.solicitudes.forEach((sol) => {
          nodo.children.push({
            id: `sol-${sol.id}`,
            prefix: '',
            level: fila.level + 1,
            tipo: 'solicitud',
            nombre: sol.justificacion?.trim() || 'Sin justificación',
            total: sol.monto,
            esPuesto: false,
            branchPrefix: fila.branchPrefix,
            rutaDependencia: fila.rutaDependencia,
            solicitud: sol,
            children: [],
            tieneHijos: false,
          });
        });
        nodo.tieneHijos = true;
      }
      continue;
    }

    if (fila.prefix === '—') {
      roots.push(nodo);
      continue;
    }

    const parentPrefix =
      fila.prefix && fila.prefix.includes('.')
        ? fila.prefix.split('.').slice(0, -1).join('.')
        : null;

    if (parentPrefix && porPrefix.has(parentPrefix)) {
      porPrefix.get(parentPrefix)!.children.push(nodo);
      porPrefix.get(parentPrefix)!.tieneHijos = true;
    } else {
      roots.push(nodo);
    }
  }

  return roots;
};

const recalcularTotales = (nodos: NodoFila[]): void => {
  nodos.forEach((n) => {
    if (n.children.length > 0) {
      recalcularTotales(n.children);
      n.total = n.children.reduce((acc, c) => acc + c.total, 0);
    }
  });
};

const quitarIdsExpandibles = (nodos: NodoFila[], ids: Set<string>) => {
  nodos.forEach((n) => {
    if (n.tieneHijos) ids.delete(n.id);
    quitarIdsExpandibles(n.children, ids);
  });
};

/** Expande todas las dependencias en cascada; empleados/cupones quedan colapsados. */
const recogerSubdependenciasExpandibles = (nodos: NodoFila[], ids: Set<string>) => {
  nodos.forEach((n) => {
    if (n.tipo === 'dependencia' && n.tieneHijos) {
      ids.add(n.id);
    }
    if (n.children.length > 0) {
      recogerSubdependenciasExpandibles(n.children, ids);
    }
  });
};

const recogerIdsExpandibles = (nodos: NodoFila[], ids: Set<string>) => {
  nodos.forEach((n) => {
    if (n.tieneHijos) ids.add(n.id);
    recogerIdsExpandibles(n.children, ids);
  });
};

const aplanarParaPdf = (nodos: NodoFila[]): NodoFila[] => {
  const resultado: NodoFila[] = [];
  const recorrer = (lista: NodoFila[]) => {
    lista.forEach((n) => {
      const tieneCupones =
        n.tipo === 'empleado' && n.children.some((c) => c.tipo === 'solicitud');

      if (tieneCupones) {
        resultado.push({ ...n, ocultarTotalFila: true });
        n.children.forEach((c) => recorrer([c]));
        resultado.push({
          ...n,
          id: `${n.id}-total`,
          tipo: 'total-empleado',
          nombre: 'Total',
          nombrePuesto: undefined,
          prefix: '',
          children: [],
          tieneHijos: false,
          ocultarTotalFila: false,
        });
        return;
      }

      resultado.push(n);
      if (n.children.length) recorrer(n.children);
    });
  };
  recorrer(nodos);
  return resultado;
};

function ReporteTablaSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-500 rounded-2xl shadow-sm overflow-hidden print:hidden animate-pulse">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-300 dark:border-neutral-500 bg-slate-50/80 dark:bg-neutral-800/40">
        <div className="h-3 w-36 rounded bg-slate-200 dark:bg-neutral-700" />
        <div className="flex items-center gap-2">
          <div className="h-9 w-36 rounded-xl bg-slate-200 dark:bg-neutral-700" />
          <div className="h-9 w-32 rounded-xl bg-slate-200 dark:bg-neutral-700" />
          <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-neutral-700" />
        </div>
      </div>
      <div
        className={`${GRID_TABLA} ${FILA_TABLA} bg-slate-50 dark:bg-neutral-800/60`}
      >
        <div className={`${CELDA_NO} py-3`}>
          <div className="h-3 w-8 rounded bg-slate-200 dark:bg-neutral-700" />
        </div>
        <div className={`${CELDA_NOMBRE} py-3`}>
          <div className="h-3 w-40 rounded bg-slate-200 dark:bg-neutral-700" />
        </div>
        <div className={`${CELDA_TOTAL} py-3 flex justify-end`}>
          <div className="h-3 w-16 rounded bg-slate-200 dark:bg-neutral-700" />
        </div>
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={`${GRID_TABLA} ${FILA_TABLA}`}>
          <div className={`${CELDA_NO} flex items-center justify-center`}>
            <div className="h-7 w-10 rounded-md bg-slate-200 dark:bg-neutral-700" />
          </div>
          <div className={`${CELDA_NOMBRE} flex items-center`}>
            <div
              className="h-3 rounded bg-slate-200 dark:bg-neutral-700"
              style={{ width: `${45 + (i % 4) * 12}%` }}
            />
          </div>
          <div className={`${CELDA_TOTAL} flex items-center justify-end`}>
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-neutral-700" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface NodoItemProps {
  nodo: NodoFila;
  expandidos: Set<string>;
  toggleExpand: (nodo: NodoFila) => void;
  onVerSolicitud: (id: number) => void;
}

function NodoItem({ nodo, expandidos, toggleExpand, onVerSolicitud }: NodoItemProps) {
  const colores = getColorNivel(nodo);
  const expandido = expandidos.has(nodo.id);
  const esExpandible = nodo.tieneHijos;
  const esSolicitud = nodo.tipo === 'solicitud';
  const mostrarNumero = nodo.tipo === 'dependencia' && nodo.prefix && !nodo.esPuesto;
  const sol = nodo.solicitud;
  const datosSol = esSolicitud && sol ? datosSolicitudReporte(sol) : null;

  const esEmpleado = nodo.tipo === 'empleado';
  const tieneCupones = esEmpleado && nodo.children.some((c) => c.tipo === 'solicitud');
  const mostrarTotalEnLinea = !tieneCupones || !expandido;

  const handleClick = () => {
    if (esSolicitud && sol) {
      onVerSolicitud(sol.id);
      return;
    }
    if (esExpandible) toggleExpand(nodo);
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={`${GRID_TABLA} ${FILA_TABLA} ${colores.row} ${
          esExpandible || esSolicitud
            ? 'cursor-pointer hover:brightness-[0.98] dark:hover:brightness-110'
            : ''
        }`}
      >
        <div className={`${CELDA_NO} flex items-center justify-center`}>
          {mostrarNumero && (
            <span
              className={`inline-flex items-center justify-center min-w-[2rem] h-7 px-2 rounded-md font-mono font-bold text-[11px] ${colores.badge} ${colores.underline}`}
            >
              {nodo.prefix}
            </span>
          )}
          {datosSol && (
            <span className={`text-sm text-center leading-snug ${colores.text}`}>
              {datosSol.noEtiqueta}
            </span>
          )}
        </div>

        <div
          className={`${CELDA_NOMBRE} overflow-hidden text-left ${
            esSolicitud ? 'flex flex-col justify-center' : 'flex items-center'
          }`}
        >
          {datosSol ? (
            <div className={`text-sm leading-snug break-words space-y-0.5 ${colores.text}`}>
              <p>
                <span className={clasesColorFechaSolicitud()}>{datosSol.fecha}</span>{' '}
                <span className={clasesColorDatoVehiculo()}>{datosSol.vehiculo}</span>,{' '}
                <span className={clasesColorDatoVehiculo()}>{datosSol.placa}</span>,{' '}
                <span className={clasesColorCombustible(datosSol.combustible)}>
                  {datosSol.combustible}
                </span>
              </p>
              <p>{datosSol.justificacion}</p>
            </div>
          ) : nodo.tipo === 'total-empleado' ? (
            <span className={`font-bold ${colores.text}`}>Total</span>
          ) : nodo.tipo === 'empleado' ? (
            <div className="min-w-0 text-left leading-snug">
              {nodo.nombrePuesto && (
                <div className={`font-bold truncate ${colores.text}`}>{nodo.nombrePuesto}</div>
              )}
              <div
                className={`font-bold truncate underline decoration-2 underline-offset-[3px] decoration-current ${colores.text}`}
              >
                {nodo.nombre}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`font-bold truncate ${colores.text}`}>{nodo.nombre}</span>
            </div>
          )}
        </div>

        <div
          className={`${CELDA_TOTAL} flex items-center justify-end font-mono font-extrabold whitespace-nowrap ${colores.price} ${
            debeSubrayarTotalReporte(nodo) && (nodo.tipo !== 'empleado' || mostrarTotalEnLinea)
              ? 'underline decoration-2 underline-offset-[3px] decoration-current'
              : ''
          }`}
        >
          {mostrarTotalEnLinea || nodo.tipo === 'total-empleado' || nodo.tipo === 'solicitud'
            ? formatearQ(nodo.total)
            : null}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {expandido && nodo.children.length > 0 && (
          <motion.div
            key={`children-${nodo.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            {nodo.children.map((hijo) => (
              <NodoItem
                key={hijo.id}
                nodo={hijo}
                expandidos={expandidos}
                toggleExpand={toggleExpand}
                onVerSolicitud={onVerSolicitud}
              />
            ))}
            {tieneCupones && (
              <div
                className={`${GRID_TABLA} ${FILA_TABLA} bg-slate-50/70 dark:bg-slate-900/20`}
              >
                <div className={`${CELDA_NO} pb-5`} />
                <div
                  className={`${CELDA_NOMBRE} pb-5 flex items-start font-bold underline decoration-2 underline-offset-[3px] decoration-current ${colores.text}`}
                >
                  Total
                </div>
                <div
                  className={`${CELDA_TOTAL} pb-5 flex items-start justify-end font-mono font-extrabold whitespace-nowrap underline decoration-2 underline-offset-[3px] decoration-current ${colores.price}`}
                >
                  {formatearQ(nodo.total)}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReporteDepartamentos({ initialData, initialParams }: Props) {
  const mesInicial = initialParams.modoRango
    ? toMonthValue(initialParams.anioInicio, initialParams.mesInicio)
    : toMonthValue(initialParams.anio, initialParams.mes);
  const mesFinal = initialParams.modoRango
    ? toMonthValue(initialParams.anioFin, initialParams.mesFin)
    : toMonthValue(initialParams.anio, initialParams.mes);

  const [data, setData] = useState<ReporteJerarquicoCombustible>(initialData);
  const [params, setParams] = useState<ParamsReporteCombustible>(initialParams);
  const [mesInicioValor, setMesInicioValor] = useState(mesInicial);
  const [mesFinValor, setMesFinValor] = useState(mesFinal);
  const [busquedaDep, setBusquedaDep] = useState('');
  const [busquedaNombre, setBusquedaNombre] = useState('');
  const [modoFiltroNombre, setModoFiltroNombre] = useState(false);
  const [solicitudModalId, setSolicitudModalId] = useState<number | null>(null);
  const [exportPdfOpen, setExportPdfOpen] = useState(false);
  const [estadisticasOpen, setEstadisticasOpen] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const sincronizarUiPeriodo = useCallback((p: ParamsReporteCombustible) => {
    if (!p.modoRango) {
      const valor = toMonthValue(p.anio, p.mes);
      setMesInicioValor(valor);
      setMesFinValor(valor);
      return;
    }
    setMesInicioValor(toMonthValue(p.anioInicio, p.mesInicio));
    setMesFinValor(toMonthValue(p.anioFin, p.mesFin));
  }, []);

  const construirParams = (): ParamsReporteCombustible =>
    paramsDesdeMeses(mesInicioValor, mesFinValor);

  const cargar = (nuevosParams?: ParamsReporteCombustible) => {
    const p = nuevosParams ?? construirParams();
    setParams(p);
    guardarParamsReporte(p);
    setBusquedaDep('');
    setBusquedaNombre('');
    setExpandidos(new Set());
    startTransition(async () => {
      const res = await getReporteJerarquicoCombustible(p);
      setData(res);
    });
  };

  useEffect(() => {
    const guardado = leerParamsReporte();
    if (!guardado || paramsReporteIguales(guardado, initialParams)) return;
    sincronizarUiPeriodo(guardado);
    cargar(guardado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filasArea = useMemo(
    () => filtrarFilas(data.filas, busquedaDep, busquedaNombre),
    [data.filas, busquedaDep, busquedaNombre]
  );

  const arbol = useMemo(() => {
    const tree = buildTree(filasArea);
    if (busquedaDep.trim() || busquedaNombre.trim()) {
      recalcularTotales(tree);
    }
    return tree;
  }, [filasArea, busquedaDep, busquedaNombre]);

  const autoExpandir = (dep: string, nombre: string) => {
    if (dep.trim() || nombre.trim()) {
      const todos = new Set<string>();
      recogerIdsExpandibles(
        buildTree(filtrarFilas(data.filas, dep, nombre)),
        todos
      );
      setExpandidos(todos);
    } else {
      setExpandidos(new Set());
    }
  };

  const handleBusquedaDep = (valor: string) => {
    setBusquedaDep(valor);
    setBusquedaNombre('');
    autoExpandir(valor, '');
  };

  const handleBusquedaNombre = (valor: string) => {
    setBusquedaNombre(valor);
    setBusquedaDep('');
    autoExpandir('', valor);
  };

  const limpiarFiltro = () => {
    setBusquedaDep('');
    setBusquedaNombre('');
    setExpandidos(new Set());
  };

  const valorFiltroAplicado = modoFiltroNombre ? busquedaNombre : busquedaDep;

  const handleVerSolicitud = useCallback((id: number) => {
    setSolicitudModalId(id);
  }, []);

  const toggleExpand = useCallback((nodo: NodoFila) => {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(nodo.id)) {
        quitarIdsExpandibles([nodo], next);
      } else {
        next.add(nodo.id);
        if (nodo.tipo === 'dependencia') {
          recogerSubdependenciasExpandibles(nodo.children, next);
        }
      }
      return next;
    });
  }, []);

  const idsExpandiblesTotales = useMemo(() => {
    const ids = new Set<string>();
    recogerIdsExpandibles(arbol, ids);
    return ids;
  }, [arbol]);

  const todoExpandido = useMemo(() => {
    if (idsExpandiblesTotales.size === 0) return false;
    for (const id of idsExpandiblesTotales) {
      if (!expandidos.has(id)) return false;
    }
    return true;
  }, [idsExpandiblesTotales, expandidos]);

  const toggleExpandirTodo = useCallback(() => {
    if (todoExpandido) {
      setExpandidos(new Set());
      return;
    }
    setExpandidos(new Set(idsExpandiblesTotales));
  }, [todoExpandido, idsExpandiblesTotales]);

  const handleExportarPdf = useCallback(
    async (busquedaDepPdf: string, busquedaNombrePdf: string) => {
      const filasPdf =
        busquedaDepPdf.trim() || busquedaNombrePdf.trim()
          ? filtrarFilas(data.filas, busquedaDepPdf, busquedaNombrePdf)
          : data.filas;

      if (filasPdf.length === 0) {
        throw new Error('No hay datos para generar el reporte.');
      }

      const tree = buildTree(filasPdf);
      if (busquedaDepPdf.trim() || busquedaNombrePdf.trim()) {
        recalcularTotales(tree);
      }
      const flat = aplanarParaPdf(tree);
      const titulo =
        busquedaDepPdf.trim() || busquedaNombrePdf.trim()
          ? busquedaNombrePdf || busquedaDepPdf
          : 'Todos los departamentos';
      const granTotal = tree.reduce((acc, n) => acc + n.total, 0);

      return crearUrlPdfReporteDepartamento({
        filas: flat.map((n) => ({
          prefix: n.prefix,
          nombre: n.nombre,
          nombrePuesto: n.nombrePuesto,
          total: n.total,
          tipo: n.tipo,
          esPuesto: n.esPuesto,
          level: n.level,
          solicitud: n.solicitud,
          ocultarTotalFila: n.ocultarTotalFila,
        })),
        tituloFiltro: titulo,
        periodo: etiquetaPeriodo(params),
        granTotal,
      });
    },
    [data.filas, params]
  );

  const aplicarPeriodo = (inicio: string, fin: string) => {
    setMesInicioValor(inicio);
    setMesFinValor(fin);
    cargar(paramsDesdeMeses(inicio, fin));
  };

  const hayDatos = arbol.length > 0;

  return (
    <div className="space-y-4 md:space-y-6 w-full md:w-[91%] px-3 md:px-0 mx-auto animate-in fade-in duration-500 mt-2 md:mt-4 xl:mt-5 pb-20">
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/sigem/combustible"
            className="mt-1 p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors print:hidden shrink-0"
            title="Volver"
          >
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight shrink-0">
                Reporte de Consumo
              </h1>
              <div className="print:hidden flex flex-col sm:flex-row items-stretch gap-2 lg:flex-1 lg:min-w-0 lg:justify-end">
                <FiltroConSugerencias
                  modoNombre={modoFiltroNombre}
                  onModoChange={setModoFiltroNombre}
                  filas={data.filas}
                  valorAplicado={valorFiltroAplicado}
                  onSeleccionarDep={handleBusquedaDep}
                  onSeleccionarNombre={handleBusquedaNombre}
                  onLimpiar={limpiarFiltro}
                  className="lg:flex-1 lg:max-w-lg lg:min-w-0"
                />
                <div className="shrink-0">
                  <SelectorPeriodoReporte
                    inicio={mesInicioValor}
                    fin={mesFinValor}
                    onChange={aplicarPeriodo}
                  />
                </div>
              </div>
            </div>
            <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mt-1">
              Consumo de cupones por área administrativa.
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        {isPending ? (
          <ReporteTablaSkeleton />
        ) : hayDatos ? (
          <>
            <div className="bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-500 rounded-2xl shadow-sm overflow-hidden print:hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-300 dark:border-neutral-500 bg-slate-50/80 dark:bg-neutral-800/40">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Detalle del periodo
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEstadisticasOpen(true)}
                    className={`${BTN_TOOLBAR} justify-center`}
                    title="Ver estadísticas y gráficas de consumo"
                  >
                    <BarChart3 size={15} className="text-purple-500" />
                    <span>VER ESTADÍSTICAS</span>
                  </button>
                  <button
                    onClick={() => setExportPdfOpen(true)}
                    className={`${BTN_TOOLBAR} justify-center`}
                    title="Generar PDF por departamento o persona"
                  >
                    <ExternalLink size={15} className="text-blue-500" />
                    <span>GENERAR PDF</span>
                  </button>
                  <button
                    onClick={toggleExpandirTodo}
                    className={`${BTN_TOOLBAR} justify-center px-2.5`}
                    title={todoExpandido ? 'Cerrar todos los acordeones' : 'Abrir todos los acordeones'}
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
              <div
                className={`${GRID_TABLA} ${FILA_TABLA} bg-slate-50 dark:bg-neutral-800/60 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider font-bold`}
              >
                <div className={`${CELDA_NO} py-3 flex items-center`}>No.</div>
                <div className={`${CELDA_NOMBRE} py-3 flex items-center`}>Dependencia / Nombre</div>
                <div className={`${CELDA_TOTAL} py-3 flex items-center justify-end`}>Total</div>
              </div>
              {arbol.map((nodo) => (
                <NodoItem
                  key={nodo.id}
                  nodo={nodo}
                  expandidos={expandidos}
                  toggleExpand={toggleExpand}
                  onVerSolicitud={handleVerSolicitud}
                />
              ))}
            </div>

            <DetalleSolicitudModal
              solicitudId={solicitudModalId}
              onClose={() => setSolicitudModalId(null)}
            />

            <ExportarReportePdfModal
              open={exportPdfOpen}
              onClose={() => setExportPdfOpen(false)}
              filas={data.filas}
              onExportar={handleExportarPdf}
            />

            <EstadisticasReporteModal
              open={estadisticasOpen}
              onClose={() => setEstadisticasOpen(false)}
              filas={data.filas}
              periodo={etiquetaPeriodo(params)}
              mesInicio={mesInicioValor}
              mesFin={mesFinValor}
              onPeriodoChange={aplicarPeriodo}
              cargando={isPending}
            />
          </>
        ) : (
          <div className="text-center py-16 bg-slate-50 dark:bg-neutral-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-neutral-800">
            <SearchX size={32} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-slate-900 dark:text-white font-bold">No hay consumo registrado</h3>
            <p className="text-slate-500 text-sm mt-1">
              {busquedaDep.trim() || busquedaNombre.trim()
                ? 'No hay resultados con los filtros aplicados.'
                : `No se encontraron cupones aprobados en ${etiquetaPeriodo(params)}.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
