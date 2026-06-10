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
        className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
      />
      <div className="flex gap-1.5">
        <input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Link (optional)"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 outline-none placeholder:text-slate-400 focus:border-slate-400"
        />
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
        >
          Add
        </button>
      </div>
    </form>
  );
}
