import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RUTAS_PUBLICAS = ["/login", "/bloqueado", "/cambiar-contrasena"];

export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.get("firebase-token");
  const { pathname } = request.nextUrl;

  const esRutaPublica = RUTAS_PUBLICAS.some((r) => pathname === r || pathname.startsWith(r + "/"));

  if (esRutaPublica) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/bloqueado",
    "/cambiar-contrasena",
  ],
};
