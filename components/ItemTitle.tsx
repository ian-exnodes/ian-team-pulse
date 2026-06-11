"use client";

import { useRef, useState } from "react";
import { jiraKeyFromUrl } from "@/lib/jira";

// Single-line label for task/todo rows: truncates long text, and a Jira
// browse link adds a highlighted "[CPD-3384]" issue key before the title.
// Hovering a truncated row shows the full text in a tooltip; rows that
// already fit get no tooltip noise.
export function ItemTitle({
  text,
  link,
  className,
}: {
  text: string;
  link: string | null;
  className: string;
}) {
  const jiraKey = jiraKeyFromUrl(link);
  const textRef = useRef<HTMLSpanElement>(null);
  const [showTip, setShowTip] = useState(false);

  return (
    <span
      className="relative min-w-0 flex-1"
      onMouseEnter={() => {
        const el = textRef.current;
        if (el && el.scrollWidth > el.clientWidth) setShowTip(true);
      }}
      onMouseLeave={() => setShowTip(false)}
    >
      <span ref={textRef} className={`block truncate ${className}`}>
        {jiraKey && (
          <span className="font-medium text-olivia-pink">[{jiraKey}]</span>
        )}
        {jiraKey && " "}
        {text}
      </span>
      {showTip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-0 top-full z-20 mt-1 block w-max max-w-72 whitespace-normal rounded-lg border border-olivia-border bg-olivia-raised px-2.5 py-1.5 text-xs leading-snug text-olivia-cream shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
