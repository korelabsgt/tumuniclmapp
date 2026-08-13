"use server";

import supabaseAdmin from "@/lib/supabaseAdmin";
import { createClient } from "@/utils/supabase/server";
import { correoDesdeUsuario, extraerUsuario } from "@/utils/auth/usuarioCorreo";

export async function siguienteUsuarioDisponible(base: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "";

  const local = extraerUsuario(base).toLowerCase();
  if (!local) return "";

  const ocupado = async (usuario: string) => {
    const { data, error } = await supabaseAdmin.rpc("correo_ya_registrado", {
      email_input: correoDesdeUsuario(usuario),
    });
    if (error) return false;
    return Boolean(data);
  };

  if (!(await ocupado(local))) return local;

  for (let n = 1; n <= 99; n += 1) {
    const candidato = `${local}${n}`;
    if (!(await ocupado(candidato))) return candidato;
  }

  return `${local}100`;
}
