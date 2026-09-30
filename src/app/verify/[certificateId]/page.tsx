import { BadgeCheck, BadgeX } from "lucide-react";
import { getCertificate } from "@/lib/db/certificates";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const cert = await getCertificate(certificateId).catch(() => null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        {cert ? (
          <>
            <CardHeader className="items-center text-center">
              <BadgeCheck className="mx-auto size-12 text-emerald-600" />
              <CardTitle>Сертификат хүчинтэй</CardTitle>
              <CardDescription>Verification ID: {cert.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-center text-sm">
              <p className="text-lg font-semibold">{cert.name}</p>
              <p className="text-muted-foreground">{cert.syllabus}</p>
              <p className="text-muted-foreground">Олгосон огноо: {cert.issued_at}</p>
            </CardContent>
          </>
        ) : (
          <CardHeader className="items-center text-center">
            <BadgeX className="mx-auto size-12 text-destructive" />
            <CardTitle>Сертификат олдсонгүй</CardTitle>
            <CardDescription>
              Энэ ID-тай сертификат бүртгэлд байхгүй байна.
            </CardDescription>
          </CardHeader>
        )}
      </Card>
    </main>
  );
}
