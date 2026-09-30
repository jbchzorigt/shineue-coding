import { Newspaper, Plus } from "lucide-react";
import { listNews } from "@/lib/db/news";
import { NewsList } from "@/components/news/news-list";
import { SiteHeader } from "@/components/site-header";
import { StaffLink } from "@/components/staff-link";

export default async function NewsPage() {
  const posts = await listNews();

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Newspaper className="size-6" />
              Мэдээний булан
            </h1>
            <p className="text-muted-foreground">Сургалтын багийн зарлал, мэдээлэл.</p>
          </div>
          <StaffLink href="/teacher/news/new">
            <Plus className="size-4" />
            Шинэ мэдээ
          </StaffLink>
        </div>
        <NewsList posts={posts} />
      </main>
    </div>
  );
}
