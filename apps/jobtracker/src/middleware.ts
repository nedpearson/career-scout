import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BASE_PATH = "/jobtracker";

// IMPORTANT:
// Next.js Middleware runs on the Edge runtime. Do NOT import Prisma / DB-backed auth here.
// We do a lightweight cookie presence check only to gate navigation.
function hasSessionCookie(req: NextRequest) {
  const cookieNames = [
    // Auth.js / NextAuth v5
    "authjs.session-token",
    "__Secure-authjs.session-token",
    // NextAuth v4 fallback (in case cookies linger)
    "next-auth.session-token",
    "__Secure-next-auth.session-token"
  ];

  return cookieNames.some((name) => {
    const value = req.cookies.get(name)?.value;
    return typeof value === "string" && value.length > 0;
  });
}

export default function middleware(req: NextRequest) {
  // If not signed in, send to /signin (preserve callback).
  if (!hasSessionCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = `${BASE_PATH}/signin`;
    url.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Never run middleware on /api routes (avoid redirecting fetch calls).
  // Since this app is mounted under BASE_PATH, scope matching accordingly.
  matcher: [
    "/jobtracker/((?!api|_next/static|_next/image|favicon.ico|signin|signup).*)",
  ],
};

