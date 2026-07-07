import type { NextAuthConfig } from "next-auth";
import Google, { type GoogleProfile } from "next-auth/providers/google";

export const ALLOWED_DOMAIN = "shineue.edu.mn";

/**
 * Edge-safe auth config. Keep Node-only imports (firebase-admin etc.)
 * out of this file — it is loaded by the middleware.
 */
export const authConfig = {
  providers: [
    Google({
      authorization: {
        params: {
          // Hint for Google's account picker only — a crafted request can
          // omit it, so the real enforcement lives in the signIn callback.
          hd: ALLOWED_DOMAIN,
          prompt: "select_account",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    signIn({ account, profile }) {
      if (account?.provider !== "google") return false;

      const google = profile as GoogleProfile | undefined;
      if (!google?.email_verified) return false;

      // `hd` is only issued for Google Workspace accounts, so this both
      // pins the domain and rejects personal Gmail accounts.
      return (
        google.hd === ALLOWED_DOMAIN &&
        (google.email ?? "").endsWith(`@${ALLOWED_DOMAIN}`)
      );
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // Public pages: landing (news showcase), news reading, and
      // certificate verification.
      if (pathname === "/") return true;
      if (pathname.startsWith("/news")) return true;
      if (pathname.startsWith("/verify")) return true;

      const isLoginPage = pathname.startsWith("/login");

      if (isLoginPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
