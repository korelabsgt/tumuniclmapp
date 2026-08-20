'use client';

import React, { Fragment, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertCircle, LogIn, LogOut, PartyPopper, Briefcase } from 'lucide-react';
import { format, parseISO, isAfter, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { PermisoEmpleado, esTipoAcuerdo } from '@/components/permisos/types';
import {
  permisoAplicaEnDia,
} from '@/components/permisos/utilidades';
import {
  getMensajeSinMarcaje,
  getCategoriaPermiso,
  getCategoriaIcon,
  getCategoriaLabel,
  getCategoriaJustificacionClass,
  getCategoriaTextClass,
  COMISION_TEXT_CLASS,
  COMISION_BADGE_CLASS,
} from '@/components/permisos/categorias';
import {
  getCategoriaAcuerdo,
  getCategoriaAcuerdoIcon,
  getCategoriaAcuerdoLabel,
  getCategoriaAcuerdoJustificacionClass,
  getCategoriaAcuerdoTextClass,
} from '@/components/permisos/acuerdos/categorias';
import { Asueto, getAsuetoPorFecha, ParentByDependenciaId } from '@/hooks/asistencia/useAsuetos';
import type { ComisionConFechaYHoraSeparada } from '@/hooks/comisiones/useObtenerComisiones';
import {
  resolverEstadoMarcaje,
  getEstadoMarcajeMeta,
  esEntradaTardeMarcaje,
  ENTRADA_TARDE_TIME_CLASS,
  MARCaje_FILA_CLASS,
  MARCaje_ETIQUETA_CLASS,
  MARCaje_HORA_CLASS,
  resolverHorarioEntradaDia,
} from '@/components/asistencia/lib/estado-marcaje';
import type { Usuario } from '@/lib/usuarios/esquemas';

type ComisionInfo = ComisionConFechaYHoraSeparada;

interface OficinaAccordionProps {
  nombreOficina: string;
  registros: any[];
  vistaAgrupada: 'nombre' | 'fecha';
  estaAbierta: boolean;
  onToggle: () => void;
  onAbrirModal: (reg: any, nombre?: string) => void;
  permisosMap?: Record<string, PermisoEmpleado[]>;
  comisionesMap?: Record<string, ComisionInfo[]>;
  onVerPermiso?: (permiso: PermisoEmpleado) => void;
  onVerAcuerdo?: (acuerdo: PermisoEmpleado) => void;
  onVerComision?: (comision: ComisionInfo) => void;
  asuetos?: Asueto[];
  parentByDependenciaId?: ParentByDependenciaId;
  dependenciaPorUsuario?: Record<string, string | null>;
  usuarios?: Usuario[];
  horariosMap?: Record<string, { entrada: string; salida: string | null }>;
}

export default function OficinaAccordion({
  nombreOficina,
  registros,
  vistaAgrupada,
  estaAbierta,
  onToggle,
  onAbrirModal,
  permisosMap = {},
  comisionesMap = {},
  onVerPermiso,
  onVerAcuerdo,
  onVerComision,
  asuetos = [],
  parentByDependenciaId,
  dependenciaPorUsuario = {},
  usuarios = [],
  horariosMap = {},
}: OficinaAccordionProps) {
  const resolverAsueto = (userId: string, diaString: string) =>
    getAsuetoPorFecha(
      asuetos,
      diaString,
      dependenciaPorUsuario[userId],
      parentByDependenciaId,
    );

  const horariosPorUsuario = useMemo(() => {
    const map: Record<string, { entrada: string; salida: string | null }> = {
      ...horariosMap,
    };
    usuarios.forEach((u) => {
      const usuario = u as Usuario & {
        user_id?: string;
        horario_entrada?: string | null;
        horario_salida?: string | null;
      };
      const id = usuario.id || usuario.user_id;
      if (!id || map[id]) return;
      map[id] = {
        entrada: usuario.horario_entrada || '08:00:00',
        salida: usuario.horario_salida || null,
      };
    });
    return map;
  }, [horariosMap, usuarios]);

  const resolverHorarioEntrada = (
    userId: string,
    diaString: string,
    permiso: PermisoEmpleado | null,
  ) =>
    resolverHorarioEntradaDia(
      diaString,
      horariosPorUsuario[userId]?.entrada || '08:00:00',
      horariosPorUsuario[userId]?.salida,
      permiso,
    );

  let diaActual = "";

  const formatTime = (
    iso: string | null | undefined,
    permiso: PermisoEmpleado | null,
    diaString?: string,
    tipo?: 'entrada' | 'salida',
    comision?: boolean,
    notas?: string | null,
    horarioEntrada?: string | null,
    userId?: string,
  ) => {
    if (iso) {
      const hora = format(parseISO(iso), 'hh:mm aa', { locale: es });
      const horario =
        horarioEntrada ||
        (userId && diaString ? resolverHorarioEntrada(userId, diaString, permiso) : '08:00:00');
      if (
        tipo === 'entrada' &&
        !permiso &&
        esEntradaTardeMarcaje({
          marcaEntradaAt: iso,
          horarioEntrada: horario,
          diaString,
          notas,
        })
      ) {
        return <span className={ENTRADA_TARDE_TIME_CLASS}>{hora}</span>;
      }
      return <span className={MARCaje_HORA_CLASS}>{hora}</span>;
    }
    const colorClass = permiso
      ? getJustificacionTextClass(permiso)
      : comision
        ? COMISION_TEXT_CLASS
        : 'text-red-500';
    return <span className={`${colorClass} font-normal`}>--:--</span>;
  };

  const getComisionParaDia = (userId: string, diaString: string): ComisionInfo | null => {
    const comisiones = comisionesMap[userId] || [];
    return comisiones.find(c => c.fecha_hora.startsWith(diaString)) || null;
  };

  const getPermisoParaDia = (userId: string, diaString: string): PermisoEmpleado | null => {
    const permisos = permisosMap[userId] || [];
    return permisos.find(p => permisoAplicaEnDia(p, diaString)) || null;
  };

  const getJustificacionTextClass = (justificacion: PermisoEmpleado) => {
    if (esTipoAcuerdo(justificacion.tipo)) {
      return getCategoriaAcuerdoTextClass(getCategoriaAcuerdo(justificacion));
    }
    return getCategoriaTextClass(getCategoriaPermiso(justificacion));
  };

  const getMensajeDiaSinMarcaje = (
    justificacion: PermisoEmpleado | null,
    asueto: Asueto | null,
    comision: ComisionInfo | null,
  ) => {
    if (justificacion && esTipoAcuerdo(justificacion.tipo)) {
      return {
        texto: 'Justificación',
        className: getJustificacionTextClass(justificacion),
      };
    }
    return getMensajeSinMarcaje({
      asueto: !!asueto,
      permiso: justificacion,
      comision: !asueto && !justificacion && !!comision,
    });
  };

  const renderEntSalVacio = (
    justificacion: PermisoEmpleado | null,
    asueto: Asueto | null,
    comision: ComisionInfo | null,
    sizeClass = MARCaje_FILA_CLASS,
  ) => {
    const dashClass = justificacion
      ? getJustificacionTextClass(justificacion)
      : asueto
        ? 'text-amber-500 dark:text-amber-400'
        : comision
          ? COMISION_TEXT_CLASS
          : 'text-red-400';

    return (
      <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center">
        <span className={MARCaje_FILA_CLASS}>
          <span className={MARCaje_ETIQUETA_CLASS}>Ent: </span>
          <span className={`${dashClass} font-normal`}>--:--</span>
        </span>
        <span className="text-gray-300 dark:text-neutral-700">|</span>
        <span className={MARCaje_FILA_CLASS}>
          <span className={MARCaje_ETIQUETA_CLASS}>Sal: </span>
          <span className={`${dashClass} font-normal`}>--:--</span>
        </span>
      </div>
    );
  };

  const JUSTIFICACION_BADGE_CLASS =
    'w-full min-h-[2.35rem] py-2 px-2 rounded-md font-bold flex items-center justify-center gap-1.5 text-center text-[11px] sm:text-xs leading-snug border shadow-sm';
  const JUSTIFICACION_ICON_CLASS = 'w-4 h-4 flex-shrink-0';

  /** Botón de justificación con íconos */
  const JustificacionBtn = ({ justificacion, asueto, comision, fechaStr, tieneEntrada = false, tieneSalida = false, notasEntrada, notasSalida, marcaEntradaAt, horarioEntrada, cantidadMarcajes }: {
    justificacion: PermisoEmpleado | null;
    asueto: Asueto | null;
    comision: ComisionInfo | null;
    fechaStr: string;
    tieneEntrada?: boolean;
    tieneSalida?: boolean;
    notasEntrada?: string | null;
    notasSalida?: string | null;
    marcaEntradaAt?: string | null;
    horarioEntrada?: string | null;
    cantidadMarcajes?: number | null;
  }) => {
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
        const categoria = getCategoriaAcuerdo(justificacion);
        const Icono = getCategoriaAcuerdoIcon(categoria);
        return (
          <button
            onClick={(e) => { e.stopPropagation(); onVerAcuerdo?.(justificacion); }}
            className={`${JUSTIFICACION_BADGE_CLASS} transition-colors cursor-pointer ${getCategoriaAcuerdoJustificacionClass(categoria)}`}
          >
            <Icono className={JUSTIFICACION_ICON_CLASS} />
            {getCategoriaAcuerdoLabel(categoria)}
          </button>
        );
      }
      const categoria = getCategoriaPermiso(justificacion);
      const Icono = getCategoriaIcon(categoria);
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onVerPermiso?.(justificacion); }}
          className={`${JUSTIFICACION_BADGE_CLASS} transition-colors cursor-pointer ${getCategoriaJustificacionClass(categoria)}`}
        >
          <Icono className={JUSTIFICACION_ICON_CLASS} />
          {getCategoriaLabel(categoria)}
        </button>
      );
    }

    // Comisión — siempre tiene prioridad sobre Correcto/Sin Permiso
    if (comision) {
      return (
        <button
          onClick={(e) => { e.stopPropagation(); onVerComision?.(comision); }}
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

  const contarRegistrosReales = () => {
    if (vistaAgrupada === 'fecha') return registros.filter(r => !r.esDiaVacio).length;
    return registros.length;
  };

  return (
    <Fragment>
      <tr className="border-b border-slate-100 dark:border-neutral-800">
        <td colSpan={3} className="p-1">
          <div
            onClick={onToggle}
            className="bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors py-2.5 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between rounded-sm"
          >
            <span>{nombreOficina} ({contarRegistrosReales()})</span>
            <motion.div
              initial={false}
              animate={{ rotate: estaAbierta ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </motion.div>
          </div>
        </td>
      </tr>

      <AnimatePresence initial={false}>
        {estaAbierta && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: 'hidden' }}
          >
            <td colSpan={3} className="p-0">
              <table className="w-full">
                <tbody>
                  {vistaAgrupada === 'fecha' ? (
                    registros.map((registro: any, index: number) => {
                      const mostrarEncabezadoDia = registro.diaString !== diaActual;
                      if (mostrarEncabezadoDia) diaActual = registro.diaString;

                      const esMultiple = registro.multiple && registro.multiple.length > 0;
                      const totalRegistros = (registro.entrada ? 1 : 0) + (registro.salida ? 1 : 0) + (registro.multiple?.length || 0);
                      const esVacio = (registro.esDiaVacio || registro.esAusencia) && totalRegistros === 0;
                      const permiso = getPermisoParaDia(registro.userId, registro.diaString);
                      const asueto = resolverAsueto(registro.userId, registro.diaString);
                      const comision = !asueto && !permiso ? getComisionParaDia(registro.userId, registro.diaString) : null;
                      if (isAfter(parseISO(registro.diaString + 'T00:00:00'), startOfToday()) && totalRegistros === 0 && !asueto && !comision) return null;

                      return (
                        <Fragment key={`${registro.userId}-${registro.diaString}-${index}`}>
                          {mostrarEncabezadoDia && (
                            <tr>
                              <td colSpan={3} className="bg-slate-100 dark:bg-neutral-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-200 border-t border-b border-slate-200 dark:border-neutral-700 capitalize text-xs">
                                {format(parseISO(registro.diaString + 'T00:00:00'), "eeee, d 'de' LLLL", { locale: es })}
                              </td>
                            </tr>
                          )}

                          <tr className="border-b border-slate-100 dark:border-neutral-800 transition-colors">
                              {/* Nombre */}
                              <td className="py-2 px-3 text-xs text-slate-700 dark:text-slate-300 w-[45%]">
                                {registro.nombre}
                              </td>
                              {/* Asistencia + Permiso */}
                              <td colSpan={2} className="py-2 px-3">
                                <div className="flex items-center gap-1">
                                  <div
                                    className={`w-3/4 ${!esVacio ? 'cursor-pointer' : ''}`}
                                    onClick={() => !esVacio && onAbrirModal(registro)}
                                  >
                                    {esMultiple || totalRegistros > 2 ? (
                                      <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-center text-center hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[9px]">
                                        Ver Asistencia ({totalRegistros})
                                      </div>
                                    ) : esVacio ? (() => {
                                      const msg = getMensajeDiaSinMarcaje(permiso, asueto, comision);
                                      return (
                                        <span className={`text-[9px] md:text-sm font-medium italic whitespace-nowrap ${msg.className}`}>
                                          {msg.texto}
                                        </span>
                                      );
                                    })() : (
                                      <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center">
                                        <span className={MARCaje_FILA_CLASS}>
                                          <span className={MARCaje_ETIQUETA_CLASS}>Ent: </span>
                                          {formatTime(registro.entrada?.created_at || registro.entrada?.fecha_hora, permiso, registro.diaString, 'entrada', false, registro.entrada?.notas, undefined, registro.userId)}
                                        </span>
                                        <span className="text-gray-300 dark:text-neutral-700">|</span>
                                        <span className={MARCaje_FILA_CLASS}>
                                          <span className={MARCaje_ETIQUETA_CLASS}>Sal: </span>
                                          {registro.salida
                                            ? formatTime(registro.salida?.created_at || registro.salida?.fecha_hora, permiso, registro.diaString, 'salida')
                                            : formatTime(null, permiso, registro.diaString, 'salida', !!comision)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="w-1/4 flex-shrink-0 cursor-pointer">
                                    <JustificacionBtn
                                      justificacion={permiso}
                                      asueto={asueto}
                                      comision={comision}
                                      fechaStr={registro.diaString}
                                      tieneEntrada={!!registro.entrada}
                                      tieneSalida={!!registro.salida}
                                      notasEntrada={registro.entrada?.notas}
                                      notasSalida={registro.salida?.notas}
                                      marcaEntradaAt={registro.entrada?.created_at || registro.entrada?.fecha_hora || registro.multiple?.[0]?.created_at}
                                      horarioEntrada={resolverHorarioEntrada(registro.userId, registro.diaString, permiso)}
                                      cantidadMarcajes={esMultiple || totalRegistros > 2 ? totalRegistros : null}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                        </Fragment>
                      );
                    })
                  ) : (
                    registros.map((usuario: any) => {
                      const todayStr = format(new Date(), 'yyyy-MM-dd');
                      const totalAusencias = usuario.asistencias.filter((a: any) => {
                        if (!a.esAusencia) return false;
                        if (a.diaString > todayStr) return false; // excluir futuro
                        // Excluir si tiene cualquier justificación
                        const tieneComision = (comisionesMap[usuario.userId] || []).some(c => c.fecha_hora.startsWith(a.diaString));
                        if (tieneComision) return false;
                        const tienePermiso = (permisosMap[usuario.userId] || []).some(p =>
                          permisoAplicaEnDia(p, a.diaString),
                        );
                        if (tienePermiso) return false;
                        const tieneAsueto = !!resolverAsueto(usuario.userId, a.diaString);
                        return !tieneAsueto;
                      }).length;
                      const totalSinEntrada = usuario.asistencias.filter((a: any) => !a.esAusencia && !a.entrada && (!a.multiple || a.multiple.length === 0)).length;
                      const totalSinSalida = usuario.asistencias.filter((a: any) => !a.esAusencia && !a.salida && (!a.multiple || a.multiple.length === 0)).length;

                        return (
                        <Fragment key={usuario.userId}>
                          {/* Encabezado usuario */}
                          <tr>
                            <td colSpan={3} className="bg-slate-50 dark:bg-neutral-900 py-1.5 px-4 font-medium text-slate-500 dark:text-slate-400 text-[11px] border-y border-slate-100 dark:border-neutral-800 tracking-wide">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="uppercase text-slate-700 dark:text-slate-300 font-bold">{usuario.nombre}</span>
                                <div className="flex items-center gap-3 text-[9px] md:text-sm">
                                  {totalAusencias > 0 && (
                                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800">
                                      <AlertCircle size={10} /> {totalAusencias} Inasistencia{totalAusencias !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {totalSinEntrada > 0 && (
                                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-1.5 py-0.5 rounded border border-orange-200 dark:border-orange-800">
                                      <LogIn size={10} /> {totalSinEntrada} Sin Entrada
                                    </span>
                                  )}
                                  {totalSinSalida > 0 && (
                                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                      <LogOut size={10} /> {totalSinSalida} Sin Salida
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                          {/* Filas de asistencia */}
                          {usuario.asistencias.map((asistencia: any, idx: number) => {
                             const esMultiple = asistencia.multiple && asistencia.multiple.length > 0;
                             const totalRegistros = (asistencia.entrada ? 1 : 0) + (asistencia.salida ? 1 : 0) + (asistencia.multiple?.length || 0);
                             const esAusencia = !!asistencia.esAusencia && totalRegistros === 0;
                             const permiso = getPermisoParaDia(usuario.userId, asistencia.diaString);
                             const asueto = resolverAsueto(usuario.userId, asistencia.diaString);
                             const comision = !asueto && !permiso ? getComisionParaDia(usuario.userId, asistencia.diaString) : null;
                             if (isAfter(parseISO(asistencia.diaString + 'T00:00:00'), startOfToday()) && totalRegistros === 0 && !asueto && !comision) return null;

                            return (
                              <tr
                                key={`${usuario.userId}-${asistencia.diaString}-${idx}`}
                                className="border-b border-slate-100 dark:border-neutral-800 transition-colors"
                              >
                                {/* Fecha */}
                                {(() => {
                                  const ausenciaColor = esAusencia && !asueto
                                    ? permiso
                                      ? getJustificacionTextClass(permiso)
                                      : comision ? COMISION_TEXT_CLASS : 'text-red-500'
                                    : 'text-slate-700 dark:text-slate-300';
                                  const sinRegistrosLabel = permiso
                                    ? esTipoAcuerdo(permiso.tipo)
                                      ? getCategoriaAcuerdoLabel(getCategoriaAcuerdo(permiso))
                                      : getCategoriaLabel(getCategoriaPermiso(permiso))
                                    : comision ? 'Comisión' : 'Sin registros';
                                  const sinRegistrosColor = permiso
                                    ? getJustificacionTextClass(permiso)
                                    : comision ? COMISION_TEXT_CLASS : 'text-red-500';
                                  return (
                                    <td className={`py-2 px-3 text-xs w-[45%] pl-8 capitalize font-medium ${ausenciaColor}`}>
                                      {format(parseISO(asistencia.diaString + 'T00:00:00'), "eee d 'de' MMM", { locale: es })}
                                      {esAusencia && !asueto && (
                                        <span className={`ml-1 text-[9px] italic ${sinRegistrosColor}`}>
                                          — {sinRegistrosLabel}
                                        </span>
                                      )}
                                      {asueto && <span className="ml-1 text-[9px] italic text-amber-600">— {asueto.nombre}</span>}
                                    </td>
                                  );
                                })()}

                                {/* Asistencia + Permiso */}
                                <td colSpan={2} className="py-2 px-3">
                                  <div className="flex items-center gap-1">
                                    <div
                                      className={`w-3/4 ${!esAusencia ? 'cursor-pointer' : ''}`}
                                      onClick={() => !esAusencia && onAbrirModal(asistencia, usuario.nombre)}
                                    >
                                      {esAusencia ? (
                                        renderEntSalVacio(permiso, asueto, comision)
                                      ) : esMultiple || totalRegistros > 2 ? (
                                        <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-center text-center hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[9px]">
                                          Ver Asistencia ({totalRegistros})
                                        </div>
                                      ) : (
                                        <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center">
                                          <span className={MARCaje_FILA_CLASS}>
                                            <span className={MARCaje_ETIQUETA_CLASS}>Ent: </span>
                                            {formatTime(asistencia.entrada?.created_at || asistencia.entrada?.fecha_hora, permiso, asistencia.diaString, 'entrada', false, asistencia.entrada?.notas, undefined, usuario.userId)}
                                          </span>
                                          <span className="text-gray-300 dark:text-neutral-700">|</span>
                                          <span className={MARCaje_FILA_CLASS}>
                                            <span className={MARCaje_ETIQUETA_CLASS}>Sal: </span>
                                            {asistencia.salida
                                              ? formatTime(asistencia.salida?.created_at || asistencia.salida?.fecha_hora, permiso, asistencia.diaString, 'salida')
                                              : formatTime(null, permiso, asistencia.diaString, 'salida', !!comision)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="w-1/4 flex-shrink-0 cursor-pointer">
                                      <JustificacionBtn
                                        justificacion={permiso}
                                        asueto={asueto}
                                        comision={comision}
                                        fechaStr={asistencia.diaString}
                                        tieneEntrada={!!asistencia.entrada}
                                        tieneSalida={!!asistencia.salida}
                                        notasEntrada={asistencia.entrada?.notas}
                                        notasSalida={asistencia.salida?.notas}
                                        marcaEntradaAt={asistencia.entrada?.created_at || asistencia.entrada?.fecha_hora || asistencia.multiple?.[0]?.created_at}
                                        horarioEntrada={resolverHorarioEntrada(usuario.userId, asistencia.diaString, permiso)}
                                        cantidadMarcajes={esMultiple || totalRegistros > 2 ? totalRegistros : null}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </Fragment>
  );
}