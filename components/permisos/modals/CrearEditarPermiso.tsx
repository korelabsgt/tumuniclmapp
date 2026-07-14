"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Save,
  Loader2,
  Check,
  ChevronsUpDown,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermisoEmpleado, UsuarioConJerarquia } from "../types";
import { guardarPermiso, PerfilUsuario, gestionarPermiso } from "../acciones";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { TipoVistaPermisos } from "@/components/permisos/hooks";
import { Switch } from "@/components/ui/Switch";

const TIPOS_GENERAL = [
  "Vacaciones",
  "Asuntos Personales",
  "Situaciones Administrativas",
  "Situaciones Académicas",
  "Licencias no remuneradas",
  "Sindicales",
  "Citaciones",
  "Calamidad Doméstica",
  "Otros",
];
const TIPOS_SEGURIDAD_SOCIAL = [
  "Consultas Médicas y/o Odontológicas",
  "Exámenes Médicos y/o Odontológicos",
  "Enfermedad Común",
  "IGSS",
  "Accidente de trabajo",
  "Enfermedad Profesional",
  "Licencias de Maternidad / Paternidad",
  "Incapacidad",
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  permisoAEditar?: PermisoEmpleado | null;
  onSuccess: () => void;
  perfilUsuario: PerfilUsuario | null;
  tipoVista: TipoVistaPermisos;
  usuariosParaModal?: UsuarioConJerarquia[];
}

