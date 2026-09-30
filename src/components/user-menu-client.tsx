"use client";

import Link from "next/link";
import { GraduationCap, KeyRound, LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenuClient({
  name,
  email,
  image,
  staff,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  /** Teachers and the admin also get a link to the management pages. */
  staff: boolean;
}) {
  const initials = (name ?? email ?? "?")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="relative size-9 rounded-full p-0" />
        }
      >
        <Avatar className="size-9">
          <AvatarImage src={image ?? undefined} alt={name ?? ""} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {staff && (
          <DropdownMenuItem render={<Link href="/teacher" />}>
            <GraduationCap className="size-4" />
            Багшийн самбар
          </DropdownMenuItem>
        )}
        <DropdownMenuItem render={<Link href="/account/password" />}>
          <KeyRound className="size-4" />
          Нууц үг солих
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void signOutAction()}>
          <LogOut className="size-4" />
          Гарах
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
