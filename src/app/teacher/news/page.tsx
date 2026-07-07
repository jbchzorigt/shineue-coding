import Link from "next/link";
import { redirect } from "next/navigation";
import { Newspaper, Pencil, Plus } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { isStaff } from "@/lib/types";
import { listNews } from "@/lib/firebase/news";
import { formatDate } from "@/components/news/news-media";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function TeacherNewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const posts = await listNews();

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Newspaper className="size-6" />
              Мэдээний удирдлага
            </h1>
            <p className="text-muted-foreground">Зарлал, мэдээ нийтэлж, засварлана.</p>
          </div>
          <Button render={<Link href="/teacher/news/new" />} nativeButton={false}>
            <Plus className="size-4" />
            Шинэ мэдээ
          </Button>
        </div>

        {posts.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Мэдээ нийтлээгүй байна — "Шинэ мэдээ" дарж эхлээрэй.
            </CardContent>
          </Card>
        )}

        {posts.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-semibold">{p.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {p.author_name ?? "Багш"} · {formatDate(p.published_at)}
                </p>
              </div>
              <Button
                render={<Link href={`/teacher/news/${p.id}`} />}
                nativeButton={false}
                variant="outline"
                size="sm"
              >
                <Pencil className="size-3.5" />
                Засах
              </Button>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
