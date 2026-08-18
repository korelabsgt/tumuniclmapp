'use client';

import React, { useState, Fragment, useMemo, useRef } from 'react';
import { es } from 'date-fns/locale';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday, 
  addDays, 
  subDays, 
  isSameDay, 
  startOfDay,
  endOfDay,
  isAfter,
  parseISO,
  startOfToday,
  isValid,
  getDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, PartyPopper, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PermisoEmpleado } from '@/components/permisos/types';
import { esTipoAcuerdo } from '@/components/permisos/types';
import PreviewPermiso from '@/components/permisos/modals/PreviewPermiso';
import PreviewAcuerdo from '@/components/permisos/acuerdos/modals/PreviewAcuerdo';
import { obtenerJustificacionParaDia } from '@/components/permisos/justificaciones';
import VerComision from '@/components/comisiones/VerComision';
import Mapa from '@/components/ui/modals/Mapa';
import { useAsuetos, getAsuetoPorFecha, buildParentByDependenciaId } from '@/hooks/asistencia/useAsuetos';
import useUserData from '@/hooks/sesion/useUserData';
import { useDependencias } from '@/hooks/dependencias/useDependencias';
import {
  getCategoriaIcon,
  getCategoriaJustificacionClass,
  getCategoriaLabel,
  getCategoriaPermiso,
  getCategoriaTextClass,
  COMISION_TEXT_CLASS,
  COMISION_DOT_CLASS,
  COMISION_BADGE_CLASS,
  VACACIONES_DOT_CLASS,
  IGSS_DOT_CLASS,
  PERMISO_DOT_CLASS,
} from '@/components/permisos/categorias';
import {
  getCategoriaAcuerdo,
  getCategoriaAcuerdoIcon,
  getCategoriaAcuerdoLabel,
  getCategoriaAcuerdoJustificacionClass,
  getCategoriaAcuerdoTextClass,
  getCategoriaAcuerdoDotClass,
} from '@/components/permisos/acuerdos/categorias';
import type { ComisionConFechaYHoraSeparada } from '@/hooks/comisiones/useObtenerComisiones';
import { ModalPortal } from '@/components/ui/modal-portal';
import {
  resolverEstadoMarcaje,
  getEstadoMarcajeMeta,
  esEntradaTardeMarcaje,
  resolverHorarioEntradaDia,
  resolverMarcajeHoraTextClass,
  MARCaje_FILA_CLASS,
  MARCaje_ETIQUETA_CLASS,
} from '@/components/asistencia/lib/estado-marcaje';
import {
  MARCaje_JUSTIFICACION_GRID_CLASS,
  JUSTIFICACION_COL_CLASS,
} from '@/components/asistencia/lib/marcaje-layout';

interface CalendarioProps {
  todosLosRegistros: any[];
  onAbrirMapa: (registro: any) => void;
  fechaHoraGt: Date;
  esHorarioMultiple?: boolean;
  permisosEmpleado?: PermisoEmpleado[];
  comisionesEmpleado?: ComisionConFechaYHoraSeparada[];
  /** Días laborales del horario del empleado (0=Dom, 1=Lun...6=Sáb). Si es null, muestra todos. */
  horarioDias?: number[] | null;
  /** Hora de entrada del horario (ej: "08:00:00"). Usada para determinar si la comisión toca la entrada. */
  horarioEntrada?: string | null;
  /** Hora de salida del horario (ej: "16:00:00"). Usada para determinar si la comisión toca la salida. */
  horarioSalida?: string | null;
  /** Mientras cargan permisos/comisiones/asuetos, evita mostrar "Sin Permiso" antes de tiempo */
  cargandoJustificaciones?: boolean;
}

const getWeekDays = (date: Date) => eachDayOfInterval({
  start: startOfWeek(date, { locale: es, weekStartsOn: 1 }),
  end: endOfWeek(date, { locale: es, weekStartsOn: 1 }),
});

type AsistenciaRegistro = {
  entrada: any | null,
  salida: any | null,
  representante: any | null,
  cantidad: number,
  tieneMultiple: boolean,
  nombre: string,
  puesto_nombre: string
};

const sortUsuarios = (usuarios: AsistenciaRegistro[]) => {
  return usuarios.sort((a, b) => {
    const regA = a.entrada || a.salida || a.representante;
    const regB = b.entrada || b.salida || b.representante;
    const pathA = regA?.oficina_path_orden || '';
    const pathB = regB?.oficina_path_orden || '';

    if (pathA && pathB) {
      return pathA.localeCompare(pathB, undefined, { numeric: true, sensitivity: 'base' });
    }
    return (a.nombre || '').localeCompare(b.nombre || '');
  });
};

