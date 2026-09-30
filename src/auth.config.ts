import type { NextAuthConfig } from "next-auth";
import Google, { type GoogleProfile } from "next-auth/providers/google";
import { ALLOWED_DOMAIN } from "@/lib/constants";

export { ALLOWED_DOMAIN };

/** Google sign-in is optional: on only when both OAuth credentials are set. */
export const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

/** Where a user with a temporary password is held until they change it. */
export const PASSWORD_PAGE = "/account/password";

/**
 * Settings the full instance in src/auth.ts builds on. No database access
 * here — the email/password provider and the per-request session check
 * live in src/auth.ts.
 */
export const authConfig = {
  providers: googleEnabled
    ? [
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
      ]
    : [],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    // Shared school computers: a forgotten session should not live for a month.
    maxAge: 7 * 24 * 60 * 60,
  },
  callbacks: {
    signIn({ account, profile }) {
      // Email + password was already verified in authorize().
      if (account?.provider === "credentials") return true;
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
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = token.role ?? "student";
      session.user.mustChangePassword = token.mustChangePassword === true;
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      // A temporary password must be replaced before anything else.
      if (auth?.user?.mustChangePassword && pathname !== PASSWORD_PAGE) {
        return Response.redirect(new URL(PASSWORD_PAGE, request.nextUrl));
      }

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
