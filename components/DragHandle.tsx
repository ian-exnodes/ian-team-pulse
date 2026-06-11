"use client";

import { useDraggable } from "@dnd-kit/core";
import type { DraggedItem } from "@/lib/dnd";

// A small grip that makes its row draggable. Using a dedicated handle (rather
// than the whole row) keeps the mark-done button and link icon clickable
// without click-vs-drag ambiguity.
export function DragHandle({
  dragId,
  item,
  label,
}: {
  dragId: string;
  item: DraggedItem;
  label: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: item,
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-label={`Drag to assign: ${label}`}
      title="Drag to assign to another member"
      className={`shrink-0 cursor-grab touch-none text-olivia-muted hover:text-olivia-pink active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden>
        <circle cx="3" cy="3" r="1.4" />
        <circle cx="9" cy="3" r="1.4" />
        <circle cx="3" cy="8" r="1.4" />
        <circle cx="9" cy="8" r="1.4" />
        <circle cx="3" cy="13" r="1.4" />
        <circle cx="9" cy="13" r="1.4" />
      </svg>
    </button>
  );
}
