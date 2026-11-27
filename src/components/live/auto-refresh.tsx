"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 15_000;
/** Keep refreshing a minute past the end, so the final scores land. */
const STOP_AFTER_MS = 60_000;
/** Dispatched on window at each refresh (the ↻ icon spins on it). */
export const LIVE_REFRESH_EVENT = "live-refresh";

/** Re-renders the page from the server every 15 s while it is visible. */
export function AutoRefresh({ until }: { until: number }) {
  const router = useRouter();
  useEffect(() => {
    const live = () => Date.now() <= until + STOP_AFTER_MS;
    const refresh = () => {
      window.dispatchEvent(new Event(LIVE_REFRESH_EVENT));
      router.refresh();
    };
    const id = setInterval(() => {
      if (!live()) clearInterval(id);
      else if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && live()) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, until]);
  return null;
}
