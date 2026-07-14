"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Save,
  Loader2,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AcuerdoEmpleado,
  TIPOS_ACUERDO,
} from "../types";
import {
  guardarPermiso,
  type PerfilUsuario,
} from "@/components/permisos/acciones";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";
import { TipoVistaAcuerdos } from "../hooks";
import { UsuarioConJerarquia } from "@/components/permisos/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/Switch";
import {
  parseDiasAcuerdo,
  getModalidadAcuerdo,
  construirDiasRecurrente,
  construirDiasSemanal,
  construirDiasTodos,
  DIAS_SEMANA_LABORALES,
  HORA_ENTRADA_DEFECTO,
  HORA_SALIDA_DEFECTO,
  PASO_MINUTOS_HORARIO,
  redondearHorarioACincoMinutos,
  type ModalidadAcuerdo,
} from "../dias-acuerdo";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  acuerdoAEditar?: AcuerdoEmpleado | null;
  onSuccess: () => void;
  perfilUsuario: PerfilUsuario | null;
  tipoVista: TipoVistaAcuerdos;
  usuariosParaModal?: UsuarioConJerarquia[];
}

export default function CrearEditarAcuerdo({
  isOpen,
  onClose,
  acuerdoAEditar,
  onSuccess,
  perfilUsuario,
  tipoVista,
  usuariosParaModal = [],
}: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedTipo, setSelectedTipo] = useState<string>("");
  const [openComboboxEmpleado, setOpenComboboxEmpleado] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [esRemunerado, setEsRemunerado] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [modalidad, setModalidad] = useState<ModalidadAcuerdo>("todos");
  const [diasSemanaFijos, setDiasSemanaFijos] = useState<number[]>([]);
  const [horaEntradaLaboral, setHoraEntradaLaboral] =
    useState(HORA_ENTRADA_DEFECTO);
  const [horaSalidaLaboral, setHoraSalidaLaboral] =
    useState(HORA_SALIDA_DEFECTO);
  const [cupoSemanal, setCupoSemanal] = useState(2);

  const esRRHH = ["RRHH", "SUPER", "SECRETARIO"].includes(
    perfilUsuario?.rol || "",
  );
  const puedeCrearEditar = esRRHH && tipoVista === "gestion_rrhh";
  const mostrarOpcionRemunerado = puedeCrearEditar;
  const esSoloLectura = !puedeCrearEditar;
  const puedeElegirEmpleado = puedeCrearEditar && !acuerdoAEditar;

  const empleadoSeleccionado = useMemo(() => {
    if (acuerdoAEditar?.usuario) return acuerdoAEditar.usuario;
    if (selectedUserId) {
      return usuariosParaModal.find((u) => u.id === selectedUserId);
    }
    return undefined;
  }, [acuerdoAEditar, selectedUserId, usuariosParaModal]);

  const nombreEmpleado = puedeElegirEmpleado
    ? empleadoSeleccionado?.nombre ?? ""
    : empleadoSeleccionado?.nombre || perfilUsuario?.nombre || "";
  const userId =
    acuerdoAEditar?.user_id ||
    (puedeElegirEmpleado ? selectedUserId : perfilUsuario?.id || "");

  useEffect(() => {
    if (isOpen) {
      if (acuerdoAEditar) {
        setEsRemunerado(acuerdoAEditar.remunerado || false);
        setDescripcion(acuerdoAEditar.descripcion || "");
        setSelectedTipo(acuerdoAEditar.tipo);
        const parsed = parseDiasAcuerdo(acuerdoAEditar.dias);
        const mod = getModalidadAcuerdo(parsed);
        setModalidad(mod);
        if (mod === "todos") {
          setDiasSemanaFijos([]);
          if (parsed && !Array.isArray(parsed) && parsed.modo === "todos") {
            setHoraEntradaLaboral(
              redondearHorarioACincoMinutos(
                parsed.entrada ?? HORA_ENTRADA_DEFECTO,
              ),
            );
            setHoraSalidaLaboral(
              redondearHorarioACincoMinutos(
                parsed.salida ?? HORA_SALIDA_DEFECTO,
              ),
            );
          } else {
            setHoraEntradaLaboral(HORA_ENTRADA_DEFECTO);
            setHoraSalidaLaboral(HORA_SALIDA_DEFECTO);
          }
        } else if (mod === "recurrente") {
          if (Array.isArray(parsed)) {
            setDiasSemanaFijos(parsed);
            setHoraEntradaLaboral(HORA_ENTRADA_DEFECTO);
            setHoraSalidaLaboral(HORA_SALIDA_DEFECTO);
          } else if (parsed && !Array.isArray(parsed) && parsed.modo === "recurrente") {
            setDiasSemanaFijos(parsed.diasSemana);
            setHoraEntradaLaboral(
              redondearHorarioACincoMinutos(
                parsed.entrada ?? HORA_ENTRADA_DEFECTO,
              ),
            );
            setHoraSalidaLaboral(
              redondearHorarioACincoMinutos(
                parsed.salida ?? HORA_SALIDA_DEFECTO,
              ),
            );
          }
        } else {
          setDiasSemanaFijos([]);
          setHoraEntradaLaboral(HORA_ENTRADA_DEFECTO);
          setHoraSalidaLaboral(HORA_SALIDA_DEFECTO);
        }
        if (parsed && !Array.isArray(parsed) && parsed.modo === "semanal") {
          setCupoSemanal(parsed.cupoSemanal);
        } else {
          setCupoSemanal(2);
        }
      } else {
        setSelectedTipo("");
        setEsRemunerado(false);
        setDescripcion("");
        setModalidad("todos");
        setDiasSemanaFijos([]);
        setHoraEntradaLaboral(HORA_ENTRADA_DEFECTO);
        setHoraSalidaLaboral(HORA_SALIDA_DEFECTO);
        setCupoSemanal(2);
        setSelectedUserId("");
        setOpenComboboxEmpleado(false);
      }
    }
  }, [isOpen, acuerdoAEditar]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !puedeCrearEditar) return null;

  const toggleDiaFijo = (dia: number) => {
    if (esSoloLectura) return;
    setDiasSemanaFijos((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia],
    );
  };

  const serializarDias = (inicio: string, fin: string): string | null => {
    if (modalidad === "todos") {
      return JSON.stringify(
        construirDiasTodos({
          entrada: redondearHorarioACincoMinutos(horaEntradaLaboral),
          salida: redondearHorarioACincoMinutos(horaSalidaLaboral),
        }),
      );
    }
    if (modalidad === "recurrente") {
      if (diasSemanaFijos.length === 0) {
        return null;
      }
      return JSON.stringify(
        construirDiasRecurrente(inicio, fin, diasSemanaFijos, {
          entrada: redondearHorarioACincoMinutos(horaEntradaLaboral),
          salida: redondearHorarioACincoMinutos(horaSalidaLaboral),
        }),
      );
    }
    if (modalidad === "semanal") {
      const existente = acuerdoAEditar
        ? parseDiasAcuerdo(acuerdoAEditar.dias)
        : null;
      if (
        existente &&
        !Array.isArray(existente) &&
        existente.modo === "semanal"
      ) {
        return JSON.stringify({
          ...existente,
          cupoSemanal,
        });
      }
      return JSON.stringify(construirDiasSemanal(cupoSemanal));
    }
    return null;
  };

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!puedeCrearEditar) return;

    if (!selectedTipo) return toast.error("Selecciona un tipo.");
    if (puedeElegirEmpleado && !selectedUserId) {
      return toast.error("Selecciona el empleado.");
    }
    if (!descripcion.trim())
      return toast.error("La descripción es obligatoria.");

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

    if (
      (modalidad === "recurrente" || modalidad === "todos") &&
      redondearHorarioACincoMinutos(horaEntradaLaboral) >=
        redondearHorarioACincoMinutos(horaSalidaLaboral)
    ) {
      return toast.error("La hora de entrada debe ser anterior a la de salida.");
    }

    if (modalidad === "recurrente" && diasSemanaFijos.length === 0) {
      return toast.error("Seleccione al menos un día fijo de la semana.");
    }

    if (modalidad === "semanal" && (cupoSemanal < 1 || cupoSemanal > 5)) {
      return toast.error("El cupo semanal debe ser entre 1 y 5 días laborales.");
    }

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("user_id", userId);
    formData.set("tipo", selectedTipo);
    formData.set("descripcion", descripcion);

    const inicio = formData.get("inicio") as string;
    const fin = formData.get("fin") as string;
    const inicioISO = inicio ? toLocalISO(inicio) : "";
    const finISO = fin ? toLocalISO(fin) : "";
    if (inicio) formData.set("inicio", inicioISO);
    if (fin) formData.set("fin", finISO);

    const diasJson = serializarDias(inicioISO, finISO);
    if (modalidad === "semanal" && !diasJson) {
      return toast.error("No se pudo configurar la modalidad flexible.");
    }
    if (diasJson) formData.set("dias", diasJson);
    else formData.set("dias", "null");

    formData.set("modo_acuerdo", modalidad);
    formData.set("cupo_semanal", String(cupoSemanal));

    formData.set("remunerado", esRemunerado ? "on" : "off");

    if (acuerdoAEditar?.estado) {
      formData.set("estado", acuerdoAEditar.estado);
    } else if (puedeElegirEmpleado) {
      formData.set("crear_aprobado_rrhh", "on");
    }

    try {
      await guardarPermiso(formData, acuerdoAEditar?.id);
      toast.success(acuerdoAEditar ? "Actualizado" : "Creado y aprobado");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const defaultInicio = acuerdoAEditar?.inicio
    ? format(new Date(acuerdoAEditar.inicio), "yyyy-MM-dd'T'HH:mm")
    : `${todayStr}T08:00`;
  const defaultFin = acuerdoAEditar?.fin
    ? format(new Date(acuerdoAEditar.fin), "yyyy-MM-dd'T'HH:mm")
    : `${todayStr}T16:00`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-neutral-800 flex flex-col max-h-[90vh] overflow-hidden overscroll-x-none">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-neutral-800 shrink-0">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {acuerdoAEditar ? "Editar Acuerdo" : "Nuevo Acuerdo Municipal"}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
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
                className="p-2 text-sm rounded-md border border-gray-300 bg-gray-100 dark:bg-neutral-900 dark:border-neutral-800 text-gray-500 w-full"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Tipo de acuerdo
            </label>
            {esSoloLectura ? (
              <input type="text" readOnly value={selectedTipo} className="p-2 text-sm rounded-md border bg-gray-100 w-full" />
            ) : (
              <select
                value={selectedTipo}
                onChange={(e) => setSelectedTipo(e.target.value)}
                className="p-2 text-sm rounded-md border dark:bg-neutral-950 w-full"
              >
                <option value="">Seleccionar tipo...</option>
                {TIPOS_ACUERDO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-4 min-w-0 max-w-full">
            <div className="flex flex-col gap-1.5 min-w-0 max-w-full overflow-hidden">
              <label className="text-xs text-gray-600 dark:text-gray-400">Vigencia desde</label>
              <input
                type="datetime-local"
                name="inicio"
                readOnly={esSoloLectura}
                defaultValue={defaultInicio}
                className="p-2 text-sm rounded-md border w-full min-w-0 max-w-full box-border appearance-none"
              />
            </div>
            <div className="flex flex-col gap-1.5 min-w-0 max-w-full overflow-hidden">
              <label className="text-xs text-gray-600 dark:text-gray-400">Vigencia hasta</label>
              <input
                type="datetime-local"
                name="fin"
                readOnly={esSoloLectura}
                defaultValue={defaultFin}
                className="p-2 text-sm rounded-md border w-full min-w-0 max-w-full box-border appearance-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Modalidad de días
            </label>
            {esSoloLectura ? (
              <input
                type="text"
                readOnly
                value={
                  modalidad === "recurrente"
                    ? "Días fijos cada semana (lun–vie)"
                    : modalidad === "semanal"
                      ? "Asignación de días flexible"
                      : "Todos los días del rango (lun–vie)"
                }
                className="p-2 text-sm rounded-md border bg-gray-100 w-full"
              />
            ) : (
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as ModalidadAcuerdo)}
                className="p-2 text-sm rounded-md border dark:bg-neutral-950 w-full"
              >
                <option value="todos">Todos los días del rango (lun–vie)</option>
                <option value="recurrente">Días fijos cada semana (automático)</option>
                <option value="semanal">Asignación de días flexible</option>
              </select>
            )}
          </div>

          {modalidad === "todos" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Horario laboral (lun–vie)
              </label>
              <div className="flex items-end gap-2 shrink-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    Entrada
                  </span>
                  <input
                    type="time"
                    step={PASO_MINUTOS_HORARIO * 60}
                    value={horaEntradaLaboral}
                    readOnly={esSoloLectura}
                    onChange={(e) => setHoraEntradaLaboral(e.target.value)}
                    onBlur={(e) =>
                      setHoraEntradaLaboral(
                        redondearHorarioACincoMinutos(e.target.value),
                      )
                    }
                    className="p-1.5 text-xs rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 w-[5.5rem] box-border"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                    Salida
                  </span>
                  <input
                    type="time"
                    step={PASO_MINUTOS_HORARIO * 60}
                    value={horaSalidaLaboral}
                    readOnly={esSoloLectura}
                    onChange={(e) => setHoraSalidaLaboral(e.target.value)}
                    onBlur={(e) =>
                      setHoraSalidaLaboral(
                        redondearHorarioACincoMinutos(e.target.value),
                      )
                    }
                    className="p-1.5 text-xs rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 w-[5.5rem] box-border"
                  />
                </div>
              </div>
            </div>
          )}

          {modalidad === "recurrente" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Días fijos de la semana (lun–vie)
                <span className="text-gray-400 font-normal italic ml-1">
                  (se generan todas las fechas del rango)
                </span>
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {DIAS_SEMANA_LABORALES.map(({ valor, etiqueta }) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => toggleDiaFijo(valor)}
                      disabled={esSoloLectura}
                      className={cn(
                        "px-2.5 py-1 text-xs font-bold rounded-md border-2",
                        diasSemanaFijos.includes(valor)
                          ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20 border-blue-600 dark:border-blue-400"
                          : "bg-white dark:bg-neutral-950 border-gray-200 dark:border-neutral-700",
                      )}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2 shrink-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      Entrada
                    </span>
                    <input
                      type="time"
                      step={PASO_MINUTOS_HORARIO * 60}
                      value={horaEntradaLaboral}
                      readOnly={esSoloLectura}
                      onChange={(e) => setHoraEntradaLaboral(e.target.value)}
                      onBlur={(e) =>
                        setHoraEntradaLaboral(
                          redondearHorarioACincoMinutos(e.target.value),
                        )
                      }
                      className="p-1.5 text-xs rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 w-[5.5rem] box-border"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                      Salida
                    </span>
                    <input
                      type="time"
                      step={PASO_MINUTOS_HORARIO * 60}
                      value={horaSalidaLaboral}
                      readOnly={esSoloLectura}
                      onChange={(e) => setHoraSalidaLaboral(e.target.value)}
                      onBlur={(e) =>
                        setHoraSalidaLaboral(
                          redondearHorarioACincoMinutos(e.target.value),
                        )
                      }
                      className="p-1.5 text-xs rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 w-[5.5rem] box-border"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {modalidad === "semanal" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Días por semana
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={cupoSemanal}
                onChange={(e) => setCupoSemanal(Number(e.target.value))}
                readOnly={esSoloLectura}
                className="p-2 text-sm rounded-md border w-full max-w-[120px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Solo días laborales (lun–vie). El empleado elegirá los días concretos de cada semana desde su lista de acuerdos.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              readOnly={esSoloLectura}
              required={!esSoloLectura}
              className="p-2 text-sm rounded-md border w-full min-h-[80px] resize-none"
            />
          </div>
          </div>
          </div>

          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-4 border-t border-gray-100 dark:border-neutral-800 min-w-0 max-w-full overflow-x-hidden">
            {mostrarOpcionRemunerado ? (
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  id="remunerado-acuerdo"
                  checked={esRemunerado}
                  onCheckedChange={setEsRemunerado}
                  disabled={loading}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <label
                  htmlFor="remunerado-acuerdo"
                  className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none"
                >
                  Remunerado
                </label>
              </div>
            ) : (
              <span />
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 h-10 px-4 text-sm font-bold text-zinc-600 bg-zinc-50 dark:text-zinc-300 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors border-2 border-zinc-500 dark:border-zinc-400 cursor-pointer"
              >
                Cerrar
              </button>
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
                {acuerdoAEditar ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
