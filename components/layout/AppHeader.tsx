"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import HeaderAuth from "@/components/header-auth";
import LogoLink from "@/components/ui/LogoLink";
import AppBreadcrumb from "@/components/layout/AppBreadcrumb";
import useUserData from "@/hooks/sesion/useUserData";
import { CHROME_BG_CLASS } from "@/components/layout/chrome";

function esInicioDashboard(pathname: string) {
  return pathname === "/sigem/admin" || pathname === "/sigem/user";
}

function debeMostrarVolver(pathname: string) {
  return (
    pathname.startsWith("/sigem") &&
    pathname !== "/sigem" &&
    pathname !== "/sigem/admin" &&
    pathname !== "/sigem/user"
  );
}

function rutaInicio(rol: string) {
  const esAdmin = rol === "SUPER" || rol === "ADMINISTRADOR";
  return esAdmin ? "/sigem/admin" : "/sigem/user";
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
      <div className="flex w-full flex-col px-3 py-2 sm:px-5">
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-w-0">
            <LogoLink />
          </div>
          <div className="shrink-0">
            <HeaderAuth
              menuAbierto={menuAbierto}
              onMenuOpenChange={setMenuAbierto}
            />
          </div>
        </div>
        <AnimatePresence initial={false}>
          {mostrarVolver && (
            <motion.div
              key="breadcrumb"
              className="min-w-0 pt-1"
              {...fadeSuave}
            >
              <AppBreadcrumb homeHref={rutaInicio(rol)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
