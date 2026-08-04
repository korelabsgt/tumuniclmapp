"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  List,
  LayoutGrid,
  FileText,
  FileWarning,
  ChevronDown,
  UserCog,
  Users,
  Settings,
} from "lucide-react";
import { FiltroBeneficiarios } from "./FiltroBeneficiarios";
import { TablaBeneficiarios } from "./TablaBeneficiarios";
import EstadisticasBeneficiarios from "./EstadisticasBeneficiarios";
import MISSINGFolioModal from "./MISSINGFolioModal";
import ListadoGeneroModal from "./ListadoGeneroModal";
import GestionDoctosModal from "./GestionDoctosModal";
import ConfigMetaModal from "./ConfigMetaModal";
import EncargadosFoliosModal from "./EncargadosFoliosModal";
import type { Beneficiario, CampoFiltro, OrdenFiltro } from "./types";
import {
  cargarBeneficiariosPorAnio,
  obtenerAniosDisponibles,
  filtrarYOrdenarBeneficiarios,
  generarResumenBeneficiarios,
  obtenerConfiguracionFertilizante,
} from "./actions";
import useUserData from "@/hooks/sesion/useUserData";

export default function VerBeneficiarios() {
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [orden, setOrden] = useState<OrdenFiltro>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fertilizanteOrden");
      if (saved) return saved as OrdenFiltro;
    }
    return "codigo_asc";
  });
  const [aniosDisponibles, setAniosDisponibles] = useState<string[]>([]);
  const [mostrarModalFolio, setMostrarModalFolio] = useState(false);
  const [mostrarListadoGenero, setMostrarListadoGenero] = useState(false);
  const [beneficiariosPorPagina, setBeneficiariosPorPagina] = useState(20);
  const [mostrarGestionDoctos, setMostrarGestionDoctos] = useState(false);
  const [mostrarEncargadosFolios, setMostrarEncargadosFolios] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [totalSacosMeta, setTotalSacosMeta] = useState(7100);
  const [mostrarConfigMeta, setMostrarConfigMeta] = useState(false);

  const [filtros, setFiltros] = useState(() => {
    const defaults = {
      campo: "codigo" as CampoFiltro,
      valor: "",
      valorFin: "",
      lugar: "",
      anio: "",
      sinImagen: false,
    };
    if (typeof window !== "undefined") {
      const savedCampo = localStorage.getItem("fertilizanteCampo");
      const savedLugar = localStorage.getItem("fertilizanteLugar");
      if (savedCampo) defaults.campo = savedCampo as CampoFiltro;
      if (savedLugar) defaults.lugar = savedLugar;
    }
    return defaults;
  });
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  useEffect(() => {
    const savedMode = localStorage.getItem("fertilizanteViewMode");
    if (savedMode === "grid" || savedMode === "table") {
      setViewMode(savedMode);
    }
  }, []);

  const changeViewMode = (mode: "table" | "grid") => {
    setViewMode(mode);
    localStorage.setItem("fertilizanteViewMode", mode);
  };

  const router = useRouter();
  const { permisos, rol, cargando: cargandoUsuario } = useUserData();

  const cargarDatos = useCallback(async (anioParaCargar: string) => {
    if (!anioParaCargar) return;
    setInitialLoading(true);
    const data = await cargarBeneficiariosPorAnio(anioParaCargar);
    const sacos = await obtenerConfiguracionFertilizante(anioParaCargar);
    setBeneficiarios(data);
    setTotalSacosMeta(sacos);
    setInitialLoading(false);
  }, []);

  // Persistir filtros en localStorage
  useEffect(() => {
    localStorage.setItem("fertilizanteCampo", filtros.campo);
    localStorage.setItem("fertilizanteLugar", filtros.lugar);
    if (filtros.anio) localStorage.setItem("fertilizanteAnio", filtros.anio);
  }, [filtros.campo, filtros.lugar, filtros.anio]);

  useEffect(() => {
    localStorage.setItem("fertilizanteOrden", orden);
  }, [orden]);

  useEffect(() => {
    const inicializar = async () => {
      const anios = await obtenerAniosDisponibles();
      setAniosDisponibles(anios);

      // Intentar restaurar el año guardado, si existe y está disponible
      const savedAnio =
        typeof window !== "undefined"
          ? localStorage.getItem("fertilizanteAnio")
          : null;
      const anioActual = new Date().getFullYear().toString();

      let anioInicial = anioActual;
      if (savedAnio && anios.includes(savedAnio)) {
        anioInicial = savedAnio;
      } else if (anios.length > 0 && !anios.includes(anioActual)) {
        anioInicial = anios[0];
      }

      setFiltros((prev) => ({ ...prev, anio: anioInicial }));
      await cargarDatos(anioInicial);
    };

    inicializar();
  }, [cargarDatos]);

  // Efecto para cambios manuales en el select de año
  useEffect(() => {
    if (filtros.anio && !initialLoading) {
      cargarDatos(filtros.anio);
    }
  }, [filtros.anio, cargarDatos]);

  const beneficiariosFiltrados = filtrarYOrdenarBeneficiarios(
    beneficiarios,
    filtros,
    orden,
  );
  const totalPaginas = Math.ceil(
    beneficiariosFiltrados.length / beneficiariosPorPagina,
  );
  const inicio = (paginaActual - 1) * beneficiariosPorPagina;
  const beneficiariosPaginados = beneficiariosFiltrados.slice(
    inicio,
    inicio + beneficiariosPorPagina,
  );
  const resumen = generarResumenBeneficiarios(beneficiariosFiltrados);

  useEffect(() => {
    setPaginaActual(1);
  }, [filtros, orden, beneficiariosPorPagina]);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  if (cargandoUsuario || initialLoading) {
    return (
      <div className="w-full mx-auto p-2 md:px-10">
        <div className="text-center text-gray-500 dark:text-gray-400 my-10 text-lg italic">
          Cargando beneficiarios...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-2 md:px-10">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between my-6 gap-2">
          <h1 className="text-2xl font-bold text-left dark:text-white">
            Beneficiarios de Fertilizante
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {(rol === 'SUPER' || rol === 'SECRETARIO' || rol === 'DAFIM') && (
              <Button
                variant="outline"
                onClick={() => setMostrarConfigMeta(true)}
                className="h-12 px-4 border-gray-300 dark:border-neutral-700 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors bg-white dark:bg-neutral-900 shadow-sm"
                title="Configurar meta de sacos"
              >
                <Settings size={20} />
              </Button>
            )}
            {permisos.includes("CREAR") || permisos.includes("TODO") ? (
              <Button
                onClick={() =>
                  router.push("/sigem/fertilizante/beneficiarios/crear")
                }
                className="h-12 bg-blue-600 hover:bg-blue-700 text-white px-4 w-full sm:w-auto"
              >
                Nuevo Beneficiario
              </Button>
            ) : (
              <Button
                disabled
                className="h-12 bg-gray-400 dark:bg-neutral-700 text-gray-700 dark:text-neutral-400 cursor-not-allowed px-4 w-full sm:w-auto"
              >
                Nuevo Beneficiario
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <FiltroBeneficiarios
          filtros={filtros}
          setFiltros={setFiltros}
          anios={aniosDisponibles}
        />
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={itemVariants} transition={{ duration: 0.5, delay: 0.4 }}>
        <EstadisticasBeneficiarios 
          data={beneficiariosFiltrados} 
          totalMeta={totalSacosMeta}
          anioActual={filtros.anio}
          userRol={rol}
          onConfigChange={() => cargarDatos(filtros.anio)}
        />
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="my-6 p-4 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-gray-100 dark:border-neutral-800">
          <div className="grid grid-cols-2 md:flex md:flex-row md:items-center md:justify-between gap-3">
            {/* Izquierda: Ordenar por */}
            <div className="col-span-2 md:flex-none flex flex-col sm:flex-row sm:items-center gap-2 md:max-w-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 shrink-0">
                Ordenar por:
              </span>
              <div className="relative w-full md:w-64">
                <select
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as OrdenFiltro)}
                  className="w-full appearance-none bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                >
                  <optgroup label="Formulario">
                    <option value="codigo_asc">Folio (ascendente)</option>
                    <option value="codigo_desc">Folio (descendente)</option>
                  </optgroup>
                  <optgroup label="Nombre">
                    <option value="nombre_completo_asc">Nombre (A-Z)</option>
                    <option value="nombre_completo_desc">Nombre (Z-A)</option>
                  </optgroup>
                  <optgroup label="Fecha">
                    <option value="fecha_desc">Fecha (más reciente)</option>
                    <option value="fecha_asc">Fecha (más antigua)</option>
                  </optgroup>
                  <optgroup label="Cantidad">
                    <option value="cantidad_desc">
                      Cantidad (mayor a menor)
                    </option>
                  </optgroup>
                  <optgroup label="Género">
                    <option value="genero_hombres_primero">Solo hombres</option>
                    <option value="genero_mujeres_primero">Solo mujeres</option>
                  </optgroup>
                  <optgroup label="Estado">
                    <option value="solo_anulados">Anulados</option>
                    <option value="solo_extraviados">Extraviados</option>
                    <option value="solo_informes">Informes</option>
                  </optgroup>
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Filtros: Sin Imágenes + Listado género */}
            <div className="col-span-2 md:flex-none flex flex-col sm:flex-row gap-2">
              <div
                onClick={() =>
                  setFiltros({ ...filtros, sinImagen: !filtros.sinImagen })
                }
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                  filtros.sinImagen
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                    : "bg-gray-50 border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-700"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    filtros.sinImagen
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white dark:bg-neutral-900 border-gray-300 dark:border-neutral-600"
                  }`}
                >
                  {filtros.sinImagen && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <span className="text-sm font-bold whitespace-nowrap">
                  Sin Imágenes
                </span>
              </div>

              <button
                type="button"
                onClick={() => setMostrarListadoGenero(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border bg-gray-50 border-gray-200 dark:bg-neutral-800 dark:border-neutral-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-all"
              >
                <Users size={18} />
                <span className="text-sm font-bold whitespace-nowrap">
                  Hombres / Mujeres
                </span>
              </button>
            </div>

            {/* Centro: Switch Tabla/Tarjetas */}
            <div className="col-span-2 md:col-span-1 flex bg-gray-100 dark:bg-neutral-800 p-1 rounded-xl w-full md:w-auto md:mx-auto">
              <button
                onClick={() => changeViewMode("table")}
                className={`flex-1 md:w-20 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-all ${viewMode === "table" ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
              >
                <List size={18} className="hidden sm:block shrink-0" />
                <span>Tabla</span>
              </button>
              <button
                onClick={() => changeViewMode("grid")}
                className={`flex-1 md:w-24 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold transition-all ${viewMode === "grid" ? "bg-white dark:bg-neutral-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"}`}
              >
                <LayoutGrid size={18} className="hidden sm:block shrink-0" />
                <span>Tarjetas</span>
              </button>
            </div>

            {/* Derecha: Encargados + Gestionar doctos. + F. Faltantes */}
            {(permisos.includes("TODO") || permisos.includes("LEER")) && (
              <div className="col-span-2 md:flex-none flex flex-row flex-wrap gap-2 w-full md:w-auto">
                <div className="flex-1 md:w-auto min-w-[140px]">
                  <Button
                    className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white w-full rounded-xl flex items-center justify-center gap-2 px-4 shadow-sm transition-all active:scale-95"
                    onClick={() => setMostrarEncargadosFolios(true)}
                  >
                    <UserCog size={18} />
                    <span className="truncate">Encargados</span>
                  </Button>
                </div>

                <div className="flex-1 md:w-auto min-w-[140px]">
                  {permisos.includes("CREAR") || permisos.includes("TODO") ? (
                    <Button
                      className="h-11 bg-red-600 hover:bg-red-700 text-white w-full rounded-xl flex items-center justify-center gap-2 px-4 shadow-sm transition-all active:scale-95"
                      onClick={() => setMostrarGestionDoctos(true)}
                    >
                      <FileText size={18} />
                      <span className="truncate">Gestionar doctos.</span>
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="h-11 bg-gray-200 dark:bg-neutral-800 text-gray-400 cursor-not-allowed w-full rounded-xl px-4"
                    >
                      <FileText size={18} />
                      <span className="truncate ml-2">Gestionar doctos.</span>
                    </Button>
                  )}
                </div>

                <div className="flex-1 md:w-auto min-w-[140px]">
                  <Button
                    onClick={() => setMostrarModalFolio(true)}
                    className="h-11 bg-orange-600 hover:bg-orange-700 text-white w-full rounded-xl flex items-center justify-center gap-2 px-4 shadow-sm transition-all active:scale-95"
                  >
                    <FileWarning size={18} />
                    <span className="truncate">F. Faltantes</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        <MISSINGFolioModal
          visible={mostrarModalFolio}
          onClose={() => setMostrarModalFolio(false)}
          beneficiarios={beneficiarios}
        />
        <ListadoGeneroModal
          visible={mostrarListadoGenero}
          onClose={() => setMostrarListadoGenero(false)}
          beneficiarios={beneficiariosFiltrados}
        />
        <GestionDoctosModal
          visible={mostrarGestionDoctos}
          onClose={() => setMostrarGestionDoctos(false)}
          aniosDisponibles={aniosDisponibles}
          onGuardado={() => cargarDatos(filtros.anio)}
        />
        <EncargadosFoliosModal
          visible={mostrarEncargadosFolios}
          onClose={() => setMostrarEncargadosFolios(false)}
        />
        <ConfigMetaModal
          visible={mostrarConfigMeta}
          onClose={() => setMostrarConfigMeta(false)}
          anioActual={filtros.anio}
          totalMeta={totalSacosMeta}
          onGuardado={() => cargarDatos(filtros.anio)}
        />
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={itemVariants}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {beneficiariosFiltrados.length === 0 ? (
          <div className="text-center text-gray-600 dark:text-neutral-400 my-8 text-2xl">
            <strong>No se encontraron beneficiarios en {filtros.anio}.</strong>
          </div>
        ) : (
          <TablaBeneficiarios
            data={beneficiariosPaginados}
            resumen={resumen}
            isLoading={false}
            permisos={permisos}
            onDataChange={() => cargarDatos(filtros.anio)}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        )}
      </motion.div>

      {!(initialLoading || cargandoUsuario) &&
        beneficiariosFiltrados.length > 0 && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={itemVariants}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="flex justify-center mt-5 mb-2 text-sm gap-2 items-center">
              <span className="font-medium">Ver por:</span>
              <select
                value={beneficiariosPorPagina}
                onChange={(e) =>
                  setBeneficiariosPorPagina(parseInt(e.target.value))
                }
                className="border border-gray-300 dark:border-neutral-700 dark:bg-neutral-800 rounded px-2 py-1"
              >
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
            <div className="flex justify-center mt-4 gap-2 flex-wrap pb-10">
              <button
                onClick={() => setPaginaActual((p) => Math.max(p - 1, 1))}
                disabled={paginaActual === 1}
                className="px-3 py-2 rounded border disabled:bg-gray-200 disabled:text-gray-500 bg-white dark:bg-neutral-800 dark:border-neutral-700"
              >
                ←
              </button>
              {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                .filter((n) => {
                  const grupo = Math.floor((paginaActual - 1) / 45);
                  return n > grupo * 45 && n <= (grupo + 1) * 45;
                })
                .map((numero) => (
                  <button
                    key={numero}
                    onClick={() => setPaginaActual(numero)}
                    className={`px-4 py-2 rounded border ${paginaActual === numero ? "bg-blue-600 text-white" : "bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-gray-300"}`}
                  >
                    {numero}
                  </button>
                ))}
              <button
                onClick={() =>
                  setPaginaActual((p) => Math.min(p + 1, totalPaginas))
                }
                disabled={paginaActual === totalPaginas}
                className="px-3 py-2 rounded border disabled:bg-gray-200 disabled:text-gray-500 bg-white dark:bg-neutral-800 dark:border-neutral-700"
              >
                →
              </button>
            </div>
          </motion.div>
        )}
    </div>
  );
}
