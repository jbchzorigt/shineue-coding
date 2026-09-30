import Image from "next/image";
import { signIn } from "@/auth";
import { ALLOWED_DOMAIN, googleEnabled } from "@/auth.config";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Image
            src="/logo.png"
            alt="Шинэ Үе сургууль"
            width={96}
            height={96}
            priority
            className="mx-auto mb-2"
          />
          <CardTitle className="text-2xl">IBDP Computer Science</CardTitle>
          <CardDescription>2027 хөтөлбөрийн дасгал, сорилын платформ</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Errors below come back from the optional Google sign-in. */}
          {error === "AccessDenied" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Зөвхөн сургуулийн <strong>@{ALLOWED_DOMAIN}</strong> имэйл хаягаар нэвтрэх боломжтой.
            </p>
          )}
          {error === "AccountConflict" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Энэ имэйл хаяг өөр Google бүртгэлтэй холбогдсон байна. Админд хандаж хуучин
              бүртгэлийг устгуулаад дахин нэвтэрнэ үү.
            </p>
          )}
          {error && error !== "AccessDenied" && error !== "AccountConflict" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.
            </p>
          )}

          <LoginForm />

          {googleEnabled && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                эсвэл
                <span className="h-px flex-1 bg-border" />
              </div>
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: "/" });
                }}
              >
                <Button type="submit" variant="outline" className="w-full">
                  <GoogleIcon />
                  Google-ээр нэвтрэх
                </Button>
              </form>
            </>
          )}
        </CardContent>
        <CardFooter>
          <p className="w-full text-center text-xs text-muted-foreground">
            Нууц үгээ мартсан бол багшдаа хандана уу.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M21.35 11.1H12v2.9h5.35c-.5 2.5-2.6 3.9-5.35 3.9a6 6 0 1 1 0-12c1.5 0 2.9.55 3.95 1.55l2.2-2.2A9 9 0 1 0 12 21c5.2 0 8.65-3.65 8.65-8.8 0-.4-.1-.75-.3-1.1Z"
      />
    </svg>
  );
}
