import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";
import { refreshToken } from "@/lib/auth-token";
import { getAuthState, verifyLogin } from "@/lib/db/accounts";
import { ensureUserProfile, isEmailTakenByAnotherUser } from "@/lib/db/users";

/** Reaches the login form as `error.code === "locked"`. */
class AccountLocked extends CredentialsSignin {
  code = "locked";
}

/**
 * The one auth instance: pages, API routes, server actions and the proxy
 * (which runs on the Node.js runtime in Next 16, so it can reach the DB).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const result = await verifyLogin(email, password);
        if (result.ok) {
          return { id: result.user.uid, email: result.user.email, name: result.user.name };
        }
        if (result.reason === "locked") throw new AccountLocked();
        return null;
      },
    }),
    ...authConfig.providers,
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn(params) {
      // Domain and verification rules first (shared config).
      if (!authConfig.callbacks.signIn(params)) return false;
      // A recreated Workspace account keeps its address but gets a new
      // Google id — explain on the login page instead of failing later.
      if (params.account?.provider === "google") {
        const email = params.profile?.email;
        const uid = params.account.providerAccountId;
        if (email && (await isEmailTakenByAnotherUser(uid, email))) {
          return "/login?error=AccountConflict";
        }
      }
      return true;
    },
    async jwt({ token, account, profile, user }) {
      if (account?.provider === "credentials" && user?.id) {
        token.sub = user.id;
      } else if (account?.provider === "google") {
        // Google's stable account id, not NextAuth's per-sign-in UUID.
        token.sub = account.providerAccountId;
        await ensureUserProfile({
          uid: account.providerAccountId,
          email: profile?.email ?? "",
          name: profile?.name ?? null,
          photo_url: typeof profile?.picture === "string" ? profile.picture : null,
        });
      }
      if (!token.sub) return null;

      // Every request: a deleted account or a changed/reset password ends
      // the session; role and the must-change flag come fresh from the DB.
      const state = await getAuthState(token.sub);
      if (account) token.sv = state?.session_version;
      return refreshToken(token, state);
    },
  },
});
