import { NextRequest, NextResponse } from "next/server"

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token"

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const session = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  const isLogin = pathname === "/login"
  const isPasswordChange = pathname === "/alterar-senha"

  if (!session && !isLogin) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (session?.mustChangePassword && !isPasswordChange) {
    return NextResponse.redirect(new URL("/alterar-senha", request.url))
  }

  if (session && !session.mustChangePassword && (isLogin || isPasswordChange)) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|api/branding).*)"],
}
