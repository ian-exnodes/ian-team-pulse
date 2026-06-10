"use client";

import { useState } from "react";

export function QuickAddTask({
  placeholder,
  onAdd,
}: {
  placeholder: string;
  onAdd: (title: string, link: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd(trimmed, link.trim());
    setTitle("");
    setLink("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-olivia-border bg-olivia-raised px-2.5 py-1.5 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
      />
      <div className="flex gap-1.5">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link (optional)"
          className="min-w-0 flex-1 rounded-lg border border-olivia-border bg-olivia-raised px-2.5 py-1.5 text-xs text-olivia-muted outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
        />
        <button
          type="submit"
          className="rounded-lg bg-olivia-pink px-3 py-1.5 text-xs font-medium text-olivia-bg hover:bg-olivia-pink-deep"
        >
          Add
        </button>
      </div>
    </form>
  );
}
