"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AtSign, Check, Contact, Copy, KeyRound, Link2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { fetchUsuario } from "@/lib/usuarios/acciones";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import {
  correoDesdeUsuario,
  extraerUsuario,
} from "@/utils/auth/usuarioCorreo";
import useUserData from "@/hooks/sesion/useUserData";
import {
  MODAL_FIELD_CLASS,
  ModalInput,
  ModalSelect,
} from "@/components/ui/general-modal";
import { CampoFormulario, CAMPO_SUBMIT_BTN_CLASS } from "./CampoFormulario";
import { CintilloInstitucional } from "@/components/ui/cintillo-institucional";
import PasswordSection from "./PasswordForm";
import InfoForm from "./InfoForm";
import { obtenerInfoUsuario } from "./action";
import {
  cambiarContrasenaAdmin,
  deshabilitarLinkRestablecer,
  generarLinkRestablecer,
  obtenerLinkActivo,
} from "../lib/actions";

interface Rol {
  id: string;
  nombre: string;
}

type TabState = "informacion" | "personal";

interface UserFormProps {
  id: string;
  onSuccess: () => void;
  onCancel: () => void;
  rolUsuarioActual: string;
  botonEliminar?: React.ReactNode;
}

const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio."),
  usuario: z.string().min(1, "El usuario es obligatorio."),
  rol: z.string().min(1, "Debe seleccionar un rol."),
  activo: z.boolean(),
});

function sanitizarUsuario(valor: string) {
  return extraerUsuario(valor).replace(/[^a-zA-Z0-9]/g, "");
}

const REQUISITO =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const LINK_KEY = (userId: string) => ["password-reset-link", userId] as const;

