"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_MS = 15_000;
/** Keep refreshing a minute past the end, so the final scores land. */
const STOP_AFTER_MS = 60_000;

/** Re-renders the page from the server every 15 s while it is visible. */
export function AutoRefresh({ until }: { until: number }) {
  const router = useRouter();
  useEffect(() => {
    const live = () => Date.now() <= until + STOP_AFTER_MS;
    const id = setInterval(() => {
      if (!live()) clearInterval(id);
      else if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && live()) router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, until]);
  return null;
}
