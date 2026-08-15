"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

type Crumb = {
  href: string;
  label: string;
};

const ETIQUETAS: Record<string, string> = {
  "evaluaciones-desempeno": "Evaluaciones de desempeño",
  resultados: "Resultado",
  rrhh: "RRHH",
  jefe: "Jefe",
  permisos: "Permisos",
  actividades: "Actividades",
  inventario: "Inventario",
  propias: "Tarjeta de responsabilidad",
  general: "Inventario general",
  users: "Personal",
  empleado: "Empleado",
  "sign-up": "Registro",
  dependencias: "Dependencias",
  organos: "Órganos",
  horarios: "Horarios",
  logs: "Bitácora",
  configs: "Configuración",
  modulos: "Módulos",
  roles: "Roles",
  educacion: "Educación",
  programa: "Programa",
  nivel: "Nivel",
  fertilizante: "Fertilizante",
  beneficiarios: "Beneficiarios",
  crear: "Crear",
  editar: "Editar",
  verificar: "Verificar",
  combustible: "Combustible",
  contrato: "Contrato",
  reporte: "Reporte",
  solicitud: "Solicitud de combustible",
  solicitudes: "Solicitudes",
  lamparas: "Lámparas",
  mobiliario: "Mobiliario",
  jefes: "Jefes",
  lecturas: "Lecturas",
  acuerdos: "Acuerdos",
  concejo: "Concejo",
  agenda: "Agenda",
  asistencias: "Asistencias",
  "mis-asistencias": "Mis asistencias",
  comisiones: "Comisiones",
  "mis-comisiones": "Mis comisiones",
  dev: "Mensajes del sistema",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function esIdDinamico(segmento: string) {
  return UUID_RE.test(segmento) || /^\d+$/.test(segmento);
}

function etiqueta(segmento: string) {
  const clave = decodeURIComponent(segmento).toLowerCase();
  if (ETIQUETAS[clave]) return ETIQUETAS[clave];
  return decodeURIComponent(segmento)
    .split("-")
    .filter(Boolean)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase())
    .join(" ");
}

function crumbsDesdeRuta(pathname: string, homeHref: string): Crumb[] {
  const crumbs: Crumb[] = [{ href: homeHref, label: "Inicio" }];

  const partes = pathname.split("/").filter(Boolean);
  if (partes[0] !== "protected") return crumbs;

  const resto = [...partes.slice(1)];
  if (resto[0] === "admin" || resto[0] === "user") {
    resto.shift();
  }

  let href = pathname.startsWith("/protected/admin")
    ? "/protected/admin"
    : pathname.startsWith("/protected/user")
      ? "/protected/user"
      : "/protected";

  for (const segmento of resto) {
    href += `/${segmento}`;
    if (esIdDinamico(segmento)) {
      const anterior = crumbs[crumbs.length - 1];
      if (anterior) anterior.href = href;
      continue;
    }
    crumbs.push({
      href,
      label: etiqueta(segmento),
    });
  }

  return crumbs;
}

const CLASE_OL =
  "flex w-full max-h-[2.875rem] flex-wrap items-center gap-x-1 gap-y-0.5 overflow-hidden sm:max-h-[3.75rem] sm:gap-x-1.5";

const CLASE_LINK =
  "inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 sm:text-sm";

const CLASE_ACTUAL =
  "inline-flex min-w-0 items-center gap-1.5 border-b-2 border-[#0066cc] pb-0.5 text-xs font-semibold text-[#0066cc] dark:border-blue-400 dark:text-blue-400 sm:text-sm";

function ItemCrumb({
  crumb,
  indice,
  esActual,
  inerte = false,
}: {
  crumb: Crumb;
  indice: number;
  esActual: boolean;
  inerte?: boolean;
}) {
  const contenido = esActual ? (
    <span className="min-w-0 break-words">{crumb.label}</span>
  ) : (
    crumb.label
  );

  return (
    <li
      className={cn(
        "flex items-center gap-1 sm:gap-1.5",
        esActual ? "min-w-0 max-w-full" : "shrink-0",
      )}
    >
      {indice > 0 ? (
        <ChevronRight
          className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
          aria-hidden
        />
      ) : null}
      {esActual || inerte ? (
        <span
          aria-current={esActual && !inerte ? "page" : undefined}
          className={esActual ? CLASE_ACTUAL : CLASE_LINK}
        >
          {contenido}
        </span>
      ) : (
        <Link href={crumb.href} className={CLASE_LINK}>
          {contenido}
        </Link>
      )}
    </li>
  );
}

