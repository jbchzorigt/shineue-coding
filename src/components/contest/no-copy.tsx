"use client";

import type { ReactNode, SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

const block = (e: SyntheticEvent) => e.preventDefault();

/**
 * Problem text a student can't select, copy, cut, drag or right-click, so it
 * can't be pasted into a chatbot in one move. A deterrent only: a screenshot
 * or the page source still has it. `enabled={false}` is a plain div (staff).
 */
export function NoCopy({
  enabled,
  className,
  children,
}: {
  enabled: boolean;
  className?: string;
  children: ReactNode;
}) {
  if (!enabled) return <div className={className}>{children}</div>;
  return (
    <div
      // touch-callout: no copy menu on a long press on iPhone/iPad.
      className={cn("select-none [-webkit-touch-callout:none]", className)}
      onCopy={block}
      onCut={block}
      onContextMenu={block}
      onDragStart={block}
    >
      {children}
    </div>
  );
}
