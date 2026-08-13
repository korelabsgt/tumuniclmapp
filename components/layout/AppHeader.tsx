"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import HeaderAuth from "@/components/header-auth";
import LogoLink from "@/components/ui/LogoLink";
import useUserData from "@/hooks/sesion/useUserData";
import { CHROME_BG_CLASS } from "@/components/layout/chrome";

function esInicioDashboard(pathname: string) {
  return pathname === "/protected/admin" || pathname === "/protected/user";
}

function debeMostrarVolver(pathname: string) {
  return (
    pathname.startsWith("/protected") &&
    pathname !== "/protected" &&
    pathname !== "/protected/admin" &&
    pathname !== "/protected/user"
  );
}

function rutaInicio(rol: string) {
  const esAdmin = rol === "SUPER" || rol === "ADMINISTRADOR";
  return esAdmin ? "/protected/admin" : "/protected/user";
}

const fadeSuave = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" },
};

export default function AppHeader() {
  const pathname = usePathname();
  const { rol, cargando } = useUserData();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const esInicio = esInicioDashboard(pathname);
  const mostrarVolver = debeMostrarVolver(pathname) && !cargando;

  if (esInicio && cargando) {
    return null;
  }

  return (
    <nav
      id="app-main-nav"
      className={`w-full shrink-0 ${CHROME_BG_CLASS}`}
    >
      <div className="flex w-full items-center justify-between gap-3 px-3 py-2 sm:px-5">
        <div className="flex min-w-0 flex-col justify-center gap-2 overflow-hidden">
          <LogoLink />
          <AnimatePresence initial={false}>
            {mostrarVolver && (
              <motion.div key="volver-inicio" {...fadeSuave}>
                <Link
                  href={rutaInicio(rol)}
                  className="inline-flex w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-[#0066cc] transition-opacity hover:opacity-80 dark:text-blue-400"
                >
                  <LogOut className="h-4 w-4 rotate-180" />
                  Volver a inicio
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <HeaderAuth menuAbierto={menuAbierto} onMenuOpenChange={setMenuAbierto} />
      </div>
    </nav>
  );
}
