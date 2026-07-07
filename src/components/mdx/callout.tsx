import { Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function Callout({
  type = "info",
  children,
}: {
  type?: "info" | "warning";
  children: React.ReactNode;
}) {
  const Icon = type === "warning" ? TriangleAlert : Info;
  return (
    <div
      className={cn(
        "my-6 flex gap-3 rounded-lg border p-4 text-sm [&_p]:my-0",
        type === "warning"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
          : "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-200"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
