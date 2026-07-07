import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Separate lightweight instance: session cookie checks only, no
// firebase-admin import. Shares AUTH_SECRET with the main instance,
// so it reads the same JWT session.
export const proxy = NextAuth(authConfig).auth;

export const config = {
  // Protect everything except NextAuth routes, static assets and files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
