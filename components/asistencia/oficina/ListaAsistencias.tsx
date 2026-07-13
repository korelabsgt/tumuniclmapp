import React, { Fragment } from 'react';
import { format, parseISO, isAfter, startOfToday } from 'date-fns';
import { es } from 'date-fns/locale';
import { List, FileCheck, AlertCircle } from 'lucide-react';
import { RegistrosAgrupadosPorUsuario, RegistrosAgrupadosDiarios, AsistenciaEnriquecida } from './types';
import { PermisoEmpleado } from '@/components/permisos/types';
import { permisoAplicaEnDia } from '@/components/permisos/utilidades';
import { getMensajeSinMarcaje } from '@/components/permisos/categorias';

interface ListaAsistenciasProps {
    vista: 'nombre' | 'fecha';
    registrosPorUsuario?: RegistrosAgrupadosPorUsuario[];
    registrosPorFecha?: RegistrosAgrupadosDiarios[];
    onAbrirModal: (
        asistencia: { entrada: AsistenciaEnriquecida | null, salida: AsistenciaEnriquecida | null, multiple?: AsistenciaEnriquecida[] },
        nombreUsuario: string
    ) => void;
    // Permisos indexados por userId -> lista de permisos
    permisosMap?: Record<string, PermisoEmpleado[]>;
    onVerPermiso?: (permiso: PermisoEmpleado) => void;
}

