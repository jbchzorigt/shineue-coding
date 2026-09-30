import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Lock } from "lucide-react";
import { auth } from "@/auth";
import { getCourseProgress } from "@/lib/progression";
import { getOrCreateCertificate } from "@/lib/db/certificates";
import { SiteHeader } from "@/components/site-header";
import { CertificateView } from "@/components/certificate/certificate-view";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default async function CertificatePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const progress = await getCourseProgress(session.user.id);

  if (!progress.complete) {
    return (
      <div className="min-h-screen bg-muted/40">
        <SiteHeader />
        <main className="mx-auto flex max-w-md flex-col items-center gap-5 p-4 pt-24 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Lock className="size-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold">Сертификат хараахан нээгдээгүй</h1>
          <p className="text-muted-foreground">
            Бүх модулийн бүх даалгаврыг амжилттай бодож дуусгасны дараа
            сертификат олгогдоно.
          </p>
          <div className="w-full">
            <div className="mb-1.5 flex justify-between text-sm">
              <span>Явц</span>
              <span className="text-muted-foreground">
                {progress.passedChallenges} / {progress.totalChallenges} бодлого
              </span>
            </div>
            <Progress
              value={(progress.passedChallenges / Math.max(progress.totalChallenges, 1)) * 100}
            />
          </div>
          <Button render={<Link href="/modules" />} nativeButton={false} variant="outline">
            Модулиуд руу очих
          </Button>
        </main>
      </div>
    );
  }

  const cert = await getOrCreateCertificate(
    session.user.id,
    session.user.name ?? session.user.email ?? "Сурагч"
  );

  const host = (await headers()).get("host") ?? "localhost:3001";
  const proto = host.startsWith("localhost") ? "http" : "https";

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-2xl space-y-6 p-4 pt-10">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Баяр хүргэе! 🎓</h1>
          <p className="text-muted-foreground">
            Та хөтөлбөрийн бүх модулийг амжилттай дүүргэлээ.
          </p>
        </div>
        <CertificateView
          cert={{
            id: cert.id,
            name: cert.name,
            syllabus: cert.syllabus,
            issuedAt: cert.issued_at,
            verifyUrl: `${proto}://${host}/verify/${cert.id}`,
          }}
        />
      </main>
    </div>
  );
}
