"use client";

import { useEffect, useRef } from "react";
import type ApexCharts from "apexcharts";
import type { ScorePoint } from "@/lib/contest-timeline";

export interface RaceSeries {
  name: string;
  data: ScorePoint[];
  /** The viewer's own line — drawn thicker. */
  mine: boolean;
}

const CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ulaanbaatar",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const CLOCK_SECONDS = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ulaanbaatar",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** Each participant's total over the contest, as step lines (school time). */
export function ScoreRaceChart({
  series,
  start,
  end,
  maxTotal,
}: {
  series: RaceSeries[];
  start: number;
  end: number;
  maxTotal: number;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let chart: ApexCharts | null = null;
    let cancelled = false;
    // apexcharts touches `window` on import, so it loads in the browser only.
    import("apexcharts").then(({ default: Apex }) => {
      if (cancelled || !box.current) return;
      const dark = document.documentElement.classList.contains("dark");
      const options: ApexCharts.ApexOptions = {
        chart: {
          type: "line",
          height: 340,
          fontFamily: "inherit",
          background: "transparent",
          zoom: { enabled: false },
          toolbar: { show: false },
          animations: { enabled: false },
        },
        theme: { mode: dark ? "dark" : "light" },
        series: series.map((s) => ({ name: s.name, data: s.data })),
        stroke: { curve: "stepline", width: series.map((s) => (s.mine ? 4 : 2)) },
        markers: { size: 0, hover: { size: 4 } },
        xaxis: {
          type: "datetime",
          min: start,
          max: end,
          labels: { formatter: (value) => CLOCK.format(new Date(Number(value))) },
          tooltip: { enabled: false },
        },
        yaxis: { min: 0, max: Math.max(maxTotal, 1), forceNiceScale: true, title: { text: "Оноо" } },
        tooltip: {
          shared: false,
          x: { formatter: (value) => CLOCK_SECONDS.format(new Date(value)) },
          y: { formatter: (value) => `${value} оноо` },
        },
        legend: { position: "bottom", showForSingleSeries: true },
        grid: { strokeDashArray: 4 },
      };
      chart = new Apex(box.current, options);
      chart.render();
    });
    return () => {
      cancelled = true;
      chart?.destroy();
    };
  }, [series, start, end, maxTotal]);

  return <div ref={box} className="min-h-[340px]" />;
}
