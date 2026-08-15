import { NextResponse } from 'next/server';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { obtenerFechaYFormatoGT } from '@/utils/formatoFechaGT';
import { registrarLogServer } from '@/utils/registrarLogServer';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const { id, email, nombre, rol, password, activo, esJefe } = await req.json();

    if (!id || !email || !nombre || !rol) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user: usuarioEditor },
    } = await supabase.auth.getUser();

    if (!usuarioEditor) {
      return NextResponse.json({ error: 'Debe iniciar sesión.' }, { status: 401 });
    }

    if (
      usuarioEditor.id === id &&
      (activo === false || activo === 'false')
    ) {
      return NextResponse.json(
        { error: 'No puede inactivarse a sí mismo.' },
        { status: 400 },
      );
    }

    // 1. Obtener datos actuales
    const { data: perfilActual, error: errorPerfilActual } = await supabaseAdmin
      .from('info_usuario')
      .select('nombre, activo, esjefe')
      .eq('user_id', id)
      .single();

    const { data: rolActualRow, error: errorRolActual } = await supabaseAdmin
      .from('usuarios_roles')
      .select('rol_id')
      .eq('user_id', id)
      .single();

    const { data: authActual, error: errorAuthActual } = await supabaseAdmin.auth.admin.getUserById(id);

    if (
      errorPerfilActual ||
      errorRolActual ||
      errorAuthActual ||
      !authActual?.user ||
      !rolActualRow
    ) {
      return NextResponse.json({ error: 'No se pudieron obtener datos actuales' }, { status: 500 });
    }

    const nombreAnterior = perfilActual.nombre ?? '—';
    const activoAnterior = perfilActual.activo;
    const esjefeAnterior = perfilActual.esjefe ?? false;

    const rolAnterior = rolActualRow.rol_id;
    const emailAnterior = authActual.user.email ?? '—';

    // 2. Actualizar en auth (email, password y ban según activo)
    const updateData: any = { email };
    if (password) updateData.password = password;

    // Ban/Unban según estado activo
    if (activo === false || activo === 'false') {
      // Banear por 100 años
      const banUntil = new Date();
      banUntil.setFullYear(banUntil.getFullYear() + 100);
      updateData.ban_duration = '876000h'; // ~100 años en horas
    } else {
      // Quitar ban
      updateData.ban_duration = 'none';
    }

    const { error: errorAuth } = await supabaseAdmin.auth.admin.updateUserById(id, updateData);
    if (errorAuth) {
      console.error('Error al actualizar auth:', errorAuth);
      return NextResponse.json({ error: 'No se pudo actualizar el usuario.' }, { status: 500 });
    }

    // 3. Actualizar perfil
    const { error: errorPerfil } = await supabaseAdmin
      .from('info_usuario')
      .update({ nombre, activo, esjefe: esJefe })
      .eq('user_id', id);

    if (errorPerfil) {
      console.error('Error al actualizar perfil:', errorPerfil);
      return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
    }

    // 4. Actualizar rol si cambió
    if (rol !== rolAnterior) {
      const { error: errorRol } = await supabaseAdmin
        .from('usuarios_roles')
        .update({ rol_id: rol })
        .eq('user_id', id);

      if (errorRol) {
        console.error('Error al actualizar rol:', errorRol);
        return NextResponse.json({ error: 'Error al actualizar rol' }, { status: 500 });
      }
    }

    // 5. Construir log de cambios
    const cambios: string[] = [];

    if (email !== emailAnterior) {
      cambios.push(`Correo: "${emailAnterior}" → "${email}"`);
    }

    if (nombre !== nombreAnterior) {
      cambios.push(`Nombre: "${nombreAnterior}" → "${nombre}"`);
    }

    if (activo !== activoAnterior) {
      const estadoAnterior = activoAnterior ? 'activo' : 'inactivo';
      const estadoNuevo = activo ? 'activo' : 'inactivo';
      cambios.push(`Estado: "${estadoAnterior}" → "${estadoNuevo}"`);
    }
    
    if (esJefe !== esjefeAnterior) {
      const estadoAnterior = esjefeAnterior ? 'Sí' : 'No';
      const estadoNuevo = esJefe ? 'Sí' : 'No';
      cambios.push(`Es Jefe: "${estadoAnterior}" → "${estadoNuevo}"`);
    }

    // Obtener nombres de roles
    const { data: rolAnteriorData } = await supabaseAdmin
      .from('roles')
    .select('nombre')
      .eq('id', rolAnterior)
      .maybeSingle();

    const { data: rolNuevoData } = await supabaseAdmin
      .from('roles')
      .select('nombre')
      .eq('id', rol)
      .maybeSingle();

    const nombreRolAnterior = rolAnteriorData?.nombre ?? rolAnterior;
    const nombreRolNuevo = rolNuevoData?.nombre ?? rol;

    if (rol !== rolAnterior) {
      cambios.push(`Rol: "${nombreRolAnterior}" → "${nombreRolNuevo}"`);
    }

    if (password) {
      cambios.push(`Contraseña: actualizada`);
    }

    const { fecha } = obtenerFechaYFormatoGT();

    await registrarLogServer({
      accion: 'EDITAR_USUARIO',
      descripcion: `<br> Se editó al usuario ${email}:<br><br>${cambios.join('<br><br>')}<br><br>`,
      nombreModulo: 'SISTEMA',
      fecha,
      user_id: usuarioEditor.id,
    });

    return NextResponse.json({ message: 'Usuario actualizado con éxito' });
  } catch (error) {
    console.error('Error inesperado:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}