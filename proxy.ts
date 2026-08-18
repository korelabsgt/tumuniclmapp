import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/proxy";
import supabaseAdmin from "@/lib/supabaseAdmin";

export async function proxy(request: NextRequest) {
  const { supabase, response } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute = request.nextUrl.pathname.startsWith("/sigem");

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verificar ban de Supabase Auth
  if (user && isProtectedRoute) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    const authUserAny = authUser?.user as any;
    const bannedUntil = authUserAny?.banned_until;

    if (bannedUntil && new Date(bannedUntil) > new Date()) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (user && isProtectedRoute) {
    const { data: relacion, error: errorRol } = await supabase
      .from("usuarios_roles")
      .select("roles(nombre)")
      .eq("user_id", user.id)
      .maybeSingle();

    if (errorRol) {
      return response;
    }

    const rolNombre = (relacion?.roles as any)?.nombre ?? null;

    if (
      request.nextUrl.pathname.startsWith("/sigem/admin/configs") &&
      rolNombre !== "SUPER"
    ) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }

    const rolesPermitidosAdmin = [
      "SUPER",
      "ADMINISTRADOR",
      "SECRETARIO",
      "INVITADO",
      "ALCALDE",
      "CONCEJAL",
      "RRHH",
    ];

    if (
      request.nextUrl.pathname.startsWith("/sigem/admin") &&
      !rolesPermitidosAdmin.includes(rolNombre)
    ) {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }


  response.headers.set("x-pathname", request.nextUrl.pathname);

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|csv|xlsx|woff|woff2|tff|otf|js|css)$).*)",
  ],
};