const ListaAsistencias: React.FC<ListaAsistenciasProps> = ({
    vista,
    registrosPorUsuario = [],
    registrosPorFecha = [],
    onAbrirModal,
    permisosMap = {},
    onVerPermiso,
}) => {

    let diaActual = "";

    const esDiaVacio = (entrada: any, salida: any, multiple: any[]) =>
        !entrada && !salida && (!multiple || multiple.length === 0);

    const getPermisoParaDia = (userId: string, diaString: string): PermisoEmpleado | null => {
        const permisos = permisosMap[userId] || [];
        return permisos.find(p => permisoAplicaEnDia(p, diaString)) || null;
    };

    const hayDatos = vista === 'nombre'
        ? registrosPorUsuario.length > 0
        : registrosPorFecha.length > 0;

    const JustificacionBtn = ({ permiso, totalRegistros, fechaStr }: { permiso: PermisoEmpleado | null, totalRegistros: number, fechaStr: string }) => {
        if (permiso) {
            const esVacaciones = permiso.tipo.toLowerCase().includes('vacaciones');
            return (
                <button
                    onClick={(e) => { e.stopPropagation(); onVerPermiso?.(permiso); }}
                    className={`w-full py-1.5 px-1.5 rounded font-bold flex flex-row items-center justify-center gap-1 transition-colors text-[9px] leading-tight border shadow-sm cursor-pointer ${
                        esVacaciones
                            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 border-purple-100 dark:border-purple-900/30'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-900/30'
                    }`}
                >
                    <FileCheck size={12} />
                    <span className="text-center">{esVacaciones ? 'Vacaciones' : 'Permiso'}</span>
                </button>
            );
        }

        // Futuro: ocultar si no hay nada
        const fechaDia = parseISO(fechaStr + 'T00:00:00');
        const esFuturo = isAfter(fechaDia, startOfToday());
        if (esFuturo && totalRegistros === 0) {
            return null;
        }

        // 0 o 1 registros = Sin Permiso
        if (totalRegistros < 2) {
            return (
                <div className="w-full py-1.5 px-1.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold flex flex-row items-center justify-center gap-1 text-[9px] leading-tight border border-red-100 dark:border-red-900/30 cursor-default transition-colors shadow-sm">
                    <AlertCircle size={12} />
                    <span className="text-center">Sin Permiso</span>
                </div>
            );
        }

        // 2 o más registros = Asistencia Correcta
        return (
            <div className="w-full py-1.5 px-1.5 rounded bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400 font-bold flex flex-row items-center justify-center gap-1 text-[9px] leading-tight border border-green-100 dark:border-green-900/30 cursor-default transition-colors shadow-sm">
                <FileCheck size={12} className="opacity-70" />
                <span className="text-center">Asist. Correcta</span>
            </div>
        );
    };

    return (
        <div className="w-full">
            {!hayDatos ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="h-6 w-6 opacity-50" />
                        <p className="text-xs">No se encontraron registros para mostrar.</p>
                    </div>
                </div>
            ) : (
                <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-neutral-900 text-left text-gray-700 dark:text-gray-300">
                        <tr>
                            {vista === 'nombre' ? (
                                <th className="px-3 py-2 text-xs">Fecha</th>
                            ) : (
                                <th className="px-3 py-2 text-xs">Empleado</th>
                            )}
                            <th className="px-3 py-2 text-xs" colSpan={2}>
                                <div className="flex items-center">
                                    <span className="w-3/4">Marcaje</span>
                                    <span className="w-1/4 text-center text-indigo-500 dark:text-indigo-400">Justificación</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {vista === 'nombre' ? (
                            registrosPorUsuario.map((usuario) => (
                                <Fragment key={usuario.userId}>
                                    {/* Encabezado de usuario */}
                                    <tr className="bg-slate-100 dark:bg-neutral-800 border-y border-slate-200 dark:border-neutral-700">
                                        <td colSpan={3} className="py-2 px-4 font-bold text-slate-800 dark:text-slate-200 text-sm">
                                            <div>
                                                <span>{usuario.nombre}</span>
                                                {usuario.puesto_nombre && (
                                                    <span className="ml-2 text-[10px] text-slate-500 dark:text-slate-400 font-normal">{usuario.puesto_nombre}</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>

                                    {usuario.asistencias.length > 0 ? (
                                        usuario.asistencias.map((asistencia) => {
                                            const esMultiple = asistencia.multiple && asistencia.multiple.length > 0;
                                            const totalRegistros = (asistencia.entrada ? 1 : 0) + (asistencia.salida ? 1 : 0) + (asistencia.multiple?.length || 0);
                                            const sinRegistros = esDiaVacio(asistencia.entrada, asistencia.salida, asistencia.multiple);
                                            const permiso = getPermisoParaDia(usuario.userId, asistencia.diaString);
                                            // Fecha futura sin datos: no mostrar
                                            if (isAfter(parseISO(asistencia.diaString + 'T00:00:00'), startOfToday()) && sinRegistros && !permiso) return null;

                                            return (
                                                <tr
                                                    key={asistencia.diaString}
                                                    className="border-b dark:border-neutral-800 transition-colors"
                                                >
                                                    {/* Fecha */}
                                                    <td className="px-3 py-2 text-xs capitalize text-gray-700 dark:text-gray-300 w-1/3">
                                                        {format(parseISO(asistencia.diaString + 'T00:00:00'), 'eee d MMM', { locale: es })}
                                                    </td>

                                                    {/* Asistencia + Permiso */}
                                                    <td colSpan={2} className="px-3 py-2">
                                                        <div className="flex items-center gap-1">
                                                            {/* 3/4: Asistencia */}
                                                            <div
                                                                className={`w-3/4 ${!sinRegistros ? 'cursor-pointer' : ''}`}
                                                                onClick={() => !sinRegistros && onAbrirModal({
                                                                    entrada: asistencia.entrada,
                                                                    salida: asistencia.salida,
                                                                    multiple: esMultiple ? asistencia.multiple : undefined
                                                                }, usuario.nombre)}
                                                            >
                                                                 {sinRegistros ? (() => {
                                                                    const msg = getMensajeSinMarcaje({ permiso });
                                                                    return (
                                                                    <span className={`text-[9px] font-medium ${msg.className}`}>{msg.texto}</span>
                                                                    );
                                                                 })() : esMultiple || totalRegistros > 2 ? (
                                                                    <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[9px]">
                                                                        <List size={12} /> Ver Asistencia ({totalRegistros})
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center">
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                            <span className="font-bold text-gray-700 dark:text-gray-300">Ent: </span>
                                                                            {asistencia.entrada
                                                                                ? format(parseISO(asistencia.entrada.created_at), 'hh:mm aa', { locale: es })
                                                                                : <span className={`${permiso ? (permiso.tipo.toLowerCase().includes('vacaciones') ? 'text-purple-500 dark:text-purple-400' : 'text-blue-500 dark:text-blue-400') : 'text-red-400'} font-bold`}>--:--</span>}
                                                                        </span>
                                                                        <span className="text-gray-300 dark:text-neutral-700">|</span>
                                                                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                            <span className="font-bold text-gray-700 dark:text-gray-300">Sal: </span>
                                                                            {asistencia.salida
                                                                                ? format(parseISO(asistencia.salida.created_at), 'hh:mm aa', { locale: es })
                                                                                : <span className={`${permiso ? (permiso.tipo.toLowerCase().includes('vacaciones') ? 'text-purple-500 dark:text-purple-400' : 'text-blue-500 dark:text-blue-400') : 'text-red-400'} font-bold`}>--:--</span>}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* 1/4: Permiso */}
                                                            <div className="w-1/4 flex-shrink-0 cursor-pointer">
                                                                <JustificacionBtn permiso={permiso} totalRegistros={totalRegistros} fechaStr={asistencia.diaString} />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr className="border-b dark:border-neutral-800">
                                            <td colSpan={3} className="py-3 px-4 text-xs text-slate-400 dark:text-slate-500 italic">
                                                No hay registros en el rango seleccionado.
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        ) : (
                            registrosPorFecha.map((registro) => {
                                const mostrarEncabezadoDia = registro.diaString !== diaActual;
                                if (mostrarEncabezadoDia) diaActual = registro.diaString;

                                const esMultiple = registro.multiple && registro.multiple.length > 0;
                                const totalRegistros = (registro.entrada ? 1 : 0) + (registro.salida ? 1 : 0) + (registro.multiple?.length || 0);
                                const sinRegistros = esDiaVacio(registro.entrada, registro.salida, registro.multiple);
                                const permiso = getPermisoParaDia(registro.userId, registro.diaString);
                                // Fecha futura sin datos: no mostrar
                                if (isAfter(parseISO(registro.diaString + 'T00:00:00'), startOfToday()) && sinRegistros && !permiso) return null;

                                return (
                                    <Fragment key={registro.userId + registro.diaString}>
                                        {/* Encabezado de día */}
                                        {mostrarEncabezadoDia && (
                                            <tr>
                                                <td
                                                    colSpan={3}
                                                    className="bg-slate-100 dark:bg-neutral-800 px-4 py-2 font-bold text-slate-700 dark:text-slate-200 border-t border-b border-slate-200 dark:border-neutral-700 capitalize text-xs"
                                                >
                                                    {format(parseISO(registro.diaString + 'T00:00:00'), "eeee, d 'de' LLLL", { locale: es })}
                                                </td>
                                            </tr>
                                        )}

                                        <tr className="border-b dark:border-neutral-800 transition-colors">
                                            {/* Nombre */}
                                            <td className="px-3 py-2 text-xs font-bold text-gray-800 dark:text-gray-200 w-1/3">
                                                {registro.nombre}
                                                {registro.puesto_nombre && (
                                                    <span className="block text-[9px] text-gray-400 font-normal">{registro.puesto_nombre}</span>
                                                )}
                                            </td>

                                            {/* Asistencia + Permiso */}
                                            <td colSpan={2} className="px-3 py-2">
                                                <div className="flex items-center gap-1">
                                                    {/* 3/4: Asistencia */}
                                                    <div
                                                        className={`w-3/4 ${!sinRegistros ? 'cursor-pointer' : ''}`}
                                                        onClick={() => !sinRegistros && onAbrirModal({
                                                            entrada: registro.entrada,
                                                            salida: registro.salida,
                                                            multiple: esMultiple ? registro.multiple : undefined
                                                        }, registro.nombre)}
                                                    >
                                                        {sinRegistros ? (() => {
                                                            const msg = getMensajeSinMarcaje({ permiso });
                                                            return (
                                                            <span className={`text-[9px] font-medium ${msg.className}`}>{msg.texto}</span>
                                                            );
                                                        })() : esMultiple || totalRegistros > 2 ? (
                                                            <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-[9px]">
                                                                <List size={12} /> Ver Asistencia ({totalRegistros})
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-row flex-wrap gap-x-2 gap-y-0.5 items-center">
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                    <span className="font-bold text-gray-700 dark:text-gray-300">Ent: </span>
                                                                    {registro.entrada
                                                                        ? format(parseISO(registro.entrada.created_at), 'hh:mm aa', { locale: es })
                                                                        : <span className={`${permiso ? (permiso.tipo.toLowerCase().includes('vacaciones') ? 'text-purple-500 dark:text-purple-400' : 'text-blue-500 dark:text-blue-400') : 'text-red-400'} font-bold`}>--:--</span>}
                                                                </span>
                                                                <span className="text-gray-300 dark:text-neutral-700">|</span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                                                    <span className="font-bold text-gray-700 dark:text-gray-300">Sal: </span>
                                                                    {registro.salida
                                                                        ? format(parseISO(registro.salida.created_at), 'hh:mm aa', { locale: es })
                                                                        : <span className={`${permiso ? (permiso.tipo.toLowerCase().includes('vacaciones') ? 'text-purple-500 dark:text-purple-400' : 'text-blue-500 dark:text-blue-400') : 'text-red-400'} font-bold`}>--:--</span>}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* 1/4: Permiso */}
                                                    <div className="w-1/4 flex-shrink-0 cursor-pointer">
                                                        <JustificacionBtn permiso={permiso} totalRegistros={totalRegistros} fechaStr={registro.diaString} />
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default ListaAsistencias;