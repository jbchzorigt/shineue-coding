"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  PartyPopper,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ChallengeType } from "@/lib/types";

interface QuizResponse {
  passed: boolean;
  xpAwarded: number;
  unlockedModule: { id: string; title: string } | null;
  markScheme?: string;
  message?: string;
}

export function ChallengeQuiz({
  challengeId,
  type,
  options,
  alreadyPassed,
  initialAnswer,
}: {
  challengeId: string;
  type: Exclude<ChallengeType, "coding">;
  options?: string[];
  alreadyPassed: boolean;
  initialAnswer: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<string | null>(null);
  const [answer, setAnswer] = useState(initialAnswer);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<QuizResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [markScheme, setMarkScheme] = useState<string | null>(null);

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as QuizResponse;
      if (!res.ok) {
        setErrorMsg(data.message ?? "Алдаа гарлаа. Дахин оролдоно уу.");
      } else {
        setResponse(data);
        if (data.markScheme) setMarkScheme(data.markScheme);
      }
    } catch {
      setErrorMsg("Сервертэй холбогдож чадсангүй.");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (type === "mcq") {
      if (selectedIndex === null) {
        setErrorMsg("Хариултаа сонгоно уу.");
        return;
      }
      void send({ answerIndex: Number(selectedIndex) });
    } else {
      void send({ answer });
    }
  }

  const passed = response?.passed ?? false;

  return (
    <div className="space-y-4">
      {type === "mcq" && options && (
        <RadioGroup
          value={selectedIndex ?? ""}
          onValueChange={(v) => setSelectedIndex(String(v))}
          className="gap-2"
        >
          {options.map((opt, i) => (
            <Label
              key={i}
              className="flex cursor-pointer items-center gap-3 rounded-lg border bg-background p-3.5 font-normal transition-colors has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
            >
              <RadioGroupItem value={String(i)} />
              {opt}
            </Label>
          ))}
        </RadioGroup>
      )}

      {(type === "tracing" || type === "theory") && (
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={
            type === "tracing"
              ? "Программын гаралтыг яг хэвлэгдэх хэлбэрээр нь бичнэ үү…"
              : "Хариултаа дэлгэрэнгүй бичнэ үү…"
          }
          className={cn(
            "min-h-32 bg-background",
            type === "tracing" && "font-mono"
          )}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={submit} disabled={busy || passed} size="lg">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {type === "theory" ? "Хариулт илгээх" : "Хариулт шалгуулах"}
        </Button>
        {alreadyPassed && !response && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="size-4" />
            Өмнө нь амжилттай бодсон
          </span>
        )}
      </div>

      {errorMsg && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      {markScheme && (
        <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-4 text-sm">
          <p className="mb-2 flex items-center gap-2 font-semibold">
            <ClipboardCheck className="size-4" />
            Үнэлгээний схем (mark scheme)
          </p>
          <p className="whitespace-pre-wrap">{markScheme}</p>
          {!passed && (
            <Button
              onClick={() => void send({ selfAssess: true })}
              disabled={busy}
              size="sm"
              className="mt-3"
            >
              <CheckCircle2 className="size-4" />
              Миний хариулт схемтэй нийцэж байна
            </Button>
          )}
        </div>
      )}

      {response && type !== "theory" && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border p-4 text-sm font-medium",
            passed
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          {passed ? (
            <>
              <CheckCircle2 className="size-5" />
              Зөв байна!
              {response.xpAwarded > 0 && (
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs text-white">
                  🏆 +{response.xpAwarded} XP
                </span>
              )}
            </>
          ) : (
            <>
              <XCircle className="size-5" />
              Буруу байна — дахин бодоод оролдоорой.
            </>
          )}
        </div>
      )}

      {response && type === "theory" && passed && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="size-5" />
          Даалгавар дууслаа!
          {response.xpAwarded > 0 && (
            <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs text-white">
              🏆 +{response.xpAwarded} XP
            </span>
          )}
        </div>
      )}

      {response?.unlockedModule && (
        <div className="flex items-center gap-3 rounded-lg border border-violet-500/40 bg-violet-500/10 p-4 text-sm">
          <PartyPopper className="size-5 shrink-0 text-violet-600" />
          <p>
            Модуль дууслаа!{" "}
            <Link
              href={`/modules/${response.unlockedModule.id}`}
              className="font-semibold underline underline-offset-4"
            >
              «{response.unlockedModule.title}»
            </Link>{" "}
            нээгдлээ 🎉
          </p>
        </div>
      )}
    </div>
  );
}
