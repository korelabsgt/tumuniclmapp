"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight, LogOut, Megaphone, MoreVertical, X } from "lucide-react";
import Swal from "sweetalert2";
import useUserData from "@/hooks/sesion/useUserData";
import { useInfoUsuario } from "@/hooks/usuarios/useInfoUsuario";
import { cerrarSesion } from "@/utils/auth/logoutCliente";
import AnimatedIcon from "@/components/ui/AnimatedIcon";
import SubscribeButton from "@/components/push/SubscribeButton";
import TarjetaEmpleado from "@/components/admin/dependencias/TarjetaEmpleado";
import LlamadaAtencionManager from "@/components/admin/users/forms/LlamadaAtencionManager";
import { ThemeSwitcher } from "@/components/themes/theme-switcher";
import { useAppChromeOffset } from "@/components/layout/useAppChromeOffset";
import { CHROME_BG_CLASS } from "@/components/layout/chrome";
import CambiarContrasenaForm from "@/components/cambiar-contrasena/CambiarContrasenaForm";

function obtenerCargoYOficina(puestoPathJerarquico: string | null | undefined) {
  if (!puestoPathJerarquico) {
    return { cargo: null, oficina: null };
  }

  const pathItems = puestoPathJerarquico
    .split(" > ")
    .filter(
      (item) =>
        item.toUpperCase() !== "SIN DIRECCIÓN" &&
        item.toUpperCase() !== "SIN DIRECCION",
    )
    .slice(1);

  if (pathItems.length === 0) {
    return { cargo: null, oficina: null };
  }

  return {
    cargo: pathItems[pathItems.length - 1] ?? null,
    oficina:
      pathItems.length >= 2 ? pathItems[pathItems.length - 2] ?? null : null,
  };
}

type MenuItemConfig = {
  id: string;
  titulo: string;
  descripcion: string;
  iconKey: string;
  iconBg: string;
  onClick: () => void;
};

function MenuItemCard({
  item,
  activo,
  onHover,
  onLeave,
}: {
  item: MenuItemConfig;
  activo: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="w-full flex items-start gap-3 p-4 rounded-2xl text-left cursor-pointer bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/80 dark:border-neutral-700/80 hover:border-[#0066cc]/35 dark:hover:border-blue-500/35 transition-colors"
    >
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}
      >
        <AnimatedIcon
          iconKey={item.iconKey}
          className="w-9 h-9"
          trigger={activo ? "loop" : undefined}
        />
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-bold uppercase tracking-wide text-foreground">
          {item.titulo}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">
          {item.descripcion}
        </p>
      </div>
    </button>
  );
}

