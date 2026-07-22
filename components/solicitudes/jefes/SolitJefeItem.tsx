'use client'

import React from 'react';
import { SolicitudJefe } from './lib/zod';
import {
    ChevronDown,
    FileText,
    CheckCircle2,
    XCircle,
    Calendar,
    Pencil,
    Trash2,
    ListTodo,
    MoreVertical,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
    sol: SolicitudJefe;
    isOpen?: boolean;
    onToggle?: () => void;
    onCambiarEstado?: (sol: SolicitudJefe) => void;
    onEditar?: (sol: SolicitudJefe) => void;
    onEliminar?: (sol: SolicitudJefe) => void;
}

export default function SolitJefeItem({
    sol,
    isOpen = false,
    onToggle,
    onCambiarEstado,
    onEditar,
    onEliminar,
}: Props) {

    const parseCalendarDate = (dateStr: string) => {
        const datePart = dateStr.includes('T')
            ? dateStr.split('T')[0]
            : dateStr.includes(' ')
                ? dateStr.split(' ')[0]
                : dateStr;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
        const [y, m, d] = datePart.split('-').map(Number);
        return new Date(y, m - 1, d);
    };

    const getSimpleDate = (dateStr: string | null, asCalendarDate = false) => {
        if (!dateStr) return '--';
        const date = asCalendarDate ? parseCalendarDate(dateStr) : new Date(dateStr);
        if (!date || Number.isNaN(date.getTime())) return '--';
        const day = date.getDate().toString().padStart(2, '0');
        const month = date.toLocaleDateString('es-GT', { month: 'short' }).replace('.', '');
        const year = date.getFullYear().toString().slice(-2);
        return `${day}/${month}/${year}`;
    };

    const getFechaNumerica = (dateStr: string | null | undefined, asCalendarDate = false) => {
        if (!dateStr) return '--';
        let date: Date | null;
        if (asCalendarDate) {
            date = parseCalendarDate(dateStr);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [y, m, d] = dateStr.split('-').map(Number);
            date = new Date(y, m - 1, d);
        } else {
            date = new Date(dateStr);
        }
        if (!date || Number.isNaN(date.getTime())) return '--';
        const diaSemana = date
            .toLocaleDateString('es-GT', { weekday: 'short' })
            .replace('.', '')
            .toLowerCase();
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString().slice(-2);
        return `${diaSemana} ${day}/${month}/${year}`;
    };

    const nombreCorto = (nombreCompleto: string) => {
        const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa']);
        const parts = nombreCompleto.trim().split(/\s+/).filter(Boolean);
        if (parts.length <= 1) return nombreCompleto.trim();
        if (parts.length === 2) return `${parts[0]} ${parts[1]}`;

        const firstName = parts[0];
        let idx = 1;

        while (idx < parts.length && PARTICLES.has(parts[idx].toLowerCase())) {
            idx += 1;
            if (idx < parts.length) idx += 1;
        }

        const remaining = parts.length - idx;
        if (remaining >= 3) {
            if (PARTICLES.has(parts[idx]?.toLowerCase() ?? '')) {
                idx += 1;
                if (idx < parts.length) idx += 1;
            } else {
                idx += 1;
            }
        }

        if (idx >= parts.length) return `${firstName} ${parts[parts.length - 1]}`;

        if (PARTICLES.has(parts[idx].toLowerCase())) {
            const surnameBits = [parts[idx]];
            idx += 1;
            while (idx < parts.length && PARTICLES.has(parts[idx].toLowerCase())) {
                surnameBits.push(parts[idx]);
                idx += 1;
            }
            if (idx < parts.length) surnameBits.push(parts[idx]);
            return `${firstName} ${surnameBits.join(' ')}`;
        }

        return `${firstName} ${parts[idx]}`;
    };

    const getSimpleTime = (dateStr: string | null) => {
        if (!dateStr) return '--';
        return new Date(dateStr).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'completado':
                return {
                    color: 'emerald',
                    label: 'Confirmado',
                    border: 'border-l-emerald-500 dark:border-l-emerald-500',
                };
            case 'rechazado':
                return {
                    color: 'red',
                    label: 'Rechazado',
                    border: 'border-l-red-500 dark:border-l-red-500',
                };
            default:
                return {
                    color: 'amber',
                    label: 'Pendiente',
                    border: 'border-l-amber-500 dark:border-l-amber-500',
                };
        }
    };

    const statusConfig = getStatusConfig(sol.estado);
    const color = statusConfig.color;

    const getButtonContent = () => {
        switch (sol.estado) {
            case 'completado':
                return {
                    text: 'Solicitud Confirmada',
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
            default:
                return {
                    text: 'Gestionar Solicitud',
                    style: 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer border-none',
                    action: 'cambiar_estado' as const,
                    icon: <CheckCircle2 size={16} />,
                };
        }
    };

    const btnProps = getButtonContent();

    const menuAcciones = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title="Acciones"
                >
                    <MoreVertical size={16} className="sm:w-[18px] sm:h-[18px]" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-44 rounded-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {sol.estado === 'pendiente' && (
                    <DropdownMenuItem
                        onClick={(e) => {
                            e.stopPropagation();
                            onCambiarEstado?.(sol);
                        }}
                        className="cursor-pointer font-medium text-blue-600 dark:text-blue-400"
                    >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Gestionar
                    </DropdownMenuItem>
                )}
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        onEditar?.(sol);
                    }}
                    className="cursor-pointer font-medium"
                >
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={(e) => {
                        e.stopPropagation();
                        onEliminar?.(sol);
                    }}
                    className="cursor-pointer font-medium text-red-600 dark:text-red-400"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className={`
        group w-full bg-white dark:bg-neutral-900 rounded-lg border-l-[6px] ${statusConfig.border}
        border-t border-r border-b transition-all duration-300 overflow-hidden
        ${isOpen
                ? 'border-t-blue-500/30 border-r-blue-500/30 border-b-blue-500/30 ring-1 ring-blue-500/10'
                : 'border-t-slate-200 border-r-slate-200 border-b-slate-200 dark:border-t-neutral-800 dark:border-r-neutral-800 dark:border-b-neutral-800 hover:border-t-blue-300 hover:border-r-blue-300 hover:border-b-blue-300 dark:hover:border-t-neutral-700 dark:hover:border-r-neutral-700 dark:hover:border-b-neutral-700'
            }
    `}>
            <div
                onClick={onToggle}
                className="p-2.5 sm:p-5 cursor-pointer select-none relative z-10"
            >
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-start justify-between">
                    <div className="flex flex-col min-w-0 flex-1 gap-2.5 sm:gap-3 pr-20 sm:pr-0">
                        <div className="flex items-center gap-2">
                            <span className={`
                                text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0
                                text-slate-400 dark:text-neutral-500 bg-slate-50 dark:bg-neutral-800 border-slate-100 dark:border-neutral-700
                            `}>
                                CÓD: {sol.id.slice(0, 3)}-{sol.id.slice(3, 6)}
                            </span>
                        </div>

                        <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                            {sol.ubicacion || 'Sin título'}
                        </h3>

                        {!isOpen && (
                            <div className="flex flex-col gap-2 sm:gap-2.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 min-w-0">
                                <span className="font-medium text-slate-500">
                                    Solicitud: <span className="font-bold text-slate-800 dark:text-slate-200">{getFechaNumerica(sol.created_at)}</span>
                                    {' '}*{' '}
                                    Actividad: <span className="font-bold text-slate-800 dark:text-slate-200">{getFechaNumerica(sol.fecha_solicitud, true)}</span>
                                </span>
                                {sol.solicitante && (
                                    <span>
                                        por <span className="font-bold text-slate-800 dark:text-slate-200">{nombreCorto(sol.solicitante.nombre)}</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="hidden sm:flex items-center justify-end gap-2 sm:gap-3 shrink-0">
                        <span className={`
                            text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-md border
                            ${color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' : ''}
                            ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' : ''}
                            ${color === 'red' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : ''}
                        `}>
                            {statusConfig.label}
                        </span>

                        {menuAcciones}

                        <ChevronDown
                            size={20}
                            className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
                        />
                    </div>
                </div>

                <div className="sm:hidden flex items-center gap-0.5 absolute top-2.5 right-2">
                    <span className={`
                        text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-md border mr-1
                        ${color === 'amber' ? 'bg-amber-50 text-amber-600 border-amber-200' : ''}
                        ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                        ${color === 'red' ? 'bg-red-50 text-red-600 border-red-200' : ''}
                    `}>
                        {statusConfig.label}
                    </span>
                    {menuAcciones}
                    <ChevronDown
                        size={18}
                        className={`ml-0.5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}
                    />
                </div>
            </div>

            <div className={`
                px-2 sm:px-5 space-y-5 sm:space-y-7 overflow-hidden transition-all duration-500 ease-in-out
            ${isOpen ? 'pb-5 sm:pb-7 pt-2 max-h-[1200px] opacity-100' : 'py-0 max-h-0 opacity-0'}
        `}>
                <div className="p-2 sm:p-5 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-neutral-950/60 dark:via-neutral-900/40 dark:to-blue-950/10 border-t border-slate-200/60 dark:border-neutral-800/60">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

                        <div className="lg:col-span-6 flex flex-col gap-3">

                            <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-xl p-3 border border-slate-200/70 dark:border-neutral-700/50 flex-1">
                                <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl bg-gradient-to-r from-blue-900 via-blue-600 to-blue-400"></div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <FileText size={11} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-[0.15em]">Descripción de la solicitud</span>
                                </div>
                                <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-neutral-800/60 dark:to-neutral-800/30 p-2.5 rounded-lg border border-slate-100 dark:border-neutral-700/50 h-[calc(100%-36px)]">
                                    <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 font-medium leading-relaxed text-justify break-words">
                                        {sol.comentarios || 'Sin descripción adicional'}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-auto">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (btnProps.action === 'cambiar_estado' && onCambiarEstado) {
                                            onCambiarEstado(sol);
                                        }
                                    }}
                                    disabled={btnProps.action === 'none'}
                                    className={`w-full py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 transform active:scale-[0.98] disabled:active:scale-100 ${btnProps.style}`}
                                >
                                    {btnProps.icon}
                                    {btnProps.text}
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-6">
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-neutral-800 flex items-center justify-center">
                                    <Calendar size={11} className="text-slate-500 dark:text-slate-400" />
                                </div>
                                <h4 className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-[0.15em]">Detalles y Seguimiento</h4>
                            </div>

                            <div className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border border-slate-200/70 dark:border-neutral-700/50 rounded-xl p-2 sm:p-4 transition-all duration-200">

                                <div className="w-full space-y-3">
                                    <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-neutral-800/60 dark:to-neutral-800/30 p-2 sm:p-3 rounded-lg border border-slate-100/80 dark:border-neutral-700/50">
                                        {sol.checklists?.items && Array.isArray(sol.checklists.items) && sol.checklists.items.length > 0 && (
                                            <div>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.12em] mb-2 flex items-center gap-1.5">
                                                    <ListTodo size={11} /> Subtareas de la solicitud
                                                </span>
                                                <div className="flex flex-col gap-1.5 mt-2">
                                                    {sol.checklists.items.map((item: { descripcion: string }, i: number) => (
                                                        <div key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                            <div className="mt-0.5">
                                                                <CheckCircle2 size={14} className="text-blue-500/70" />
                                                            </div>
                                                            <span className="font-medium leading-tight">{item.descripcion}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {(!sol.checklists?.items || sol.checklists.items.length === 0) && (
                                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.12em] flex items-center gap-1.5">
                                                Sin subtareas
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 space-y-0.5 mt-2">
                                        {sol.asignado && (
                                            <p>Asignado a: <span className="font-semibold text-blue-600 dark:text-blue-400">{sol.asignado.nombre}</span></p>
                                        )}
                                        <p>
                                            Fecha de actividad: <span className="font-semibold text-slate-600 dark:text-slate-300">{sol.fecha_solicitud ? getSimpleDate(sol.fecha_solicitud, true) : '-'}</span>
                                        </p>
                                    </div>

                                    <div className="border-t-[3px] border-blue-100 dark:border-blue-900/30 my-2 opacity-75" />

                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 space-y-0.5 mt-2">
                                        {sol.solicitante && (
                                            <p>Creada por <span className="font-semibold text-slate-600 dark:text-slate-300">{sol.solicitante.nombre}</span></p>
                                        )}
                                        <p>
                                            el <span className="font-semibold text-slate-600 dark:text-slate-300">{getSimpleDate(sol.created_at)}</span> a las <span className="font-semibold text-slate-600 dark:text-slate-300">{getSimpleTime(sol.created_at)}</span>
                                        </p>
                                    </div>

                                    <div className={`border-t-[3px] pt-3 mt-1
                                        ${sol.estado === 'completado' ? 'border-emerald-200/60 dark:border-emerald-800/30' : ''}
                                        ${sol.estado === 'rechazado' ? 'border-red-200/60 dark:border-red-800/30' : ''}
                                        ${sol.estado === 'pendiente' ? 'border-slate-200/60 dark:border-neutral-700/50' : ''}
                                    `}>
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-[10px] h-[10px] shrink-0 rounded-full ring-[3px]
                                                ${sol.estado === 'completado' ? 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/40' : ''}
                                                ${sol.estado === 'rechazado' ? 'bg-red-500 ring-red-100 dark:ring-red-900/40' : ''}
                                                ${sol.estado === 'pendiente' ? 'bg-amber-500 ring-amber-100 dark:ring-amber-900/40' : ''}
                                            `}></div>
                                            <div>
                                                <h6 className="font-bold text-[12px] text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                                                    {sol.estado === 'completado' ? 'Solicitud Confirmada' : sol.estado === 'rechazado' ? 'Solicitud Rechazada' : 'Solicitud Pendiente'}
                                                </h6>
                                                {sol.fecha_terminado && (
                                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 space-y-0.5 mt-1">
                                                        {sol.estado === 'completado' && sol.asignado && (
                                                            <p>por <span className="font-semibold text-blue-600 dark:text-blue-400">{sol.asignado.nombre}</span></p>
                                                        )}
                                                        {sol.estado === 'rechazado' && sol.asignado && (
                                                            <p>por <span className="font-semibold text-red-600 dark:text-red-400">{sol.asignado.nombre}</span></p>
                                                        )}
                                                        <p>el <span className="font-semibold text-slate-600 dark:text-slate-300">{getSimpleDate(sol.fecha_terminado)}</span> a las <span className="font-semibold text-slate-600 dark:text-slate-300">{getSimpleTime(sol.fecha_terminado)}</span></p>
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
        </div>
    );
}
