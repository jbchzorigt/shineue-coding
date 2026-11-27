const FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ulaanbaatar",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function parts(ms: number): Record<string, string> {
  return Object.fromEntries(FORMAT.formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
}

/** "2026-03-01 17:05:07" in school time. */
export function formatDateTime(ms: number): string {
  const part = parts(ms);
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}:${part.second}`;
}

/** "17:05:07" in school time — identical on the server and in any browser, so safe in client components. */
export function formatClock(ms: number): string {
  const part = parts(ms);
  return `${part.hour}:${part.minute}:${part.second}`;
}
