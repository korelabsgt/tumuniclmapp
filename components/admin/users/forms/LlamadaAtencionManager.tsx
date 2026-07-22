import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Plus, AlertCircle, Calendar, Pencil, Trash2, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import LlamadaAtencionForm from "./LlamadaAtencionForm";
import CitacionForm from "./CitacionForm";
import { useLlamadasAtencion, useCitaciones } from "./hooks";
import { fetchUsuario } from "@/lib/usuarios/acciones";
import Cargando from "@/components/ui/animations/Cargando";
import Swal from "sweetalert2";

const formatearFecha = (fechaStr: string) => {
  const d = new Date(fechaStr);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diaSemana = dias[d.getDay()];
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const anio = d.getFullYear().toString().substring(2);
  let hora = d.getHours();
  const minutos = d.getMinutes().toString().padStart(2, '0');
  const ampm = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12;
  hora = hora ? hora : 12;
  return `${diaSemana} ${dia}/${mes}/${anio} | ${hora}:${minutos} ${ampm}`;
};

const formatearFechaConfirmacion = (fechaStr: string) => {
  const d = new Date(fechaStr);
  const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diaSemana = dias[d.getDay()];
  const dia = d.getDate().toString().padStart(2, '0');
  const mes = (d.getMonth() + 1).toString().padStart(2, '0');
  const anio = d.getFullYear().toString().substring(2);
  let hora = d.getHours();
  const minutos = d.getMinutes().toString().padStart(2, '0');
  const ampm = hora >= 12 ? 'PM' : 'AM';
  hora = hora % 12;
  hora = hora ? hora : 12;
  const horaStr = hora.toString().padStart(2, '0');
  
  return {
    fecha: `${diaSemana} ${dia}/${mes}/${anio}`,
    hora: `${horaStr}:${minutos} ${ampm}`
  };
};

interface LlamadaAtencionManagerProps {
  id: string; // id_usuario
  onClose: () => void;
  readOnly?: boolean;
}

