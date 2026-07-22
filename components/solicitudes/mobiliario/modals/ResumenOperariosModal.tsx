import React from 'react';
import { Award, Package, User, MessageCircle } from 'lucide-react';
import { SolicitudMobiliario } from '../lib/zod';

interface ResumenOperariosViewProps {
    solicitudes: SolicitudMobiliario[];
}

export default function ResumenOperariosView({ solicitudes }: ResumenOperariosViewProps) {
    const getSimpleDate = (dateStr: string | null) => {
        return formatActivityDate(dateStr) || '--';
    };

    const formatActivityDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        try {
            const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
            const date = new Date(cleanDateStr + 'T00:00:00');
            if (isNaN(date.getTime())) return null;

            let dayName = date.toLocaleDateString('es-GT', { weekday: 'short' }).replace('.', '');
            // Capitalizar la primera letra
            dayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);

            return `${dayName}, ${day}/${month}/${year}`;
        } catch (e) {
            return null;
        }
    };

    const getFechasActividad = (inicio: string | null, fin: string | null) => {
        const f1 = formatActivityDate(inicio);
        const f2 = formatActivityDate(fin);
        if (!f1 && !f2) return '--';
        if (f1 && f2) {
            if (f1 === f2) return f1;
            return (
                <div className="flex flex-col gap-0.5 leading-tight items-center">
                    <span>{f1} al</span>
                    <span>{f2}</span>
                </div>
            );
        }
        return f1 || f2 || '--';
    };

    const getFullAddress = (sol: SolicitudMobiliario) => {
        const parts = [sol.aldea, sol.caserio, sol.ubicacion].filter(Boolean);
        return parts.length > 0 ? parts.join(' | ') : '--';
    };

    const getShortDate = (dateStr: string | null) => {
        if (!dateStr) return '--';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '').substring(0, 3);
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const getShortFechasActividad = (inicio: string | null, fin: string | null) => {
        if (!inicio && !fin) return '--';
        if (inicio && !fin) return getShortDate(inicio);
        if (!inicio && fin) return getShortDate(fin);

        const d1 = new Date(inicio as string);
        const d2 = new Date(fin as string);

        const day1 = d1.getDate().toString().padStart(2, '0');
        const month1 = d1.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '').substring(0, 3);
        const year1 = d1.getFullYear();

        const day2 = d2.getDate().toString().padStart(2, '0');
        const month2 = d2.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '').substring(0, 3);
        const year2 = d2.getFullYear();

        if (year1 === year2 && month1 === month2 && day1 === day2) {
            return `${day1}/${month1}/${year1}`;
        }

        if (year1 === year2) {
            if (month1 === month2) {
                return `${day1}-${day2}/${month1}/${year1}`;
            } else {
                return `${day1}/${month1} al ${day2}/${month2} del ${year1}`;
            }
        } else {
            const shortYear1 = year1.toString().slice(-2);
            const shortYear2 = year2.toString().slice(-2);
            return `${day1}/${month1}/${shortYear1} al ${day2}/${month2}/${shortYear2}`;
        }
    };

    const getMobiliarioString = (checklists: any) => {
        if (!checklists?.items || !Array.isArray(checklists.items)) return '--';
        return checklists.items.map((item: any) => `${item.cantidad} ${item.descripcion}`).join(', ');
    };

    const getStatusBadge = (estado: string) => {
        switch (estado) {
            case 'completado':
                return <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Completada</span>;
            case 'en_revision':
                return <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">En Revisión</span>;
            case 'pendiente':
            default:
                return <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Pendiente</span>;
        }
    };

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-300">
            <div className="flex justify-between items-center px-2 pt-1 pb-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <Award className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                            Listado Detallado
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Revisa y administra las solicitudes de mobiliario
                        </p>
                    </div>
                </div>
            </div>

            <div className="w-full mt-2">
                {solicitudes.length === 0 ? (
                    <div className="text-center py-10 border border-slate-200/70 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-900">
                        <Package size={40} className="mx-auto text-slate-300 dark:text-neutral-700 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No hay solicitudes para mostrar.</p>
                    </div>
                ) : (
                    <>
                        {/* Vista Desktop (Tabla) */}
                        <div className="w-full border border-slate-200/70 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-200/70 dark:border-neutral-800">
                                    <tr>
                                        <th className="px-2 py-2 font-bold text-slate-700 dark:text-slate-300 text-center">CÓD</th>
                                        <th className="px-2 py-2 font-bold text-slate-700 dark:text-slate-300 text-center">Estado</th>
                                        <th className="px-2 py-2 font-bold text-slate-700 dark:text-slate-300 text-center">Fecha Creación</th>
                                        <th className="px-2 py-2 font-bold text-slate-700 dark:text-slate-300 text-center">Dirección</th>
                                        <th className="px-2 py-2 font-bold text-slate-700 dark:text-slate-300 text-center">Responsable</th>
                                        <th className="px-2 py-2 font-bold text-slate-700 dark:text-slate-300 text-center">Teléfono</th>
                                        <th className="px-2 py-2 font-bold text-slate-700 dark:text-slate-300 text-center">Fecha Actividad</th>
                                        <th className="px-2 py-2 font-bold text-slate-700 dark:text-slate-300 text-center">Mobiliario</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                                    {solicitudes.map((sol) => (
                                        <tr key={sol.id} className="bg-white dark:bg-neutral-900 hover:bg-slate-50/50 dark:hover:bg-neutral-800/20 transition-colors">
                                            <td className="px-2 py-2 text-slate-600 dark:text-slate-400 font-medium text-center align-middle">
                                                {sol.id.slice(0, 3)}-{sol.id.slice(3, 6)}
                                            </td>
                                            <td className="px-2 py-2 text-center align-middle">
                                                {getStatusBadge(sol.estado)}
                                            </td>
                                            <td className="px-2 py-2 text-slate-800 dark:text-slate-200 text-center align-middle">
                                                {getSimpleDate(sol.fecha_solicitud)}
                                            </td>
                                            <td className="px-2 py-2 text-slate-800 dark:text-slate-200 align-middle">
                                                {getFullAddress(sol)}
                                            </td>
                                            <td className="px-2 py-2 align-middle">
                                                <div className={`whitespace-normal break-words text-slate-800 dark:text-slate-200 leading-tight ${sol.nombre_responsable && sol.nombre_responsable.length > 30 ? 'text-xs' : 'text-sm'}`}>
                                                    {sol.nombre_responsable || '--'}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-slate-800 dark:text-slate-200 text-center align-middle">
                                                {sol.telefono_contacto ? (
                                                    <a
                                                        href={`https://wa.me/502${sol.telefono_contacto.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline transition-colors font-bold tabular-nums"
                                                        title="Contactar por WhatsApp"
                                                    >
                                                        {sol.telefono_contacto}
                                                    </a>
                                                ) : (
                                                    '--'
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-slate-800 dark:text-slate-200 text-center align-middle">
                                                {getFechasActividad(sol.fecha_inicio, sol.fecha_fin)}
                                            </td>
                                            <td className="px-2 py-2 text-slate-600 dark:text-slate-400 align-middle">
                                                {getMobiliarioString(sol.checklists)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
