import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { ensureUserProfile } from "@/lib/firebase/users";
import type { UserRole } from "@/lib/types";

/**
 * Full auth instance (Node runtime): pages, API routes, server actions.
 * The proxy uses its own lightweight instance built from authConfig only,
 * so firebase-admin never ends up in the proxy bundle.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, account, profile }) {
      // Only present on the initial sign-in round trip.
      if (account?.provider === "google") {
        // Without an adapter NextAuth mints a random UUID per sign-in as
        // user.id/token.sub — use Google's stable account id instead, or
        // every sign-in would create a fresh Firestore profile.
        token.sub = account.providerAccountId;
        const userProfile = await ensureUserProfile({
          uid: account.providerAccountId,
          email: profile?.email ?? "",
          name: profile?.name ?? null,
          photo_url: typeof profile?.picture === "string" ? profile.picture : null,
        });
        token.role = userProfile.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      session.user.role = (token.role as UserRole | undefined) ?? "student";
      return session;
    },
  },
});
