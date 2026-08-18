"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronsLeft, UserPlus } from "lucide-react";
import Swal from "sweetalert2";
import { signUpAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import PasswordSection from "@/components/admin/users/forms/PasswordForm";
import { siguienteUsuarioDisponible } from "@/components/admin/sign-up/lib/actions";
import { createClient } from "@/utils/supabase/client";
import {
  correoDesdeUsuario,
  extraerUsuario,
  usuarioBaseDesdeNombre,
} from "@/utils/auth/usuarioCorreo";

const inputClass =
  "h-12 rounded-xl border-zinc-300 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-[#0066cc] focus-visible:ring-offset-0 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder:text-zinc-500 dark:focus-visible:ring-blue-400 [&:-webkit-autofill]:[-webkit-text-fill-color:#18181b] [&:-webkit-autofill]:shadow-[0_0_0_1000px_#fff_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white] dark:[&:-webkit-autofill]:shadow-[0_0_0_1000px_#18181b_inset]";

const labelClass =
  "block text-sm font-semibold text-zinc-800 dark:text-white";

export function SignupForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const [nombre, setNombre] = useState("");
  const [nombreDebounced, setNombreDebounced] = useState("");
  const [usuario, setUsuario] = useState("");
  const [usuarioManual, setUsuarioManual] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [rol, setRol] = useState<string>("");
  const [rolesDisponibles, setRolesDisponibles] = useState<
    { id: string; nombre: string }[]
  >([]);

  const email = correoDesdeUsuario(usuario);
  const usuarioBase = usuarioBaseDesdeNombre(nombreDebounced);
  const { data: usuarioSugerido } = useQuery({
    queryKey: ["usuario-sugerido", usuarioBase],
    queryFn: () => siguienteUsuarioDisponible(usuarioBase),
    enabled: Boolean(usuarioBase) && !usuarioManual,
    staleTime: 0,
    gcTime: 0,
  });
  const cumpleRequisitos =
    /^.*(?=.{8,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W]).*$/.test(password);
  const contraseñasCoinciden = password === confirmar;
  const camposCompletos = nombre && email && password && confirmar && rol;
  const formularioValido = Boolean(
    camposCompletos && contraseñasCoinciden && cumpleRequisitos,
  );

  function traducirError(mensaje: string) {
    const errores: Record<string, string> = {
      "email rate limit exceeded": "Demasiados intentos. Espere unos minutos.",
      "user already registered": "El usuario ya está registrado.",
      "invalid login credentials": "Credenciales incorrectas.",
      "signup requires a valid password": "Contraseña inválida.",
      "user not found": "Usuario no encontrado.",
    };
    return errores[mensaje.toLowerCase()] || mensaje;
  }

  useEffect(() => {
    const t = setTimeout(() => setNombreDebounced(nombre), 350);
    return () => clearTimeout(t);
  }, [nombre]);

  useEffect(() => {
    if (!usuarioManual && usuarioSugerido) {
      setUsuario(usuarioSugerido);
    }
    if (!usuarioManual && !usuarioBase) {
      setUsuario("");
    }
  }, [usuarioSugerido, usuarioManual, usuarioBase]);

  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Error al crear usuario",
        text: traducirError(decodeURIComponent(error)),
        confirmButtonColor: "#d33",
      });
    }

    if (success) {
      Swal.fire({
        icon: "success",
        title: "Usuario creado",
        text: decodeURIComponent(success),
        confirmButtonColor: "#3085d6",
      });
    }
  }, [error, success]);

  useEffect(() => {
    const fetchRoles = async () => {
      const supabase = createClient();
      const { data, error: errorRoles } = await supabase
        .from("roles")
        .select("id, nombre");
      if (errorRoles) {
        return;
      }
      setRolesDisponibles(data);
    };
    void fetchRoles();
  }, []);

  return (
    <div className="flex w-full justify-center px-4 pb-6 pt-1 sm:pb-8">
      <div className="flex w-full max-w-[400px] flex-col">
        <Link
          href="/sigem/admin/users"
          className="mb-2 inline-flex cursor-pointer items-center gap-1.5 self-start text-sm font-semibold text-[#0066cc] transition-opacity hover:opacity-80 dark:text-blue-400"
        >
          <ChevronsLeft className="h-4 w-4 shrink-0" strokeWidth={2.5} />
          Volver
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative w-full rounded-3xl border border-zinc-200 bg-zinc-50 px-7 pb-8 pt-4 shadow-xl transition-colors dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-black/50 sm:px-8 sm:pb-9 sm:pt-5"
        >
          <h1 className="mb-6 text-center text-[1.65rem] font-bold leading-tight tracking-tight text-[#0066cc] dark:text-blue-400 sm:text-[1.85rem]">
          Nuevo Usuario
        </h1>

        <CintilloInstitucional className="mb-6 rounded-full" />

        <form className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="nombre" className={labelClass}>
              Nombre
            </Label>
            <Input
              id="nombre"
              name="nombre"
              placeholder="Nombres y apellidos"
              required
              value={nombre}
              onChange={(e) => {
                const valor = e.target.value;
                setNombre(valor);
                if (!valor.trim()) {
                  setUsuarioManual(false);
                  setUsuario("");
                }
              }}
              className={inputClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className={labelClass}>
              Usuario
            </Label>
            <input type="hidden" name="email" value={email} />
            <Input
              id="email"
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Tu usuario"
              required
              value={usuario}
              onChange={(e) => {
                setUsuarioManual(true);
                setUsuario(extraerUsuario(e.target.value));
              }}
              onKeyDown={(e) => {
                if (e.key === "@" || e.key === " ") {
                  e.preventDefault();
                }
              }}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rol" className={labelClass}>
              Rol
            </Label>
            <select
              id="rol"
              name="rol"
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              required
              className={`${inputClass} w-full cursor-pointer appearance-none`}
            >
              <option value="">Seleccione un rol</option>
              {rolesDisponibles.map((rolItem) => (
                <option key={rolItem.id} value={rolItem.id}>
                  {rolItem.nombre}
                </option>
              ))}
            </select>
          </div>

          <PasswordSection
            password={password}
            confirmar={confirmar}
            onPasswordChange={setPassword}
            onConfirmarChange={setConfirmar}
            inputClassName={`${inputClass} pr-11`}
            labelClassName={labelClass}
          />

          <SubmitButton
            formAction={signUpAction}
            pendingText="Creando..."
            disabled={!formularioValido}
            className="mt-1 h-12 w-full cursor-pointer rounded-xl bg-zinc-200 text-base font-semibold text-zinc-900 hover:bg-zinc-300 disabled:cursor-not-allowed dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
          >
            <UserPlus size={18} strokeWidth={2} />
            Crear Usuario
          </SubmitButton>
        </form>
        </motion.div>
      </div>
    </div>
  );
}
