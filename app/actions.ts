'use server';

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import supabaseAdmin from '@/utils/supabase/admin';
import { registrarLogServer } from '@/utils/registrarLogServer';
import { obtenerFechaYFormatoGT } from '@/utils/formatoFechaGT';
import { passwordEstaVencida } from '@/components/cambiar-contrasena/lib/password-age';

type FormState = {
  type: 'error' | 'success' | null;
  message: string;
  email?: string; 
};

export const signInAction = async (prevState: FormState, formData: FormData): Promise<FormState> => {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const traduccionErrores: Record<string, string> = {
      'Invalid login credentials': 'Correo o contraseña incorrectos.',
      'Email not confirmed': 'Debe confirmar su correo antes de iniciar sesión.',
      'User is banned': 'Este usuario ha sido suspendido.',
    };
    const mensaje = traduccionErrores[error.message] || error.message;
    return { type: 'error', message: mensaje, email: email };
  }

  const user = data?.user;

  const { data: perfil, error: errorPerfil } = await supabase
    .from('info_usuario')
    .select('activo')
    .eq('user_id', user?.id)
    .single();

  if (errorPerfil) {
    console.error('Error al verificar estado del usuario:', errorPerfil);
    await supabase.auth.signOut();
    return { type: 'error', message: 'Error al iniciar sesión. Contacta con Soporte Técnico.', email: email };
  }

  if (!perfil?.activo) {
    await supabase.auth.signOut();
    return { type: 'error', message: 'Tu cuenta está desactivada. Contacta con Soporte Técnico.', email: email };
  }

  const { data: relacion } = await supabase
    .from('usuarios_roles')
    .select('roles(nombre)')
    .eq('user_id', user?.id)
    .maybeSingle();

  const rolObject = Array.isArray(relacion?.roles) ? relacion.roles[0] : relacion?.roles;
  const rol = rolObject?.nombre || '';

  if (rol !== 'SUPER' && rol !== 'ADMINISTRADOR' && rol !== 'SECRETARIO' && rol !== 'ALCALDE' && rol !== 'RRHH' && rol !== 'INVITADO') {
    const { data: horario, error: errorHorario } = await supabase
      .from('horarios')
      .select('*')
      .eq('nombre', 'Sistema')
      .maybeSingle();

    if (errorHorario || !horario) {
      console.error('Error al encontrar el horario:', errorHorario);
      await supabase.auth.signOut();
      return { type: 'error', message: 'Horario no encontrado.', email: email };
    }
    
    const nowInGT = new Date().toLocaleString('en-US', { timeZone: 'America/Guatemala', hour12: false });
    const now = new Date(nowInGT);
    
    const horaActual = now.getHours();
    const minutoActual = now.getMinutes();
    const diaActualIndex = now.getDay();
    const [horaEntrada, minutoEntrada] = horario.entrada.split(':').map(Number);
    const [horaSalida, minutoSalida] = horario.salida.split(':').map(Number);
    
    const ahoraEnMinutos = horaActual * 60 + minutoActual;
    const entradaEnMinutos = horaEntrada * 60 + minutoEntrada;
    const salidaEnMinutos = horaSalida * 60 + minutoSalida;

    const esDiaLaboral = horario.dias.includes(diaActualIndex);
    const enHorario = ahoraEnMinutos >= entradaEnMinutos && ahoraEnMinutos < salidaEnMinutos;
    
    if (!esDiaLaboral || !enHorario) {
      const { fecha, formateada } = obtenerFechaYFormatoGT();
      await registrarLogServer({
        accion: 'FUERA_DE_HORARIO',
        descripcion: `Intento de acceso fuera de horario: ${formateada}`,
        nombreModulo: 'SISTEMA',
        fecha,
        user_id: user?.id,
      });
      await supabase.auth.signOut();
      return { type: 'error', message: `Acceso fuera de horario. Contacte con Soporte Técnico.`, email: email };
    }
  }

  const { fecha } = obtenerFechaYFormatoGT();
  await registrarLogServer({
    accion: 'INICIO_SESION',
    descripcion: `-`,
    nombreModulo: 'SISTEMA',
    fecha,
    user_id: user?.id,
  });

  if (user && passwordEstaVencida(user)) {
    await registrarLogServer({
      accion: 'PASSWORD_VENCIDA',
      descripcion: 'Inicio de sesión con contraseña vencida.',
      nombreModulo: 'SISTEMA',
      fecha,
      user_id: user.id,
    });
  }

  if (rol === 'SUPER') {
    redirect('/protected/admin');
  } else {
    redirect('/protected/user');
  }
};

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const nombre = formData.get("nombre")?.toString();
  const roles = formData.getAll("rol").map((r) => r.toString());

  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password || roles.length === 0 || !nombre) {
    return encodedRedirect("error", "/protected/admin/sign-up", "Todos los campos son obligatorios.");
  }

  const { data: yaExiste, error: errorVerificacion } = await supabase.rpc(
    'correo_ya_registrado',
    { email_input: email }
  );

  if (errorVerificacion) {
    return encodedRedirect("error", "/protected/admin/sign-up", "Error al verificar el correo.");
  }

  if (yaExiste) {
    return encodedRedirect("error", "/protected/admin/sign-up", "Usuario ya registrado.");
  }

  const {
    data: { user: usuarioActual },
  } = await supabase.auth.getUser();

  const user_id_log = usuarioActual?.id;

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data?.user) {
    return encodedRedirect("error", "/protected/admin/sign-up", error?.message || "No se pudo crear.");
  }

  const user_id = data.user.id;

  const { error: errorPerfil } = await supabase
    .from("info_usuario")
    .insert({ user_id, nombre, activo: true });

  if (errorPerfil) {
    console.error('Error al insertar en info_usuario:', errorPerfil);
    return encodedRedirect("error", "/protected/admin/sign-up", "Error al guardar perfil.");
  }

  for (const rol_id of roles) {
    await supabase
      .from("usuarios_roles")
      .insert({ user_id, rol_id });
  }

  const { fecha } = obtenerFechaYFormatoGT();

  await registrarLogServer({
    accion: 'CREAR_USUARIO',
    descripcion: `Creó al usuario ${email}`,
    nombreModulo: 'SISTEMA',
    fecha,
    user_id: user_id_log,
  });

  return encodedRedirect("success", "/protected/admin/sign-up", "Usuario creado con éxito.");
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect("error", "/reset-password", "La contraseña y la confirmación son requeridas");
  }

  if (password !== confirmPassword) {
    return encodedRedirect("error", "/reset-password", "Las contraseñas no coinciden");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return encodedRedirect("error", "/reset-password", "La contraseña no pudo actualizarse");
  }

  return encodedRedirect("success", "/reset-password", "Contraseña restablecida");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  const { fecha } = obtenerFechaYFormatoGT();

  const {
    data: { user: usuarioActual },
  } = await supabase.auth.getUser();

  const user_id_log = usuarioActual?.id;

  await registrarLogServer({
    accion: 'CERRAR_SESION',
    descripcion: `-`,
    nombreModulo: 'SISTEMA',
    fecha,
    user_id: user_id_log,
  });
 
  await supabase.auth.signOut();

  redirect("/");
};