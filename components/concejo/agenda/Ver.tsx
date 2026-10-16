'use client';

import React, { useEffect, useState, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import useUserData from '@/hooks/sesion/useUserData';
import { eliminarAgenda } from './lib/acciones';
import { useAgendasConcejo } from './lib/hooks';
import { type AgendaConcejo } from './lib/esquemas';
import { obtenerTodasActividadesConcejo } from './tareas/lib/actividades';
import AgendaForm from './forms/Sesion';
import ResumenAsistencia from './modals/ResumenAsistencia';
import InformeDietas from './modals/InformeDietas';
import GestorActa from '@/components/concejo/agenda/gestorActa';
import ListaActividadesAsignadas from './ListaActividadesAsignadas';
import FiltroPeriodoAgenda from './FiltroPeriodoAgenda';
import { CalendarPlus, Pencil, ArrowRight, Trash2, CalendarClock, CalendarDays, CalendarCheck, FileText, Table, FileUp, X, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import CargandoAnimacion from '@/components/ui/animations/Cargando';
import { useRouter } from 'next/navigation';
import { getYear, differenceInDays, isToday, isFuture, isPast } from 'date-fns';
import BotonVolver from '@/components/ui/botones/BotonVolver';
import Swal from 'sweetalert2';
import { cn } from '@/lib/utils';

const formatearFechaSesion = (iso: string) => {
  const fecha = new Date(iso);
  const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = String(fecha.getFullYear()).slice(-2);
  let hora = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const periodo = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12 || 12;
  return `${dias[fecha.getDay()]} ${dia}/${mes}/${anio}, ${String(hora).padStart(2, '0')}:${minutos} ${periodo}`;
};

const calcularDiasRestantes = (fechaReunion: string): string => {
  const fecha = new Date(fechaReunion);
  if (isToday(fecha)) return 'Hoy';
  const dias = differenceInDays(fecha, new Date());
  if (dias < 0) return 'Vencido';
  return `${dias + 1} días`;
};

const AgendaCard = memo(({ 
  agenda, 
  onDelete, 
  onEdit, 
  onGoTo, 
  rol, 
  permisos, 
  onSetActa 
}: {
  agenda: AgendaConcejo;
  onDelete: (id: string) => void;
  onEdit: (agenda: AgendaConcejo) => void;
  onGoTo: (id: string) => void;
  rol: string | null;
  permisos: string[];
  onSetActa: (agenda: AgendaConcejo) => void;
}) => {
  let textColorClass = 'text-blue-600 dark:text-blue-400';
  
  if (agenda.estado === 'En progreso') {
    textColorClass = 'text-green-600 dark:text-green-400';
  } else if (agenda.estado === 'Finalizada') {
    textColorClass = 'text-gray-500 dark:text-gray-400';
  }

  const esAdmin = ['SUPER', 'SECRETARIO', 'SEC-TECNICO'].includes(rol || '');
  const tienePermisoEditar = permisos.includes('EDITAR') || permisos.includes('TODO');
  
  const puedeEditar = tienePermisoEditar && (rol === 'SUPER' || agenda.estado !== 'Finalizada');
  const puedeEliminar = tienePermisoEditar && (rol === 'SUPER' || agenda.estado === 'En preparación');

const hayActa = Boolean(
  typeof agenda.acta === 'string' && 
  agenda.acta.toLowerCase().includes('.pdf')
);
  const mostrarBotonActa = agenda.estado === 'Finalizada' && (hayActa || esAdmin);
  const textoActa = hayActa ? 'Ver Acta' : 'Subir Acta';
  const IconoActa = hayActa ? FileText : FileUp;

  const diasRestantes = calcularDiasRestantes(agenda.fecha_reunion);
  const textoDias = diasRestantes.includes('días') ? `${diasRestantes} restantes` : diasRestantes;

  const acciones = () => (
        <div className="flex shrink-0 items-center justify-end gap-1">
          {puedeEliminar && (
            <Button
              type="button"
              onClick={() => onDelete(agenda.id)}
              variant="ghost"
              aria-label="Eliminar"
              title="Eliminar"
              className="h-8 w-8 cursor-pointer p-0 text-red-600 hover:bg-red-100 sm:h-9 sm:w-9 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {puedeEditar && (
            <Button
              type="button"
              onClick={() => onEdit(agenda)}
              variant="ghost"
              aria-label="Editar"
              title="Editar"
              className="h-8 w-8 cursor-pointer p-0 text-blue-600 hover:bg-blue-100 sm:h-9 sm:w-9 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {mostrarBotonActa && (
            <Button
              type="button"
              onClick={() => onSetActa(agenda)}
              variant="ghost"
              className={`h-8 cursor-pointer px-2 text-xs sm:h-9 sm:px-3 sm:text-sm ${
                hayActa
                  ? 'text-indigo-600 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:bg-indigo-900/30'
                  : 'text-purple-600 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30'
              }`}
            >
              <IconoActa className="mr-2 h-4 w-4" /> {textoActa}
            </Button>
          )}
          <Button
            type="button"
            onClick={() => onGoTo(agenda.id)}
            variant="ghost"
            className="h-8 cursor-pointer gap-1 px-2 text-xs font-medium text-green-600 hover:bg-green-100 hover:text-green-700 sm:h-9 sm:gap-2 sm:px-3 sm:text-sm dark:text-green-400 dark:hover:bg-green-900/50"
          >
            Entrar <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
  );

  return (
    <div className="border-b border-slate-300 last:border-b-0 dark:border-neutral-700">
      <div className="flex select-none flex-col gap-0.5 bg-white px-3 py-2 sm:hidden dark:bg-neutral-900">
        <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
          {agenda.titulo}
        </p>
        <p className={`text-xs font-semibold ${textColorClass}`}>{agenda.estado}</p>
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{textoDias}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">{agenda.descripcion}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-[11px] text-slate-500 dark:text-slate-400">
            {formatearFechaSesion(agenda.fecha_reunion)}
          </p>
          {acciones()}
        </div>
      </div>
      <div className="hidden select-none items-center justify-between gap-3 bg-white px-4 py-2.5 sm:flex dark:bg-neutral-900">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase leading-snug tracking-wider text-blue-600 dark:text-blue-400">
            <span>{agenda.titulo}</span>
            <span className={`ml-2 normal-case tracking-normal ${textColorClass}`}>{agenda.estado}</span>
            <span className="ml-1 font-semibold normal-case tracking-normal text-slate-500 dark:text-slate-400">
              · {textoDias}
            </span>
          </p>
          <p className="truncate text-[11px] font-normal text-slate-500 dark:text-slate-400">
            {agenda.descripcion}
            <span className="mx-1.5">·</span>
            {formatearFechaSesion(agenda.fecha_reunion)}
          </p>
        </div>
        {acciones()}
      </div>
    </div>
  );
});

AgendaCard.displayName = 'AgendaCard';

type VistaType = 'hoy' | 'proximas' | 'terminadas' | 'actividades';

const ACTIVIDADES_QUERY_KEY = ['actividades-concejo-todas', 'v3'] as const;

export default function Ver() {
  const router = useRouter();
  const { permisos, rol, cargando: cargandoUsuario } = useUserData();
  const { agendas, cargando: cargandoAgendas, error, fetchAgendas } = useAgendasConcejo();
  const { data: actividades = [], isLoading: cargandoActividades, isError: errorActividades } = useQuery({
    queryKey: ACTIVIDADES_QUERY_KEY,
    queryFn: obtenerTodasActividadesConcejo,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
  const hayActividades = actividades.length > 0;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResumenOpen, setIsResumenOpen] = useState(false);
  const [isInformeOpen, setIsInformeOpen] = useState(false);
  const [agendaAEditar, setAgendaAEditar] = useState<AgendaConcejo | null>(null);
  const [agendaParaActa, setAgendaParaActa] = useState<AgendaConcejo | null>(null);
  const [filtroAnio, setFiltroAnio] = useState<string>(getYear(new Date()).toString());
  const [filtroMes, setFiltroMes] = useState<string | null>(null);

  useEffect(() => {
    const savedAnio = localStorage.getItem('agenda_filtroAnio');
    if (savedAnio) setFiltroAnio(savedAnio);
    
    const savedMes = localStorage.getItem('agenda_filtroMes');
    if (savedMes) setFiltroMes(savedMes);
  }, []);

  useEffect(() => {
    if (filtroAnio) {
      localStorage.setItem('agenda_filtroAnio', filtroAnio);
    }
  }, [filtroAnio]);

  useEffect(() => {
    if (filtroMes === null) {
      localStorage.removeItem('agenda_filtroMes');
    } else {
      localStorage.setItem('agenda_filtroMes', filtroMes);
    }
  }, [filtroMes]);
  
  const [loadingAgendaId, setLoadingAgendaId] = useState<string | null>(null);
  const [vista, setVista] = useState<VistaType>('hoy');
  const [haCargadoVistaInicial, setHaCargadoVistaInicial] = useState(false);

  const agendasFiltradasBase = useMemo(() => {
    return agendas.filter(agenda => {
      const agendaDate = new Date(agenda.fecha_reunion);
      const agendaYear = agendaDate.getFullYear().toString();
      const agendaMonth = agendaDate.getMonth().toString();
      const cumpleAnio = filtroAnio === '' || agendaYear === filtroAnio;
      const cumpleMes = filtroMes === null || agendaMonth === filtroMes;
      return cumpleAnio && cumpleMes;
    });
  }, [agendas, filtroAnio, filtroMes]);

  const counts = useMemo(() => {
    let hoy = 0;
    let proximas = 0;
    let terminadas = 0;
    agendasFiltradasBase.forEach(a => {
      const fecha = new Date(a.fecha_reunion);
      if (isToday(fecha)) hoy++;
      else if (isFuture(fecha)) proximas++;
      else if (isPast(fecha)) terminadas++;
    });
    return { hoy, proximas, terminadas };
  }, [agendasFiltradasBase]);

  useEffect(() => {
    if (cargandoAgendas) return;
    const vistaActualEstaVacia = 
      (vista === 'hoy' && counts.hoy === 0) ||
      (vista === 'proximas' && counts.proximas === 0) ||
      (vista === 'terminadas' && counts.terminadas === 0);

    if (!haCargadoVistaInicial || vistaActualEstaVacia) {
      if (counts.hoy > 0) setVista('hoy');
      else if (counts.proximas > 0) setVista('proximas');
      else if (counts.terminadas > 0) setVista('terminadas');
      else setVista('hoy');
      if (!haCargadoVistaInicial) setHaCargadoVistaInicial(true);
    }
  }, [counts, vista, haCargadoVistaInicial, cargandoAgendas]);

  useEffect(() => {
    if (cargandoActividades || hayActividades || vista !== 'actividades') return;
    if (counts.hoy > 0) setVista('hoy');
    else if (counts.proximas > 0) setVista('proximas');
    else if (counts.terminadas > 0) setVista('terminadas');
    else setVista('hoy');
  }, [cargandoActividades, hayActividades, vista, counts]);

  const agendasVisibles = useMemo(() => {
    let lista: AgendaConcejo[] = [];
    if (vista === 'hoy') {
      lista = agendasFiltradasBase.filter(a => isToday(new Date(a.fecha_reunion)));
    } else if (vista === 'proximas') {
      lista = agendasFiltradasBase.filter(a => isFuture(new Date(a.fecha_reunion)) && !isToday(new Date(a.fecha_reunion)));
      lista.sort((a, b) => new Date(a.fecha_reunion).getTime() - new Date(b.fecha_reunion).getTime());
    } else {
      lista = agendasFiltradasBase.filter(a => isPast(new Date(a.fecha_reunion)) && !isToday(new Date(a.fecha_reunion)));
      lista.sort((a, b) => new Date(b.fecha_reunion).getTime() - new Date(a.fecha_reunion).getTime());
    }
    return lista;
  }, [vista, agendasFiltradasBase]);

  useEffect(() => {
    if (isModalOpen) document.body.classList.add('overflow-hidden');
    else document.body.classList.remove('overflow-hidden');
    return () => { document.body.classList.remove('overflow-hidden'); };
  }, [isModalOpen]);

  const handleOpenEditModal = (agenda: AgendaConcejo) => {
    setAgendaAEditar(agenda);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAgendaAEditar(null);
  };

  const handleGoToAgenda = (id: string) => {
    setLoadingAgendaId(id);
    setTimeout(() => { router.push(`/protected/concejo/agenda/${id}`); }, 1000);
  };

  const handleDeleteAgenda = async (id: string) => {
    const result = await Swal.fire({
      title: '¿Está seguro?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      const exito = await eliminarAgenda(id);
      if (exito) fetchAgendas();
    }
  };

  if (cargandoUsuario || cargandoAgendas) return <CargandoAnimacion texto="Cargando Agenda..." />;
  if (error) return <div className="text-center py-10 text-red-500 dark:text-red-400"><p>{error}</p></div>;

  return (
    <div className="container min-w-0 max-w-full px-2 md:mx-auto">

      <header className="w-full min-w-0 flex flex-col gap-4 mt-2 md:mb-6">
        
        <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full min-w-0 items-center gap-3 lg:w-auto lg:flex-1">
                <BotonVolver ruta="/protected/" className="h-8 shrink-0 gap-1 px-1 text-sm [&_svg]:h-4 [&_svg]:w-4 sm:h-10 sm:gap-2 sm:px-4 sm:text-xl sm:[&_svg]:h-5 sm:[&_svg]:w-5" />
                <FiltroPeriodoAgenda
                  filtroAnio={filtroAnio}
                  filtroMes={filtroMes}
                  onChangeAnio={setFiltroAnio}
                  onChangeMes={setFiltroMes}
                />
            </div>

            <div className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:gap-2 lg:ml-4 lg:w-auto lg:shrink-0 lg:flex-nowrap lg:justify-end">
                <Button onClick={() => setIsResumenOpen(true)} variant="ghost" size="sm" className="h-8 gap-1.5 border border-gray-100 px-1.5 text-blue-600 hover:bg-blue-100 hover:text-blue-700 dark:border-neutral-800 dark:text-blue-400 dark:hover:bg-blue-900/30 sm:h-10 sm:gap-2 sm:px-2 lg:border-none">
                    <Table size={14} className="sm:h-4 sm:w-4" /> <span className="text-[11px] sm:text-sm">Resumen de asistencia</span>
                </Button>
                <Button onClick={() => setIsInformeOpen(true)} variant="ghost" size="sm" className="h-8 gap-1.5 border border-gray-100 px-1.5 text-green-600 hover:bg-green-100 hover:text-green-700 dark:border-neutral-800 dark:text-green-400 dark:hover:bg-green-900/50 sm:h-10 sm:gap-2 sm:px-2 lg:border-none">
                    <FileText size={14} className="sm:h-4 sm:w-4" /> <span className="text-[11px] sm:text-sm">Informe Pago DAFIM</span>
                </Button>
                {(permisos.includes('EDITAR') || permisos.includes('TODO')) && (
                    <Button 
                    onClick={() => { setAgendaAEditar(null); setIsModalOpen(true); }} 
                    variant="ghost" 
                    className="h-8 gap-1.5 border border-green-600 px-1.5 text-[11px] font-semibold text-green-600 hover:bg-green-100 hover:text-green-700 dark:border-green-400 dark:text-green-400 dark:hover:bg-green-900/50 sm:h-10 sm:gap-2 sm:border-2 sm:px-2 sm:text-sm"
                    >
                    <CalendarPlus size={14} className="sm:h-[18px] sm:w-[18px]" /> <span>Nueva Sesión</span>
                    </Button>
                )}
            </div>
        </div>

        <div className="w-full min-w-0 border-t border-gray-100 dark:border-neutral-800 pt-2 xl:border-none xl:pt-0">
            <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-4 sm:overflow-x-auto sm:overscroll-x-contain sm:pb-1 sm:[-ms-overflow-style:none] sm:[scrollbar-width:none] sm:[&::-webkit-scrollbar]:hidden xl:overflow-x-visible">
                <div className="flex items-center justify-center gap-3 sm:contents">
                {(counts.hoy > 0 || vista === 'hoy') && (
                    <button onClick={() => setVista('hoy')} className={cn("relative flex shrink-0 items-center gap-1.5 px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap", vista === 'hoy' ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}>
                        <CalendarClock className="h-4 w-4" /> <span>Hoy ({counts.hoy})</span>
                        {vista === 'hoy' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 dark:bg-blue-400" />}
                    </button>
                )}
                {(counts.proximas > 0 || vista === 'proximas') && (
                    <button onClick={() => setVista('proximas')} className={cn("relative flex shrink-0 items-center gap-1.5 px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap", vista === 'proximas' ? "text-indigo-600 dark:text-indigo-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}>
                        <CalendarDays className="h-4 w-4" /> <span>Próximas ({counts.proximas})</span>
                        {vista === 'proximas' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-600 dark:bg-indigo-400" />}
                    </button>
                )}
                {(counts.terminadas > 0 || vista === 'terminadas') && (
                    <button onClick={() => setVista('terminadas')} className={cn("relative flex shrink-0 items-center gap-1.5 px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap", vista === 'terminadas' ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}>
                        <CalendarCheck className="h-4 w-4" /> <span>Terminadas ({counts.terminadas})</span>
                        {vista === 'terminadas' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-600 dark:bg-red-400" />}
                    </button>
                )}
                </div>
                <div className="flex items-center justify-center sm:contents">
                {(hayActividades || vista === 'actividades' || cargandoActividades) && !errorActividades && (
                    <button onClick={() => setVista('actividades')} className={cn("relative flex shrink-0 items-center gap-1.5 px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap", vista === 'actividades' ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}>
                        <ClipboardList className="h-4 w-4" /> <span>Actividades Asignadas</span>
                        {vista === 'actividades' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-purple-600 dark:bg-purple-400" />}
                    </button>
                )}
                </div>
            </div>
        </div>

      </header>
      <div className="w-full">
        {vista === 'actividades' && hayActividades ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="actividades"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ListaActividadesAsignadas filtroAnio={filtroAnio} filtroMes={filtroMes} />
            </motion.div>
          </AnimatePresence>
        ) : agendasVisibles.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-gray-300 dark:border-neutral-800 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Aún no hay sesiones disponibles en esta vista.</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={vista}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {agendasVisibles.map(agenda => (
                <AgendaCard
                  key={agenda.id}
                  agenda={agenda}
                  onDelete={handleDeleteAgenda}
                  onEdit={handleOpenEditModal}
                  onGoTo={handleGoToAgenda}
                  rol={rol}
                  permisos={permisos}
                  onSetActa={(a) => setAgendaParaActa(a)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {agendaParaActa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-0 backdrop-blur-sm">
          <div className="relative w-full h-full max-w-none flex flex-col rounded-none bg-white dark:bg-neutral-900 shadow-xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0 z-10">
              <div className="pr-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  {agendaParaActa.titulo}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {agendaParaActa.descripcion}
                </p>
              </div>
              <button 
                onClick={() => {
                  setAgendaParaActa(null);
                  fetchAgendas();
                }}
                className="text-gray-400 hover:text-white hover:bg-red-600 transition-colors bg-gray-100 dark:bg-gray-800 p-2 rounded-full shrink-0"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-neutral-950 relative">
              <GestorActa 
                agendaId={agendaParaActa.id}
                currentActaPath={agendaParaActa.acta}
                rol={rol}
                estadoAgenda={agendaParaActa.estado}
                onUpdate={(nuevoPath) => {
                  setAgendaParaActa({ ...agendaParaActa, acta: nuevoPath });
                  fetchAgendas(); 
                }}
              />
            </div>
          </div>
        </div>
      )}

       <AnimatePresence>
        {isModalOpen && (
          <AgendaForm isOpen={isModalOpen} onClose={handleCloseModal} onSave={() => { fetchAgendas(); }} agendaAEditar={agendaAEditar} />
        )}
      </AnimatePresence>

      <ResumenAsistencia isOpen={isResumenOpen} onClose={() => setIsResumenOpen(false)} agendas={agendas} />
      <InformeDietas isOpen={isInformeOpen} onClose={() => setIsInformeOpen(false)} agendas={agendas} />
    </div>
  );
}