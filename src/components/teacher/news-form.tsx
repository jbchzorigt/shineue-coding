"use client";

import { useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { saveNews, deleteNews } from "@/lib/news-actions";
import type { ActionState } from "@/lib/teacher-actions";
import { mediaLimitError } from "@/lib/media";
import { MediaUploadField } from "@/components/teacher/media-upload-field";
import { ACCEPT, uploadMedia, type MediaStore } from "@/components/teacher/upload-file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NewsPost } from "@/lib/db/news";

export function NewsForm({ post, store }: { post: NewsPost | null; store: MediaStore }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveNews, { error: null });
  // Controlled, so React 19's reset after a failed save keeps the text.
  const [title, setTitle] = useState(post?.title ?? "");
  const [body, setBody] = useState(post?.body_mdx ?? "");
  const [video, setVideo] = useState(post?.video_url ?? "");
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [inlineProgress, setInlineProgress] = useState<number | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const uploading = inlineProgress !== null || Object.values(busy).some(Boolean);
  const setFieldBusy = (field: string) => (b: boolean) => setBusy((x) => ({ ...x, [field]: b }));

  /** Uploads an image and puts ![](url) where the cursor was. */
  async function insertImage(file: File) {
    const tooBig = mediaLimitError(file.size, "image");
    if (tooBig) {
      setInlineError(tooBig);
      return;
    }
    const el = bodyRef.current;
    const from = el?.selectionStart ?? body.length;
    const to = el?.selectionEnd ?? body.length;
    setInlineError(null);
    setInlineProgress(0);
    try {
      const url = await uploadMedia(file, "image", store, setInlineProgress);
      const snippet = `\n![](${url})\n`;
      setBody((b) => b.slice(0, Math.min(from, b.length)) + snippet + b.slice(Math.min(to, b.length)));
    } catch (err) {
      setInlineError(err instanceof Error ? err.message : "Файл оруулахад алдаа гарлаа.");
    } finally {
      setInlineProgress(null);
    }
  }

  return (
    <form action={action} className="space-y-5">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="space-y-1.5">
        <Label htmlFor="title">Гарчиг</Label>
        <Input id="title" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="body_mdx">Агуулга (Markdown)</Label>
          <input
            ref={picker}
            type="file"
            accept={ACCEPT.image}
            className="hidden"
            aria-label="Агуулгад зураг оруулах: файл сонгох"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void insertImage(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => picker.current?.click()}
            disabled={inlineProgress !== null}
          >
            {inlineProgress !== null ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
            {inlineProgress !== null ? `${inlineProgress}%` : "Зураг оруулах"}
          </Button>
        </div>
        <Textarea
          ref={bodyRef}
          id="body_mdx"
          name="body_mdx"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-48"
          placeholder={"Мэдээний текст...\n\n**Тод**, жагсаалт, хүснэгт, ![зураг](https://...) бүгд дэмжигдэнэ."}
          required
        />
        {inlineError && <p className="text-xs text-destructive">{inlineError}</p>}
      </div>

      <MediaUploadField
        name="image_url"
        label="Нүүр зураг (заавал биш)"
        kind="image"
        defaultValue={post?.image_url ?? ""}
        placeholder="https://… эсвэл «Файл сонгох»"
        store={store}
        onBusyChange={setFieldBusy("image_url")}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="video_url">Видео URL (заавал биш)</Label>
          <Input
            id="video_url"
            name="video_url"
            type="url"
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
          <p className="text-xs text-muted-foreground">
            YouTube линк тоглуулагч болж суугдана; шууд .mp4 линк ч болно.
          </p>
        </div>
        <MediaUploadField
          name="audio_url"
          label="Дуу (заавал биш)"
          kind="audio"
          defaultValue={post?.audio_url ?? ""}
          placeholder="https://… эсвэл «Файл сонгох»"
          store={store}
          onBusyChange={setFieldBusy("audio_url")}
        />
      </div>

      {state.error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {uploading ? "Файл оруулж байна…" : "Нийтлэх"}
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
