"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  CalendarDays,
  Edit2,
  PartyPopper,
  Loader2,
  CalendarRange,
  Calendar,
  Search,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  obtenerAsuetos,
  crearAsueto,
  actualizarAsueto,
  eliminarAsueto,
  Asueto,
} from "@/lib/asuetos/acciones";
import { useDependencias } from "@/hooks/dependencias/useDependencias";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "react-toastify";
import Swal, { type SweetAlertOptions } from "sweetalert2";

interface GestionAsuetoProps {
  isOpen: boolean;
  onClose: () => void;
}

function fireSwal(opciones: SweetAlertOptions) {
  const oscuro =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  return Swal.fire({
    ...opciones,
    background: oscuro ? "#18181b" : "#fafafa",
    color: oscuro ? "#e4e4e7" : "#18181b",
  });
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

type ModoFecha = "dia" | "rango";

const btnOutlineAmber =
  "inline-flex items-center justify-center gap-2 rounded-md border-2 border-amber-500 text-amber-500 bg-transparent font-semibold transition-colors cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 dark:hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50";

const btnOutlineAmberActivo =
  "inline-flex items-center justify-center gap-2 rounded-md border-2 border-amber-500 text-amber-500 bg-amber-500/15 dark:bg-amber-500/20 font-bold transition-colors cursor-pointer shadow-sm";

export default function GestionAsueto({ isOpen, onClose }: GestionAsuetoProps) {
  const { dependencias } = useDependencias();
  const [asuetos, setAsuetos] = useState<Asueto[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  const [editando, setEditando] = useState<Asueto | null>(null);
  const [modoFecha, setModoFecha] = useState<ModoFecha>("dia");
  const [formFechaInicio, setFormFechaInicio] = useState("");
  const [formFechaFin, setFormFechaFin] = useState("");
  const [formNombre, setFormNombre] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formExcluidas, setFormExcluidas] = useState<string[]>([]);
  const [busquedaDep, setBusquedaDep] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);

  const oficinasExcluibles = useMemo(() => {
    const byId = new Map(dependencias.map((d) => [d.id, d]));
    return dependencias
      .filter((d) => !d.es_puesto && d.parent_id !== null)
      .map((d) => {
        const parent = d.parent_id ? byId.get(d.parent_id) : null;
        const etiqueta =
          parent && parent.parent_id !== null
            ? `${parent.nombre} › ${d.nombre}`
            : d.nombre;
        return { id: d.id, nombre: etiqueta };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [dependencias]);

  const nombrePorId = useCallback(
    (id: string) => {
      const byId = new Map(dependencias.map((d) => [d.id, d]));
      const dep = byId.get(id);
      if (!dep) return id;
      const parent = dep.parent_id ? byId.get(dep.parent_id) : null;
      if (!dep.es_puesto && parent && parent.parent_id !== null) {
        return `${parent.nombre} › ${dep.nombre}`;
      }
      return dep.nombre;
    },
    [dependencias],
  );

  const nombreDependencia = useCallback(
    (id: string) =>
      oficinasExcluibles.find((o) => o.id === id)?.nombre || nombrePorId(id),
    [oficinasExcluibles, nombrePorId],
  );

  const terminoBusqueda = busquedaDep.trim().toLowerCase();
  const dependenciasFiltradas = useMemo(() => {
    if (terminoBusqueda.length === 0) return [];
    return oficinasExcluibles.filter((d) =>
      d.nombre.toLowerCase().includes(terminoBusqueda),
    );
  }, [oficinasExcluibles, terminoBusqueda]);

  const excluidasSeleccionadas = useMemo(
    () =>
      formExcluidas
        .map((id) => ({ id, nombre: nombreDependencia(id) }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [formExcluidas, nombreDependencia],
  );

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await obtenerAsuetos(anio, mes);
      setAsuetos(data);
    } finally {
      setLoading(false);
    }
  }, [anio, mes]);

  useEffect(() => {
    if (isOpen) cargar();
  }, [isOpen, cargar]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleNuevo = () => {
    setEditando(null);
    setModoFecha("dia");
    setFormFechaInicio("");
    setFormFechaFin("");
    setFormNombre("");
    setFormDescripcion("");
    setFormExcluidas([]);
    setBusquedaDep("");
    setMostrarForm(true);
  };

  const handleEditar = (a: Asueto) => {
    setEditando(a);
    const esRango = a.fecha_inicio !== a.fecha_fin;
    setModoFecha(esRango ? "rango" : "dia");
    setFormFechaInicio(a.fecha_inicio);
    setFormFechaFin(a.fecha_fin);
    setFormNombre(a.nombre);
    setFormDescripcion(a.descripcion || "");
    setFormExcluidas(a.dependencias_excluidas || []);
    setBusquedaDep("");
    setMostrarForm(true);
  };

  const handleCancelarForm = () => {
    setMostrarForm(false);
    setEditando(null);
    setFormExcluidas([]);
    setBusquedaDep("");
  };

  const hayCambiosSinGuardar = useMemo(() => {
    if (!mostrarForm) return false;
    const finEfectivo = modoFecha === "dia" ? formFechaInicio : formFechaFin;
    if (editando) {
      const exclOrig = [...(editando.dependencias_excluidas || [])].sort().join(",");
      const exclNew = [...formExcluidas].sort().join(",");
      return (
        formFechaInicio !== editando.fecha_inicio ||
        finEfectivo !== editando.fecha_fin ||
        formNombre.trim() !== editando.nombre ||
        (formDescripcion || "") !== (editando.descripcion || "") ||
        exclOrig !== exclNew
      );
    }
    return !!(
      formFechaInicio ||
      formNombre.trim() ||
      formDescripcion.trim() ||
      formExcluidas.length > 0
    );
  }, [
    mostrarForm,
    editando,
    modoFecha,
    formFechaInicio,
    formFechaFin,
    formNombre,
    formDescripcion,
    formExcluidas,
  ]);

  const confirmarSalirFormulario = async (): Promise<boolean> => {
    if (!hayCambiosSinGuardar) return true;
    const result = await fireSwal({
      title: "¿Descartar cambios?",
      text: "Los datos del asueto no guardados se perderán.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Seguir editando",
    });
    return result.isConfirmed;
  };

  const handleAtras = async () => {
    const puedeSalir = await confirmarSalirFormulario();
    if (!puedeSalir) return;
    handleCancelarForm();
  };

  const handleCerrarModal = async () => {
    if (mostrarForm) {
      const puedeSalir = await confirmarSalirFormulario();
      if (!puedeSalir) return;
      handleCancelarForm();
    }
    onClose();
  };

  const toggleExcluida = (id: string) => {
    setFormExcluidas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleModoChange = (modo: ModoFecha) => {
    setModoFecha(modo);
    if (modo === "dia" && formFechaInicio) {
      setFormFechaFin(formFechaInicio);
    }
  };

  const handleFechaInicioChange = (val: string) => {
    setFormFechaInicio(val);
    if (modoFecha === "dia") setFormFechaFin(val);
  };

  const handleGuardar = async () => {
    if (!formFechaInicio || !formNombre.trim()) {
      toast.warn("La fecha y el nombre son requeridos.");
      return;
    }
    const finEfectivo = modoFecha === "dia" ? formFechaInicio : formFechaFin;
    if (!finEfectivo) {
      toast.warn("Debe ingresar la fecha final del rango.");
      return;
    }
    if (finEfectivo < formFechaInicio) {
      toast.warn("La fecha fin no puede ser anterior a la fecha inicio.");
      return;
    }

    setGuardando(true);
    const fd = new FormData();
    fd.append("fecha_inicio", formFechaInicio);
    fd.append("fecha_fin", finEfectivo);
    fd.append("nombre", formNombre.trim());
    fd.append("descripcion", formDescripcion);
    fd.append("dependencias_excluidas", JSON.stringify(formExcluidas));

    const eraEdicion = !!editando;

    try {
      const result = eraEdicion
        ? await actualizarAsueto(editando.id, fd)
        : await crearAsueto(fd);

      if (result.ok) {
        setMostrarForm(false);
        setEditando(null);
        setFormExcluidas([]);
        setBusquedaDep("");
        await cargar();
        toast.success(
          eraEdicion ? "Asueto actualizado correctamente." : "Asueto creado correctamente.",
        );
      } else {
        toast.error(result.error || "No se pudo guardar el asueto.");
      }
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (a: Asueto) => {
    const label =
      a.fecha_inicio === a.fecha_fin
        ? format(parseISO(a.fecha_inicio + "T00:00:00"), "d 'de' MMMM yyyy", {
            locale: es,
          })
        : `${format(parseISO(a.fecha_inicio + "T00:00:00"), "d MMM", { locale: es })} al ${format(parseISO(a.fecha_fin + "T00:00:00"), "d MMM yyyy", { locale: es })}`;

    const result = await fireSwal({
      title: "¿Eliminar asueto?",
      text: `Se eliminará "${a.nombre}" (${label}).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    const res = await eliminarAsueto(a.id);
    if (res.ok) {
      await cargar();
      toast.success("Asueto eliminado correctamente.");
    } else {
      toast.error(res.error || "No se pudo eliminar el asueto.");
    }
  };

  const aniosDisponibles = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i,
  );

  const getDiasRango = (a: Asueto) => {
    if (a.fecha_inicio === a.fecha_fin) return null;
    return (
      differenceInCalendarDays(
        parseISO(a.fecha_fin + "T00:00:00"),
        parseISO(a.fecha_inicio + "T00:00:00"),
      ) + 1
    );
  };

  if (!isOpen) return null;

  const panelExclusiones = (
    <div className="flex flex-col min-h-0">
      <div className="mb-2 shrink-0">
        <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          Excluir dependencias
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
          Busca y marca las dependencias cuyo personal no verá este asueto.
        </p>
      </div>

      <div className="relative mb-2 shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={busquedaDep}
          onChange={(e) => setBusquedaDep(e.target.value)}
          placeholder="Buscar dependencia..."
          className="w-full text-xs border border-gray-200 dark:border-neutral-700 rounded-md pl-8 pr-8 py-2 bg-white dark:bg-neutral-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
        {busquedaDep && (
          <button
            type="button"
            onClick={() => setBusquedaDep("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-[12rem] overflow-y-auto rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        {terminoBusqueda.length > 0 ? (
          dependenciasFiltradas.length === 0 ? (
            <div className="flex items-center justify-center min-h-[10rem] px-4 py-6">
              <p className="text-[11px] text-gray-400 text-center">
                Sin resultados para &quot;{busquedaDep.trim()}&quot;
              </p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              {dependenciasFiltradas.map((dep) => {
                const checked = formExcluidas.includes(dep.id);
                return (
                  <label
                    key={dep.id}
                    className={`flex items-start gap-2 cursor-pointer rounded-md px-2 py-2 transition-colors ${
                      checked
                        ? "bg-amber-50 dark:bg-amber-900/30"
                        : "hover:bg-zinc-50 dark:hover:bg-neutral-700/50"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleExcluida(dep.id)}
                      className="mt-0.5 border-amber-400 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <span className="text-[11px] text-gray-700 dark:text-gray-200 leading-snug">
                      {dep.nombre}
                    </span>
                  </label>
                );
              })}
            </div>
          )
        ) : excluidasSeleccionadas.length > 0 ? (
          <div className="p-2 space-y-1.5">
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 px-1">
              {excluidasSeleccionadas.length} excluida
              {excluidasSeleccionadas.length !== 1 ? "s" : ""} — escribe arriba
              para agregar más
            </p>
            {excluidasSeleccionadas.map((dep) => (
              <button
                key={dep.id}
                type="button"
                onClick={() => toggleExcluida(dep.id)}
                className="w-full flex items-start gap-2 text-left rounded-md px-2.5 py-2 border border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 cursor-pointer transition-colors"
                title="Quitar exclusión"
              >
                <span className="text-[11px] text-amber-900 dark:text-amber-100 leading-snug flex-1">
                  {dep.nombre}
                </span>
                <X className="w-3.5 h-3.5 shrink-0 text-amber-500 mt-0.5" />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[10rem] px-4 py-8">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
              Escribe en el buscador para encontrar dependencias a excluir
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex bg-black/60 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25 }}
          className={`bg-white dark:bg-neutral-900 shadow-2xl w-full border border-gray-200 dark:border-neutral-700 overflow-hidden flex flex-col
            ${mostrarForm ? "h-auto max-h-[100dvh] sm:max-h-[92dvh]" : "h-[100dvh] sm:h-[min(92dvh,880px)]"}
            sm:max-w-[min(96vw,1100px)] sm:rounded-2xl`}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-gray-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-900/20 shrink-0 gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {mostrarForm ? (
                <button
                  type="button"
                  onClick={handleAtras}
                  className="flex items-center gap-1 shrink-0 px-2 py-1.5 rounded-md text-sm font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Atrás
                </button>
              ) : (
                <PartyPopper className="w-5 h-5 text-amber-500 shrink-0" />
              )}
              <h2 className="text-base sm:text-lg font-bold text-amber-800 dark:text-amber-300 truncate">
                {mostrarForm
                  ? editando
                    ? "Editar Asueto"
                    : "Nuevo Asueto"
                  : "Gestión de Asuetos"}
              </h2>
              {!mostrarForm && (
                <span className="text-[10px] bg-amber-200 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded font-bold shrink-0">
                  Solo RRHH
                </span>
              )}
            </div>
            <button
              onClick={handleCerrarModal}
              className="p-2 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-400 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!mostrarForm && (
          <div className="flex items-center gap-2 px-4 sm:px-6 pt-3 pb-2 shrink-0 flex-wrap">
            <CalendarDays className="w-4 h-4 text-gray-400" />
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="text-sm border border-gray-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-gray-50 dark:bg-neutral-800 dark:text-gray-200 focus:outline-none"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="text-sm border border-gray-200 dark:border-neutral-700 rounded-md px-3 py-2 bg-gray-50 dark:bg-neutral-800 dark:text-gray-200 focus:outline-none"
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <div className="flex-1" />
              <Button
                size="sm"
                onClick={handleNuevo}
                className="h-9 text-sm bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Nuevo Asueto
              </Button>
          </div>
          )}

          <div className={`overflow-hidden flex flex-col ${mostrarForm ? "" : "flex-1 min-h-0"}`}>
            {mostrarForm ? (
              <>
              <div className="overflow-y-auto border-y border-gray-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-start px-4 sm:px-6 py-4 gap-4 lg:gap-0">
                  <div className="lg:pr-5 flex flex-col gap-3 min-w-0">
                        <div className="flex justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleModoChange("dia")}
                            className={`h-12 px-6 text-base ${
                              modoFecha === "dia"
                                ? btnOutlineAmberActivo
                                : btnOutlineAmber
                            }`}
                          >
                            <Calendar className="w-5 h-5" />
                            Un día
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModoChange("rango")}
                            className={`h-12 px-6 text-base ${
                              modoFecha === "rango"
                                ? btnOutlineAmberActivo
                                : btnOutlineAmber
                            }`}
                          >
                            <CalendarRange className="w-5 h-5" />
                            Rango de días
                          </button>
                        </div>

                        <div className="flex gap-3">
                          <div className="flex flex-col gap-1.5 flex-1">
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                              {modoFecha === "dia"
                                ? "Fecha *"
                                : "Fecha inicio *"}
                            </label>
                            <input
                              type="date"
                              value={formFechaInicio}
                              onChange={(e) =>
                                handleFechaInicioChange(e.target.value)
                              }
                              className="text-sm border border-gray-200 dark:border-neutral-700 rounded-md px-3 py-2.5 bg-white dark:bg-neutral-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                            />
                          </div>

                          {modoFecha === "rango" && (
                            <div className="flex flex-col gap-1.5 flex-1">
                              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Fecha fin *
                              </label>
                              <input
                                type="date"
                                value={formFechaFin}
                                min={formFechaInicio || undefined}
                                onChange={(e) =>
                                  setFormFechaFin(e.target.value)
                                }
                                className="text-sm border border-gray-200 dark:border-neutral-700 rounded-md px-3 py-2.5 bg-white dark:bg-neutral-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                              />
                            </div>
                          )}
                        </div>

                        {modoFecha === "rango" &&
                          formFechaInicio &&
                          formFechaFin &&
                          formFechaFin >= formFechaInicio && (
                            <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md border border-amber-100 dark:border-amber-900/30">
                              {differenceInCalendarDays(
                                parseISO(formFechaFin + "T00:00:00"),
                                parseISO(formFechaInicio + "T00:00:00"),
                              ) + 1}{" "}
                              día(s) —{" "}
                              {format(
                                parseISO(formFechaInicio + "T00:00:00"),
                                "d MMM",
                                { locale: es },
                              )}{" "}
                              al{" "}
                              {format(
                                parseISO(formFechaFin + "T00:00:00"),
                                "d MMM yyyy",
                                { locale: es },
                              )}
                            </div>
                          )}

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Nombre *
                          </label>
                          <input
                            type="text"
                            value={formNombre}
                            onChange={(e) => setFormNombre(e.target.value)}
                            placeholder="Ej: Semana Santa, Día Nacional"
                            className="text-sm border border-gray-200 dark:border-neutral-700 rounded-md px-3 py-2.5 bg-white dark:bg-neutral-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            Descripción (opcional)
                          </label>
                          <textarea
                            value={formDescripcion}
                            onChange={(e) => setFormDescripcion(e.target.value)}
                            placeholder="Notas adicionales..."
                            rows={4}
                            className="text-sm border border-gray-200 dark:border-neutral-700 rounded-md px-3 py-2.5 bg-white dark:bg-neutral-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                          />
                        </div>
                      </div>

                      <div className="lg:pl-5 lg:border-l border-gray-200 dark:border-zinc-700 flex flex-col min-w-0">
                        {panelExclusiones}
                      </div>
                    </div>
              </div>
              <div className="shrink-0 px-4 sm:px-6 py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 flex justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleGuardar}
                  disabled={guardando}
                  className={`h-12 min-w-[11rem] px-8 text-base ${btnOutlineAmber}`}
                >
                  {guardando && (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  )}
                  {editando ? "Actualizar" : "Guardar"}
                </Button>
              </div>
              </>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-base">Cargando...</span>
                </div>
              ) : asuetos.length === 0 ? (
                <div className="text-center py-16">
                  <PartyPopper className="w-12 h-12 text-amber-300 mx-auto mb-3" />
                  <p className="text-base text-gray-400">
                    No hay asuetos configurados para este mes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {asuetos.map((a) => {
                    const esRango = a.fecha_inicio !== a.fecha_fin;
                    const dias = getDiasRango(a);
                    const excluidas = a.dependencias_excluidas ?? [];
                    const nombresExcluidas = excluidas.map(nombreDependencia);

                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 overflow-hidden"
                      >
                        <div className="flex items-start gap-3 p-4">
                          <div className="flex-shrink-0 w-14 bg-amber-400 dark:bg-amber-500 rounded-lg flex flex-col items-center justify-center text-white shadow-sm py-2 px-1">
                            {esRango ? (
                              <>
                                <CalendarRange className="w-4 h-4 mb-0.5" />
                                <span className="text-[10px] font-bold">{dias}d</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] font-bold uppercase leading-none">
                                  {format(
                                    parseISO(a.fecha_inicio + "T00:00:00"),
                                    "MMM",
                                    { locale: es },
                                  )}
                                </span>
                                <span className="text-xl font-extrabold leading-none">
                                  {format(
                                    parseISO(a.fecha_inicio + "T00:00:00"),
                                    "d",
                                  )}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-amber-800 dark:text-amber-200">
                              {a.nombre}
                            </p>
                            <p className="text-sm text-amber-600 dark:text-amber-400 capitalize mt-0.5">
                              {esRango
                                ? `${format(parseISO(a.fecha_inicio + "T00:00:00"), "d MMM", { locale: es })} – ${format(parseISO(a.fecha_fin + "T00:00:00"), "d MMM yyyy", { locale: es })}`
                                : format(
                                    parseISO(a.fecha_inicio + "T00:00:00"),
                                    "EEEE, d 'de' MMMM yyyy",
                                    { locale: es },
                                  )}
                            </p>
                            {a.descripcion && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {a.descripcion}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleEditar(a)}
                              className="p-3 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/40 text-amber-600 dark:text-amber-400 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 className="w-6 h-6" />
                            </button>
                            <button
                              onClick={() => handleEliminar(a)}
                              className="p-3 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-red-400 transition-colors cursor-pointer"
                              title="Eliminar"
                            >
                              <Trash2 className="w-6 h-6" />
                            </button>
                          </div>
                        </div>

                        <div className="px-4 pb-4 pt-0 border-t border-amber-100/80 dark:border-amber-900/30 mx-4 mb-4 mt-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mt-3 mb-2">
                            Alcance del asueto
                          </p>
                          {excluidas.length === 0 ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 text-sm font-medium">
                              Aplica a todo el personal
                            </span>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
                                No aplica a {excluidas.length} dependencia
                                {excluidas.length !== 1 ? "s" : ""}:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {nombresExcluidas.map((nombre, i) => (
                                  <span
                                    key={excluidas[i]}
                                    className="inline-flex max-w-full rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800 px-2 py-1 text-[11px] font-medium leading-snug"
                                  >
                                    {nombre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
              </div>
            )}
          </div>

          {!mostrarForm && (
          <div className="px-4 sm:px-6 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-100 dark:border-neutral-800 flex justify-end shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              className="h-9 text-sm cursor-pointer"
            >
              Cerrar
            </Button>
          </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
