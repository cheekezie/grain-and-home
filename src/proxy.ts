import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

// Optimistic check only: bounce signed-out visitors from /admin to the
// login page before rendering anything. The authoritative check is
// requireAdmin() inside each admin page and server action.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const ok = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  return NextResponse.redirect(new URL("/admin/login", request.url));
}

export const config = {
  matcher: ["/admin/:path*"],
};