function MenuOcultos({ crumbs }: { crumbs: Crumb[] }) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = (evento: PointerEvent) => {
      const nodo = evento.target;
      if (nodo instanceof Node && ref.current?.contains(nodo)) return;
      setAbierto(false);
    };
    document.addEventListener("pointerdown", cerrar);
    return () => document.removeEventListener("pointerdown", cerrar);
  }, [abierto]);

  return (
    <li
      ref={ref}
      className="relative flex shrink-0 items-center gap-1 sm:gap-1.5"
    >
      <ChevronRight
        className="h-3.5 w-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
        aria-hidden
      />
      <button
        type="button"
        aria-expanded={abierto}
        aria-label="Mostrar secciones ocultas"
        onClick={() => setAbierto((valor) => !valor)}
        className="cursor-pointer rounded-md px-1 text-xs font-semibold text-zinc-500 hover:bg-zinc-200/80 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-200 sm:text-sm"
      >
        …
      </button>
      {abierto ? (
        <ul className="absolute left-0 top-full z-[230] mt-1 min-w-[12rem] rounded-2xl border border-zinc-200 bg-zinc-50 p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-800">
          {crumbs.map((crumb) => (
              <li key={`${crumb.href}-${crumb.label}`}>
                <Link
                  href={crumb.href}
                  onClick={() => setAbierto(false)}
                  className="flex cursor-pointer items-center rounded-xl px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700 sm:text-sm"
                >
                  {crumb.label}
                </Link>
              </li>
            ))}
        </ul>
      ) : null}
    </li>
  );
}

export default function AppBreadcrumb({ homeHref }: { homeHref: string }) {
  const pathname = usePathname();
  const crumbs = useMemo(
    () => crumbsDesdeRuta(pathname, homeHref),
    [pathname, homeHref],
  );
  const navRef = useRef<HTMLElement>(null);
  const medidaRef = useRef<HTMLOListElement>(null);
  const [colapsado, setColapsado] = useState(false);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const medida = medidaRef.current;
    if (!nav || !medida) return;

    const actualizar = () => {
      const desborda = medida.scrollHeight > medida.clientHeight + 1;
      setColapsado(desborda && crumbs.length > 2);
    };

    actualizar();
    const observer = new ResizeObserver(actualizar);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [crumbs]);

  const inicio = crumbs[0];
  const actual = crumbs[crumbs.length - 1];
  const ocultos = crumbs.slice(1, -1);
  const mostrarColapsado = colapsado && inicio && actual && ocultos.length > 0;

  return (
    <nav ref={navRef} aria-label="Ruta de navegación" className="relative w-full min-w-0">
      <ol
        ref={medidaRef}
        aria-hidden
        className={cn(CLASE_OL, "pointer-events-none invisible absolute inset-x-0 top-0")}
      >
        {crumbs.map((crumb, indice) => (
          <ItemCrumb
            key={`${crumb.href}-${crumb.label}-medida`}
            crumb={crumb}
            indice={indice}
            esActual={indice === crumbs.length - 1}
            inerte
          />
        ))}
      </ol>
      <ol className={CLASE_OL}>
        {mostrarColapsado ? (
          <>
            <ItemCrumb crumb={inicio} indice={0} esActual={false} />
            <MenuOcultos crumbs={ocultos} />
            <ItemCrumb crumb={actual} indice={2} esActual />
          </>
        ) : (
          crumbs.map((crumb, indice) => (
            <ItemCrumb
              key={`${crumb.href}-${crumb.label}`}
              crumb={crumb}
              indice={indice}
              esActual={indice === crumbs.length - 1}
            />
          ))
        )}
      </ol>
    </nav>
  );
}
