'use client';

import React, { useState, Fragment, useMemo } from 'react';
import { es } from 'date-fns/locale';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isToday, 
  addDays, 
  subDays, 
  getYear, 
  getMonth, 
  isSameDay, 
  startOfDay,
  endOfDay,
  isAfter,
  parseISO,
  startOfToday,
  isValid,
  getDay
} from 'date-fns';
import { ChevronsLeft, ChevronsRight, PartyPopper, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PermisoEmpleado } from '@/components/permisos/types';
import { esTipoAcuerdo } from '@/components/permisos/types';
import PreviewPermiso from '@/components/permisos/modals/PreviewPermiso';
import PreviewAcuerdo from '@/components/permisos/acuerdos/modals/PreviewAcuerdo';
import { obtenerJustificacionParaDia } from '@/components/permisos/justificaciones';
import VerComision from '@/components/comisiones/VerComision';
import Mapa from '@/components/ui/modals/Mapa';
import { useAsuetos, getAsuetoPorFecha } from '@/hooks/asistencia/useAsuetos';
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
import {
  resolverEstadoMarcaje,
  getEstadoMarcajeMeta,
  esEntradaTardeMarcaje,
  resolverHorarioEntradaDia,
  esTipoMarcajeLibre,
  ENTRADA_TARDE_TIME_CLASS,
  MARCaje_FILA_CLASS,
  MARCaje_ETIQUETA_CLASS,
  MARCaje_HORA_CLASS,
} from '@/components/asistencia/lib/estado-marcaje';

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
  "w-full min-h-[2.35rem] py-2 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 text-center text-[11px] sm:text-xs leading-snug border shadow-sm";
const JUSTIFICACION_ICON_CLASS = "w-4 h-4 flex-shrink-0";

const JustificacionSkeleton = () => (
  <div className="w-full min-h-[2.35rem] rounded-md bg-gray-200 dark:bg-neutral-700 animate-pulse" />
);

const TiempoSkeleton = () => (
  <span className="inline-block h-4 w-12 rounded bg-gray-200 dark:bg-neutral-700 animate-pulse align-middle" />
);

