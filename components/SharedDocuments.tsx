"use client";

import { useRef, useState } from "react";
import type { Document, Profile } from "@/lib/types";
import {
  ALLOWED_MIME_TYPES,
  fileIcon,
  formatFileSize,
  validateFile,
} from "@/lib/documents";

export function SharedDocuments({
  documents,
  profiles,
  onUpload,
  onDelete,
  onDownload,
}: {
  documents: Document[];
  profiles: Record<string, Profile>;
  onUpload: (file: File) => Promise<void>;
  onDelete: (doc: Document) => Promise<void>;
  onDownload: (doc: Document) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
    }
  }

  const accept = ALLOWED_MIME_TYPES.join(",");

  return (
    <section className="rounded-2xl border border-olivia-border bg-olivia-bg/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
          <span className="inline-block h-2 w-2 rounded-xs bg-olivia-pink" />
          Shared Documents
        </h2>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1 rounded-lg border border-olivia-border px-2 py-1 text-xs text-olivia-cream hover:bg-olivia-raised disabled:opacity-50"
          aria-label="Upload document"
        >
          {uploading ? "Uploading…" : "+ Upload"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p className="mb-2 text-xs text-olivia-pink" role="alert">
          {error}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="text-sm text-olivia-muted/70">
          No documents yet. Upload one.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => {
            const uploader = profiles[doc.uploaded_by];
            return (
              <li key={doc.id} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true">{fileIcon(doc.mime_type)}</span>
                <span
                  className="min-w-0 flex-1 truncate text-olivia-cream"
                  title={doc.name}
                >
                  {doc.name}
                </span>
                <span className="shrink-0 text-xs text-olivia-muted/70">
                  {uploader?.display_name ?? "Unknown"} ·{" "}
                  {formatFileSize(doc.size_bytes)}
                </span>
                <button
                  onClick={() => void onDownload(doc)}
                  title="Download"
                  aria-label={`Download ${doc.name}`}
                  className="shrink-0 text-olivia-muted/60 hover:text-olivia-cream"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    className="h-4 w-4"
                  >
                    <path d="M8 2v8M5 7l3 3 3-3M2.5 12h11" />
                  </svg>
                </button>
                <button
                  onClick={() => void onDelete(doc)}
                  title="Delete"
                  aria-label={`Delete ${doc.name}`}
                  className="shrink-0 text-olivia-muted/60 hover:text-olivia-pink"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    className="h-4 w-4"
                  >
                    <path d="M2.5 4h11M6.5 4V2.75A.75.75 0 0 1 7.25 2h1.5a.75.75 0 0 1 .75.75V4M5 4l.5 9.25a1 1 0 0 0 1 .75h3a1 1 0 0 0 1-.75L11 4M6.75 7v4M9.25 7v4" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