const MarcajeSkeleton = () => (
  <div className="h-4 w-36 max-w-full rounded bg-gray-200 dark:bg-neutral-700 animate-pulse" />
);

const JUSTIFICACION_BADGE_CLASS =
  "w-full min-h-[2.35rem] py-1.5 px-1.5 rounded-md font-bold flex items-center justify-center gap-1 text-center text-[10px] sm:text-[11px] leading-tight border shadow-sm";
const JUSTIFICACION_ICON_CLASS = "w-4 h-4 flex-shrink-0";

const JustificacionSkeleton = () => (
  <div className="w-full min-h-[2.35rem] rounded-md bg-gray-200 dark:bg-neutral-700 animate-pulse" />
);

const TiempoSkeleton = () => (
  <span className="inline-block h-4 w-12 rounded bg-gray-200 dark:bg-neutral-700 animate-pulse align-middle" />
);

const WEEK_NAV_BTN_CLASS =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-slate-500 transition-colors hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200";

export default function Calendario({ todosLosRegistros = [], onAbrirMapa, fechaHoraGt, esHorarioMultiple = false, permisosEmpleado = [], comisionesEmpleado = [], horarioDias, horarioEntrada, horarioSalida, cargandoJustificaciones = false }: CalendarioProps) {
  const { dependencia_id } = useUserData();
  const { dependencias } = useDependencias();
  const parentByDependenciaId = useMemo(
    () => buildParentByDependenciaId(dependencias),
    [dependencias],
  );
  const [fechaDeReferencia, setFechaDeReferencia] = useState(new Date());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | undefined>(undefined);
  const [filtroTipo, setFiltroTipo] = useState<'semanal' | 'rango'>('semanal');
  const [fechaInicialRango, setFechaInicialRango] = useState('');
  const [fechaFinalRango, setFechaFinalRango] = useState('');
  const [permisoPreview, setPermisoPreview] = useState<PermisoEmpleado | null>(null);
  const [acuerdoPreview, setAcuerdoPreview] = useState<PermisoEmpleado | null>(null);
  const [comisionPreview, setComisionPreview] = useState<ComisionConFechaYHoraSeparada | null>(null);
  const [mapaComisionRegistros, setMapaComisionRegistros] = useState<any>(null);
  const [mapaComisionNombre, setMapaComisionNombre] = useState('');
  const monthInputRef = useRef<HTMLInputElement>(null);

  const diasDeLaSemana = useMemo(() => getWeekDays(fechaDeReferencia), [fechaDeReferencia]);

  // Calcular rango de fechas para cargar asuetos
  const { rangoInicio, rangoFin } = useMemo(() => {
    const semanaInicio = format(diasDeLaSemana[0], 'yyyy-MM-dd');
    const semanaFin = format(diasDeLaSemana[6], 'yyyy-MM-dd');
    if (filtroTipo === 'rango' && fechaInicialRango && fechaFinalRango) {
      return { rangoInicio: fechaInicialRango, rangoFin: fechaFinalRango };
    }
    return { rangoInicio: semanaInicio, rangoFin: semanaFin };
  }, [diasDeLaSemana, filtroTipo, fechaInicialRango, fechaFinalRango]);

  const { asuetos, loading: cargandoAsuetos } = useAsuetos(rangoInicio, rangoFin);
  const esperandoJustificaciones = cargandoJustificaciones || cargandoAsuetos;

  const resolverAsueto = (diaStr: string) =>
    getAsuetoPorFecha(asuetos, diaStr, dependencia_id, parentByDependenciaId);

  /** ¿Este día está dentro del horario laboral del empleado? */
  const esDiaLaboral = (dia: Date): boolean => {
    if (!horarioDias || horarioDias.length === 0) return true;
    return horarioDias.includes(getDay(dia));
  };

  const registrosAgrupados = useMemo(() => {
    const agrupados: Record<string, Record<string, AsistenciaRegistro>> = {};

    todosLosRegistros.forEach(registro => {
      const diaString = format(new Date(registro.created_at), 'yyyy-MM-dd');
      const userId = registro.user_id;

      if (!agrupados[diaString]) {
        agrupados[diaString] = {};
      }
      if (!agrupados[diaString][userId]) {
        agrupados[diaString][userId] = {
          entrada: null,
          salida: null,
          representante: null,
          cantidad: 0,
          tieneMultiple: false,
          nombre: registro.nombre,
          puesto_nombre: registro.puesto_nombre
        };
      }

      const grupo = agrupados[diaString][userId];
      grupo.cantidad++;
      if (!grupo.representante) grupo.representante = registro;

      if (registro.tipo_registro === 'Entrada') {
        if (!grupo.entrada || new Date(registro.created_at) < new Date(grupo.entrada.created_at)) {
          grupo.entrada = registro;
        }
      } else if (registro.tipo_registro === 'Salida') {
        if (!grupo.salida || new Date(registro.created_at) > new Date(grupo.salida.created_at)) {
          grupo.salida = registro;
        }
      } else {
        grupo.tieneMultiple = true;
      }
    });

    return agrupados;
  }, [todosLosRegistros]);

  const diasParaTabla = useMemo(() => {
    let start: Date;
    let end: Date;

    if (filtroTipo === 'semanal') {
      if (diaSeleccionado) {
        start = startOfDay(diaSeleccionado);
        end = endOfDay(diaSeleccionado);
      } else {
        start = startOfDay(diasDeLaSemana[0]);
        end = endOfDay(diasDeLaSemana[6]);
      }
    } else {
      if (!fechaInicialRango || !fechaFinalRango) return [];
      start = startOfDay(new Date(fechaInicialRango + 'T00:00:00'));
      end = endOfDay(new Date(fechaFinalRango + 'T00:00:00'));
    }

    if (!isValid(start) || !isValid(end) || isAfter(start, end)) return [];

    const diasSet = new Set<string>();

    eachDayOfInterval({ start, end }).forEach((d) => {
      const diaStr = format(d, 'yyyy-MM-dd');
      const tieneAsueto = resolverAsueto(diaStr) !== null;
      const tieneJustificacion =
        obtenerJustificacionParaDia(permisosEmpleado, diaStr) !== null;
      const tieneComision =
        comisionesEmpleado.some(
          (c) => c.aprobado && c.fecha_hora.startsWith(diaStr),
        );

      if (
        esDiaLaboral(d) ||
        tieneAsueto ||
        tieneJustificacion ||
        tieneComision
      ) {
        diasSet.add(diaStr);
      }
    });

    return [...diasSet].sort();
  }, [
    filtroTipo,
    diasDeLaSemana,
    diaSeleccionado,
    fechaInicialRango,
    fechaFinalRango,
    horarioDias,
    permisosEmpleado,
    asuetos,
    comisionesEmpleado,
    dependencia_id,
    parentByDependenciaId,
  ]);

  const irSemanaSiguiente = () => setFechaDeReferencia(addDays(fechaDeReferencia, 7));
  const irSemanaAnterior = () => setFechaDeReferencia(subDays(fechaDeReferencia, 7));

  const handleSeleccionFecha = (anio: number, mes: number) => {
    const nuevaFecha = new Date(anio, mes, 1);
    setFechaDeReferencia(startOfWeek(nuevaFecha, { locale: es, weekStartsOn: 1 }));
    setDiaSeleccionado(undefined);
  };

  const handleMonthInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) return;
    const [anioStr, mesStr] = value.split('-');
    handleSeleccionFecha(parseInt(anioStr, 10), parseInt(mesStr, 10) - 1);
  };

  const abrirSelectorMesAnio = () => {
    const input = monthInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
    input.click();
  };

  const handleSeleccionDia = (dia: Date) => {
    const yaEstaSeleccionado = diaSeleccionado ? isSameDay(dia, diaSeleccionado) : false;
    setDiaSeleccionado(yaEstaSeleccionado ? undefined : dia);
  };

  const handleFiltroTipoClick = (tipo: 'semanal' | 'rango') => {
    setFiltroTipo(tipo);
    setDiaSeleccionado(undefined);
  };

  const uniqueUserIds = useMemo(() => {
    const ids = new Set();
    todosLosRegistros.forEach(r => ids.add(r.user_id));
    return ids.size;
  }, [todosLosRegistros]);

  const esVistaIndividual = uniqueUserIds <= 1;
  const colSpanCount = esVistaIndividual ? 2 : 4;

  const getJustificacionParaDia = (diaString: string): PermisoEmpleado | null =>
    obtenerJustificacionParaDia(permisosEmpleado, diaString);


  const getJustificacionTextClass = (permiso: PermisoEmpleado) => {
    if (esTipoAcuerdo(permiso.tipo)) {
      return getCategoriaAcuerdoTextClass(getCategoriaAcuerdo(permiso));
    }
    return getCategoriaTextClass(getCategoriaPermiso(permiso));
  };

  const getJustificacionDotClass = (permiso: PermisoEmpleado) => {
    if (esTipoAcuerdo(permiso.tipo)) {
      return getCategoriaAcuerdoDotClass(getCategoriaAcuerdo(permiso));
    }
    const categoria = getCategoriaPermiso(permiso);
    switch (categoria) {
      case 'igss': return IGSS_DOT_CLASS;
      case 'vacaciones': return VACACIONES_DOT_CLASS;
      case 'academicas': return 'bg-green-500';
      default: return PERMISO_DOT_CLASS;
    }
  };

  const getComisionParaDia = (diaString: string): ComisionConFechaYHoraSeparada | null => {
    if (!comisionesEmpleado || comisionesEmpleado.length === 0) return null;
    return comisionesEmpleado.find(c => c.aprobado && c.fecha_hora.startsWith(diaString)) || null;
  };

  const getMarcajeDashClass = (
    justificacion: PermisoEmpleado | null,
    asueto: ReturnType<typeof getAsuetoPorFecha>,
    comision: ComisionConFechaYHoraSeparada | null,
  ) => {
    if (asueto) return 'text-amber-500 dark:text-amber-400';
    if (justificacion) return getJustificacionTextClass(justificacion);
    if (comision) return COMISION_TEXT_CLASS;
    return 'text-red-400';
  };

  const renderMarcajeSinRegistro = (
    diaString: string,
    justificacion: PermisoEmpleado | null,
    asueto: ReturnType<typeof getAsuetoPorFecha>,
    comision: ComisionConFechaYHoraSeparada | null,
    sizeClass = MARCaje_FILA_CLASS,
  ) => {
    if (asueto) {
      return (
        <span className={`${sizeClass} font-medium text-amber-600 dark:text-amber-400`}>
          {asueto.nombre}
        </span>
      );
    }

    const textClass = justificacion
      ? getJustificacionTextClass(justificacion)
      : comision
        ? COMISION_TEXT_CLASS
        : 'text-red-400';

    if (justificacion || comision) {
      return (
        <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center">
          <span className={MARCaje_FILA_CLASS}>
            <span className={MARCaje_ETIQUETA_CLASS}>Ent: </span>
            <span className={`${textClass} font-normal`}>--:--</span>
          </span>
          <span className="text-gray-300 dark:text-neutral-700">|</span>
          <span className={MARCaje_FILA_CLASS}>
            <span className={MARCaje_ETIQUETA_CLASS}>Sal: </span>
            <span className={`${textClass} font-normal`}>--:--</span>
          </span>
        </div>
      );
    }

    return null;
  };

  /** Botón de justificación con ícono por tipo */
  const JustificacionBtn = ({ justificacion, asueto, comision, fechaStr, cargando = false, tieneEntrada = false, tieneSalida = false, notasEntrada, notasSalida, marcaEntradaAt, horarioEntrada, cantidadMarcajes }: {
    justificacion: PermisoEmpleado | null;
    asueto: ReturnType<typeof getAsuetoPorFecha>;
    comision: ComisionConFechaYHoraSeparada | null;
    fechaStr: string;
    cargando?: boolean;
    tieneEntrada?: boolean;
    tieneSalida?: boolean;
    notasEntrada?: string | null;
    notasSalida?: string | null;
    marcaEntradaAt?: string | null;
    horarioEntrada?: string | null;
    cantidadMarcajes?: number | null;
  }) => {
    if (cargando) return <JustificacionSkeleton />;
    if (asueto) {
      return (
        <div
          title={asueto.descripcion || asueto.nombre}
          className={`${JUSTIFICACION_BADGE_CLASS} bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 cursor-default`}
        >
          <PartyPopper className={JUSTIFICACION_ICON_CLASS} />
          Asueto
        </div>
      );
    }

    if (justificacion) {
      if (esTipoAcuerdo(justificacion.tipo)) {
        const cat = getCategoriaAcuerdo(justificacion);
        const Icono = getCategoriaAcuerdoIcon(cat);
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setAcuerdoPreview(justificacion); }}
            className={`${JUSTIFICACION_BADGE_CLASS} transition-colors cursor-pointer ${getCategoriaAcuerdoJustificacionClass(cat)}`}
          >
            <Icono className={JUSTIFICACION_ICON_CLASS} />
            {getCategoriaAcuerdoLabel(cat)}
          </button>
        );
      }
      const categoria = getCategoriaPermiso(justificacion);
      const Icono = getCategoriaIcon(categoria);
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setPermisoPreview(justificacion); }}
          className={`${JUSTIFICACION_BADGE_CLASS} transition-colors cursor-pointer ${getCategoriaJustificacionClass(categoria)}`}
        >
          <Icono className={JUSTIFICACION_ICON_CLASS} />
          {getCategoriaLabel(categoria)}
        </button>
      );
    }

    if (comision) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); setComisionPreview(comision); }}
          title={comision.titulo}
          className={`${JUSTIFICACION_BADGE_CLASS} cursor-pointer transition-colors hover:opacity-80 ${COMISION_BADGE_CLASS}`}
        >
          <Briefcase className={JUSTIFICACION_ICON_CLASS} />
          Comisión
        </button>
      );
    }

    const estadoMarcaje = resolverEstadoMarcaje({
      fechaStr,
      tieneEntrada,
      tieneSalida,
      notasEntrada,
      notasSalida,
      marcaEntradaAt,
      horarioEntrada,
      cantidadMarcajes,
    });

    if (!estadoMarcaje) return null;

    const meta = getEstadoMarcajeMeta(estadoMarcaje);
    const IconoEstado = meta.icon;

    return (
      <div className={`${JUSTIFICACION_BADGE_CLASS} ${meta.className} cursor-default`}>
        <IconoEstado className={JUSTIFICACION_ICON_CLASS} />
        {meta.label}
      </div>
    );
  };

  return (
    <>
    <div className="w-full space-y-4">

      <div className="flex w-full justify-center">
      <div className="flex w-fit max-w-full flex-row items-center gap-2 rounded-lg bg-gray-100 p-1 transition-colors dark:bg-neutral-900">
        <div className="flex shrink-0 overflow-hidden rounded-lg">
          <Button 
            variant={filtroTipo === 'semanal' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => handleFiltroTipoClick('semanal')} 
            className={`h-7 min-w-[4.5rem] px-2 text-[11px] rounded-r-none ${filtroTipo === 'semanal' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800'}`}
          >
            Semanal
          </Button>
          <Button 
            variant={filtroTipo === 'rango' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => handleFiltroTipoClick('rango')} 
            className={`h-7 min-w-[4.5rem] px-2 text-[11px] rounded-l-none ${filtroTipo === 'rango' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800'}`}
          >
            Rango
          </Button>
        </div>
        <div className="h-6 w-px shrink-0 bg-gray-300 dark:bg-neutral-700" />
        {filtroTipo === 'semanal' ? (
          <div className="relative shrink-0">
            <input
              ref={monthInputRef}
              type="month"
              value={format(fechaDeReferencia, 'yyyy-MM')}
              onChange={handleMonthInputChange}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
            />
            <button
              type="button"
              onClick={abrirSelectorMesAnio}
              className="h-7 shrink-0 rounded-md border border-gray-300 bg-gray-100 px-2.5 text-xs capitalize text-gray-900 transition-colors hover:bg-gray-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100 dark:hover:bg-neutral-700"
            >
              {format(fechaDeReferencia, 'LLLL yyyy', { locale: es })}
            </button>
          </div>
        ) : (
          <div className="flex shrink-0 items-center gap-1.5">
            <Input 
              type="date" 
              value={fechaInicialRango} 
              onChange={(e) => setFechaInicialRango(e.target.value)} 
              className="h-7 w-[8.75rem] shrink-0 px-1 py-0 text-[11px] border border-gray-300 focus-visible:ring-0 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100" 
            />
            <span className="shrink-0 text-[10px] text-gray-500 dark:text-gray-400">a</span>
            <Input 
              type="date" 
              value={fechaFinalRango} 
              onChange={(e) => setFechaFinalRango(e.target.value)} 
              className="h-7 w-[8.75rem] shrink-0 px-1 py-0 text-[11px] border border-gray-300 focus-visible:ring-0 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-gray-100" 
            />
          </div>
        )}
      </div>
      </div>

      {filtroTipo === 'semanal' && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            onClick={irSemanaAnterior}
            aria-label="Semana anterior"
            className={WEEK_NAV_BTN_CLASS}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex flex-1 max-w-sm items-center justify-around">
          {diasDeLaSemana.map((dia) => {
            const diaStr = format(dia, 'yyyy-MM-dd');
            const esDiaSeleccionado = diaSeleccionado ? isSameDay(dia, diaSeleccionado) : false;
            const justificacionDia = getJustificacionParaDia(diaStr);
            const tieneAsueto = resolverAsueto(diaStr) !== null;
            const tieneComision = getComisionParaDia(diaStr) !== null;
            const esLaboral = esDiaLaboral(dia);
            if (!esLaboral && !tieneAsueto && !justificacionDia && !tieneComision) return null;
            return (
              <div 
                key={dia.toString()} 
                onClick={() => handleSeleccionDia(dia)} 
                className={`flex flex-col items-center justify-center w-11 h-11 rounded-md transition-all cursor-pointer relative
                  ${isToday(dia) && !esDiaSeleccionado ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : ''} 
                  ${isSameDay(dia, new Date(fechaHoraGt)) ? 'border border-blue-400 dark:border-blue-500' : ''} 
                  ${esDiaSeleccionado ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-bold shadow-lg scale-105' : 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-400'}`}
              >
                <span className="text-[10px] uppercase">{format(dia, 'eee', { locale: es })}</span>
                <span className="text-xs">{format(dia, 'd')}</span>
                {tieneAsueto && !esperandoJustificaciones && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-white dark:border-neutral-950" />
                )}
                {!esperandoJustificaciones && !tieneAsueto && justificacionDia && (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white dark:border-neutral-950 ${getJustificacionDotClass(justificacionDia)}`} />
                )}
                {!esperandoJustificaciones && !tieneAsueto && !justificacionDia && getComisionParaDia(diaStr) && (
                  <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full border border-white dark:border-neutral-950 ${COMISION_DOT_CLASS}`} />
                )}
              </div>
            );
          })}
          </div>
          <button
            type="button"
            onClick={irSemanaSiguiente}
            aria-label="Semana siguiente"
            className={WEEK_NAV_BTN_CLASS}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      )}

      <div className="border-t dark:border-neutral-800 pt-1 transition-colors">
        <p className="text-xs text-blue-600 dark:text-blue-400 text-center my-1">Haz click un registro para ver más información 🔍</p>
        
        {diasParaTabla.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 text-xs">Seleccione un rango de fechas válido.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-neutral-900 text-left text-gray-700 dark:text-gray-300">
              <tr>
                {!esVistaIndividual && <th className="px-3 py-2 text-xs w-1/4">Empleado</th>}
                {!esVistaIndividual && <th className="px-3 py-2 text-xs w-1/4">Puesto</th>}
                <th className="px-3 py-2 text-xs" colSpan={2}>
                  <div className={MARCaje_JUSTIFICACION_GRID_CLASS}>
                    <span className="min-w-0">{esHorarioMultiple ? 'Marcajes' : 'Marcaje'}</span>
                    <span className={`${JUSTIFICACION_COL_CLASS} text-center text-indigo-500 dark:text-indigo-400`}>Justificación</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {diasParaTabla.map((diaString) => {
                const datosDelDia = registrosAgrupados[diaString];
                const usuariosDelDia = datosDelDia ? sortUsuarios(Object.values(datosDelDia)) : [];
                
                const fechaDia = parseISO(diaString + 'T00:00:00');
                const esFuturo = isAfter(fechaDia, startOfToday());
                const justificacionDelDia = getJustificacionParaDia(diaString);
                const asuetoDelDia = resolverAsueto(diaString);
                const esAsueto = !!asuetoDelDia;
                const comisionDelDia = getComisionParaDia(diaString);
                const tieneEventoJustificable =
                  !!asuetoDelDia || !!justificacionDelDia || !!comisionDelDia;

                if (esFuturo && usuariosDelDia.length === 0 && !tieneEventoJustificable) {
                  return null;
                }

                return (
                  <Fragment key={diaString}>
                    {/* Encabezado del día — siempre gris, sin badge */}
                    <tr>
                      <td
                        colSpan={colSpanCount}
                        className="px-4 py-2 font-bold border-t border-b transition-colors bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-neutral-700 capitalize"
                      >
                        {format(fechaDia, "eeee, d 'de' LLLL", { locale: es })}
                        {asuetoDelDia && (
                          <span className="ml-1 text-[10px] italic font-medium normal-case text-amber-600 dark:text-amber-400">
                            — {asuetoDelDia.nombre}
                          </span>
                        )}
                      </td>
                    </tr>

                    {usuariosDelDia.length > 0 ? (
                      usuariosDelDia.map((usuario, index) => {
                        const sinRegistros = usuario.cantidad === 0;

                        return (
                          <tr 
                            key={index}
                            className="border-b dark:border-neutral-800 transition-colors"
                          >
                            {!esVistaIndividual && (<td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-200 font-bold">{usuario.nombre}</td>)}
                            {!esVistaIndividual && (<td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{usuario.puesto_nombre}</td>)}

                            <td colSpan={2} className="px-3 py-2">
                              <div className={MARCaje_JUSTIFICACION_GRID_CLASS}>
                                <div
                                  className={`min-w-0 ${!sinRegistros ? 'cursor-pointer' : ''}`}
                                  onClick={() => !sinRegistros && onAbrirMapa(usuario.entrada || usuario.salida || usuario.representante)}
                                >
                                  {sinRegistros ? (
                                    esperandoJustificaciones ? (
                                      <MarcajeSkeleton />
                                    ) : (
                                      renderMarcajeSinRegistro(
                                        diaString,
                                        justificacionDelDia,
                                        asuetoDelDia,
                                        comisionDelDia,
                                      ) ?? (
                                        !isToday(fechaDia) && !isAfter(fechaDia, startOfToday()) ? (
                                          <span className="text-xs text-red-500 dark:text-red-400 font-medium">
                                            Sin registros de asistencia
                                          </span>
                                        ) : null
                                      )
                                    )
                                  ) : (esHorarioMultiple || usuario.tieneMultiple || usuario.cantidad > 2) ? (
                                    <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-center text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[9px]">
                                      Ver Asistencia ({usuario.cantidad})
                                    </div>
                                  ) : (
                                    <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center justify-left">
                                      {(() => {
                                        const justificacionTextClass = justificacionDelDia
                                          ? getJustificacionTextClass(justificacionDelDia)
                                          : null;
                                        const horarioEntradaDia = resolverHorarioEntradaDia(
                                          diaString,
                                          horarioEntrada,
                                          horarioSalida,
                                          justificacionDelDia,
                                        );
                                        const entradaEsTarde =
                                          !!usuario.entrada &&
                                          !justificacionDelDia &&
                                          esEntradaTardeMarcaje({
                                            marcaEntradaAt: usuario.entrada.created_at,
                                            horarioEntrada: horarioEntradaDia,
                                            diaString,
                                            notas: usuario.entrada.notas,
                                          });
                                        const estadoMarcaje = resolverEstadoMarcaje({
                                          fechaStr: diaString,
                                          tieneEntrada: !!usuario.entrada,
                                          tieneSalida: !!usuario.salida,
                                          notasEntrada: usuario.entrada?.notas,
                                          notasSalida: usuario.salida?.notas,
                                          marcaEntradaAt: usuario.entrada?.created_at,
                                          horarioEntrada: horarioEntradaDia,
                                          cantidadMarcajes: null,
                                        });
                                        const entradaHoraClass = resolverMarcajeHoraTextClass({
                                          justificacionTextClass,
                                          asueto: !!asuetoDelDia,
                                          comision:
                                            !!comisionDelDia &&
                                            !justificacionDelDia &&
                                            !asuetoDelDia,
                                          tieneMarca: !!usuario.entrada,
                                          esEntradaTarde: entradaEsTarde,
                                          estadoMarcaje,
                                        });
                                        const salidaHoraClass = resolverMarcajeHoraTextClass({
                                          justificacionTextClass,
                                          asueto: !!asuetoDelDia,
                                          comision:
                                            !!comisionDelDia &&
                                            !justificacionDelDia &&
                                            !asuetoDelDia,
                                          tieneMarca: !!usuario.salida,
                                          estadoMarcaje,
                                        });
                                        const dashClass = getMarcajeDashClass(
                                          justificacionDelDia,
                                          asuetoDelDia,
                                          comisionDelDia,
                                        );
                                        return (
                                          <>
                                      <span className={MARCaje_FILA_CLASS}>
                                        <span className={MARCaje_ETIQUETA_CLASS}>Ent: </span>
                                        {usuario.entrada 
                                          ? (
                                            <span className={entradaHoraClass}>
                                              {format(new Date(usuario.entrada.created_at), 'hh:mm aa', { locale: es })}
                                            </span>
                                          )
                                          : esperandoJustificaciones
                                            ? <TiempoSkeleton />
                                            : <span className={`${dashClass} font-normal`}>--:--</span>}
                                      </span>
                                      <span className="text-gray-300 dark:text-neutral-700">|</span>
                                      <span className={MARCaje_FILA_CLASS}>
                                        <span className={MARCaje_ETIQUETA_CLASS}>Sal: </span>
                                        {usuario.salida 
                                          ? (
                                            <span className={salidaHoraClass}>
                                              {format(new Date(usuario.salida.created_at), 'hh:mm aa', { locale: es })}
                                            </span>
                                          )
                                          : esperandoJustificaciones
                                            ? <TiempoSkeleton />
                                            : <span className={`${dashClass} font-normal`}>--:--</span>}
                                      </span>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                                <div className={JUSTIFICACION_COL_CLASS}>
                                    <JustificacionBtn
                                      justificacion={esAsueto ? null : justificacionDelDia}
                                      asueto={asuetoDelDia}
                                      comision={esAsueto || justificacionDelDia ? null : comisionDelDia}
                                      fechaStr={diaString}
                                      cargando={esperandoJustificaciones}
                                      tieneEntrada={!!usuario.entrada}
                                      tieneSalida={!!usuario.salida}
                                      notasEntrada={usuario.entrada?.notas}
                                      notasSalida={usuario.salida?.notas}
                                      marcaEntradaAt={usuario.entrada?.created_at}
                                      horarioEntrada={resolverHorarioEntradaDia(
                                        diaString,
                                        horarioEntrada,
                                        horarioSalida,
                                        justificacionDelDia,
                                      )}
                                      cantidadMarcajes={
                                        esHorarioMultiple || usuario.tieneMultiple || usuario.cantidad > 2
                                          ? usuario.cantidad
                                          : null
                                      }
                                    />
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={colSpanCount} className="px-3 py-2">
                          <div className={MARCaje_JUSTIFICACION_GRID_CLASS}>
                          <div className="min-w-0">
                              {esperandoJustificaciones ? (
                                <MarcajeSkeleton />
                              ) : renderMarcajeSinRegistro(
                                diaString,
                                justificacionDelDia,
                                asuetoDelDia,
                                comisionDelDia,
                              ) ?? (
                                !isToday(fechaDia) && !isAfter(fechaDia, startOfToday())
                                  ? <span className="text-xs text-red-500 dark:text-red-400 font-medium">Sin registros de asistencia</span>
                                  : null
                              )}
                            </div>
                            <div className={`${JUSTIFICACION_COL_CLASS} cursor-pointer`}>
                              <JustificacionBtn
                                justificacion={esAsueto ? null : justificacionDelDia}
                                asueto={asuetoDelDia}
                                comision={esAsueto || justificacionDelDia ? null : comisionDelDia}
                                fechaStr={diaString}
                                cargando={esperandoJustificaciones}
                                tieneEntrada={false}
                                tieneSalida={false}
                              />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <PreviewPermiso
        isOpen={!!permisoPreview}
        onClose={() => setPermisoPreview(null)}
        permiso={permisoPreview}
      />

      <PreviewAcuerdo
        isOpen={!!acuerdoPreview}
        onClose={() => setAcuerdoPreview(null)}
        acuerdo={acuerdoPreview}
      />

      {comisionPreview && (
        <ModalPortal
          open={!!comisionPreview}
          onClose={() => setComisionPreview(null)}
          className="p-4"
        >
          <div className="bg-white dark:bg-neutral-950 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <VerComision
              comision={comisionPreview}
              usuarios={(comisionPreview.asistentes || []) as any}
              onClose={() => setComisionPreview(null)}
              onAbrirMapa={(registros, nombre) => {
                setMapaComisionRegistros(registros);
                setMapaComisionNombre(nombre);
              }}
              onEdit={() => {}}
              onDelete={() => {}}
              onAprobar={() => {}}
            />
          </div>
        </ModalPortal>
      )}

      {mapaComisionRegistros && (
        <Mapa
          isOpen={!!mapaComisionRegistros}
          onClose={() => { setMapaComisionRegistros(null); setMapaComisionNombre(''); }}
          registros={mapaComisionRegistros}
          nombreUsuario={mapaComisionNombre}
          titulo="Comisión"
        />
      )}
    </div>
    </>
  );
}