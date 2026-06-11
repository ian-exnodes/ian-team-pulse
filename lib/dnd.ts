// Pure drag-drop resolution: given what's being dragged and the profile card
// it was dropped on, decide which mutation (if any) should fire. Kept free of
// React/dnd-kit so it can be unit-tested directly.

export type DraggedItem =
  | { kind: "task"; id: string; assigneeId: string }
  | { kind: "todo"; id: string };

export type DropAction =
  | { type: "reassign"; taskId: string; to: string }
  | { type: "convert"; itemId: string; to: string };

export function resolveDrop(
  dragged: DraggedItem,
  targetProfileId: string
): DropAction | null {
  if (dragged.kind === "task") {
    // Dropping a task on the card it already belongs to is a no-op.
    if (dragged.assigneeId === targetProfileId) return null;
    return { type: "reassign", taskId: dragged.id, to: targetProfileId };
  }
  return { type: "convert", itemId: dragged.id, to: targetProfileId };
}
