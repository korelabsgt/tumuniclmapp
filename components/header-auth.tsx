"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, MoreVertical, X } from "lucide-react";
import Swal from "sweetalert2";
import useUserData from "@/hooks/sesion/useUserData";
import { useInfoUsuario } from "@/hooks/usuarios/useInfoUsuario";
import { signOutAction } from "@/app/actions";
import AnimatedIcon from "@/components/ui/AnimatedIcon";
import SubscribeButton from "@/components/push/SubscribeButton";
import TarjetaEmpleado from "@/components/admin/dependencias/TarjetaEmpleado";
import LlamadaAtencionManager from "@/components/admin/users/forms/LlamadaAtencionManager";
import { ThemeSwitcher } from "@/components/themes/theme-switcher";
import { useAppChromeOffset } from "@/components/layout/useAppChromeOffset";

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
      className="w-full flex items-start gap-3 p-4 rounded-2xl text-left cursor-pointer bg-white dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 hover:border-[#0066cc]/35 dark:hover:border-blue-500/35 transition-colors"
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
}: {
  titulo: string;
  colorClass: string;
  dotClass: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
      <p
        className={`text-[10px] font-bold uppercase tracking-[0.2em] ${colorClass}`}
      >
        {titulo}
      </p>
      <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export default function AuthButton() {
  const { userId, nombre, email, cargando } = useUserData();
  const { usuario: datosUsuario } = useInfoUsuario(userId);
  const router = useRouter();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [mostrarTarjeta, setMostrarTarjeta] = useState(false);
  const [mostrarCitacionesFaltas, setMostrarCitacionesFaltas] = useState(false);
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

  useEffect(() => {
    if (!menuAbierto) return;
    remeasure();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuAbierto, remeasure]);

  const cerrarMenu = () => setMenuAbierto(false);

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
      signOutAction();
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

  const menuItemsPrincipales: MenuItemConfig[] = [
    {
      id: "asistencia",
      titulo: "Asistencia",
      descripcion: "Consultar registros de asistencia.",
      iconKey: "sgtmgpft",
      iconBg: "bg-green-100 dark:bg-green-900/40",
      onClick: () => irA("/protected/mis-asistencias"),
    },
    {
      id: "comisiones",
      titulo: "Comisiones",
      descripcion: "Ver comisiones asignadas.",
      iconKey: "vqkaxtlm",
      iconBg: "bg-purple-100 dark:bg-purple-900/40",
      onClick: () => irA("/protected/mis-comisiones"),
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
            className="fixed left-0 right-0 bottom-0 z-[200] bg-zinc-700/20 backdrop-blur-sm cursor-pointer hidden sm:block"
            style={{ top: topOffset }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cerrarMenu}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menú de usuario"
            className="fixed right-0 bottom-0 z-[210] flex w-full min-h-0 flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 sm:w-[min(22rem,92vw)] sm:border-l border-zinc-200 dark:border-zinc-800 shadow-xl"
            style={{ top: topOffset }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 border-b border-zinc-200/70 px-4 pt-3 pb-3 dark:border-zinc-800">
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
              <SubscribeButton userId={userId} variant="plain" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="pb-3 pt-1">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800/90">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Usuario
                      </p>
                      <p className="truncate text-sm font-semibold text-[#0066cc] dark:text-blue-400">
                        {usuario}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-700">
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

              <div className="my-4 h-px bg-zinc-200 dark:bg-zinc-800" />

              <MenuSectionHeader
                titulo="Mi Cuenta"
                colorClass="text-violet-500"
                dotClass="bg-violet-500"
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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="flex items-center gap-0.5 sm:gap-1">
        <ThemeSwitcher className="w-11 h-11 sm:w-10 sm:h-10" />

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="Actualizar"
          className="inline-flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 cursor-pointer text-[#0066cc] dark:text-blue-400 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 transition-opacity focus-visible:outline-none"
        >
          <AnimatedIcon
            iconKey="qzorewvq"
            trigger={isRefreshing ? "loop" : "hover"}
            className="w-9 h-9 sm:w-8 sm:h-8"
          />
        </button>

        {!cargando && userId ? (
          <button
            type="button"
            aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuAbierto}
            onClick={() => setMenuAbierto((v) => !v)}
            className="inline-flex items-center justify-center w-11 h-11 sm:w-10 sm:h-10 cursor-pointer text-foreground hover:text-[#0066cc] dark:hover:text-blue-400 transition-colors focus-visible:outline-none"
          >
            <span className="relative w-7 h-7 sm:w-6 sm:h-6 block">
              <AnimatePresence mode="wait" initial={false}>
                {menuAbierto ? (
                  <motion.span
                    key="x"
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                  >
                    <X className="h-6 w-6" strokeWidth={2.25} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="dots"
                    className="absolute inset-0 flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
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

      {userId ? (
        <>
          <TarjetaEmpleado
            isOpen={mostrarTarjeta}
            onClose={() => setMostrarTarjeta(false)}
            userId={userId}
          />

          {mostrarCitacionesFaltas ? (
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
      ) : null}
    </>
  );
}
