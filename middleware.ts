import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();

  const password = process.env.PACKWELL_PASSWORD;
  if (!password) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const expected = await sessionToken(password);
  if (token === expected) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
