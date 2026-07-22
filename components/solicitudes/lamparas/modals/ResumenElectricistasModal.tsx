import React, { useMemo } from 'react';
import { X, Wrench, CheckCircle2, Clock, XCircle, Award } from 'lucide-react';
import { SolicitudLampara } from '../lib/zod';

interface ResumenElectricistasViewProps {
    solicitudes: SolicitudLampara[];
}

export default function ResumenElectricistasView({ solicitudes }: ResumenElectricistasViewProps) {
    const stats = useMemo(() => {
        const agrupar = solicitudes.reduce((acc, sol) => {
            if (!sol.asignado_a_uid || !sol.asignado?.nombre) return acc;
            const uid = sol.asignado_a_uid;
            if (!acc[uid]) {
                acc[uid] = {
                    nombre: sol.asignado.nombre,
                    total: 0,
                    completadas: 0,
                    pendientes: 0,
                    enRevision: 0,
                    reqs: {
                        cambioBombilla: { comp: 0, pend: 0, enRev: 0, total: 0 },
                        revisionLampara: { comp: 0, pend: 0, enRev: 0, total: 0 },
                        cambioLampara: { comp: 0, pend: 0, enRev: 0, total: 0 },
                        lamparaNueva: { comp: 0, pend: 0, enRev: 0, total: 0 },
                    }
                };
            }
            
            acc[uid].total++;
            if (sol.estado === 'completado') acc[uid].completadas++;
            if (sol.estado === 'pendiente') acc[uid].pendientes++;
            if (sol.estado === 'en_revision') acc[uid].enRevision++;

            if (sol.checklists?.cambio_bombilla) {
                acc[uid].reqs.cambioBombilla.total++;
                if (sol.estado === 'completado') acc[uid].reqs.cambioBombilla.comp++;
                if (sol.estado === 'pendiente') acc[uid].reqs.cambioBombilla.pend++;
                if (sol.estado === 'en_revision') acc[uid].reqs.cambioBombilla.enRev++;
            }
            if (sol.checklists?.revision_lampara) {
                acc[uid].reqs.revisionLampara.total++;
                if (sol.estado === 'completado') acc[uid].reqs.revisionLampara.comp++;
                if (sol.estado === 'pendiente') acc[uid].reqs.revisionLampara.pend++;
                if (sol.estado === 'en_revision') acc[uid].reqs.revisionLampara.enRev++;
            }
            if (sol.checklists?.cambio_lampara) {
                acc[uid].reqs.cambioLampara.total++;
                if (sol.estado === 'completado') acc[uid].reqs.cambioLampara.comp++;
                if (sol.estado === 'pendiente') acc[uid].reqs.cambioLampara.pend++;
                if (sol.estado === 'en_revision') acc[uid].reqs.cambioLampara.enRev++;
            }
            if (sol.checklists?.lampara_nueva) {
                acc[uid].reqs.lamparaNueva.total++;
                if (sol.estado === 'completado') acc[uid].reqs.lamparaNueva.comp++;
                if (sol.estado === 'pendiente') acc[uid].reqs.lamparaNueva.pend++;
                if (sol.estado === 'en_revision') acc[uid].reqs.lamparaNueva.enRev++;
            }

            return acc;
        }, {} as Record<string, any>);

        // Convertir a array y ordenar por mayor cantidad de completadas
        return Object.values(agrupar).sort((a, b) => b.completadas - a.completadas);
    }, [solicitudes]);

    return (
        <div className="w-full flex flex-col animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center px-2 py-4 mb-2">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <Award className="text-blue-600 dark:text-blue-400" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                            Resumen de Actividades
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                            Estadísticas por electricista
                        </p>
                    </div>
                </div>
            </div>

            {/* Body */}
            <div className="w-full">
                {stats.length === 0 ? (
                        <div className="text-center py-10">
                            <Wrench size={40} className="mx-auto text-slate-300 dark:text-neutral-700 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">No hay electricistas asignados en las solicitudes actuales.</p>
                        </div>
                    ) : (
                        <>
                            {/* Vista móvil: Tabla compacta con scroll */}
                            <div className="lg:hidden border border-slate-200/70 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm overflow-x-auto">
                                <table className="w-full text-left text-xs whitespace-nowrap min-w-[420px]">
                                    <thead className="bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-200/70 dark:border-neutral-800">
                                        <tr>
                                            <th className="px-3 py-2.5 font-bold text-slate-700 dark:text-slate-300">Electricista / Req.</th>
                                            <th className="px-2 py-2.5 font-bold text-emerald-700 dark:text-emerald-400 text-center">Comp.</th>
                                            <th className="px-2 py-2.5 font-bold text-amber-700 dark:text-amber-400 text-center">Pend.</th>
                                            <th className="px-2 py-2.5 font-bold text-red-700 dark:text-red-400 text-center">Rev.</th>
                                            <th className="px-2 py-2.5 font-bold text-slate-700 dark:text-slate-300 text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                                        {stats.map((stat, idx) => (
                                            <React.Fragment key={idx}>
                                                <tr className="bg-slate-50/50 dark:bg-neutral-800/20 border-t-2 border-slate-200/60 dark:border-neutral-700">
                                                    <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-1.5">
                                                        <Wrench size={12} className="text-slate-500 dark:text-slate-400 shrink-0" />
                                                        <span className="truncate max-w-[160px]">{stat.nombre}</span>
                                                    </td>
                                                    <td colSpan={4}></td>
                                                </tr>
                                                <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                                                    <td className="px-3 py-1.5 pl-8 text-slate-600 dark:text-slate-400 font-medium">Cambio bombilla</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.cambioBombilla.comp > 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{stat.reqs.cambioBombilla.comp}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.cambioBombilla.pend > 0 ? <span className="font-bold text-amber-600 dark:text-amber-500">{stat.reqs.cambioBombilla.pend}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.cambioBombilla.enRev > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{stat.reqs.cambioBombilla.enRev}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center"><span className="font-bold text-slate-700 dark:text-slate-300">{stat.reqs.cambioBombilla.total}</span></td>
                                                </tr>
                                                <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                                                    <td className="px-3 py-1.5 pl-8 text-slate-600 dark:text-slate-400 font-medium">Revisión lámpara</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.revisionLampara.comp > 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{stat.reqs.revisionLampara.comp}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.revisionLampara.pend > 0 ? <span className="font-bold text-amber-600 dark:text-amber-500">{stat.reqs.revisionLampara.pend}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.revisionLampara.enRev > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{stat.reqs.revisionLampara.enRev}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center"><span className="font-bold text-slate-700 dark:text-slate-300">{stat.reqs.revisionLampara.total}</span></td>
                                                </tr>
                                                <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                                                    <td className="px-3 py-1.5 pl-8 text-slate-600 dark:text-slate-400 font-medium">Cambio lámpara</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.cambioLampara.comp > 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{stat.reqs.cambioLampara.comp}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.cambioLampara.pend > 0 ? <span className="font-bold text-amber-600 dark:text-amber-500">{stat.reqs.cambioLampara.pend}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.cambioLampara.enRev > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{stat.reqs.cambioLampara.enRev}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center"><span className="font-bold text-slate-700 dark:text-slate-300">{stat.reqs.cambioLampara.total}</span></td>
                                                </tr>
                                                <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/30">
                                                    <td className="px-3 py-1.5 pl-8 text-slate-600 dark:text-slate-400 font-medium">Lámpara nueva</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.lamparaNueva.comp > 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{stat.reqs.lamparaNueva.comp}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.lamparaNueva.pend > 0 ? <span className="font-bold text-amber-600 dark:text-amber-500">{stat.reqs.lamparaNueva.pend}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center">{stat.reqs.lamparaNueva.enRev > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{stat.reqs.lamparaNueva.enRev}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-2 py-1.5 text-center"><span className="font-bold text-slate-700 dark:text-slate-300">{stat.reqs.lamparaNueva.total}</span></td>
                                                </tr>
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Vista PC: Tabla ancha */}
                            <div className="hidden lg:block border border-slate-200/70 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 shadow-sm overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-50 dark:bg-neutral-800/50 border-b border-slate-200/70 dark:border-neutral-800">
                                        <tr>
                                            <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-300 w-1/3">Electricista / Requerimiento</th>
                                            <th className="px-4 py-3.5 font-bold text-emerald-700 dark:text-emerald-400 text-center">Completadas</th>
                                            <th className="px-4 py-3.5 font-bold text-amber-700 dark:text-amber-400 text-center">Pendientes</th>
                                            <th className="px-4 py-3.5 font-bold text-red-700 dark:text-red-400 text-center">En Revisión</th>
                                            <th className="px-4 py-3.5 font-bold text-slate-700 dark:text-slate-300 text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/60">
                                        {stats.map((stat, idx) => (
                                            <React.Fragment key={idx}>
                                                {/* Header Row for Electrician */}
                                                <tr className="bg-slate-50/50 dark:bg-neutral-800/20 border-t-[3px] border-slate-200/60 dark:border-neutral-800">
                                                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200 text-base flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                                                            <Wrench size={12} className="text-slate-600 dark:text-slate-400" />
                                                        </div>
                                                        {stat.nombre}
                                                    </td>
                                                    <td colSpan={4}></td>
                                                </tr>
                                                
                                                {/* Row 1: Cambio de Bombilla */}
                                                <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/30 transition-colors">
                                                    <td className="px-4 py-2.5 pl-12 text-slate-600 dark:text-slate-400 font-medium">Cambio de bombilla</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.cambioBombilla.comp > 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{stat.reqs.cambioBombilla.comp}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.cambioBombilla.pend > 0 ? <span className="font-bold text-amber-600 dark:text-amber-500">{stat.reqs.cambioBombilla.pend}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.cambioBombilla.enRev > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{stat.reqs.cambioBombilla.enRev}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center"><span className="font-bold text-slate-700 dark:text-slate-300">{stat.reqs.cambioBombilla.total}</span></td>
                                                </tr>

                                                {/* Row 2: Revisión de Lámpara */}
                                                <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/30 transition-colors">
                                                    <td className="px-4 py-2.5 pl-12 text-slate-600 dark:text-slate-400 font-medium">Revisión de lámpara</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.revisionLampara.comp > 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{stat.reqs.revisionLampara.comp}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.revisionLampara.pend > 0 ? <span className="font-bold text-amber-600 dark:text-amber-500">{stat.reqs.revisionLampara.pend}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.revisionLampara.enRev > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{stat.reqs.revisionLampara.enRev}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center"><span className="font-bold text-slate-700 dark:text-slate-300">{stat.reqs.revisionLampara.total}</span></td>
                                                </tr>

                                                {/* Row 3: Cambio de Lámpara */}
                                                <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/30 transition-colors">
                                                    <td className="px-4 py-2.5 pl-12 text-slate-600 dark:text-slate-400 font-medium">Cambio de lámpara</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.cambioLampara.comp > 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{stat.reqs.cambioLampara.comp}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.cambioLampara.pend > 0 ? <span className="font-bold text-amber-600 dark:text-amber-500">{stat.reqs.cambioLampara.pend}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.cambioLampara.enRev > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{stat.reqs.cambioLampara.enRev}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center"><span className="font-bold text-slate-700 dark:text-slate-300">{stat.reqs.cambioLampara.total}</span></td>
                                                </tr>

                                                {/* Row 4: Lámpara Nueva */}
                                                <tr className="hover:bg-slate-50 dark:hover:bg-neutral-800/30 transition-colors border-b border-slate-100 dark:border-neutral-800/60">
                                                    <td className="px-4 py-2.5 pl-12 text-slate-600 dark:text-slate-400 font-medium">Lámpara nueva</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.lamparaNueva.comp > 0 ? <span className="font-bold text-emerald-600 dark:text-emerald-400">{stat.reqs.lamparaNueva.comp}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.lamparaNueva.pend > 0 ? <span className="font-bold text-amber-600 dark:text-amber-500">{stat.reqs.lamparaNueva.pend}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center">{stat.reqs.lamparaNueva.enRev > 0 ? <span className="font-bold text-red-600 dark:text-red-400">{stat.reqs.lamparaNueva.enRev}</span> : <span className="text-slate-300 dark:text-neutral-600">-</span>}</td>
                                                    <td className="px-4 py-2.5 text-center"><span className="font-bold text-slate-700 dark:text-slate-300">{stat.reqs.lamparaNueva.total}</span></td>
                                                </tr>
                                            </React.Fragment>
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
