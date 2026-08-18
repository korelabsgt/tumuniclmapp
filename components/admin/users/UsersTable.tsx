"use client";

import React, { useState, useMemo, Fragment, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Usuario } from "@/lib/usuarios/esquemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import UsuarioForm from "./forms/UsuarioForm";
import Swal from "sweetalert2";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useDependencias } from "@/hooks/dependencias/useDependencias";
import Cargando from "@/components/ui/animations/Cargando";
import {
  Clock,
  Trash2,
  Search,
  ChevronDown,
  Settings2,
  UserPlus,
  Crown,
  Banknote,
  Check,
} from "lucide-react";

// --- 1. IMPORTAMOS EL COMPONENTE DEL INFORME ---
import InformeEmpleados from "./reportes/InformeEmpleados";
import { ModalShell } from "@/components/ui/general-modal";

type UsuarioConJerarquia = Usuario & {
  puesto_nombre: string | null;
  oficina_nombre: string | null;
  oficina_path_orden: string | null;
};

type Props = {
  usuarios: UsuarioConJerarquia[];
  rolActual: string | null;
};

export default function UsersTable({ usuarios, rolActual }: Props) {
  const router = useRouter();

  const [listaUsuarios, setListaUsuarios] =
    useState<UsuarioConJerarquia[]>(usuarios.filter(u => u.rol !== "INVITADO"));
  const [terminoBusqueda, setTerminoBusqueda] = useState("");

  // Estado para el modal de Crear/Editar usuario
  const [usuarioIdSeleccionado, setUsuarioIdSeleccionado] = useState<
    string | null
  >(null);
  const [modoModal, setModoModal] = useState<"crear" | "editar">("crear");

  // --- 2. ESTADO PARA EL MODAL DE PLANILLA ---
  const [mostrarPlanilla, setMostrarPlanilla] = useState(false);

  const [eliminando, setEliminando] = useState(false);
  const [nivel2Id, setNivel2Id] = useState<string | null>(null);
  const [nivel3Id, setNivel3Id] = useState<string | null>(null);

  const { dependencias, loading: cargandoDependencias } = useDependencias();

  const [oficinasAbiertas, setOficinasAbiertas] = useState<
    Record<string, boolean>
  >({});

  const [menuAbierto, setMenuAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [openNivel2, setOpenNivel2] = useState(false);
  const [openNivel3, setOpenNivel3] = useState(false);
  const [openRol, setOpenRol] = useState(false);
  const [rolFiltro, setRolFiltro] = useState<string | null>(null);

  const hasCreatePermission =
    rolActual === "SUPER" || rolActual === "RRHH" || rolActual === "SECRETARIO";
  const canOpenModal =
    rolActual === "SUPER" || rolActual === "RRHH" || rolActual === "SECRETARIO";

  useEffect(() => {
    setListaUsuarios(usuarios.filter(u => u.rol !== "INVITADO"));
  }, [usuarios]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const oficinasNivel2 = useMemo(() => {
    const rootIds = new Set(
      dependencias.filter((d) => d.parent_id === null).map((d) => d.id),
    );
    return dependencias
      .filter(
        (d) => !d.es_puesto && d.parent_id !== null && rootIds.has(d.parent_id),
      )
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [dependencias]);

  const oficinasNivel3 = useMemo(() => {
    if (!nivel2Id) {
      return [];
    }
    return dependencias
      .filter((d) => !d.es_puesto && d.parent_id === nivel2Id)
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
  }, [dependencias, nivel2Id]);

  const rolesDisponibles = useMemo(() => {
    const roles = new Set(listaUsuarios.map((u) => u.rol).filter(Boolean));
    return Array.from(roles).sort();
  }, [listaUsuarios]);

  const usuariosAgrupados = useMemo(() => {
    let usuariosFiltrados = [...listaUsuarios];

    let oficinasPermitidas: Set<string | null> | null = null;

    if (nivel3Id) {
      const oficina = dependencias.find((d) => d.id === nivel3Id);
      if (oficina) {
        oficinasPermitidas = new Set([oficina.nombre]);
      }
    } else if (nivel2Id) {
      oficinasPermitidas = new Set(
        dependencias
          .filter((d) => d.parent_id === nivel2Id && !d.es_puesto)
          .map((d) => d.nombre),
      );
    }

    usuariosFiltrados = usuariosFiltrados.filter((usuario) => {
      const lowerTermino = terminoBusqueda.toLowerCase();
      const busquedaCoincide =
        terminoBusqueda === "" ||
        (usuario.nombre?.toLowerCase() || "").includes(lowerTermino) ||
        (usuario.email?.toLowerCase() || "").includes(lowerTermino) ||
        (usuario.puesto_nombre?.toLowerCase() || "").includes(lowerTermino) ||
        (usuario.oficina_nombre?.toLowerCase() || "").includes(lowerTermino);

      const oficinaCoincide =
        !oficinasPermitidas || oficinasPermitidas.has(usuario.oficina_nombre);

      const rolCoincide = !rolFiltro || usuario.rol === rolFiltro;

      return busquedaCoincide && oficinaCoincide && rolCoincide;
    });

    const grupos: Record<
      string,
      { path_orden: string; usuarios: UsuarioConJerarquia[] }
    > = {};

    for (const usuario of usuariosFiltrados) {
      const oficina = usuario.oficina_nombre || "Sin Oficina Asignada";
      const path = usuario.oficina_path_orden || "9999";

      if (!grupos[oficina]) {
        grupos[oficina] = { path_orden: path, usuarios: [] };
      }
      grupos[oficina].usuarios.push(usuario);
    }

    return Object.entries(grupos)
      .map(([oficina_nombre, data]) => ({
        oficina_nombre,
        path_orden: data.path_orden,
        usuarios: data.usuarios.sort((a, b) =>
          (a.nombre || "").localeCompare(b.nombre || ""),
        ),
      }))
      .sort((a, b) =>
        a.path_orden.localeCompare(b.path_orden, undefined, { numeric: true }),
      );
  }, [listaUsuarios, terminoBusqueda, nivel2Id, nivel3Id, dependencias, rolFiltro]);

  const handleVerUsuario = (id: string) => {
    if (!canOpenModal) return;
    setUsuarioIdSeleccionado(id);
    setModoModal("editar");
  };

  const handleCerrarModal = () => {
    setUsuarioIdSeleccionado(null);
    setModoModal("editar");
  };

  const handleSuccess = () => {
    router.refresh();
  };

  const handleCancel = () => {
    handleCerrarModal();
  };

  const handleEliminarUsuario = async () => {
    if (!usuarioIdSeleccionado) return;

    const result = await Swal.fire({
      title: "¿Está seguro?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      background: document.documentElement.classList.contains("dark")
        ? "#171717"
        : "#fff",
      color: document.documentElement.classList.contains("dark")
        ? "#e5e5e5"
        : "#000",
    });

    if (result.isConfirmed) {
      setEliminando(true);

      try {
        const res = await fetch(`/api/users?id=${usuarioIdSeleccionado}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const json = await res.json();
          return Swal.fire({
            title: "Error",
            text: json.error || "No se pudo eliminar el usuario.",
            icon: "error",
            background: document.documentElement.classList.contains("dark")
              ? "#171717"
              : "#fff",
            color: document.documentElement.classList.contains("dark")
              ? "#e5e5e5"
              : "#000",
          });
        }

        const idEliminado = usuarioIdSeleccionado;
        setListaUsuarios((prevUsuarios) =>
          prevUsuarios.filter((u) => u.id !== idEliminado),
        );

        handleCerrarModal();
        Swal.fire({
          title: "¡Eliminado!",
          text: "El usuario ha sido eliminado correctamente.",
          icon: "success",
          background: document.documentElement.classList.contains("dark")
            ? "#171717"
            : "#fff",
          color: document.documentElement.classList.contains("dark")
            ? "#e5e5e5"
            : "#000",
        });
      } catch (error) {
        Swal.fire({
          title: "Error",
          text: "Ocurrió un error al intentar eliminar el usuario.",
          icon: "error",
          background: document.documentElement.classList.contains("dark")
            ? "#171717"
            : "#fff",
          color: document.documentElement.classList.contains("dark")
            ? "#e5e5e5"
            : "#000",
        });
      } finally {
        setEliminando(false);
      }
    }
  };

  const handleNivel2Change = (value: string) => {
    const newId = value === "todos" ? null : value;
    setNivel2Id(newId);
    setNivel3Id(null);
    setOficinasAbiertas({});
  };

  const handleNivel3Change = (value: string) => {
    const newId = value === "todos" ? null : value;
    setNivel3Id(newId);
    setOficinasAbiertas({});
  };

  const toggleOficina = (nombreOficina: string) => {
    setOficinasAbiertas((prev) => ({
      ...prev,
      [nombreOficina]: !prev[nombreOficina],
    }));
  };

  return (
    <>
      <div className="w-full xl:w-4/5 mx-auto md:px-4">
        <div className="p-2 bg-white dark:bg-neutral-900 rounded-lg shadow-md border border-gray-100 dark:border-neutral-800 space-y-4 w-full transition-colors duration-200">
          <div className="flex flex-col xl:flex-row gap-2 w-full items-center p-2 bg-slate-50 dark:bg-neutral-900 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto shrink-0">
              {cargandoDependencias ? (
                <Cargando texto="Cargando..." />
              ) : (
                <>
                  <Popover open={openNivel2} onOpenChange={setOpenNivel2}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openNivel2}
                        className="bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs w-full sm:w-[250px] h-9 justify-between font-normal hover:bg-slate-50 dark:hover:bg-neutral-700/50"
                      >
                        <span className="truncate">
                        {nivel2Id
                          ? oficinasNivel2.find((oficina) => oficina.id === nivel2Id)?.nombre || "Todas"
                          : "Todas las Dependencias"}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] sm:w-[350px] p-0 dark:bg-neutral-800 dark:border-neutral-700">
                      <Command>
                        <CommandInput placeholder="Buscar dependencia..." className="text-xs h-9" />
                        <CommandList>
                          <CommandEmpty>No se encontró la dependencia.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todas las dependencias"
                              onSelect={() => {
                                handleNivel2Change("todos")
                                setOpenNivel2(false)
                              }}
                              className="dark:text-gray-200 dark:focus:bg-neutral-700 text-xs py-2"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${!nivel2Id ? "opacity-100" : "opacity-0"}`}
                              />
                              Todas las Dependencias
                            </CommandItem>
                            {oficinasNivel2.map((oficina) => (
                              <CommandItem
                                key={oficina.id}
                                value={oficina.nombre || ""}
                                onSelect={() => {
                                  handleNivel2Change(oficina.id)
                                  setOpenNivel2(false)
                                }}
                                className="dark:text-gray-200 dark:focus:bg-neutral-700 text-xs py-2"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 shrink-0 ${nivel2Id === oficina.id ? "opacity-100" : "opacity-0"}`}
                                />
                                {oficina.nombre}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <Popover open={openNivel3} onOpenChange={setOpenNivel3}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openNivel3}
                        disabled={!nivel2Id}
                        className="bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs w-full sm:w-[250px] h-9 justify-between font-normal hover:bg-slate-50 dark:hover:bg-neutral-700/50"
                      >
                        <span className="truncate">
                        {nivel3Id
                          ? oficinasNivel3.find((oficina) => oficina.id === nivel3Id)?.nombre || "Todas"
                          : "Todas las Oficinas"}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] sm:w-[350px] p-0 dark:bg-neutral-800 dark:border-neutral-700">
                      <Command>
                        <CommandInput placeholder="Buscar oficina..." className="text-xs h-9" />
                        <CommandList>
                          <CommandEmpty>No se encontró la oficina.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todas las oficinas"
                              onSelect={() => {
                                handleNivel3Change("todos")
                                setOpenNivel3(false)
                              }}
                              className="dark:text-gray-200 dark:focus:bg-neutral-700 text-xs py-2"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${!nivel3Id ? "opacity-100" : "opacity-0"}`}
                              />
                              Todas las Oficinas
                            </CommandItem>
                            {oficinasNivel3.map((oficina) => (
                              <CommandItem
                                key={oficina.id}
                                value={oficina.nombre || ""}
                                onSelect={() => {
                                  handleNivel3Change(oficina.id)
                                  setOpenNivel3(false)
                                }}
                                className="dark:text-gray-200 dark:focus:bg-neutral-700 text-xs py-2"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 shrink-0 ${nivel3Id === oficina.id ? "opacity-100" : "opacity-0"}`}
                                />
                                {oficina.nombre}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Popover open={openRol} onOpenChange={setOpenRol}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openRol}
                        className="bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 text-xs w-full sm:w-[180px] h-9 justify-between font-normal hover:bg-slate-50 dark:hover:bg-neutral-700/50"
                      >
                        <span className="truncate">
                        {rolFiltro || "Todos los Roles"}
                        </span>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0 dark:bg-neutral-800 dark:border-neutral-700">
                      <Command>
                        <CommandInput placeholder="Buscar rol..." className="text-xs h-9" />
                        <CommandList>
                          <CommandEmpty>No se encontró el rol.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todos los roles"
                              onSelect={() => {
                                setRolFiltro(null)
                                setOpenRol(false)
                              }}
                              className="dark:text-gray-200 dark:focus:bg-neutral-700 text-xs py-2"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${!rolFiltro ? "opacity-100" : "opacity-0"}`}
                              />
                              Todos los Roles
                            </CommandItem>
                            {rolesDisponibles.map((rol) => (
                              <CommandItem
                                key={rol}
                                value={rol || ""}
                                onSelect={() => {
                                  setRolFiltro(rol)
                                  setOpenRol(false)
                                }}
                                className="dark:text-gray-200 dark:focus:bg-neutral-700 text-xs py-2"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 shrink-0 ${rolFiltro === rol ? "opacity-100" : "opacity-0"}`}
                                />
                                {rol}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>

            <div className="relative w-full flex-1">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar por Nombre..."
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                className="w-full text-xs pl-8 bg-white dark:bg-neutral-800 dark:text-gray-100 dark:border-neutral-700 h-9"
              />
            </div>

            <div
              className="flex gap-2 shrink-0 w-full xl:w-auto relative"
              ref={menuRef}
            >
              {hasCreatePermission && (
                <div className="relative w-full xl:w-auto">
                  <button
                    onClick={() => setMenuAbierto(!menuAbierto)}
                    className={`w-full xl:w-auto px-4 py-2 text-white bg-slate-800 dark:bg-slate-700 rounded-lg font-semibold hover:bg-slate-700 dark:hover:bg-slate-600 transition-all duration-200 text-xs flex items-center justify-center gap-2 h-9 shadow-sm ${menuAbierto ? "ring-2 ring-blue-500/50" : ""}`}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                    <span>Administrar</span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform duration-200 ${menuAbierto ? "rotate-180" : ""}`}
                    />
                  </button>

                  {menuAbierto && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-gray-100 dark:border-neutral-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-1.5 flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            setMenuAbierto(false);
                            router.push("/sigem/admin/sign-up");
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-700/50 rounded-lg flex items-center gap-3 transition-colors group"
                        >
                          <div className="p-1.5 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-md group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                            <UserPlus size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                              Crear Usuario
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Registrar nuevo empleado
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setMenuAbierto(false);
                            router.push("/sigem/admin/jefes");
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-700/50 rounded-lg flex items-center gap-3 transition-colors group"
                        >
                          <div className="p-1.5 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-md group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                            <Crown size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                              Asignación de Jefe
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Gestionar liderazgos
                            </p>
                          </div>
                        </button>

                        <button
                          onClick={() => {
                            setMenuAbierto(false);
                            router.push("/sigem/admin/horarios");
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-700/50 rounded-lg flex items-center gap-3 transition-colors group"
                        >
                          <div className="p-1.5 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-md group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                            <Clock size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                              Asignación de Horarios
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Cree, edite y asigne horarios
                            </p>
                          </div>
                        </button>

                        {/* --- 3. BOTÓN CONECTADO AL ESTADO --- */}
                        <button
                          onClick={() => {
                            setMenuAbierto(false);
                            setMostrarPlanilla(true); // <--- AHORA SÍ ABRE EL MODAL
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-700/50 rounded-lg flex items-center gap-3 transition-colors group"
                        >
                          <div className="p-1.5 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 rounded-md group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                            <Banknote size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                              Generar Planilla
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Cálculo y reporte de nómina
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-neutral-800 pt-2 mt-2">
            {cargandoDependencias ? (
              <Cargando texto="Cargando usuarios..." />
            ) : usuariosAgrupados.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 text-xs py-4">
                No se encontraron usuarios con los filtros seleccionados.
              </p>
            ) : (
              <div className="w-full">
                <div className="w-full overflow-x-auto">
                  <table className="w-full table-fixed text-xs">
                    <thead className="bg-slate-50 dark:bg-neutral-900 text-left border-b border-gray-100 dark:border-neutral-800">
                      <tr>
                        <th className="py-3 px-4 text-[10px] xl:text-xs w-[35%] font-semibold text-slate-600 dark:text-slate-400">
                          Nombre
                        </th>
                        <th className="py-3 px-2 text-[10px] xl:text-xs w-[35%] font-semibold text-slate-600 dark:text-slate-400 pl-4">
                          Usuario
                        </th>
                        <th className="py-3 px-2 text-[10px] xl:text-xs w-[30%] font-semibold text-slate-600 dark:text-slate-400 pl-4">
                          Puesto
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuariosAgrupados.map((grupo) => {
                        const estaAbierta =
                          oficinasAbiertas[grupo.oficina_nombre] || false;

                        return (
                          <Fragment key={grupo.path_orden}>
                            <tr className="border-b border-slate-100 dark:border-neutral-800">
                              <td colSpan={3} className="p-1">
                                <div
                                  onClick={() =>
                                    toggleOficina(grupo.oficina_nombre)
                                  }
                                  className="bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 cursor-pointer transition-colors py-2.5 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center justify-between rounded-sm"
                                >
                                  <span>
                                    {grupo.oficina_nombre} (
                                    {grupo.usuarios.length})
                                  </span>
                                  <motion.div
                                    initial={false}
                                    animate={{ rotate: estaAbierta ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                  >
                                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                                  </motion.div>
                                </div>
                              </td>
                            </tr>

                            <AnimatePresence initial={false}>
                              {estaAbierta && (
                                <motion.tr
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{
                                    duration: 0.3,
                                    ease: "easeInOut",
                                  }}
                                  style={{ overflow: "hidden" }}
                                >
                                  <td colSpan={3} className="p-0">
                                    <table className="w-full">
                                      <tbody>
                                        {grupo.usuarios.map((usuario) => (
                                          <tr
                                            key={usuario.id}
                                            onClick={() =>
                                              handleVerUsuario(usuario.id)
                                            }
                                            className={`border-b border-slate-100 dark:border-neutral-800 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 group ${canOpenModal ? "cursor-pointer" : "cursor-default"}`}
                                          >
                                            <td className="py-3 px-4 text-[11px] xl:text-xs text-slate-700 dark:text-slate-300 w-[35%] truncate">
                                              {usuario.nombre || "—"}
                                            </td>
                                            <td className="py-3 px-2 text-[11px] xl:text-xs text-slate-600 dark:text-slate-400 w-[35%] truncate pl-4">
                                              {usuario.email || "—"}
                                            </td>
                                            <td className="py-3 px-2 text-[11px] xl:text-xs text-slate-600 dark:text-slate-400 w-[30%] truncate pl-4">
                                              {usuario.puesto_nombre || "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </td>
                                </motion.tr>
                              )}
                            </AnimatePresence>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- 4. RENDERIZADO DEL MODAL DE PLANILLA --- */}
      <InformeEmpleados
        isOpen={mostrarPlanilla}
        onClose={() => setMostrarPlanilla(false)}
      />

      <ModalShell
        open={Boolean(usuarioIdSeleccionado)}
        onClose={handleCancel}
        title="Editar usuario"
        subtitle={
          listaUsuarios.find((u) => u.id === usuarioIdSeleccionado)?.nombre ||
          listaUsuarios.find((u) => u.id === usuarioIdSeleccionado)?.email ||
          "Cuenta"
        }
      >
        {usuarioIdSeleccionado ? (
          <UsuarioForm
            id={usuarioIdSeleccionado}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            rolUsuarioActual={rolActual || ""}
            botonEliminar={
              rolActual === "SUPER" ? (
                <Button
                  variant="ghost"
                  onClick={handleEliminarUsuario}
                  disabled={eliminando}
                  className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-red-300 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  {eliminando ? "Eliminando..." : "Eliminar"}
                </Button>
              ) : null
            }
          />
        ) : null}
      </ModalShell>
    </>
  );
}
