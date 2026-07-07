"use client";

import { useActionState } from "react";
import { Loader2, Save, Trash2 } from "lucide-react";
import { saveNews, deleteNews } from "@/lib/news-actions";
import type { ActionState } from "@/lib/teacher-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NewsPost } from "@/lib/firebase/news";

export function NewsForm({ post }: { post: NewsPost | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveNews,
    { error: null }
  );

  return (
    <form action={action} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="title">Гарчиг</Label>
        <Input id="title" name="title" defaultValue={post?.title ?? ""} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body_mdx">Агуулга (Markdown)</Label>
        <Textarea
          id="body_mdx"
          name="body_mdx"
          defaultValue={post?.body_mdx ?? ""}
          className="min-h-48"
          placeholder={"Мэдээний текст...\n\n**Тод**, жагсаалт, хүснэгт, ![зураг](https://...) бүгд дэмжигдэнэ."}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="image_url">Нүүр зургийн URL (заавал биш)</Label>
        <Input
          id="image_url"
          name="image_url"
          type="url"
          defaultValue={post?.image_url ?? ""}
          placeholder="https://example.com/photo.jpg"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="video_url">Видео URL (заавал биш)</Label>
          <Input
            id="video_url"
            name="video_url"
            type="url"
            defaultValue={post?.video_url ?? ""}
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">
            YouTube линк тоглуулагч болж суугдана; шууд .mp4 линк ч болно.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audio_url">Аудио URL (заавал биш)</Label>
          <Input
            id="audio_url"
            name="audio_url"
            type="url"
            defaultValue={post?.audio_url ?? ""}
            placeholder="https://example.com/recording.mp3"
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Нийтлэх
        </Button>
        {post && (
          <Button
            type="submit"
            formAction={deleteNews}
            formNoValidate
            variant="destructive"
            onClick={(e) => {
              if (!confirm(`«${post.title}» мэдээг устгах уу?`)) e.preventDefault();
            }}
          >
            <Trash2 className="size-4" />
            Устгах
          </Button>
        )}
      </div>
    </form>
  );
}