export default function LlamadaAtencionManager({ id, onClose, readOnly = false }: LlamadaAtencionManagerProps) {
  const [activeTab, setActiveTab] = useState<"faltas" | "citaciones">("citaciones");
  const [view, setView] = useState<"list" | "createFalta" | "createCitacion">("list");
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [orden, setOrden] = useState<"desc" | "asc">("desc");
  const [nombreEmpleado, setNombreEmpleado] = useState<string>("el empleado");

  useEffect(() => {
    fetchUsuario(id)
      .then(u => {
        if (u && u.nombre) setNombreEmpleado(u.nombre);
      })
      .catch(console.error);
  }, [id]);

  const { llamadas, loading: loadingFaltas, invalidate: invalidateFaltas, eliminarLlamada } = useLlamadasAtencion(id);
  const { citaciones, loading: loadingCitaciones, invalidate: invalidateCitaciones, eliminar: eliminarCitacion } = useCitaciones(id);

  const handleEditCitacion = (record: any) => {
    setEditingRecord(record);
    setView("createCitacion");
  };

  const handleDeleteCitacion = async (idCitacion: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar citación?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#18181b',
      color: '#ffffff'
    });

    if (result.isConfirmed) {
      const deleteResult = await eliminarCitacion(idCitacion);
      if (deleteResult.success) {
        Swal.fire({
          title: 'Eliminada',
          text: 'La citación ha sido eliminada.',
          icon: 'success',
          background: '#18181b',
          color: '#ffffff'
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al eliminar la citación.',
          icon: 'error',
          background: '#18181b',
          color: '#ffffff'
        });
      }
    }
  };

  const handleEditFalta = (record: any) => {
    setEditingRecord(record);
    setView("createFalta");
  };

  const handleDeleteFalta = async (idLlamada: string) => {
    const result = await Swal.fire({
      title: '¿Eliminar registro?',
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#18181b',
      color: '#ffffff'
    });

    if (result.isConfirmed) {
      const deleteResult = await eliminarLlamada(idLlamada);
      if (deleteResult.success) {
        Swal.fire({
          title: 'Eliminado',
          text: 'El registro ha sido eliminado.',
          icon: 'success',
          background: '#18181b',
          color: '#ffffff'
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: 'Hubo un problema al eliminar el registro.',
          icon: 'error',
          background: '#18181b',
          color: '#ffffff'
        });
      }
    }
  };

  if (view === "createFalta") {
    return (
      <LlamadaAtencionForm
        id={id}
        initialData={editingRecord}
        onSuccess={() => {
          invalidateFaltas();
          setView("list");
          setEditingRecord(null);
        }}
        onCancel={() => {
          setView("list");
          setEditingRecord(null);
        }}
      />
    );
  }

  if (view === "createCitacion") {
    return (
      <CitacionForm
        id={id}
        initialData={editingRecord}
        nombreEmpleado={nombreEmpleado}
        onSuccess={() => {
          invalidateCitaciones();
          setView("list");
          setEditingRecord(null);
        }}
        onCancel={() => {
          setView("list");
          setEditingRecord(null);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col -mx-6 -my-6 h-full min-h-[500px]">
      {/* Header Institucional */}
      <div className="flex items-center justify-between px-3 sm:px-8 py-2 sm:py-3 border-b-2 border-blue-600 rounded-t-lg bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-4">
          <img
            src="/images/logo-muni.png"
            alt="Logo"
            className="h-10 sm:h-14 object-contain"
          />
          <div>
            <p className="text-[10px] sm:text-[12px] font-black text-neutral-600 dark:text-neutral-400 tracking-widest uppercase leading-tight">
              Municipalidad de Concepción Las Minas
            </p>
            <p className="text-[8px] sm:text-[10px] font-bold text-neutral-500/80 tracking-wide mt-0.5">Expediente Disciplinario</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              invalidateFaltas();
              invalidateCitaciones();
            }}
            title="Recargar datos"
            className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-100 dark:bg-neutral-800 rounded-xl transition-colors active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loadingFaltas || loadingCitaciones ? 'animate-spin text-blue-500' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-100 dark:bg-neutral-800 rounded-xl transition-colors active:scale-95"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-gray-200 dark:border-neutral-800 px-6 sm:px-8 pt-4">
        <button
          onClick={() => setActiveTab("citaciones")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'citaciones'
            ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500"
            : "border-transparent text-gray-500 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300 hover:border-gray-300 dark:hover:border-neutral-700"
            }`}
        >
          Citaciones ({citaciones.length})
        </button>
        <button
          onClick={() => setActiveTab("faltas")}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === "faltas"
            ? "border-red-600 text-red-600 dark:border-red-500 dark:text-red-500"
            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
        >
          Faltas ({llamadas.length})
        </button>
      </div>

      {/* Título y Controles */}
      <div className="px-3 pt-4 pb-0 sm:px-8 sm:pt-5 sm:pb-0 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <h2 className="text-base sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
            Historial de {activeTab === "faltas" ? "Faltas" : "Citaciones"}
          </h2>
        </div>
        <div className="flex flex-row w-full md:w-auto justify-between items-center gap-2 sm:gap-3">
          {(activeTab === "faltas" ? llamadas.length : citaciones.length) > 0 && (
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as "desc" | "asc")}
              className="bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-semibold px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer appearance-none pr-7 relative h-10 truncate w-auto"
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.3rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          )}
          {activeTab === "faltas" && !readOnly && (
            <Button
              onClick={() => {
                setEditingRecord(null);
                setView("createFalta");
              }}
              className="bg-red-600 hover:bg-red-700 flex-1 md:flex-none text-white flex items-center justify-center gap-1.5 rounded-xl h-10 px-3 text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus className="h-4 w-4 shrink-0" /> Agregar Falta
            </Button>
          )}
          {activeTab === "citaciones" && !readOnly && (
            <Button
              onClick={() => {
                setEditingRecord(null);
                setView("createCitacion");
              }}
              className="bg-blue-600 hover:bg-blue-700 flex-1 md:flex-none text-white flex items-center justify-center gap-1.5 rounded-xl h-10 px-3 text-xs sm:text-sm whitespace-nowrap"
            >
              <Plus className="h-4 w-4 shrink-0" /> Nueva Citación
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 px-3 pt-4 pb-4 sm:px-8 overflow-y-auto custom-scrollbar max-h-[450px] sm:max-h-[500px]">
        {activeTab === "faltas" ? (
          loadingFaltas ? (
            <Cargando texto="Cargando faltas..." />
          ) : llamadas.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-700">
              <AlertCircle className="h-12 w-12 text-gray-300 dark:text-neutral-600 mx-auto mb-4" />
              <p className="text-base font-bold text-gray-600 dark:text-gray-300">Expediente Limpio</p>
              <p className="text-sm text-gray-500 mt-1">Este empleado no tiene faltas registradas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...llamadas]
                .sort((a, b) => {
                  const timeA = new Date(a.created_at).getTime();
                  const timeB = new Date(b.created_at).getTime();
                  return orden === "desc" ? timeB - timeA : timeA - timeB;
                })
                .map((llamada, idx) => (
                  <div
                    key={llamada.id}
                    className="relative p-2.5 sm:p-5 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 shadow-sm hover:shadow-md transition-shadow group overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${llamada.tipo.toLowerCase().includes('escrita') ? 'bg-red-500' : 'bg-amber-500'}`} />

                    <div className="flex flex-row justify-between items-start gap-2 mb-3 pl-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-gray-400 dark:text-neutral-500">
                          #{orden === "desc" ? llamadas.length - idx : idx + 1}
                        </span>
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wider ${llamada.tipo.toLowerCase().includes('escrita')
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50'
                          }`}>
                          FALTA {llamada.tipo}
                        </span>
                      </div>
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-neutral-900/50 px-2.5 py-1 rounded-md border border-gray-100 dark:border-neutral-800 w-fit">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          {formatearFecha(llamada.created_at)}
                        </span>
                        {!readOnly && (
                          <div className="flex items-center gap-1 bg-white/50 dark:bg-neutral-800/50 rounded-lg p-0.5 border border-gray-100 dark:border-neutral-800">
                            <button onClick={() => handleEditFalta(llamada)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteFalta(llamada.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pl-2">
                      <h4 className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 leading-tight">
                        Motivo de la Llamada de Atención
                      </h4>
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                        {llamada.descripcion}
                      </p>
                    </div>
                    <div className="pl-2 mt-4 sm:hidden">
                      <span className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-neutral-900/50 px-2.5 py-2 rounded-md border border-gray-100 dark:border-neutral-800">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatearFecha(llamada.created_at)}
                      </span>
                    </div>

                    {!readOnly && (
                      <div className="absolute top-2.5 right-2.5 sm:hidden flex items-center gap-1 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-lg p-0.5 z-10">
                        <button onClick={() => handleEditFalta(llamada)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteFalta(llamada.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )
        ) : (
          loadingCitaciones ? (
            <Cargando texto="Cargando citaciones..." />
          ) : citaciones.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-neutral-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-700">
              <AlertCircle className="h-12 w-12 text-gray-300 dark:text-neutral-600 mx-auto mb-4" />
              <p className="text-base font-bold text-gray-600 dark:text-gray-300">Sin Citaciones</p>
              <p className="text-sm text-gray-500 mt-1">Este empleado no tiene citaciones a RRHH registradas.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[...citaciones]
                .sort((a, b) => {
                  const timeA = new Date(a.created_at).getTime();
                  const timeB = new Date(b.created_at).getTime();
                  return orden === "desc" ? timeB - timeA : timeA - timeB;
                })
                .map((citacion, idx) => (
                  <div
                    key={citacion.id}
                    className="relative p-2.5 sm:p-5 rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 shadow-sm hover:shadow-md transition-shadow group overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${citacion.estado === 'Pendiente' ? 'bg-orange-500' : 'bg-emerald-500'}`} />

                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pl-2">
                      {/* Left Column: Badge and Motivo */}
                      <div className="flex-1 flex flex-col gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs font-bold text-gray-400 dark:text-neutral-500">
                            #{orden === "desc" ? citaciones.length - idx : idx + 1}
                          </span>
                          <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-black uppercase tracking-wider ${citacion.estado === 'Pendiente'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                            }`}>
                            {citacion.estado === 'Pendiente' ? <Clock className="w-3.5 h-3.5 mr-1" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                            {citacion.estado}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-[10px] sm:text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 leading-tight">
                            Motivo de la Citación
                          </h4>
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {citacion.motivo}
                          </p>
                        </div>
                      </div>

                      {/* Right Column: Dates (Desktop) */}
                      <div className="hidden sm:flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-neutral-900/50 px-2.5 py-1 rounded-md border border-gray-100 dark:border-neutral-800 w-fit">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          Agendada para: {formatearFecha(citacion.fecha_cita)}
                        </span>
                        {!readOnly && (
                          <div className="flex items-center gap-1 bg-white/50 dark:bg-neutral-800/50 rounded-lg p-0.5 border border-gray-100 dark:border-neutral-800">
                            <button onClick={() => handleEditCitacion(citacion)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteCitacion(citacion.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </div>
                    </div>

                    {citacion.fecha_confirmado && (
                      <div className="pl-2 mt-4">
                        <div className="bg-gray-50 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-lg p-3 block w-full">
                          <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                            Confirmado por: <span className="font-bold italic text-gray-900 dark:text-white">{nombreEmpleado}</span><br />
                            El <span className="font-bold italic text-gray-900 dark:text-white">{formatearFechaConfirmacion(citacion.fecha_confirmado).fecha}</span> a las <span className="font-bold italic text-gray-900 dark:text-white">{formatearFechaConfirmacion(citacion.fecha_confirmado).hora}</span>
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="pl-2 mt-4 sm:hidden">
                      <span className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold bg-gray-50 dark:bg-neutral-900/50 px-2.5 py-2 rounded-md border border-gray-100 dark:border-neutral-800">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        Agendada para: {formatearFecha(citacion.fecha_cita)}
                      </span>
                    </div>

                    {!readOnly && (
                      <div className="absolute top-2.5 right-2.5 sm:hidden flex items-center gap-1 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm rounded-lg p-0.5 z-10">
                        <button onClick={() => handleEditCitacion(citacion)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteCitacion(citacion.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )
        )}
      </div>

      {/* Cintillo de Colores Institucional */}
      <div className="flex h-1.5 sm:h-2 w-full mt-auto">
        <div className="flex-1 bg-blue-900" />
        <div className="flex-1 bg-blue-600" />
        <div className="flex-1 bg-blue-400" />
        <div className="flex-1 bg-blue-200" />
      </div>
    </div>
  );
}
