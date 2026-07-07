"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { CheckCircle2, EyeOff, Loader2, Send, Star, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TestResultDto } from "@/app/api/challenges/[challengeId]/submit/route";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-lg border bg-[#1e1e1e] text-sm text-white/60">
      Editor ачаалж байна…
    </div>
  ),
});

interface SubmitResponse {
  results: TestResultDto[];
  passedTests: number;
  totalTests: number;
  score: number;
  bestScore: number;
  improved: boolean;
  maxPoints: number;
  message?: string;
}

export function ContestRunner({
  contestId,
  problemId,
  initialCode,
  disabled,
}: {
  contestId: string;
  problemId: string;
  initialCode: string;
  /** Contest not running (for students) — editor visible, submit blocked. */
  disabled: boolean;
}) {
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<SubmitResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setErrorMsg(null);
    setResponse(null);
    try {
      const res = await fetch(
        `/api/contests/${contestId}/problems/${problemId}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        }
      );
      const data = (await res.json()) as SubmitResponse;
      if (!res.ok) {
        setErrorMsg(data.message ?? "Алдаа гарлаа. Дахин оролдоно уу.");
      } else {
        setResponse(data);
      }
    } catch {
      setErrorMsg("Сервертэй холбогдож чадсангүй.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border">
        <MonacoEditor
          height="300px"
          language="python"
          theme="vs-dark"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            tabSize: 4,
            automaticLayout: true,
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={submitting || disabled} size="lg">
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {submitting ? "Шалгаж байна…" : "Илгээх"}
        </Button>
        {disabled && (
          <span className="text-sm text-muted-foreground">
            Тэмцээн явагдаж байх үед л илгээх боломжтой.
          </span>
        )}
      </div>

      {errorMsg && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMsg}
        </p>
      )}

      {response && (
        <Card
          className={cn(
            response.passedTests === response.totalTests
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-amber-500/40"
          )}
        >
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {response.passedTests === response.totalTests ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <XCircle className="size-5 text-amber-600" />
              )}
              {response.passedTests} / {response.totalTests} тест давлаа
              <span className="ml-auto flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-sm text-primary-foreground">
                <Star className="size-4" />
                {response.score} / {response.maxPoints} оноо
              </span>
            </CardTitle>
            {response.improved ? (
              <p className="text-sm font-medium text-emerald-600">
                🎉 Шинэ дээд оноо! Leaderboard шинэчлэгдлээ.
              </p>
            ) : (
              response.bestScore > 0 && (
                <p className="text-sm text-muted-foreground">
                  Таны дээд оноо: {response.bestScore}
                </p>
              )
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {response.results.map((r, i) =>
              r.hidden ? (
                <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/40 p-2.5 text-sm">
                  {r.passed ? (
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 shrink-0 text-destructive" />
                  )}
                  <EyeOff className="size-4 shrink-0 text-muted-foreground" />
                  Нууц тест {i + 1}: {r.passed ? "амжилттай" : "амжилтгүй"}
                </div>
              ) : (
                <div key={i} className="rounded-md border p-2.5 text-sm">
                  <div className="mb-1 flex items-center gap-2 font-medium">
                    {r.passed ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : (
                      <XCircle className="size-4 text-destructive" />
                    )}
                    Тест {i + 1}
                  </div>
                  {!r.passed && (
                    <div className="ml-6 grid gap-1 font-mono text-xs sm:grid-cols-3">
                      <p><span className="text-muted-foreground">Оролт: </span>{r.input}</p>
                      <p><span className="text-muted-foreground">Хүлээгдэж буй: </span>{r.expected}</p>
                      <p className={r.error ? "text-destructive" : ""}>
                        <span className="text-muted-foreground">{r.error ? "Алдаа: " : "Гаралт: "}</span>
                        {r.actual}
                      </p>
                    </div>
                  )}
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