function MenuSectionHeader({
  titulo,
  colorClass,
  dotClass,
  className = "",
}: {
  titulo: string;
  colorClass: string;
  dotClass: string;
  className?: string;
}) {
  return (
    <div className={`mb-3 flex items-center gap-2 ${className}`}>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${colorClass}`}
      >
        {titulo}
      </p>
      <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
    </div>
  );
}

export default function AuthButton({
  menuAbierto,
  onMenuOpenChange,
}: {
  menuAbierto: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const { userId, nombre, email, cargando, rol } = useUserData();
  const { usuario: datosUsuario } = useInfoUsuario(menuAbierto ? userId : null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
  const [mostrarCitacionesFaltas, setMostrarCitacionesFaltas] = useState(false);
  const [vistaContrasena, setVistaContrasena] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { topOffset, remeasure } = useAppChromeOffset();

  const usuario = email.includes("@") ? email.split("@")[0] : email;
  const { cargo, oficina } = obtenerCargoYOficina(
    datosUsuario?.puesto_path_jerarquico,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    remeasure();
  }, [menuAbierto, remeasure]);

  useEffect(() => {
    if (!menuAbierto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuAbierto]);

  useEffect(() => {
    if (!menuAbierto) {
      setVistaContrasena(false);
    }
  }, [menuAbierto]);

  const cerrarMenu = () => onMenuOpenChange(false);
  const alternarMenu = () => onMenuOpenChange(!menuAbierto);

  const handleSignOut = async () => {
    const result = await Swal.fire({
      title: "¿Está seguro?",
      text: "Se cerrará su sesión actual.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, cerrar sesión",
      cancelButtonText: "Cancelar",
      customClass: {
        popup:
          "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl shadow-xl",
        title: "text-gray-900 dark:text-white text-xl font-bold",
        htmlContainer: "text-gray-600 dark:text-gray-300",
        confirmButton:
          "bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg",
        cancelButton:
          "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white font-medium py-2 px-4 rounded-lg",
        actions: "gap-3",
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      await cerrarSesion(queryClient);
    }
  };

  const irA = (ruta: string) => {
    cerrarMenu();
    router.push(ruta);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const mostrarDifusion = ["SUPER", "RRHH", "SECRETARIO"].includes(rol);

  const menuItemsPrincipales: MenuItemConfig[] = [
    {
      id: "asistencia",
      titulo: "Asistencia",
      descripcion: "Consultar registros de asistencia.",
      iconKey: "sgtmgpft",
      iconBg: "bg-green-100 dark:bg-green-900/40",
      onClick: () => irA("/sigem/mis-asistencias"),
    },
    {
      id: "comisiones",
      titulo: "Comisiones",
      descripcion: "Ver comisiones asignadas.",
      iconKey: "vqkaxtlm",
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      onClick: () => irA("/sigem/mis-comisiones"),
    },
  ];

  const menuItemsSecundarios: MenuItemConfig[] = [
    {
      id: "citaciones",
      titulo: "Citaciones y Faltas",
      descripcion: "Historial de citaciones y faltas.",
      iconKey: "dicxqsya",
      iconBg: "bg-sky-100 dark:bg-sky-900/40",
      onClick: () => {
        cerrarMenu();
        setMostrarCitacionesFaltas(true);
      },
    },
    {
      id: "info",
      titulo: "Mi Información",
      descripcion: "Ver expediente y datos del empleado.",
      iconKey: "hroklero",
      iconBg: "bg-blue-100 dark:bg-blue-900/40",
      onClick: () => {
        cerrarMenu();
        setMostrarTarjeta(true);
      },
    },
  ];

  const panel = (
    <AnimatePresence>
      {menuAbierto && (
        <>
          <motion.button
            type="button"
            aria-label="Cerrar menú"
            className="fixed left-0 right-0 z-[200] cursor-pointer bg-white/50 backdrop-blur-sm dark:bg-black/55 dark:backdrop-blur-sm hidden sm:block"
            style={{ top: topOffset, bottom: 0 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cerrarMenu}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menú de usuario"
            className={`fixed right-0 z-[210] flex w-full min-h-0 flex-col overflow-hidden ${CHROME_BG_CLASS} sm:w-[min(22rem,92vw)]`}
            style={{ top: topOffset, bottom: 0 }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {vistaContrasena ? (
                <motion.div
                  key="vista-contrasena"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="shrink-0 px-4 pt-2 pb-3">
                    <button
                      type="button"
                      onClick={() => setVistaContrasena(false)}
                      className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-[#0066cc] transition-opacity hover:opacity-80 dark:text-blue-400"
                    >
                      <ChevronsLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} />
                      Volver
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <CambiarContrasenaForm
                      variant="menu"
                      onSuccess={() => setVistaContrasena(false)}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="vista-menu"
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="shrink-0 flex items-center justify-between gap-3 px-4 pt-2 pb-3">
                    <button
                      type="button"
                      onClick={() => {
                        cerrarMenu();
                        void handleSignOut();
                      }}
                      className="inline-flex items-center gap-2 text-base font-semibold text-red-500 hover:text-red-600 cursor-pointer transition-colors"
                    >
                      <LogOut className="h-5 w-5 rotate-180" />
                      Cerrar Sesión
                    </button>
                    <div className="flex items-center gap-0.5">
                      {mostrarDifusion ? (
                        <button
                          type="button"
                          aria-label="Difusión"
                          onClick={() => irA("/sigem/dev")}
                          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center text-[#0066cc] transition-opacity hover:opacity-80 dark:text-blue-400"
                        >
                          <Megaphone className="h-8 w-8" strokeWidth={2.25} />
                        </button>
                      ) : null}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                        <SubscribeButton userId={userId} variant="plain" reserveSlot />
                      </div>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <div className="pb-3 pt-1">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/40">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            Usuario
                          </p>
                          <p className="truncate text-sm font-semibold text-[#0066cc] dark:text-blue-400">
                            {usuario}
                          </p>
                        </div>
                        <div className="mt-2 border-t border-neutral-200 pt-2 dark:border-neutral-700">
                          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                            Nombre
                          </p>
                          <p className="text-sm font-bold leading-snug text-foreground">
                            {nombre || "Usuario"}
                          </p>
                          {cargo ? (
                            <p className="mt-2 text-xs font-semibold leading-snug text-[#0066cc] dark:text-blue-400">
                              {cargo}
                            </p>
                          ) : null}
                          {oficina ? (
                            <p className="mt-1 text-xs leading-snug text-muted-foreground">
                              {oficina}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setVistaContrasena(true)}
                      className="mb-4 flex w-full cursor-pointer items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-left transition-colors hover:bg-zinc-100 dark:border-neutral-700 dark:bg-neutral-900/40 dark:hover:bg-zinc-800/80"
                    >
                      <span className="text-sm font-semibold text-[#0066cc] dark:text-blue-400">
                        Cambiar contraseña
                      </span>
                      <ChevronsRight
                        className="h-4 w-4 shrink-0 text-[#0066cc] dark:text-blue-400"
                        strokeWidth={2.5}
                      />
                    </button>

                    <MenuSectionHeader
                      titulo="Registros"
                      colorClass="text-[#0066cc] dark:text-blue-400"
                      dotClass="bg-[#0066cc] dark:bg-blue-400"
                    />

                    <div className="flex flex-col gap-2">
                      {menuItemsPrincipales.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          activo={hovered === item.id}
                          onHover={() => setHovered(item.id)}
                          onLeave={() => setHovered(null)}
                        />
                      ))}
                    </div>

                    <MenuSectionHeader
                      titulo="Mi Cuenta"
                      colorClass="text-violet-500"
                      dotClass="bg-violet-500"
                      className="mt-4"
                    />

                    <div className="flex flex-col gap-2">
                      {menuItemsSecundarios.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          activo={hovered === item.id}
                          onHover={() => setHovered(item.id)}
                          onLeave={() => setHovered(null)}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <ThemeSwitcher className="w-9 h-9 sm:w-10 sm:h-10" />

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Actualizar"
          className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 cursor-pointer text-[#0066cc] dark:text-blue-400 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 transition-opacity focus-visible:outline-none"
        >
          <AnimatedIcon
            iconKey="qzorewvq"
            trigger={isRefreshing ? "loop" : "hover"}
            className="w-6 h-6 sm:w-8 sm:h-8"
          />
        </button>

        {!cargando && userId ? (
          <button
            type="button"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            onClick={() => alternarMenu()}
            className="inline-flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 cursor-pointer text-foreground hover:text-[#0066cc] dark:hover:text-blue-400 transition-colors focus-visible:outline-none"
          >
            <span className="relative w-7 h-7 sm:w-6 sm:h-6 block">
              <AnimatePresence initial={false}>
                {menuAbierto ? (
                  <motion.span
                    key="x"
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.55, rotate: -90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.55, rotate: 90 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <X className="h-6 w-6" strokeWidth={2.25} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="dots"
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.55, rotate: 90 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.55, rotate: -90 }}
                    transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <MoreVertical className="h-6 w-6" strokeWidth={2.25} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
          </button>
        ) : null}
      </div>

      {mounted && userId ? createPortal(panel, document.body) : null}

      {userId && mostrarTarjeta ? (
        <TarjetaEmpleado
          isOpen={mostrarTarjeta}
          onClose={() => setMostrarTarjeta(false)}
          userId={userId}
        />
      ) : null}

      {userId && mostrarCitacionesFaltas ? (
        <div
          className="fixed inset-0 z-[230] flex items-center justify-center p-1 sm:p-4 bg-black/30 dark:bg-black/70 backdrop-blur-sm"
          onClick={() => setMostrarCitacionesFaltas(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-lg w-full max-w-4xl p-6 shadow-xl border dark:border-neutral-800 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <LlamadaAtencionManager
              id={userId}
              onClose={() => setMostrarCitacionesFaltas(false)}
              readOnly={true}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}