import React, { useState } from 'react';
import { SolicitudMobiliario } from './lib/zod';
import {
    ChevronDown,
    MapPin,
    Phone,
    User,
    FileText,
    CheckCircle2,
    Clock,
    XCircle,
    Calendar,
    Wrench,
    Pencil,
    Trash2,
    MessageCircle,
    AlertTriangle,
} from 'lucide-react';

interface Props {
    sol: SolicitudMobiliario;
    isOpen: boolean;
    onToggle: () => void;
    onAsignar?: (sol: SolicitudMobiliario) => void;
    onCambiarEstado?: (sol: SolicitudMobiliario) => void;
    onEditar?: (sol: SolicitudMobiliario) => void;
    onEliminar?: (sol: SolicitudMobiliario) => void;
    isOperario?: boolean;
}

export const SolitMobiliarioItem: React.FC<Props> = ({
    sol,
    isOpen,
    onToggle,
    onAsignar,
    onCambiarEstado,
    onEditar,
    onEliminar,
    isOperario = false
}) => {
    const [showPhoneMenu, setShowPhoneMenu] = useState(false);

    const getSimpleDate = (dateStr: string | null) => {
        if (!dateStr) return '--';
        const date = new Date(dateStr);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');
        return `${day}/${month}`;
    };

    const getSimpleTime = (dateStr: string | null) => {
        if (!dateStr) return '--';
        return new Date(dateStr).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completado':
                return { color: 'emerald', label: 'Completado', icon: <CheckCircle2 size={14} className="shrink-0" /> };
            case 'rechazado':
                return { color: 'red', label: 'Rechazado', icon: <XCircle size={14} className="shrink-0" /> };
            case 'en_revision':
                return { color: 'red', label: 'En Revisión', icon: <AlertTriangle size={14} className="shrink-0" /> };
            default:
                return { color: 'amber', label: 'Pendiente', icon: <Clock size={14} className="shrink-0" /> };
        }
    };

    const statusConfig = getStatusConfig(sol.estado);
    const color = statusConfig.color;

    const toTitleCase = (str: string) => {
        return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getUbicacionCompleta = () => {
        const parts = [];
        if (sol.aldea) parts.push(toTitleCase(sol.aldea));
        if (sol.caserio) parts.push(toTitleCase(sol.caserio));
        if (isOpen && sol.ubicacion) parts.push(sol.ubicacion);
        return parts.length > 0 ? parts.join(' | ') : 'Sin ubicación';
    };

    const formatActivityDate = (dateStr: string | null) => {
        if (!dateStr) return '-';

        try {
            const cleanDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0];
            const date = new Date(cleanDateStr + 'T00:00:00');

            if (isNaN(date.getTime())) return '--';

            const dayName = date.toLocaleDateString('es-GT', { weekday: 'short' }).replace('.', '').toLowerCase();
            const day = String(date.getDate()).padStart(2, '0');
            const year = String(date.getFullYear()).slice(-2);
            return `${dayName}/${day}/${year}`;
        } catch (e) {
            return '--';
        }
    };

    const getButtonContent = () => {
        switch (sol.estado as string) {
            case 'completado':
                return {
                    text: 'Solicitud Finalizada',
                    style: 'bg-emerald-100 text-emerald-700 border-emerald-200 cursor-not-allowed dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 border',
                    action: 'none' as const,
                    icon: <CheckCircle2 size={16} />,
                };
            case 'rechazado':
                return {
                    text: 'Solicitud Rechazada',
                    style: 'bg-red-100 text-red-700 border-red-200 cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 border',
                    action: 'none' as const,
                    icon: <XCircle size={16} />,
                };
            case 'en_revision':
                return {
                    text: 'En Revisión',
                    style: 'bg-red-100 text-red-700 border-red-200 cursor-not-allowed dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 border',
                    action: 'none' as const,
                    icon: <AlertTriangle size={16} />,
                };
            default:
                if (!sol.asignado_a_uid) {
                    if (isOperario) return { text: 'Pendiente de Asignación', style: 'bg-slate-100 text-slate-400 cursor-not-allowed border-none', action: 'none' as const, icon: <Clock size={16} /> };
                    return {
                        text: 'Asignar Operario',
                        style: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 shadow-sm cursor-pointer border-none',
                        action: 'asignar' as const,
                        icon: <Wrench size={16} />,
                    };
                }
                return {
                    text: 'Cambiar Estado',
                    style: 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm',
                    action: 'cambiar_estado' as const,
                    icon: null,
                };
        }
    };

    const btnProps = getButtonContent();

    return (
        <div className={`
        group w-full bg-white dark:bg-neutral-900 rounded-2xl border transition-all duration-300 overflow-hidden
        ${color === 'emerald' ? 'border-emerald-500/50 dark:border-emerald-500/40' : ''}
        ${color === 'amber' ? 'border-amber-500/50 dark:border-amber-500/40' : ''}
        ${color === 'red' ? 'border-red-500/50 dark:border-red-500/40' : ''}
        ${isOpen ? 'border-blue-500/30 ring-1 ring-blue-500/10' : ''}
    `}>
            <div
                onClick={onToggle}
                className="p-2 sm:p-5 cursor-pointer select-none relative z-10"
            >
                <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 sm:items-center justify-between">
                    <div className="flex items-start gap-3 sm:gap-4 overflow-hidden">
                        <div className="flex flex-col min-w-0 gap-0.5 sm:gap-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <span className={`
                                text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border
                                text-slate-400 dark:text-neutral-500 bg-slate-50 dark:bg-neutral-800 border-slate-100 dark:border-neutral-700
                            `}>
                                    CÓD: {sol.id.slice(0, 3)}-{sol.id.slice(3, 6)}
                                </span>
                                <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                                    {getUbicacionCompleta()}
                                </h3>
                            </div>
                            {!isOpen && (
                                <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1 font-medium text-slate-500">
                                        <Calendar size={11} className="sm:w-3 sm:h-3" />
                                        {new Date(sol.created_at).toLocaleDateString('es-GT')}
                                    </span>
                                    <span className="hidden sm:inline text-slate-300 dark:text-neutral-600">•</span>
                                    <span className="hidden sm:inline-block font-medium text-slate-700 dark:text-slate-300 truncate max-w-[140px] sm:max-w-none">
                                        {sol.nombre_responsable || 'Sin nombre'}
                                    </span>
                                    {sol.asignado && (
                                        <>
                                            <span className="hidden sm:inline text-slate-300 dark:text-neutral-600">•</span>
                                            <span className="hidden sm:flex items-center gap-1 text-[11px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 truncate max-w-[120px] sm:max-w-none">
                                                <Wrench size={10} className="sm:w-[11px] sm:h-[11px] shrink-0" />
                                                {sol.asignado.nombre}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="hidden sm:flex items-center justify-end sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                        <span className={`
                            flex items-center gap-1.5 text-[11px] sm:text-[12px] uppercase font-extrabold px-3 py-1.5 rounded-md border
                            ${color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : ''}
                            ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : ''}
                            ${color === 'red' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : ''}
                        `}>
                            {statusConfig.icon}
                            {statusConfig.label}
                        </span>

                        {!isOperario && (
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditar?.(sol);
                                    }}
                                    className="p-1.5 sm:p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                    title="Editar"
                                >
                                    <Pencil size={14} className="sm:w-4 sm:h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEliminar?.(sol);
                                    }}
                                    className="p-1.5 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        )}

                        <ChevronDown
                            size={20}
                            className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
                        />
                    </div>
                </div>

                {!isOperario && (
                    <div className="sm:hidden flex items-center gap-0.5 absolute top-2 right-2">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEditar?.(sol);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEliminar?.(sol);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                        <ChevronDown
                            size={18}
                            className={`ml-1 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
                        />
                    </div>
                )}
                {isOperario && (
                    <div className="sm:hidden absolute top-2 right-2">
                        <ChevronDown
                            size={18}
                            className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
                        />
                    </div>
                )}
            </div>

            <div className={`
                px-2 sm:px-5 space-y-5 sm:space-y-7 overflow-hidden transition-all duration-500 ease-in-out
            ${isOpen ? 'pb-5 sm:pb-7 pt-2 max-h-[1200px] opacity-100' : 'py-0 max-h-0 opacity-0'}
        `}>
                <div className="p-2 sm:p-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-neutral-950/60 dark:via-neutral-900/40 dark:to-blue-950/10 border-t border-slate-200/60 dark:border-neutral-800/60">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5">

                        {/* Columna izquierda */}
                        <div className="lg:col-span-5 flex flex-col gap-2.5 sm:gap-3">

                            {/* Información Principal */}
                            <div className="relative z-20 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-xl p-2 sm:p-4 border border-slate-200/70 dark:border-neutral-700/50 shadow-sm hover:shadow-md transition-shadow">
                                <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r from-blue-900 via-blue-600 to-blue-400"></div>
                                <h4 className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-[0.15em] mb-3 flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <User size={11} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    Solicitante
                                </h4>
                                <div className="flex items-center gap-2.5 sm:gap-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-neutral-800/60 dark:to-neutral-800/30 p-2.5 sm:p-3 rounded-lg border border-slate-100 dark:border-neutral-700/50">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
                                            <User size={13} className="text-slate-500 dark:text-slate-400" />
                                        </div>
                                        <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                            {sol.nombre_responsable || 'No registrado'}
                                        </span>
                                    </div>
                                    {sol.telefono_contacto ? (
                                        <div className="relative shrink-0 border-l border-slate-200/80 dark:border-neutral-600 pl-2.5 sm:pl-3">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowPhoneMenu(!showPhoneMenu);
                                                }}
                                                className="flex items-center gap-1.5 transition-all group hover:opacity-80"
                                                title="Contactar"
                                            >
                                                <Phone size={12} className="text-emerald-500 dark:text-emerald-400 sm:w-[13px] sm:h-[13px]" />
                                                <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums underline decoration-emerald-500/30 underline-offset-2">
                                                    {sol.telefono_contacto}
                                                </span>
                                            </button>
                                            
                                            {showPhoneMenu && (
                                                <>
                                                    <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowPhoneMenu(false); }}></div>
                                                    <div className="absolute right-0 sm:left-3 sm:right-auto top-full mt-2 w-44 bg-slate-900 dark:bg-neutral-800 rounded-xl shadow-xl border border-slate-700 dark:border-neutral-700 z-50 overflow-hidden text-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <a
                                                            href={`tel:${sol.telefono_contacto.replace(/\D/g, '')}`}
                                                            className="flex items-center gap-2.5 px-4 py-3 hover:bg-slate-800 dark:hover:bg-neutral-700 transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Phone size={14} className="text-blue-400" />
                                                            <span className="text-sm font-semibold text-white">Llamar normal</span>
                                                        </a>
                                                        <div className="h-[1px] w-full bg-slate-800 dark:bg-neutral-700"></div>
                                                        <a
                                                            href={`https://wa.me/502${sol.telefono_contacto.replace(/\D/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2.5 px-4 py-3 hover:bg-slate-800 dark:hover:bg-neutral-700 transition-colors"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <MessageCircle size={14} className="text-emerald-400" />
                                                            <span className="text-sm font-semibold text-white">Por WhatsApp</span>
                                                        </a>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-200/80 dark:border-neutral-600 pl-2.5 sm:pl-3 opacity-50">
                                            <span className="text-xs sm:text-sm font-medium text-slate-400">—</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Operario Asignado */}
                            <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-xl p-2 sm:p-4 border border-slate-200/70 dark:border-neutral-700/50 shadow-sm hover:shadow-md transition-shadow">
                                <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-xl ${sol.asignado_a_uid ? 'bg-gradient-to-r from-blue-900 via-blue-600 to-blue-400' : 'bg-gradient-to-r from-slate-300 to-slate-200 dark:from-neutral-700 dark:to-neutral-600'}`}></div>
                                <h4 className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-[0.15em] mb-3 flex items-center gap-2">
                                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${sol.asignado_a_uid ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-slate-100 dark:bg-neutral-800'}`}>
                                        <Wrench size={11} className={sol.asignado_a_uid ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'} />
                                    </div>
                                    Operario Asignado
                                </h4>
                                <div className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${sol.asignado_a_uid ? 'bg-gradient-to-r from-blue-50/80 to-blue-50/30 border-blue-100/80 dark:from-blue-900/15 dark:to-blue-900/10 dark:border-blue-800/30' : 'bg-slate-50/80 border-dashed border-slate-200 dark:bg-neutral-800/40 dark:border-neutral-700/50'}`}>
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ring-2 ring-offset-1 dark:ring-offset-neutral-900 ${sol.asignado_a_uid ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white ring-blue-200 dark:ring-blue-800' : 'bg-slate-200 text-slate-400 dark:bg-neutral-700 ring-slate-200 dark:ring-neutral-700'}`}>
                                        <Wrench size={14} />
                                    </div>
                                    <span className={`text-xs sm:text-sm font-semibold ${sol.asignado_a_uid ? 'text-blue-900 dark:text-blue-200' : 'text-slate-400 italic'}`}>
                                        {sol.asignado ? sol.asignado.nombre : 'Sin asignar'}
                                    </span>
                                </div>
                            </div>

                            {/* Motivo del Rechazo o Revisión */}
                            {(sol.estado as string) === 'rechazado' && (
                                <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-red-200/70 dark:border-red-900/40 shadow-sm">
                                    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r from-blue-900 via-blue-600 to-blue-400"></div>
                                    <h4 className="text-[10px] text-red-500 dark:text-red-400 uppercase font-bold tracking-[0.15em] mb-2 flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                            <FileText size={11} className="text-red-500 dark:text-red-400" />
                                        </div>
                                        Motivo del Rechazo
                                    </h4>
                                    <p className="text-xs text-red-700 dark:text-red-300 italic bg-red-50/80 dark:bg-red-900/15 p-2.5 sm:p-3 rounded-lg border border-red-100/80 dark:border-red-800/20 leading-relaxed font-medium">
                                        &ldquo;{sol.comentarios || 'Sin comentarios'}&rdquo;
                                    </p>
                                </div>
                            )}

                            {/* Botón principal */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (btnProps.action === 'asignar' && onAsignar) {
                                        onAsignar(sol);
                                    } else if (btnProps.action === 'cambiar_estado' && onCambiarEstado) {
                                        onCambiarEstado(sol);
                                    }
                                }}
                                disabled={btnProps.action === 'none'}
                                className={`w-full py-2.5 sm:py-3 mt-1 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 transform active:scale-[0.98] disabled:active:scale-100 shadow-sm hover:shadow-md ${btnProps.style}`}
                            >
                                {btnProps.icon}
                                {btnProps.text}
                            </button>
                        </div>

                        {/* Columna derecha: Seguimiento */}
                        <div className="lg:col-span-7">
                            <div className="flex items-center justify-between mb-4 px-1">
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-[0.15em] flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                                        <Calendar size={11} className="text-slate-500 dark:text-slate-400" />
                                    </div>
                                    Seguimiento
                                </h4>
                            </div>

                            {/* Timeline */}
                            <div className="relative">
                                {/* Solicitud (única tarjeta) */}
                                <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-slate-200/70 dark:border-neutral-700/50 rounded-xl p-2 sm:p-4 hover:shadow-lg transition-all duration-200 group">
                                    {/* Encabezado con punto azul */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="relative z-10 w-[10px] h-[10px] shrink-0 rounded-full bg-blue-500 ring-[3px] ring-blue-100 dark:ring-blue-900/40 shadow-sm shadow-blue-500/30"></div>
                                        <h5 className="font-bold text-[13px] text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                                            Solicitud
                                        </h5>
                                    </div>
                                    
                                    {/* Contenido ocupando todo el ancho */}
                                    <div className="w-full space-y-3">
                                        <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-neutral-800/60 dark:to-neutral-800/30 p-2 sm:p-3 rounded-lg border border-slate-100/80 dark:border-neutral-700/50 space-y-2.5 sm:space-y-3">
                                            <div className="flex items-start gap-2">
                                                <MapPin size={14} className="text-blue-400 dark:text-blue-500 shrink-0 mt-0.5" />
                                                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium leading-snug">
                                                    {getUbicacionCompleta()}
                                                </span>
                                            </div>

                                            {(sol.fecha_inicio || sol.fecha_fin || sol.checklists?.items?.length > 0) && (
                                                <div className="border-t border-slate-200/60 dark:border-neutral-700/50 pt-2.5">
                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.12em] mb-1.5 flex items-center gap-1.5">
                                                        <CheckCircle2 size={11} /> Detalles y Fechas
                                                    </span>
                                                    <div className="flex flex-col gap-1.5">
                                                        {(sol.fecha_inicio || sol.fecha_fin) && (
                                                            <div className="text-xs text-slate-600 dark:text-slate-300">
                                                                <span className="font-bold">Actividad: </span>
                                                                {formatActivityDate(sol.fecha_inicio)}
                                                                {sol.fecha_fin ? ` al ${formatActivityDate(sol.fecha_fin)}` : ''}
                                                            </div>
                                                        )}
                                                        {sol.checklists?.items && Array.isArray(sol.checklists.items) && sol.checklists.items.length > 0 && (
                                                            <div className="mt-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Mobiliario:</span>
                                                                <div className="flex flex-col gap-1.5">
                                                                    {sol.checklists.items.map((item: any, i: number) => (
                                                                        <div key={i} className="flex items-center gap-2 px-3 py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg border border-blue-100/50 dark:border-blue-900/30">
                                                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-md font-bold text-xs shrink-0">
                                                                                {item.cantidad}
                                                                            </span>
                                                                            <span className="font-medium text-xs text-slate-700 dark:text-slate-300">{item.descripcion}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Fecha de creación (formato inline) */}
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                            Creada el <span className="font-semibold text-slate-600 dark:text-slate-300">{getSimpleDate(sol.created_at)}</span> a las <span className="font-semibold text-slate-600 dark:text-slate-300">{getSimpleTime(sol.created_at)}</span>
                                            {sol.solicitante && (
                                                <> por <span className="font-semibold text-slate-600 dark:text-slate-300">{sol.solicitante.nombre}</span></>
                                            )}
                                        </p>

                                        {/* Estado / Finalización (integrado) */}
                                        <div className={`border-t pt-3 mt-1
                                            ${sol.estado === 'completado' ? 'border-emerald-200/60 dark:border-emerald-800/30' : ''}
                                            ${sol.estado === 'en_revision' ? 'border-red-200/60 dark:border-red-800/30' : ''}
                                            ${sol.estado === 'pendiente' ? 'border-slate-200/60 dark:border-neutral-700/50' : ''}
                                        `}>
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-[10px] h-[10px] shrink-0 rounded-full ring-[3px] shadow-sm
                                                    ${sol.estado === 'completado' ? 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/40 shadow-emerald-500/30' : ''}
                                                    ${sol.estado === 'en_revision' ? 'bg-red-500 ring-red-100 dark:ring-red-900/40 shadow-red-500/30' : ''}
                                                    ${sol.estado === 'pendiente' ? 'bg-amber-500 ring-amber-100 dark:ring-amber-900/40 shadow-amber-500/30' : ''}
                                                `}></div>
                                                <div>
                                                    <h6 className="font-bold text-[12px] text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                                                        {sol.estado === 'completado' ? 'Trabajo Completado' : sol.estado === 'en_revision' ? 'En Revisión' : (sol.estado as string) === 'rechazado' ? 'Trabajo Rechazado' : 'Trabajo Pendiente'}
                                                    </h6>
                                                    {sol.fecha_terminado && (
                                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                                            <span className="font-semibold text-slate-600 dark:text-slate-300">{getSimpleDate(sol.fecha_terminado)}</span> a las <span className="font-semibold text-slate-600 dark:text-slate-300">{getSimpleTime(sol.fecha_terminado)}</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {sol.estado === 'en_revision' && sol.comentarios && (
                                                <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg p-2.5">
                                                    <p className="text-xs text-red-700 dark:text-red-400">
                                                        <span className="font-bold flex items-center gap-1.5 mb-1 text-red-800 dark:text-red-300">
                                                            <AlertTriangle size={12} /> Motivo:
                                                        </span>
                                                        {sol.comentarios}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
