import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/firebase/users";
import { isStaff } from "@/lib/types";
import { getNews } from "@/lib/firebase/news";
import { SiteHeader } from "@/components/site-header";
import { NewsForm } from "@/components/teacher/news-form";
import { Button } from "@/components/ui/button";

export default async function EditNewsPage({
  params,
}: {
  params: Promise<{ newsId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const profile = await getUserProfile(session.user.id).catch(() => null);
  if (!isStaff(profile?.role)) redirect("/");

  const { newsId } = await params;
  const isNew = newsId === "new";
  const post = isNew ? null : await getNews(newsId);
  if (!isNew && !post) notFound();

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <Button render={<Link href="/teacher/news" />} nativeButton={false} variant="ghost" size="sm">
            <ArrowLeft className="size-4" />
            Мэдээний удирдлага
          </Button>
          <h1 className="mt-2 text-2xl font-bold">
            {isNew ? "Шинэ мэдээ" : `Мэдээ засах: ${post!.title}`}
          </h1>
        </div>
        <div className="rounded-xl border bg-background p-6">
          <NewsForm post={post} />
        </div>
      </main>
    </div>
  );
}
