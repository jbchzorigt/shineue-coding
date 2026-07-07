import { Newspaper } from "lucide-react";
import { listNews } from "@/lib/firebase/news";
import { NewsList } from "@/components/news/news-list";
import { SiteHeader } from "@/components/site-header";

export default async function NewsPage() {
  const posts = await listNews();

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Newspaper className="size-6" />
            Мэдээний булан
          </h1>
          <p className="text-muted-foreground">Сургалтын багийн зарлал, мэдээлэл.</p>
        </div>
        <NewsList posts={posts} />
      </main>
    </div>
  );
}
