"use client";

import type { QueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { registrarLog } from "@/utils/registrarLog";
import { obtenerFechaYFormatoGT } from "@/utils/formatoFechaGT";

function esClaveAuth(nombre: string) {
  return (
    nombre.startsWith("sb-") ||
    nombre.includes("supabase") ||
    nombre.includes("auth-token")
  );
}

function limpiarSesionNavegador() {
  if (typeof window === "undefined") return;

  const clavesLocal: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const clave = localStorage.key(i);
    if (clave && esClaveAuth(clave)) {
      clavesLocal.push(clave);
    }
  }
  clavesLocal.forEach((clave) => localStorage.removeItem(clave));

  const clavesSesion: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const clave = sessionStorage.key(i);
    if (clave && esClaveAuth(clave)) {
      clavesSesion.push(clave);
    }
  }
  clavesSesion.forEach((clave) => sessionStorage.removeItem(clave));

  document.cookie.split(";").forEach((cookie) => {
    const nombre = cookie.split("=")[0]?.trim();
    if (!nombre || !esClaveAuth(nombre)) return;
    document.cookie = `${nombre}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${nombre}=; Max-Age=0; path=/; SameSite=Lax; Secure`;
  });
}

async function cerrarSesionSupabase() {
  const supabase = createClient();
  await supabase.auth.signOut();
}

export async function logoutPorInactividad() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { fecha } = obtenerFechaYFormatoGT();

  await registrarLog({
    accion: "INACTIVIDAD",
    descripcion: `Cierre de sesión automático por inactividad`,
    nombreModulo: "SISTEMA",
    fecha,
    user_id: user.id,
  });

  await cerrarSesionSupabase();
  limpiarSesionNavegador();
}

export async function cerrarSesion(queryClient: QueryClient) {
  const supabase = createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { fecha } = obtenerFechaYFormatoGT();
      await registrarLog({
        accion: "CERRAR_SESION",
        descripcion: "-",
        nombreModulo: "SISTEMA",
        fecha,
        user_id: user.id,
      });
    }
  } catch {}

  try {
    await cerrarSesionSupabase();
  } catch {}

  queryClient.clear();
  limpiarSesionNavegador();
  window.location.assign("/");
}
