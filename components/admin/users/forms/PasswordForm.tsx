"use client";

import { useEffect, useRef, useState } from "react";
import { Typewriter } from "react-simple-typewriter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";

type Props = {
  password: string;
  confirmar: string;
  onPasswordChange: (val: string) => void;
  onConfirmarChange: (val: string) => void;
  inputClassName?: string;
  labelClassName?: string;
  passwordLabel?: string;
  confirmarLabel?: string;
  idPrefix?: string;
  passwordName?: string;
  confirmarName?: string;
  passwordAutoComplete?: string;
  confirmarAutoComplete?: string;
};

const REQUISITOS = [
  {
    id: "mayus",
    label: "A-Z",
    descripcion: "Al menos una mayúscula",
    cumple: (v: string) => /[A-Z]/.test(v),
  },
  {
    id: "minus",
    label: "a-z",
    descripcion: "Al menos una minúscula",
    cumple: (v: string) => /[a-z]/.test(v),
  },
  {
    id: "numero",
    label: "123",
    descripcion: "Al menos un número",
    cumple: (v: string) => /\d/.test(v),
  },
  {
    id: "simbolo",
    label: "@#$",
    descripcion: "Al menos un símbolo",
    cumple: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
  {
    id: "longitud",
    label: "8 car.",
    descripcion: "Al menos 8 caracteres",
    cumple: (v: string) => v.length >= 8,
  },
] as const;

function nivelFortaleza(cumplidos: number) {
  if (cumplidos <= 0) {
    return {
      texto: "",
      barra: "bg-zinc-200 dark:bg-zinc-700",
      textoClase: "text-muted-foreground",
      borde: "border-zinc-300 dark:border-zinc-700",
    };
  }
  if (cumplidos <= 2) {
    return {
      texto: "Débil",
      barra: "bg-red-500",
      textoClase: "text-red-600 dark:text-red-400",
      borde: "border-red-500",
    };
  }
  if (cumplidos === 3) {
    return {
      texto: "Regular",
      barra: "bg-amber-500",
      textoClase: "text-amber-600 dark:text-amber-400",
      borde: "border-amber-500",
    };
  }
  if (cumplidos === 4) {
    return {
      texto: "Buena",
      barra: "bg-lime-500",
      textoClase: "text-lime-600 dark:text-lime-400",
      borde: "border-lime-500",
    };
  }
  return {
    texto: "Fuerte",
    barra: "bg-emerald-500",
    textoClase: "text-emerald-600 dark:text-emerald-400",
    borde: "border-emerald-600 dark:border-emerald-400",
  };
}

export default function PasswordSection({
  password,
  confirmar,
  onPasswordChange,
  onConfirmarChange,
  inputClassName,
  labelClassName,
  passwordLabel = "Contraseña",
  confirmarLabel = "Confirmar contraseña",
  idPrefix = "",
  passwordName = "password",
  confirmarName = "confirmar",
  passwordAutoComplete,
  confirmarAutoComplete,
}: Props) {
  const idPassword = `${idPrefix}password`;
  const idConfirmar = `${idPrefix}confirmar`;
  const [mostrarPass, setMostrarPass] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);
  const [requisitoActivo, setRequisitoActivo] = useState<string | null>(null);
  const [requisitoFijado, setRequisitoFijado] = useState(false);
  const [flechaLeft, setFlechaLeft] = useState(0);
  const [faltanteConDelay, setFaltanteConDelay] = useState<
    (typeof REQUISITOS)[number] | undefined
  >(undefined);
  const [desajusteConDelay, setDesajusteConDelay] = useState(false);
  const barraRef = useRef<HTMLDivElement>(null);
  const requisitosRef = useRef<HTMLDivElement>(null);
  const activoRef = useRef<string | null>(null);
  const fijadoRef = useRef(false);

  const contraseñasCoinciden = password === confirmar;
  const requisitos = REQUISITOS.map((r) => ({
    ...r,
    ok: r.cumple(password),
  }));
  const cumplidos = requisitos.filter((r) => r.ok).length;
  const nivel = nivelFortaleza(cumplidos);
  const porcentaje = (cumplidos / REQUISITOS.length) * 100;
  const etiqueta = labelClassName ?? "mb-1.5 block text-sm";
  const campoPass =
    inputClassName ?? `h-12 border-2 pr-11 text-sm ${nivel.borde}`;
  const campoConfirm =
    inputClassName ??
    `h-12 border-2 pr-11 text-sm ${
      confirmar && !contraseñasCoinciden
        ? "border-red-500"
        : confirmar && contraseñasCoinciden
          ? "border-emerald-600 dark:border-emerald-400"
          : "border-zinc-300 dark:border-zinc-700"
    }`;
  const requisitoVisible = requisitos.find((r) => r.id === requisitoActivo);
  const hayIntento = password.length > 0;
  const primerFaltante = hayIntento
    ? requisitos.find((r) => !r.ok)
    : undefined;
  const primerFaltanteId = primerFaltante?.id;

  useEffect(() => {
    if (!primerFaltanteId) {
      setFaltanteConDelay(undefined);
      return;
    }
    const t = setTimeout(() => {
      setFaltanteConDelay(REQUISITOS.find((r) => r.id === primerFaltanteId));
    }, 500);
    return () => clearTimeout(t);
  }, [primerFaltanteId]);

  useEffect(() => {
    if (!confirmar || contraseñasCoinciden) {
      setDesajusteConDelay(false);
      return;
    }
    const t = setTimeout(() => setDesajusteConDelay(true), 500);
    return () => clearTimeout(t);
  }, [confirmar, contraseñasCoinciden]);

  const marcarRequisito = (id: string, el: HTMLElement) => {
    const barra = barraRef.current;
    if (!barra) return;
    const barraRect = barra.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setFlechaLeft(elRect.left - barraRect.left + elRect.width / 2);
    activoRef.current = id;
    setRequisitoActivo(id);
  };

  const cerrarRequisito = () => {
    activoRef.current = null;
    fijadoRef.current = false;
    setRequisitoActivo(null);
    setRequisitoFijado(false);
  };

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!activoRef.current) return;
      const nodo = e.target;
      if (nodo instanceof Node && requisitosRef.current?.contains(nodo)) {
        return;
      }
      cerrarRequisito();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label htmlFor={idPassword} className={`mb-1.5 block ${etiqueta}`}>
          {passwordLabel}
        </Label>
        <div className="relative">
          <Input
            id={idPassword}
            type={mostrarPass ? "text" : "password"}
            name={passwordName}
            autoComplete={passwordAutoComplete}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required
            className={campoPass}
          />
          <button
            type="button"
            onClick={() => setMostrarPass(!mostrarPass)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-white"
            aria-label="Mostrar u ocultar contraseña"
          >
            {mostrarPass ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <div className="relative mt-2.5" ref={barraRef}>
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium">
            <span className="text-zinc-600 dark:text-zinc-400">
              Fortaleza de contraseña
            </span>
            <span className={nivel.textoClase}>{nivel.texto}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${nivel.barra}`}
              style={{ width: `${porcentaje}%` }}
            />
          </div>
          <div
            ref={requisitosRef}
            className="relative mt-3"
            onMouseLeave={() => {
              if (!fijadoRef.current) {
                activoRef.current = null;
                setRequisitoActivo(null);
              }
            }}
          >
            {requisitoVisible ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-full z-20 mb-2">
                <div
                  className={`relative min-h-[2.25rem] rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs font-medium shadow-sm dark:border-zinc-600 dark:bg-zinc-900 ${
                    requisitoVisible.ok
                      ? "text-emerald-600 dark:text-emerald-400"
                      : hayIntento
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  <Typewriter
                    key={requisitoVisible.id}
                    words={[requisitoVisible.descripcion]}
                    loop={1}
                    cursor={false}
                    typeSpeed={38}
                    deleteSpeed={0}
                  />
                  <span
                    className="absolute top-full left-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-b border-zinc-200 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900"
                    style={{ left: flechaLeft }}
                  />
                </div>
              </div>
            ) : null}
            <div className="flex w-full items-center justify-evenly">
              {requisitos.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onMouseEnter={(e) => {
                    marcarRequisito(r.id, e.currentTarget);
                  }}
                  onFocus={(e) => {
                    marcarRequisito(r.id, e.currentTarget);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    fijadoRef.current = true;
                    setRequisitoFijado(true);
                    marcarRequisito(r.id, e.currentTarget);
                  }}
                  className={`inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium ${
                    r.ok
                      ? "text-emerald-600 dark:text-emerald-400"
                      : hayIntento
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {r.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0" />
                  )}
                  {r.label}
                </button>
              ))}
            </div>
            {faltanteConDelay ? (
              <p className="mt-2 min-h-[1rem] text-center text-[11px] font-medium text-red-600 dark:text-red-400">
                <Typewriter
                  key={faltanteConDelay.id}
                  words={[faltanteConDelay.descripcion]}
                  loop={1}
                  cursor={false}
                  typeSpeed={38}
                  deleteSpeed={0}
                />
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor={idConfirmar} className={`mb-1.5 block ${etiqueta}`}>
          {confirmarLabel}
        </Label>
        <div className="relative">
          <Input
            id={idConfirmar}
            type={mostrarConfirm ? "text" : "password"}
            name={confirmarName}
            autoComplete={confirmarAutoComplete}
            value={confirmar}
            onChange={(e) => onConfirmarChange(e.target.value)}
            required
            className={`${campoConfirm}${
              inputClassName && confirmar && !contraseñasCoinciden
                ? " border-red-500"
                : ""
            }`}
          />
          <button
            type="button"
            onClick={() => setMostrarConfirm(!mostrarConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-white"
            aria-label="Mostrar u ocultar confirmación"
          >
            {mostrarConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {desajusteConDelay ? (
          <p className="mt-1.5 min-h-[1.25rem] text-sm text-red-600 dark:text-red-400">
            <Typewriter
              key="contrasenas-no-coinciden"
              words={["Las contraseñas no coinciden."]}
              loop={1}
              cursor={false}
              typeSpeed={38}
              deleteSpeed={0}
            />
          </p>
        ) : null}
      </div>
    </div>
  );
}
