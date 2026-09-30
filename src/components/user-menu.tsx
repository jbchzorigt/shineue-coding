import { auth } from "@/auth";
import { isStaff } from "@/lib/types";
import { UserMenuClient } from "@/components/user-menu-client";

export async function UserMenu() {
  const session = await auth();
  if (!session?.user) return null;

  const { name, email, image } = session.user;
  return (
    <UserMenuClient
      name={name ?? null}
      email={email ?? null}
      image={image ?? null}
      staff={isStaff(session.user.role)}
    />
  );
}
