import type { DefaultSession } from "next-auth";
import type { UserRole } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: {
      /** users.uid primary key (random id, or the Google account id). */
      id: string;
      role: UserRole;
      /** Temporary password — the proxy holds the user on /account/password. */
      mustChangePassword: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole;
    /** session_version the token was issued against (see auth-token.ts). */
    sv?: number;
    mustChangePassword?: boolean;
  }
}
