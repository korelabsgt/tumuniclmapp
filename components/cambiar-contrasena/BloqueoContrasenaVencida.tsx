"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { PAGE_BG_CLASS } from "@/components/layout/chrome";
import CambiarContrasenaForm from "./CambiarContrasenaForm";
import { useForzarCambioContrasena } from "./lib/hooks";

export default function BloqueoContrasenaVencida() {
  const pathname = usePathname();
  const mostrar = useForzarCambioContrasena();
  const [ocultoLocal, setOcultoLocal] = useState(false);

  useEffect(() => {
    if (!mostrar) {
      setOcultoLocal(false);
    }
  }, [mostrar]);

  if (!mostrar || ocultoLocal) return null;
  if (pathname === "/" || pathname.startsWith("/albergues") || pathname.startsWith("/restablecer-contrasena")) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto px-4 py-10 sm:items-center ${PAGE_BG_CLASS}`}
    >
      <div className="flex w-full max-w-[400px] flex-col">
        <CambiarContrasenaForm
          variant="bloqueo"
          onSuccess={() => setOcultoLocal(true)}
        />
      </div>
    </div>
  );
}