function formatoRestante(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${segundos.toString().padStart(2, "0")}`;
}

function BarraEsqueleto({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-700",
        className,
      )}
    />
  );
}

function UsuarioFormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-busy aria-live="polite">
      <BarraEsqueleto className="h-10 w-full rounded-lg" />
      <div className="flex flex-col gap-5">
        <div>
          <BarraEsqueleto className="mb-2 h-4 w-20" />
          <BarraEsqueleto className="h-12 w-full" />
        </div>
        <div>
          <BarraEsqueleto className="mb-2 h-4 w-16" />
          <BarraEsqueleto className="h-12 w-full" />
        </div>
        <div>
          <BarraEsqueleto className="mb-2 h-4 w-12" />
          <BarraEsqueleto className="h-12 w-full" />
        </div>
        <div className="flex gap-6">
          <BarraEsqueleto className="h-6 w-28" />
          <BarraEsqueleto className="h-6 w-28" />
        </div>
        <BarraEsqueleto className="h-12 w-full rounded-2xl" />
        <BarraEsqueleto className="h-12 w-full" />
      </div>
    </div>
  );
}

function SeparadorSeccion({ titulo }: { titulo: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-2 w-2 shrink-0 rounded-full bg-[#0066cc] dark:bg-blue-400" />
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-[#0066cc] dark:text-blue-400">
        {titulo}
      </span>
      <span className="h-px min-w-0 flex-1 bg-[#0066cc]/40 dark:bg-blue-400/40" />
    </div>
  );
}

const USUARIO_TABS: { id: TabState; label: string }[] = [
  { id: "informacion", label: "Usuario" },
  { id: "personal", label: "Información Personal" },
];

const USUARIO_TAB_WRAP =
  "relative grid w-full grid-cols-2 gap-2 pt-2 pb-2.5";

const USUARIO_TAB_BTN =
  "inline-flex h-10 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors";

const USUARIO_TAB_ACTIVA =
  "bg-blue-100 text-[#0066cc] dark:bg-blue-950/50 dark:text-blue-400";

const USUARIO_TAB_INACTIVA =
  "bg-blue-50 text-[#0066cc]/85 hover:bg-blue-100/90 dark:bg-blue-950/30 dark:text-blue-400/90 dark:hover:bg-blue-950/45";

const USUARIO_TAB_INDICATOR =
  "pointer-events-none absolute bottom-0 z-20 h-1 rounded-sm bg-[#0066cc] transition-[left,width] duration-300 ease-out dark:bg-blue-400";

function UsuarioFormTabBar({
  active,
  onChange,
}: {
  active: TabState;
  onChange: (tab: TabState) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<TabState, HTMLButtonElement>());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const bar = barRef.current;
    const tab = tabRefs.current.get(active);
    if (!bar || !tab) return;
    const barRect = bar.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    setIndicator({
      left: tabRect.left - barRect.left,
      width: tabRect.width,
    });
  }, [active]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useLayoutEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const observer = new ResizeObserver(() => updateIndicator());
    observer.observe(bar);
    for (const tab of tabRefs.current.values()) {
      observer.observe(tab);
    }
    return () => observer.disconnect();
  }, [updateIndicator, active]);

  return (
    <div ref={barRef} className={USUARIO_TAB_WRAP}>
      {USUARIO_TABS.map((tab) => {
        const activa = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              USUARIO_TAB_BTN,
              activa ? USUARIO_TAB_ACTIVA : USUARIO_TAB_INACTIVA,
            )}
          >
            {tab.label}
          </button>
        );
      })}
      <span
        aria-hidden
        className={USUARIO_TAB_INDICATOR}
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />
    </div>
  );
}

function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export default function UserForm({
  id,
  onSuccess,
  onCancel,
  rolUsuarioActual,
  botonEliminar,
}: UserFormProps) {
  const [activeTab, setActiveTab] = useState<TabState>("informacion");
  const [nombre, setNombre] = useState("");
  const [usuarioLogin, setUsuarioLogin] = useState("");
  const [rol, setRol] = useState<string | null>(null);
  const [activo, setActivo] = useState(true);
  const [esJefe, setEsJefe] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [acordeonPassword, setAcordeonPassword] = useState(false);
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [mensajeLink, setMensajeLink] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());
  const [copiado, setCopiado] = useState(false);
  const queryClient = useQueryClient();
  const linkKey = LINK_KEY(id);
  const { userId: sesionUserId } = useUserData();
  const esPropio = Boolean(sesionUserId) && sesionUserId === id;
  const [errors, setErrors] = useState<z.ZodIssue[]>([]);
  const [original, setOriginal] = useState({
    nombre: "",
    email: "",
    rol: "",
    activo: true,
    esJefe: false,
  });

  const { data: usuario, error, isPending: cargandoUsuario } = useQuery({
    queryKey: ["usuario-modal", id],
    queryFn: () => fetchUsuario(id),
    enabled: Boolean(id),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: rolesDisponibles = [], isPending: cargandoRoles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error: errorRoles } = await supabase
        .from("roles")
        .select("id, nombre");
      if (errorRoles) throw errorRoles;
      return data as Rol[];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: infoPersonal, isPending: cargandoInfo } = useQuery({
    queryKey: ["info_usuario", id],
    queryFn: () => obtenerInfoUsuario(id),
    enabled: Boolean(id),
    staleTime: 1000 * 60 * 6,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: expiresAt, isPending: cargandoLink } = useQuery({
    queryKey: linkKey,
    queryFn: async () => {
      const result = await obtenerLinkActivo({ userId: id });
      if (!result.ok) throw new Error(result.message);
      return result.expiresAt;
    },
    enabled: Boolean(id),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const generarLinkMut = useMutation({
    mutationFn: () => generarLinkRestablecer({ userId: id }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setMensajeLink(result.mensaje);
      queryClient.setQueryData(linkKey, result.expiresAt);
    },
  });

  const anularLinkMut = useMutation({
    mutationFn: () => deshabilitarLinkRestablecer({ userId: id }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setMensajeLink(null);
      queryClient.setQueryData(linkKey, null);
    },
  });

  const rolesFiltrados = useMemo(() => {
    if (rolUsuarioActual === "SUPER") return rolesDisponibles;
    return rolesDisponibles.filter((r) => {
      const nombreRol = r.nombre.trim().toUpperCase();
      return !nombreRol.includes("SUPER") && !nombreRol.includes("AFILIA");
    });
  }, [rolesDisponibles, rolUsuarioActual]);

  const hayCambios =
    nombre !== original.nombre ||
    correoDesdeUsuario(usuarioLogin) !== original.email ||
    rol !== original.rol ||
    activo !== original.activo ||
    esJefe !== original.esJefe;

  const passwordValida =
    REQUISITO.test(password) && password === confirmar && password.length > 0;

  const restanteMs = expiresAt
    ? Math.max(0, new Date(expiresAt).getTime() - ahora)
    : 0;
  const linkActivo = Boolean(expiresAt) && restanteMs > 0;
  const generandoLink = generarLinkMut.isPending || anularLinkMut.isPending;
  const cargandoFormulario =
    cargandoUsuario || cargandoRoles || cargandoInfo || cargandoLink;

  useEffect(() => {
    if (!linkActivo) return;
    setAhora(Date.now());
    const timer = window.setInterval(() => setAhora(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [linkActivo, expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;
    if (new Date(expiresAt).getTime() > Date.now()) return;
    setMensajeLink(null);
    queryClient.setQueryData(linkKey, null);
  }, [ahora, expiresAt, linkKey, queryClient]);

  useLayoutEffect(() => {
    if (!usuario || rolesDisponibles.length === 0) return;
    const rolEncontrado = rolesDisponibles.find((r) => r.nombre === usuario.rol);
    const rolId = rolEncontrado ? rolEncontrado.id : null;
    setNombre(usuario.nombre || "");
    setUsuarioLogin(extraerUsuario(usuario.email || ""));
    setRol(rolId);
    setActivo(usuario.activo);
    setEsJefe(usuario.esjefe || false);
    setOriginal({
      nombre: usuario.nombre || "",
      email: usuario.email || "",
      rol: rolId || "",
      activo: usuario.activo,
      esJefe: usuario.esjefe || false,
    });
  }, [usuario, rolesDisponibles]);

  useLayoutEffect(() => {
    const tel = infoPersonal?.telefono
      ? String(infoPersonal.telefono).replace(/\D/g, "").slice(0, 8)
      : "";
    setTelefono(tel);
  }, [infoPersonal]);

  const validateForm = () => {
    const result = formSchema.safeParse({
      nombre,
      usuario: usuarioLogin,
      rol,
      activo,
    });
    if (!result.success) {
      setErrors(result.error.issues);
      return false;
    }
    setErrors([]);
    return true;
  };

  const errorDe = (campo: string) =>
    errors.find((err) => err.path[0] === campo)?.message;

  const guardarCambios = async () => {
    if (!id) {
      toast.error("ID de usuario no proporcionado.");
      return;
    }
    if (!hayCambios) {
      toast.warn("No hiciste ninguna modificación.");
      return;
    }
    if (esPropio && !activo) {
      toast.warn("No puede inactivarse a sí mismo.");
      return;
    }
    const result = formSchema.safeParse({
      nombre,
      usuario: usuarioLogin,
      rol,
      activo,
    });
    if (!result.success) {
      setErrors(result.error.issues);
      toast.error(
        result.error.issues[0]?.message || "Revise los datos del formulario.",
      );
      return;
    }
    setErrors([]);

    setCargando(true);
    const res = await fetch("/api/users/editar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        email: correoDesdeUsuario(usuarioLogin),
        nombre,
        rol,
        activo,
        esJefe,
      }),
    });
    const json = await res.json();
    setCargando(false);

    if (!res.ok) {
      toast.error(json.error || "No se pudo guardar.");
      return;
    }

    toast.success("El usuario fue guardado con éxito.");
    onSuccess();
  };

  async function obtenerMensajeLink() {
    if (mensajeLink && linkActivo) return mensajeLink;
    if (!linkActivo) {
      toast.warn("Genere el enlace primero.");
      return null;
    }
    const result = await generarLinkMut.mutateAsync();
    if (!result.ok) return null;
    return result.mensaje;
  }

  async function alternarLink() {
    if (generandoLink) return;
    if (linkActivo) {
      const result = await anularLinkMut.mutateAsync();
      if (result.ok) toast.success("Enlace eliminado.");
      return;
    }
    const result = await generarLinkMut.mutateAsync();
    if (result.ok) toast.success("Enlace generado. Vence en 5 minutos.");
  }

  async function enviarWhatsApp() {
    const tel = telefono.replace(/\D/g, "").slice(0, 8);
    if (tel.length !== 8) {
      toast.warn("Ingrese un número de teléfono de 8 dígitos.");
      return;
    }
    const mensaje = await obtenerMensajeLink();
    if (!mensaje) return;
    window.open(
      `https://wa.me/502${tel}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function copiarMensaje() {
    const mensaje = await obtenerMensajeLink();
    if (!mensaje) return;
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      toast.success("Mensaje copiado.");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar.");
    }
  }

  async function guardarPassword() {
    if (!passwordValida) {
      toast.warn("Revise la nueva contraseña.");
      return;
    }
    setGuardandoPassword(true);
    const result = await cambiarContrasenaAdmin({
      userId: id,
      nueva: password,
      confirmar,
    });
    setGuardandoPassword(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Contraseña actualizada.");
    setPassword("");
    setConfirmar("");
    setAcordeonPassword(false);
  }

  const telefonoMostrado = () => {
    const clean = telefono.replace(/\D/g, "").slice(0, 8);
    if (clean.length <= 4) return clean;
    return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  };

  if (!id) {
    return (
      <p className="text-center text-sm text-red-600">ID no proporcionado.</p>
    );
  }
  if (cargandoFormulario) {
    return <UsuarioFormSkeleton />;
  }
  if (error) {
    onCancel();
    return null;
  }
  if (!usuario) return null;

  return (
    <div className="flex flex-col gap-5">
      <CintilloInstitucional className="rounded-full" />

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <UsuarioFormTabBar active={activeTab} onChange={setActiveTab} />
        </div>
        {botonEliminar}
      </div>

      <div
        className={
          activeTab === "informacion" ? "flex flex-col gap-3" : "hidden"
        }
      >
            <CampoFormulario
              icon={Contact}
              label="Nombre"
              error={errorDe("nombre")}
            >
              <ModalInput
                id="nombre"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  validateForm();
                }}
                className={errorDe("nombre") ? "border-red-400" : undefined}
              />
            </CampoFormulario>

            <CampoFormulario
              icon={AtSign}
              label="Usuario"
              error={errorDe("usuario")}
            >
              <ModalInput
                id="usuario"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={usuarioLogin}
                onChange={(e) => {
                  setUsuarioLogin(sanitizarUsuario(e.target.value));
                  validateForm();
                }}
                onKeyDown={(e) => {
                  if (e.key === "@" || e.key === " ") {
                    e.preventDefault();
                  }
                }}
                className={errorDe("usuario") ? "border-red-400" : undefined}
              />
            </CampoFormulario>

            <CampoFormulario icon={ShieldCheck} label="Rol" error={errorDe("rol")}>
              <ModalSelect
                id="rol"
                value={rol || ""}
                onChange={(e) => {
                  setRol(e.target.value);
                  validateForm();
                }}
                className={errorDe("rol") ? "border-red-400" : undefined}
              >
                <option value="">Seleccione un rol</option>
                {rolesFiltrados.map((rolItem) => (
                  <option key={rolItem.id} value={rolItem.id}>
                    {rolItem.nombre}
                  </option>
                ))}
              </ModalSelect>
            </CampoFormulario>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setActivo(true)}
                  className={`h-10 cursor-pointer rounded-lg text-xs font-semibold transition-colors sm:text-sm ${
                    activo
                      ? "bg-white text-emerald-600 shadow-sm dark:bg-zinc-700 dark:text-emerald-400"
                      : "text-muted-foreground hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  Activo
                </button>
                <button
                  type="button"
                  onClick={() => setActivo(false)}
                  disabled={esPropio}
                  title={
                    esPropio
                      ? "No puede inactivarse a sí mismo."
                      : undefined
                  }
                  className={`h-10 rounded-lg text-xs font-semibold transition-colors sm:text-sm ${
                    esPropio
                      ? "cursor-not-allowed opacity-40"
                      : "cursor-pointer"
                  } ${
                    !activo
                      ? "bg-white text-red-600 shadow-sm dark:bg-zinc-700 dark:text-red-400"
                      : "text-muted-foreground hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  Inactivo
                </button>
              </div>
              <div className="grid grid-cols-2 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setEsJefe(true)}
                  className={`h-10 cursor-pointer rounded-lg text-xs font-semibold transition-colors sm:text-sm ${
                    esJefe
                      ? "bg-white text-violet-600 shadow-sm dark:bg-zinc-700 dark:text-violet-400"
                      : "text-muted-foreground hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  Es jefe
                </button>
                <button
                  type="button"
                  onClick={() => setEsJefe(false)}
                  className={`h-10 cursor-pointer rounded-lg text-xs font-semibold transition-colors sm:text-sm ${
                    !esJefe
                      ? "bg-white text-[#0066cc] shadow-sm dark:bg-zinc-700 dark:text-blue-400"
                      : "text-muted-foreground hover:text-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  No es jefe
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/40">
              <button
                type="button"
                onClick={() => setAcordeonPassword((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-[#0066cc] dark:text-blue-400">
                  Cambiar contraseña
                </span>
                <KeyRound className="h-4 w-4 text-[#0066cc] dark:text-blue-400" />
              </button>
              <AnimatePresence initial={false}>
                {acordeonPassword ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-5 border-t border-zinc-200 px-4 pb-4 pt-4 dark:border-zinc-700">
                      <div>
                        <SeparadorSeccion titulo="Link para restablecer contraseña" />
                        <div className="flex flex-col gap-3">
                          <button
                            type="button"
                            onClick={() => void alternarLink()}
                            disabled={generandoLink}
                            className={`flex h-12 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 text-center text-sm font-semibold leading-tight disabled:cursor-not-allowed disabled:opacity-50 ${
                              linkActivo
                                ? "border-red-500 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-400 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
                                : "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900"
                            }`}
                          >
                            <Link2 className="h-4 w-4 shrink-0" />
                            {generandoLink
                              ? linkActivo
                                ? "Eliminando..."
                                : "Generando..."
                              : linkActivo
                                ? "Eliminar link de contraseña"
                                : "Generar nuevo link de contraseña"}
                          </button>
                          {linkActivo ? (
                            <div className="flex h-12 w-full shrink-0 items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900">
                              <span className="pr-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Tiempo restante
                              </span>
                              <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-[#0066cc] dark:text-blue-400">
                                {formatoRestante(restanteMs)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex h-12 w-full shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 dark:border-zinc-700 dark:bg-zinc-900">
                              <p className="text-center text-sm font-semibold text-muted-foreground">
                                El link de contraseña está inactivo.
                              </p>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <ModalInput
                              id="telefono-reset"
                              type="tel"
                              inputMode="numeric"
                              autoComplete="tel"
                              enterKeyHint="done"
                              value={telefonoMostrado()}
                              onChange={(e) =>
                                setTelefono(e.target.value.replace(/\D/g, "").slice(0, 8))
                              }
                              className="min-w-0 flex-1"
                              aria-label="Teléfono para restablecer contraseña"
                            />
                            <button
                              type="button"
                              onClick={() => void enviarWhatsApp()}
                              disabled={!linkActivo || generandoLink}
                              aria-label="Enviar por WhatsApp"
                              className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-emerald-500 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <IconoWhatsApp className="h-6 w-6" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void copiarMensaje()}
                              disabled={!linkActivo || generandoLink}
                              aria-label="Copiar mensaje"
                              className="inline-flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-zinc-300 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                              {copiado ? (
                                <Check className="h-5 w-5 text-emerald-600" />
                              ) : (
                                <Copy className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div>
                        <SeparadorSeccion titulo="Cambiar contraseña" />
                        <PasswordSection
                          password={password}
                          confirmar={confirmar}
                          onPasswordChange={setPassword}
                          onConfirmarChange={setConfirmar}
                          inputClassName={`${MODAL_FIELD_CLASS} pr-11`}
                          passwordLabel="Nueva contraseña"
                          idPrefix="admin-user-"
                          passwordName="new-password"
                          confirmarName="new-password-confirm"
                          passwordAutoComplete="new-password"
                          confirmarAutoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => void guardarPassword()}
                          disabled={!passwordValida || guardandoPassword}
                          className="mt-4 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-zinc-200 text-sm font-semibold text-zinc-900 hover:bg-zinc-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                        >
                          {guardandoPassword
                            ? "Guardando..."
                            : "Guardar contraseña"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {!acordeonPassword ? (
              <button
                type="button"
                onClick={() => void guardarCambios()}
                disabled={!hayCambios || cargando}
                className={CAMPO_SUBMIT_BTN_CLASS}
              >
                {cargando ? "Guardando..." : "Guardar cambios de cuenta"}
              </button>
            ) : null}
      </div>

      <div className={activeTab === "personal" ? "block" : "hidden"}>
        <InfoForm userData={usuario} />
      </div>
    </div>
  );
}
