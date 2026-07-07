import Link from "next/link";
import { redirect } from "next/navigation";
import { Music, Newspaper, Video } from "lucide-react";
import { auth } from "@/auth";
import { listNews } from "@/lib/firebase/news";
import { formatDate } from "@/components/news/news-media";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

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

        {posts.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Одоогоор мэдээ алга.
            </CardContent>
          </Card>
        )}

        {posts.map((p) => (
          <Link key={p.id} href={`/news/${p.id}`} className="block">
            <Card className="overflow-hidden transition-colors hover:border-primary/50">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image_url}
                  alt={p.title}
                  className="max-h-56 w-full object-cover"
                />
              )}
              <CardContent className="space-y-1.5">
                <h2 className="text-lg font-semibold">{p.title}</h2>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {p.body_mdx.replace(/[#*`>\[\]]/g, "").slice(0, 200)}
                </p>
                <p className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
                  <span>{p.author_name ?? "Багш"}</span>
                  <span>{formatDate(p.published_at)}</span>
                  {p.video_url && <Video className="size-3.5" />}
                  {p.audio_url && <Music className="size-3.5" />}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </main>
    </div>
  );
}