export default function Calendario({ todosLosRegistros = [], onAbrirMapa, fechaHoraGt, esHorarioMultiple = false, permisosEmpleado = [], comisionesEmpleado = [], horarioDias, horarioEntrada, horarioSalida, cargandoJustificaciones = false }: CalendarioProps) {
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

      if (esTipoMarcajeLibre(registro.tipo_registro)) {
          grupo.tieneMultiple = true;
      }

      if (registro.tipo_registro === 'Entrada') {
        if (!grupo.entrada || new Date(registro.created_at) < new Date(grupo.entrada.created_at)) {
          grupo.entrada = registro;
        }
      } else if (registro.tipo_registro === 'Salida') {
        if (!grupo.salida || new Date(registro.created_at) > new Date(grupo.salida.created_at)) {
          grupo.salida = registro;
        }
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
      const tieneAsueto = getAsuetoPorFecha(asuetos, diaStr) !== null;
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
  ]);

  const irSemanaSiguiente = () => setFechaDeReferencia(addDays(fechaDeReferencia, 7));
  const irSemanaAnterior = () => setFechaDeReferencia(subDays(fechaDeReferencia, 7));

  const handleSeleccionFecha = (anio: number, mes: number) => {
    const nuevaFecha = new Date(anio, mes, 1);
    setFechaDeReferencia(startOfWeek(nuevaFecha, { locale: es, weekStartsOn: 1 }));
    setDiaSeleccionado(undefined);
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
    <div className="p-1 bg-white dark:bg-neutral-950 rounded-lg shadow-md space-y-4 w-full transition-colors duration-200">

      <div className="flex items-center bg-gray-100 dark:bg-neutral-900 rounded-lg p-0 transition-colors">
        <div className="flex w-[40%] h-full rounded-l-lg overflow-hidden flex-shrink-0">
          <Button 
            variant={filtroTipo === 'semanal' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => handleFiltroTipoClick('semanal')} 
            className={`h-7 flex-1 px-1 text-[11px] rounded-r-none ${filtroTipo === 'semanal' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800'}`}
          >
            Semanal
          </Button>
          <Button 
            variant={filtroTipo === 'rango' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => handleFiltroTipoClick('rango')} 
            className={`h-7 flex-1 px-1 text-[11px] rounded-l-none ${filtroTipo === 'rango' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-md' : 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800'}`}
          >
            Rango
          </Button>
        </div>
        <div className="w-px h-6 bg-gray-300 dark:bg-neutral-700 mx-1"></div>
        <div className="flex w-[70%] items-center justify-end p-1">
          {filtroTipo === 'semanal' ? (
            <div className="flex justify-between items-center w-full xl:justify-center xl:gap-4">
              <button onClick={irSemanaAnterior} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-800"><ChevronsLeft className="h-4 w-4 text-gray-600 dark:text-gray-400 xl:h-6 xl:w-6" /></button>
              <div className='flex gap-1 text-xs xl:text-base xl:gap-2 w-full justify-between xl:w-auto'>
                <select 
                  value={getMonth(fechaDeReferencia)} 
                  onChange={(e) => handleSeleccionFecha(getYear(fechaDeReferencia), parseInt(e.target.value))} 
                  className="p-1 border border-gray-300 dark:border-neutral-700 rounded-md text-xs bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 h-7 focus:ring-0 appearance-none w-1/2 xl:text-lg xl:h-10 xl:w-32 xl:p-2 text-center"
                >
                  {Array.from({ length: 12 }).map((_, i) => (<option key={i} value={i} className="capitalize">{format(new Date(2000, i, 1), 'LLLL', { locale: es })}</option>))}
                </select>
                <select 
                  value={getYear(fechaDeReferencia)} 
                  onChange={(e) => handleSeleccionFecha(parseInt(e.target.value), getMonth(fechaDeReferencia))} 
                  className="p-1 border border-gray-300 dark:border-neutral-700 rounded-md text-xs bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-gray-100 h-7 focus:ring-0 appearance-none w-1/2 xl:text-lg xl:h-10 xl:w-28 xl:p-2 text-center"
                >
                  {Array.from({ length: 10 }).map((_, i) => { const anio = getYear(new Date()) - 5 + i; return <option key={anio} value={anio}>{anio}</option>; })}
                </select>
              </div>
              <button onClick={irSemanaSiguiente} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-neutral-800"><ChevronsRight className="h-4 w-4 text-gray-600 dark:text-gray-400 xl:h-6 xl:w-6" /></button>
            </div>
          ) : (
            <div className="flex text-xs lg:text-lg items-center gap-1 w-full xl:justify-center xl:gap-4">
              <Input 
                type="date" 
                value={fechaInicialRango} 
                onChange={(e) => setFechaInicialRango(e.target.value)} 
                className="w-1/2 text-[10px] h-7 px-1 py-0 border border-gray-300 dark:border-neutral-700 focus-visible:ring-0 bg-gray-100 dark:bg-neutral-800 dark:text-gray-100 xl:text-lg xl:h-10 xl:px-3" 
                placeholder="Fecha Inicial" 
              />
              <span className="text-gray-500 dark:text-gray-400 text-[10px] flex-shrink-0 xl:text-base">a</span>
              <Input 
                type="date" 
                value={fechaFinalRango} 
                onChange={(e) => setFechaFinalRango(e.target.value)} 
                className="w-1/2 text-[10px] h-7 px-1 py-0 border border-gray-300 dark:border-neutral-700 focus-visible:ring-0 bg-gray-100 dark:bg-neutral-800 dark:text-gray-100 xl:text-lg xl:h-10 xl:px-3" 
                placeholder="Fecha Final" 
              />
            </div>
          )}
        </div>
      </div>

      {filtroTipo === 'semanal' && (
        <div className="flex justify-around items-center pt-2">
          {diasDeLaSemana.map((dia) => {
            const diaStr = format(dia, 'yyyy-MM-dd');
            const esDiaSeleccionado = diaSeleccionado ? isSameDay(dia, diaSeleccionado) : false;
            const justificacionDia = getJustificacionParaDia(diaStr);
            const tieneAsueto = getAsuetoPorFecha(asuetos, diaStr) !== null;
            const tieneComision = getComisionParaDia(diaStr) !== null;
            const esLaboral = esDiaLaboral(dia);
            if (!esLaboral && !tieneAsueto && !justificacionDia && !tieneComision) return null;
            return (
              <div 
                key={dia.toString()} 
                onClick={() => handleSeleccionDia(dia)} 
                className={`flex flex-col items-center justify-center w-10 h-10 rounded-md transition-all cursor-pointer relative
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
                  <div className="flex items-center">
                    <span className="flex-1 min-w-0">{esHorarioMultiple ? 'Marcajes' : 'Marcaje'}</span>
                    <span className="w-[38%] sm:w-[32%] min-w-[6.75rem] flex-shrink-0 text-center text-indigo-500 dark:text-indigo-400">Justificación</span>
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
                const asuetoDelDia = getAsuetoPorFecha(asuetos, diaString);
                const esAsueto = !!asuetoDelDia;
                const comisionDelDia = getComisionParaDia(diaString);
                const tieneEventoJustificable =
                  !!asuetoDelDia || !!justificacionDelDia || !!comisionDelDia;
                const diaSinMarcaje =
                  usuariosDelDia.length === 0 ||
                  usuariosDelDia.every(
                    (u) => !u.entrada && !u.salida && !u.tieneMultiple,
                  );
                const etiquetaDiaSinMarcaje = asuetoDelDia
                  ? asuetoDelDia.nombre
                  : justificacionDelDia
                    ? esTipoAcuerdo(justificacionDelDia.tipo)
                      ? getCategoriaAcuerdoLabel(getCategoriaAcuerdo(justificacionDelDia))
                      : getCategoriaLabel(getCategoriaPermiso(justificacionDelDia))
                    : comisionDelDia
                      ? 'Comisión'
                      : null;
                const colorEtiquetaDiaSinMarcaje = asuetoDelDia
                  ? 'text-amber-600 dark:text-amber-400'
                  : justificacionDelDia
                    ? getJustificacionTextClass(justificacionDelDia)
                    : comisionDelDia
                      ? COMISION_TEXT_CLASS
                      : '';

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
                        {diaSinMarcaje && etiquetaDiaSinMarcaje && (
                          <span className={`ml-1 text-[10px] italic font-medium normal-case ${colorEtiquetaDiaSinMarcaje}`}>
                            — {etiquetaDiaSinMarcaje}
                          </span>
                        )}
                      </td>
                    </tr>

                    {usuariosDelDia.length > 0 ? (
                      usuariosDelDia.map((usuario, index) => {
                        const sinRegistros = !usuario.entrada && !usuario.salida && !usuario.tieneMultiple;

                        return (
                          <tr 
                            key={index}
                            className="border-b dark:border-neutral-800 transition-colors"
                          >
                            {!esVistaIndividual && (<td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-200 font-bold">{usuario.nombre}</td>)}
                            {!esVistaIndividual && (<td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{usuario.puesto_nombre}</td>)}

                            <td colSpan={2} className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                {/* Columna 3/4: Asistencia */}
                                <div
                                  className={`flex-1 min-w-0 ${!sinRegistros ? 'cursor-pointer' : ''}`}
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
                                  ) : (esHorarioMultiple || usuario.tieneMultiple) ? (
                                    <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-center text-center transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[9px]">
                                      Ver Asistencia ({usuario.cantidad})
                                    </div>
                                  ) : (
                                    <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center justify-left">
                                      {(() => {
                                        const textClass = getMarcajeDashClass(
                                          justificacionDelDia,
                                          asuetoDelDia,
                                          comisionDelDia,
                                        );
                                        const horarioEntradaDia = resolverHorarioEntradaDia(
                                          diaString,
                                          horarioEntrada,
                                          horarioSalida,
                                          justificacionDelDia,
                                        );
                                        const entradaEsTarde =
                                          usuario.entrada && !justificacionDelDia
                                            ? esEntradaTardeMarcaje({
                                                marcaEntradaAt: usuario.entrada.created_at,
                                                horarioEntrada: horarioEntradaDia,
                                                diaString,
                                                notas: usuario.entrada.notas,
                                              })
                                            : false;
                                        return (
                                          <>
                                      <span className={MARCaje_FILA_CLASS}>
                                        <span className={MARCaje_ETIQUETA_CLASS}>Ent: </span>
                                        {usuario.entrada 
                                          ? (
                                            <span className={entradaEsTarde ? ENTRADA_TARDE_TIME_CLASS : MARCaje_HORA_CLASS}>
                                              {format(new Date(usuario.entrada.created_at), 'hh:mm aa', { locale: es })}
                                            </span>
                                          )
                                          : esperandoJustificaciones
                                            ? <TiempoSkeleton />
                                            : <span className={`${textClass} font-normal`}>--:--</span>}
                                      </span>
                                      <span className="text-gray-300 dark:text-neutral-700">|</span>
                                      <span className={MARCaje_FILA_CLASS}>
                                        <span className={MARCaje_ETIQUETA_CLASS}>Sal: </span>
                                        {usuario.salida 
                                          ? (
                                            <span className={MARCaje_HORA_CLASS}>
                                              {format(new Date(usuario.salida.created_at), 'hh:mm aa', { locale: es })}
                                            </span>
                                          )
                                          : esperandoJustificaciones
                                            ? <TiempoSkeleton />
                                            : <span className={`${textClass} font-normal`}>--:--</span>}
                                      </span>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                                {/* Columna 1/4: Justificación */}
                                <div className="w-[38%] sm:w-[32%] min-w-[6.75rem] flex-shrink-0">
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
                                        esHorarioMultiple || usuario.tieneMultiple
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
                          <div className="flex items-center gap-1">
                          <div className="flex-1 min-w-0">
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
                            <div className="w-[38%] sm:w-[32%] min-w-[6.75rem] flex-shrink-0 cursor-pointer">
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setComisionPreview(null); }}
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
        </div>
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
  );
}