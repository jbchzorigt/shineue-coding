import { signIn } from "@/auth";
import { ALLOWED_DOMAIN } from "@/auth.config";
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
          <CardTitle className="text-2xl">IBDP Computer Science</CardTitle>
          <CardDescription>
            2027 хөтөлбөрийн дасгал, сорилын платформ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "AccessDenied" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Зөвхөн сургуулийн <strong>@{ALLOWED_DOMAIN}</strong> имэйл
              хаягаар нэвтрэх боломжтой.
            </p>
          )}
          {error && error !== "AccessDenied" && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              Нэвтрэхэд алдаа гарлаа. Дахин оролдоно уу.
            </p>
          )}
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <Button type="submit" className="w-full" size="lg">
              <GoogleIcon />
              Google-ээр нэвтрэх
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="w-full text-center text-xs text-muted-foreground">
            Сургуулийн бүртгэлтэй Google хаяг шаардлагатай
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
