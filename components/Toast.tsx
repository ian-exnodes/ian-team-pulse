"use client";

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-red-400/40 bg-olivia-raised px-4 py-2 text-sm font-medium text-red-300 shadow-lg">
      {message}
    </div>
  );
}
