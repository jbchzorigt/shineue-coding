"use client";

import type { ReactNode, SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

/** The code block (```…```) holding `node`, if it sits inside `root`. */
function codeBlockOf(node: Node | null, root: Element): Element | null {
  const el = node instanceof Element ? node : (node?.parentElement ?? null);
  const pre = el?.closest("pre") ?? null;
  return pre && root.contains(pre) ? pre : null;
}

/** Copy or cut only when the whole selection lies in one code block. */
function guardClipboard(e: SyntheticEvent) {
  const sel = window.getSelection();
  const range = sel && sel.rangeCount === 1 ? sel.getRangeAt(0) : null;
  if (!range || !codeBlockOf(range.commonAncestorContainer, e.currentTarget)) e.preventDefault();
}

/** Right-click and drag work inside a code block only. */
function guardPointer(e: SyntheticEvent) {
  if (!codeBlockOf(e.target as Node, e.currentTarget)) e.preventDefault();
}

/**
 * Problem text a student can't select, copy, cut, drag or right-click, so it
 * can't be pasted into a chatbot in one move. Code blocks stay copyable: a
 * problem may hand out long input data there. A deterrent only: a screenshot
 * or the page source still has the text. `enabled={false}` is a plain div (staff).
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
      className={cn(
        "select-none [-webkit-touch-callout:none] [&_pre]:select-text [&_pre]:[-webkit-touch-callout:default]",
        className
      )}
      onCopy={guardClipboard}
      onCut={guardClipboard}
      onContextMenu={guardPointer}
      onDragStart={guardPointer}
    >
      {children}
    </div>
  );
}
