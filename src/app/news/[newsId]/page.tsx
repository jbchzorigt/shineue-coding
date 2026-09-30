import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getNews } from "@/lib/db/news";
import { MdxContent } from "@/components/mdx/mdx-content";
import {
  NewsAudio,
  NewsImage,
  NewsVideo,
  formatDate,
} from "@/components/news/news-media";
import { NewsCategoryBadge } from "@/components/news/news-category";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ newsId: string }>;
}) {
  const { newsId } = await params;
  const post = await getNews(newsId);
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl space-y-6 p-4 pt-8">
        <Button render={<Link href="/news" />} nativeButton={false} variant="ghost" size="sm">
          <ArrowLeft className="size-4" />
          Мэдээний булан
        </Button>

        <article className="space-y-5 rounded-xl border bg-background p-6 sm:p-8">
          <div className="space-y-2">
            <NewsCategoryBadge category={post.category} />
            <h1 className="text-2xl font-bold">{post.title}</h1>
            <p className="text-sm text-muted-foreground">
              {post.author_name ?? "Багш"} · {formatDate(post.published_at)}
            </p>
          </div>

          {post.image_url && <NewsImage url={post.image_url} title={post.title} />}

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <MdxContent source={post.body_mdx} />
          </div>

          {post.video_url && <NewsVideo url={post.video_url} />}
          {post.audio_url && <NewsAudio url={post.audio_url} />}
        </article>
      </main>
    </div>
  );
}
