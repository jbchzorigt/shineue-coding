"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { isAllowedMediaUrl, mediaLimitError, type MediaKind } from "@/lib/media";
import { ACCEPT, uploadMedia, type MediaStore } from "@/components/teacher/upload-file";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * A URL field that can also take a file from the computer: the file is
 * uploaded at once and its /media URL fills the field. Controlled, so a
 * failed save (React 19 form reset) does not lose it.
 */
export function MediaUploadField({
  name,
  label,
  kind,
  defaultValue,
  placeholder,
  store,
  onBusyChange,
}: {
  name: string;
  label: string;
  kind: MediaKind;
  defaultValue: string;
  placeholder: string;
  store: MediaStore;
  onBusyChange: (busy: boolean) => void;
}) {
  const [url, setUrl] = useState(defaultValue);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    const tooBig = mediaLimitError(file.size, kind);
    if (tooBig) {
      setError(tooBig);
      return;
    }
    setError(null);
    setProgress(0);
    onBusyChange(true);
    try {
      setUrl(await uploadMedia(file, kind, store, setProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Файл оруулахад алдаа гарлаа.");
    } finally {
      setProgress(null);
      onBusyChange(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <div className="flex gap-2">
        <Input id={name} name={name} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={placeholder} />
        <input
          ref={picker}
          type="file"
          accept={ACCEPT[kind]}
          className="hidden"
          aria-label={`${label}: файл сонгох`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        <Button type="button" variant="outline" onClick={() => picker.current?.click()} disabled={progress !== null}>
          {progress !== null ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {progress !== null ? `${progress}%` : "Файл сонгох"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {url && !isAllowedMediaUrl(url) && (
        <p className="text-xs text-amber-700">https://-ээр эхэлсэн хаяг оруулах эсвэл «Файл сонгох» ашиглана уу.</p>
      )}
      {/* Only preview real addresses: a half-typed one would be fetched on every keystroke. */}
      {url && isAllowedMediaUrl(url) && (
        <div className="flex items-start gap-2">
          {kind === "image" ? (
            <img src={url} alt="" className="max-h-40 rounded-md border" />
          ) : (
            <audio src={url} controls className="w-full" preload="metadata" />
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setUrl("")}>
            <X className="size-4" />
            Арилгах
          </Button>
        </div>
      )}
    </div>
  );
}
