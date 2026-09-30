import { auth } from "@/auth";

// The full instance: Next 16 runs the proxy on the Node.js runtime, so the
// jwt callback re-checks every session against the database here, and the
// authorized callback (auth.config.ts) holds users with a temporary
// password on /account/password.
export const proxy = auth;

export const config = {
  // Protect everything except NextAuth routes, uploads (checked in the
  // route — the proxy would cut bodies at 10MB), static assets and files.
  matcher: ["/((?!api/auth|api/uploads|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
