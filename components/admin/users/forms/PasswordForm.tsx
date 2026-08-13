"use client";

import { useState } from "react";
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
};

const REQUISITOS = [
  { id: "longitud", label: "8 car.", cumple: (v: string) => v.length >= 8 },
  { id: "mayus", label: "A-Z", cumple: (v: string) => /[A-Z]/.test(v) },
  { id: "minus", label: "a-z", cumple: (v: string) => /[a-z]/.test(v) },
  { id: "numero", label: "123", cumple: (v: string) => /\d/.test(v) },
  { id: "simbolo", label: "@#$", cumple: (v: string) => /[^A-Za-z0-9]/.test(v) },
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
}: Props) {
  const [mostrarPass, setMostrarPass] = useState(false);
  const [mostrarConfirm, setMostrarConfirm] = useState(false);

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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Label htmlFor="password" className={`mb-1.5 block ${etiqueta}`}>
          Contraseña
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={mostrarPass ? "text" : "password"}
            name="password"
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

        <div className="mt-2.5">
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
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {requisitos.map((r) => (
              <span
                key={r.id}
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                  r.ok
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-400 dark:text-zinc-500"
                }`}
              >
                {r.ok ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0" />
                )}
                {r.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="confirmar" className={`mb-1.5 block ${etiqueta}`}>
          Confirmar contraseña
        </Label>
        <div className="relative">
          <Input
            id="confirmar"
            type={mostrarConfirm ? "text" : "password"}
            name="confirmar"
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
        {confirmar && !contraseñasCoinciden ? (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            Las contraseñas no coinciden.
          </p>
        ) : null}
      </div>
    </div>
  );
}
