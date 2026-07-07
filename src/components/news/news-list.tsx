/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Music, Video } from "lucide-react";
import { formatDate } from "@/components/news/news-media";
import { Card, CardContent } from "@/components/ui/card";
import type { NewsPost } from "@/lib/firebase/news";

export function NewsList({ posts }: { posts: NewsPost[] }) {
  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Одоогоор мэдээ алга.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <Link key={p.id} href={`/news/${p.id}`} className="block">
          <Card className="overflow-hidden transition-colors hover:border-primary/50">
            {p.image_url && (
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
    </div>
  );
}