export default function CrearEditarPermiso({
  isOpen,
  onClose,
  permisoAEditar,
  onSuccess,
  perfilUsuario,
  tipoVista,
  usuariosParaModal = [],
}: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<string>("");
  const [openComboboxTipo, setOpenComboboxTipo] = useState(false);
  const [openComboboxEmpleado, setOpenComboboxEmpleado] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [otroTipoManual, setOtroTipoManual] = useState<string>("");
  const [esRemunerado, setEsRemunerado] = useState(false);
  const [descripcion, setDescripcion] = useState("");

  const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(
    perfilUsuario?.rol || "",
  );
  const tiposGeneralesDisponibles = useMemo(
    () => TIPOS_GENERAL.filter((t) => t !== "Vacaciones" || esRRHH),
    [esRRHH],
  );
  // RRHH ve el check en su vista de gestión
  const mostrarOpcionRemunerado = esRRHH && tipoVista === "gestion_rrhh";

  const estadoActual = permisoAEditar?.estado || "";
  const contieneBloqueo =
    estadoActual.includes("aprobado") || estadoActual.includes("rechazado");

  // Lógica de fases
  const esFaseJefe = permisoAEditar?.estado === "pendiente";
  const esFaseRRHH = permisoAEditar?.estado === "aprobado_jefe";

  // Puede aprobar si es fase jefe (y es jefe o RRHH) O si es fase RRHH (y es RRHH)
  const puedeGestionar =
    (tipoVista === "gestion_jefe" && esFaseJefe) ||
    (tipoVista === "gestion_rrhh" && (esFaseJefe || esFaseRRHH));

  // CORRECCIÓN 1: RRHH puede editar siempre, excepto cuando está en la pantalla de "Gestionar" (botones de aprobar/rechazar)
  // Si estoy gestionando, es solo lectura visual. Si NO estoy gestionando (ej. editando uno viejo), RRHH puede escribir.
  const esSoloLectura =
    puedeGestionar || // Si tengo los botones de Aprobar/Rechazar, bloqueo inputs para evitar confusión
    (!!permisoAEditar && !esRRHH && !puedeGestionar) || // Empleado normal no edita lo enviado
    (contieneBloqueo && !esRRHH); // Si está finalizado, solo RRHH puede tocar

  const puedeElegirEmpleado =
    tipoVista === "gestion_rrhh" && !permisoAEditar && esRRHH;

  const empleadoSeleccionado = useMemo(() => {
    if (permisoAEditar?.usuario) return permisoAEditar.usuario;
    if (selectedUserId) {
      return usuariosParaModal.find((u) => u.id === selectedUserId);
    }
    return undefined;
  }, [permisoAEditar, selectedUserId, usuariosParaModal]);

  const nombreEmpleado =
    empleadoSeleccionado?.nombre || perfilUsuario?.nombre || "";
  const userId =
    permisoAEditar?.user_id ||
    (puedeElegirEmpleado ? selectedUserId : perfilUsuario?.id || "");
  const requiereDescripcion =
    selectedTipo === "IGSS" ||
    selectedTipo === "Asuntos Personales" ||
    selectedTipo === "Situaciones Académicas";

  useEffect(() => {
    if (isOpen) {
      if (permisoAEditar) {
        setEsRemunerado(permisoAEditar.remunerado || false);
        setDescripcion(permisoAEditar.descripcion || "");
        const tipoGuardado =
          permisoAEditar.tipo.toLowerCase() === "consulta igss"
            ? "IGSS"
            : permisoAEditar.tipo;
        const tipo = [...TIPOS_GENERAL, ...TIPOS_SEGURIDAD_SOCIAL].find(
          (t) => t.toLowerCase() === tipoGuardado.toLowerCase(),
        );
        if (tipo) {
          setSelectedTipo(tipo);
          setOtroTipoManual("");
        } else {
          setSelectedTipo("Otros");
          setOtroTipoManual(permisoAEditar.tipo);
        }
      } else {
        setSelectedTipo("");
        setOtroTipoManual("");
        setEsRemunerado(false);
        setDescripcion("");
        setSelectedUserId("");
        setOpenComboboxEmpleado(false);
      }
    }
  }, [isOpen, permisoAEditar]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGestion = async (accion: "aprobar" | "rechazar") => {
    if (!permisoAEditar) return;
    setLoading(true);
    try {
      // Si RRHH aprueba, nos aseguramos de mandar el estado del check remunerado
      if (esFaseRRHH && accion === "aprobar") {
        const formData = new FormData();
        formData.set("remunerado", esRemunerado ? "on" : "off");
        // Nota: guardarPermiso aquí solo actualizaría el campo remunerado si se manda solo eso,
        // pero tu server action espera todo el objeto.
        // Mejor confiamos en que gestionarPermiso maneje el estado, y si necesitas guardar remunerado,
        // deberías llamarlo antes o asegurarte que gestionarPermiso no lo sobreescriba.
        // Para simplificar: Guardamos el remunerado primero.

        // HACK: Llamamos a guardarPermiso con los datos actuales para actualizar el remunerado antes de cambiar estado
        const formUpdate = new FormData();
        formUpdate.set("user_id", permisoAEditar.user_id);
        formUpdate.set("tipo", permisoAEditar.tipo);
        formUpdate.set("inicio", permisoAEditar.inicio);
        formUpdate.set("fin", permisoAEditar.fin);
        formUpdate.set("descripcion", permisoAEditar.descripcion || "");
        formUpdate.set("remunerado", esRemunerado ? "on" : "off");
        formUpdate.set("estado", permisoAEditar.estado); // Mantenemos estado

        await guardarPermiso(formUpdate, permisoAEditar.id);
      }

      await gestionarPermiso(permisoAEditar.id, accion, permisoAEditar.user_id);
      toast.success(
        accion === "aprobar" ? "Solicitud Procesada" : "Solicitud Rechazada",
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // CORRECCIÓN 2: RRHH puede guardar aunque contenga bloqueo
    if (contieneBloqueo && !esRRHH) return;

    if (!selectedTipo) return toast.error("Selecciona un tipo.");
    if (puedeElegirEmpleado && !selectedUserId) {
      return toast.error("Selecciona el empleado.");
    }
    if (selectedTipo === "Vacaciones" && !esRRHH)
      return toast.error("No tiene permiso para solicitar vacaciones.");
    if (selectedTipo === "Otros" && !otroTipoManual.trim())
      return toast.error("Especifique el tipo.");
    if (requiereDescripcion && !descripcion.trim())
      return toast.error("La descripción es obligatoria para este tipo de permiso.");

    const form = e.currentTarget;
    const inicioVal = (form.querySelector('input[name="inicio"]') as HTMLInputElement).value;
    const finVal = (form.querySelector('input[name="fin"]') as HTMLInputElement).value;

    if (!inicioVal || !finVal) {
      return toast.error("Debe ingresar ambas fechas.");
    }

    const inicioDate = new Date(inicioVal);
    const finDate = new Date(finVal);

    if (finDate <= inicioDate) {
      return toast.error("La fecha de fin debe ser posterior a la de inicio.");
    }


    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("user_id", userId);
    formData.set(
      "tipo",
      selectedTipo === "Otros" ? otroTipoManual : selectedTipo,
    );
    formData.set("descripcion", descripcion);

    const inicio = formData.get("inicio") as string;
    const fin = formData.get("fin") as string;
    // Guardamos en formato ISO con offset local para preservar la fecha/hora
    // tal cual la seleccionó el usuario (evita desfase UTC que cambia el día)
    const toLocalISO = (datetimeLocal: string) => {
      const d = new Date(datetimeLocal);
      const offsetMin = d.getTimezoneOffset();
      const sign = offsetMin <= 0 ? "+" : "-";
      const absOffset = Math.abs(offsetMin);
      const hh = String(Math.floor(absOffset / 60)).padStart(2, "0");
      const mm = String(absOffset % 60).padStart(2, "0");
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${hh}:${mm}`;
    };
    if (inicio) formData.set("inicio", toLocalISO(inicio));
    if (fin) formData.set("fin", toLocalISO(fin));

    // Aseguramos enviar el estado correcto
    if (esRRHH) {
      formData.set("remunerado", esRemunerado ? "on" : "off");
    } else {
      formData.delete("remunerado");
    }

    if (permisoAEditar?.estado) {
      formData.set("estado", permisoAEditar.estado);
    } else if (puedeElegirEmpleado) {
      formData.set("crear_aprobado_rrhh", "on");
    }

    try {
      await guardarPermiso(formData, permisoAEditar?.id);
      toast.success(permisoAEditar ? "Actualizado" : "Creado");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const defaultInicio = permisoAEditar?.inicio
    ? format(new Date(permisoAEditar.inicio), "yyyy-MM-dd'T'HH:mm")
    : `${todayStr}T08:00`;
  const defaultFin = permisoAEditar?.fin
    ? format(new Date(permisoAEditar.fin), "yyyy-MM-dd'T'HH:mm")
    : `${todayStr}T16:00`;

  const tituloModal = puedeGestionar
    ? "Gestionar Solicitud"
    : permisoAEditar
      ? "Detalles / Editar"
      : "Nuevo Permiso";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden overscroll-x-none">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {tituloModal}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col flex-1 min-h-0 overflow-hidden overscroll-x-none"
        >
          <div className="p-4 overflow-y-auto overflow-x-hidden overscroll-x-none min-w-0 max-w-full flex-1 [scrollbar-width:thin]">
          <div className="flex flex-col gap-4 w-full min-w-0 max-w-full overflow-x-hidden">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Empleado
            </label>
            {puedeElegirEmpleado ? (
              <Popover
                open={openComboboxEmpleado}
                onOpenChange={setOpenComboboxEmpleado}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal h-auto py-2"
                  >
                    {nombreEmpleado || "Buscar empleado..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="z-[110] w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Buscar por nombre u oficina..." />
                    <CommandList className="max-h-[250px]">
                      <CommandEmpty>No se encontraron empleados.</CommandEmpty>
                      <CommandGroup>
                        {usuariosParaModal.map((u) => (
                          <CommandItem
                            key={u.id}
                            value={`${u.nombre} ${u.oficina_nombre || ""}`}
                            onSelect={() => {
                              setSelectedUserId(u.id);
                              setOpenComboboxEmpleado(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedUserId === u.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate">{u.nombre}</span>
                              {u.oficina_nombre && (
                                <span className="text-[10px] text-muted-foreground truncate">
                                  {u.oficina_nombre}
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : (
              <input
                type="text"
                readOnly
                value={nombreEmpleado}
                className="p-2 text-sm rounded-md border border-gray-300 bg-gray-100 dark:bg-neutral-900 dark:border-neutral-800 text-gray-500 dark:text-gray-400 w-full outline-none cursor-default"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Tipo
            </label>
            {esSoloLectura ? (
              <input
                type="text"
                readOnly
                value={selectedTipo === "Otros" ? otroTipoManual : selectedTipo}
                className="p-2 text-sm rounded-md border border-gray-300 bg-gray-100 dark:bg-neutral-900 dark:border-neutral-800 text-gray-500 dark:text-gray-400 w-full outline-none"
              />
            ) : (
              <>
                <Popover
                  open={openComboboxTipo}
                  onOpenChange={setOpenComboboxTipo}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal text-sm border-gray-300 dark:bg-neutral-950 dark:border-neutral-800 dark:text-gray-200"
                    >
                      {selectedTipo || "Seleccionar tipo..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                  >
                    <Command className="dark:bg-neutral-900 dark:border-neutral-800">
                      <CommandInput placeholder="Buscar tipo..." />
                      <CommandList>
                        <div className="max-h-60 overflow-y-auto">
                          <CommandGroup heading="General">
                            {tiposGeneralesDisponibles.map((t) => (
                              <CommandItem
                                key={t}
                                value={t}
                                onSelect={(val) => {
                                  const orig =
                                    tiposGeneralesDisponibles.find(
                                      (x) =>
                                        x.toLowerCase() === val.toLowerCase(),
                                    ) || val;
                                  setSelectedTipo(orig);
                                  setOpenComboboxTipo(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTipo === t
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />{" "}
                                {t}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup heading="Seguridad Social">
                            {TIPOS_SEGURIDAD_SOCIAL.map((t) => (
                              <CommandItem
                                key={t}
                                value={t}
                                onSelect={(val) => {
                                  const orig =
                                    TIPOS_SEGURIDAD_SOCIAL.find(
                                      (x) =>
                                        x.toLowerCase() === val.toLowerCase(),
                                    ) || val;
                                  setSelectedTipo(orig);
                                  setOpenComboboxTipo(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedTipo === t
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />{" "}
                                {t}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </div>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedTipo === "Otros" && (
                  <input
                    type="text"
                    placeholder="Especifique..."
                    value={otroTipoManual}
                    onChange={(e) => setOtroTipoManual(e.target.value)}
                    className="mt-1 p-2 text-sm rounded-md border border-gray-300 dark:border-neutral-800 dark:bg-neutral-900 dark:text-gray-200 w-full"
                  />
                )}
              </>
            )}
          </div>

          <div className="flex flex-col gap-4 min-w-0 max-w-full">
            <div className="flex flex-col gap-1.5 min-w-0 max-w-full overflow-hidden">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Inicio
              </label>
              <input
                type="datetime-local"
                name="inicio"
                readOnly={esSoloLectura}
                defaultValue={defaultInicio}
                className={cn(
                  "p-2 px-1.5 sm:px-2 text-xs sm:text-sm rounded-md border outline-none w-full min-w-0 max-w-full box-border appearance-none",
                  esSoloLectura
                    ? "border-gray-300 bg-gray-100 text-gray-500 dark:bg-neutral-900 dark:border-neutral-800 dark:text-gray-400"
                    : "border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 dark:text-gray-200 focus:ring-1 focus:ring-blue-500",
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0 max-w-full overflow-hidden">
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Fin
              </label>
              <input
                type="datetime-local"
                name="fin"
                readOnly={esSoloLectura}
                defaultValue={defaultFin}
                className={cn(
                  "p-2 px-1.5 sm:px-2 text-xs sm:text-sm rounded-md border outline-none w-full min-w-0 max-w-full box-border appearance-none",
                  esSoloLectura
                    ? "border-gray-300 bg-gray-100 text-gray-500 dark:bg-neutral-900 dark:border-neutral-800 dark:text-gray-400"
                    : "border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 dark:text-gray-200 focus:ring-1 focus:ring-blue-500",
                )}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 min-w-0">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Descripción{" "}
              {!requiereDescripcion && (
                <span className="text-gray-400 font-normal italic">
                  (Opcional)
                </span>
              )}
              {requiereDescripcion && (
                <span className="text-red-500 font-normal">*</span>
              )}
            </label>
            <textarea
              name="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              readOnly={esSoloLectura}
              required={requiereDescripcion && !esSoloLectura}
              placeholder={
                selectedTipo === "IGSS"
                  ? "Describa el motivo de la consulta IGSS..."
                  : selectedTipo === "Asuntos Personales"
                    ? "Describa el motivo del permiso..."
                    : selectedTipo === "Situaciones Académicas"
                      ? "Describa la situación académica..."
                      : "Añadir detalles adicionales..."
              }
              className={cn(
                "p-2 text-sm rounded-md border outline-none w-full min-h-[80px] resize-none",
                esSoloLectura
                  ? "border-gray-300 bg-gray-100 text-gray-500 dark:bg-neutral-900 dark:border-neutral-800 dark:text-gray-400 cursor-default"
                  : "border-gray-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 dark:text-gray-200 focus:ring-1 focus:ring-blue-500",
              )}
            />
          </div>
          </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-4 border-t border-gray-100 dark:border-neutral-800 min-w-0 max-w-full overflow-x-hidden">
            {mostrarOpcionRemunerado ? (
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  id="remunerado"
                  checked={esRemunerado}
                  onCheckedChange={setEsRemunerado}
                  disabled={loading}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <label
                  htmlFor="remunerado"
                  className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                >
                  Remunerado
                </label>
              </div>
            ) : (
              <span />
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 ml-auto">
            {puedeGestionar ? (
              <>
                <button
                  type="button"
                  onClick={() => handleGestion("rechazar")}
                  className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-bold text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-md transition-colors border-2 border-red-600 dark:border-red-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => handleGestion("aprobar")}
                  className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-bold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-md transition-colors border-2 border-emerald-600 dark:border-emerald-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {esFaseJefe ? "Aprobar como jefe" : "Aprobar como RRHH"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-bold text-zinc-600 bg-zinc-50 dark:text-zinc-300 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border-2 border-zinc-500 dark:border-zinc-400 cursor-pointer"
                >
                  Cerrar
                </button>
                {(!esSoloLectura || (esRRHH && contieneBloqueo)) && (
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-bold text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-md transition-colors border-2 border-blue-600 dark:border-blue-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {contieneBloqueo ? "Actualizar Datos" : "Guardar"}
                  </button>
                )}
              </>
            )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
