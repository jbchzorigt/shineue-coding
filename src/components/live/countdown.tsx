"use client";

import { useEffect, useState } from "react";
import { contestStatus } from "@/lib/contest-status";
import { formatDuration } from "@/lib/live-board";

/** Time to the start, or to the end while running; ticks every second. */
export function Countdown({ startsAt, endsAt }: { startsAt: number; endsAt: number }) {
  // Null until mounted: the server's clock would not match the browser's.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (now === null) return <span className="tabular-nums">&nbsp;</span>;
  const status = contestStatus({ starts_at: startsAt, ends_at: endsAt }, now);
  return (
    <span className="tabular-nums">
      {status === "upcoming" && `Эхлэх хүртэл ${formatDuration(startsAt - now)}`}
      {status === "running" && `Дуусах хүртэл ${formatDuration(endsAt - now)}`}
      {status === "finished" && "Дууссан"}
    </span>
  );
}
