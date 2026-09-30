"use client";

import { useState } from "react";
import { Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Reveals a challenge's hint on request; the first reveal costs 30% of the XP. */
export function HintBox({
  challengeId,
  alreadyPassed,
  hintAlreadyUsed,
  onError,
}: {
  challengeId: string;
  alreadyPassed: boolean;
  hintAlreadyUsed: boolean;
  onError: (message: string) => void;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const [hintUsed, setHintUsed] = useState(hintAlreadyUsed);
  const [loading, setLoading] = useState(false);

  async function fetchHint() {
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/hint`, { method: "POST" });
      const data = (await res.json()) as { hint?: string; message?: string };
      if (res.ok && data.hint) {
        setHint(data.hint);
        setHintUsed(true);
      } else {
        onError(data.message ?? "Hint авахад алдаа гарлаа.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      {hint ? (
        <div className="flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p className="text-amber-900 dark:text-amber-200">{hint}</p>
        </div>
      ) : (
        <Button onClick={fetchHint} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
          {alreadyPassed || hintUsed ? "Hint харах" : "Hint авах (−30% XP)"}
        </Button>
      )}
    </div>
  );
}
