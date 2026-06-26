# Shared Document Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sidebar panel where any team member can upload, download, and delete shared documents (PDF, Word, Excel, PowerPoint, Markdown), stored in Supabase Storage.

**Architecture:** A new `documents` Postgres table stores metadata; a private Supabase Storage bucket `shared-documents` stores the actual files. The existing Dashboard component manages document state with `useState<Document[]>` (same pattern as `activity`), wires a realtime subscription into the existing `team-pulse` channel, and passes upload/delete/download handlers to a new `SharedDocuments` sidebar panel component.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase (Postgres + Storage + Realtime), Vitest

## Global Constraints

- Next.js App Router (not Pages Router) — server components in `app/`, client components with `"use client"` at the top
- TypeScript strict mode — no `any`, no implicit `any`
- Tailwind CSS only for styling — use existing `olivia-*` design tokens (e.g. `olivia-border`, `olivia-pink`, `olivia-cream`, `olivia-muted`, `olivia-bg`, `olivia-raised`)
- Max file size: 10 MB per upload
- Allowed MIME types: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-powerpoint`, `application/vnd.openxmlformats-officedocument.presentationml.presentation`, `text/markdown`
- Storage bucket name: `shared-documents` (private, not public)
- Migration filename: `supabase/migrations/0009_shared_documents.sql`
- Test runner: `npm test` (vitest)
- Typecheck: `npx tsc --noEmit`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/0009_shared_documents.sql`

**Interfaces:**
- Produces: `documents` table with columns `id`, `name`, `storage_path`, `mime_type`, `size_bytes`, `uploaded_by`, `created_at`; Supabase Storage bucket `shared-documents`; realtime publication for `documents` table

- [ ] **Step 1: Create the migration file**

```sql
-- ============================================================
-- 0009_shared_documents.sql - team-shared file library.
-- Run in the Supabase SQL editor (after 0008).
-- ============================================================

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  storage_path  text not null unique,
  mime_type     text not null,
  size_bytes    bigint not null,
  uploaded_by   uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.documents enable row level security;

create policy "team can read documents" on public.documents
  for select to authenticated using (true);

create policy "authenticated can upload" on public.documents
  for insert to authenticated
  with check (uploaded_by = (select auth.uid()));

create policy "anyone can delete documents" on public.documents
  for delete to authenticated using (true);

alter publication supabase_realtime add table public.documents;

-- Private storage bucket: reads require signed URLs.
insert into storage.buckets (id, name, public)
values ('shared-documents', 'shared-documents', false)
on conflict (id) do nothing;

create policy "authenticated can upload documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'shared-documents');

create policy "authenticated can download documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'shared-documents');

create policy "authenticated can delete documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'shared-documents');
```

- [ ] **Step 2: Run the migration**

Open **SQL Editor** in the Supabase dashboard, paste the contents of `supabase/migrations/0009_shared_documents.sql`, and run it.

Verify: the `documents` table appears in the Supabase Table Editor with the correct columns and RLS enabled. The `shared-documents` bucket appears under Storage.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0009_shared_documents.sql
git commit -m "feat: add shared_documents migration and storage bucket"
```

---

### Task 2: TypeScript Type + Document Helpers

**Files:**
- Modify: `lib/types.ts`
- Create: `lib/documents.ts`
- Create: `lib/__tests__/documents.test.ts`

**Interfaces:**
- Produces:
  - `Document` type (exported from `lib/types.ts`): `{ id: string; name: string; storage_path: string; mime_type: string; size_bytes: number; uploaded_by: string; created_at: string }`
  - `ALLOWED_MIME_TYPES: readonly string[]` (exported from `lib/documents.ts`)
  - `MAX_FILE_SIZE: number` = `10485760` (exported from `lib/documents.ts`)
  - `validateFile(file: File): string | null` — returns `null` if valid, error message string if invalid (exported from `lib/documents.ts`)
  - `fileIcon(mimeType: string): string` — returns an emoji (exported from `lib/documents.ts`)
  - `formatFileSize(bytes: number): string` — returns human-readable size string (exported from `lib/documents.ts`)

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/documents.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  validateFile,
  fileIcon,
  formatFileSize,
  MAX_FILE_SIZE,
} from "../documents";

function makeFile(name: string, type: string, size: number): File {
  return new File(["x".repeat(size)], name, { type });
}

describe("validateFile", () => {
  it("returns null for a valid PDF", () => {
    expect(validateFile(makeFile("a.pdf", "application/pdf", 1024))).toBeNull();
  });

  it("returns null for a markdown file", () => {
    expect(
      validateFile(makeFile("notes.md", "text/markdown", 512))
    ).toBeNull();
  });

  it("returns null for a docx file", () => {
    expect(
      validateFile(
        makeFile(
          "doc.docx",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          1024
        )
      )
    ).toBeNull();
  });

  it("returns an error for a disallowed type", () => {
    expect(
      validateFile(makeFile("photo.png", "image/png", 1024))
    ).not.toBeNull();
  });

  it("returns an error when file exceeds 10 MB", () => {
    expect(
      validateFile(makeFile("big.pdf", "application/pdf", MAX_FILE_SIZE + 1))
    ).not.toBeNull();
  });

  it("returns null for a file exactly at the size limit", () => {
    expect(
      validateFile(makeFile("ok.pdf", "application/pdf", MAX_FILE_SIZE))
    ).toBeNull();
  });
});

describe("fileIcon", () => {
  it("returns 📄 for PDF", () => {
    expect(fileIcon("application/pdf")).toBe("📄");
  });

  it("returns 📝 for markdown", () => {
    expect(fileIcon("text/markdown")).toBe("📝");
  });

  it("returns 📊 for xlsx", () => {
    expect(
      fileIcon(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe("📊");
  });

  it("returns 📊 for xls", () => {
    expect(fileIcon("application/vnd.ms-excel")).toBe("📊");
  });

  it("returns 📑 for pptx", () => {
    expect(
      fileIcon(
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      )
    ).toBe("📑");
  });

  it("returns 📑 for ppt", () => {
    expect(fileIcon("application/vnd.ms-powerpoint")).toBe("📑");
  });

  it("returns 📃 for Word doc", () => {
    expect(fileIcon("application/msword")).toBe("📃");
  });

  it("returns 📃 for docx", () => {
    expect(
      fileIcon(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toBe("📃");
  });
});

describe("formatFileSize", () => {
  it("formats bytes under 1 KB", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(2048)).toBe("2 KB");
  });

  it("formats megabytes to one decimal", () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });

  it("formats exactly 1 MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- lib/__tests__/documents.test.ts
```

Expected: FAIL with "Cannot find module '../documents'"

- [ ] **Step 3: Add the `Document` type to `lib/types.ts`**

Append to the bottom of `lib/types.ts` (after the existing exports):

```typescript
export interface Document {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}
```

- [ ] **Step 4: Create `lib/documents.ts`**

```typescript
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/markdown",
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export function validateFile(file: File): string | null {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "File type not allowed. Upload PDF, Word, Excel, PowerPoint, or Markdown files.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File too large. Maximum size is 10 MB.";
  }
  return null;
}

export function fileIcon(mimeType: string): string {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType === "text/markdown") return "📝";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📑";
  return "📃";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- lib/__tests__/documents.test.ts
```

Expected: all 17 tests PASS

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts lib/documents.ts lib/__tests__/documents.test.ts
git commit -m "feat: add Document type and file validation helpers"
```

---

### Task 3: SharedDocuments Sidebar Component

**Files:**
- Create: `components/SharedDocuments.tsx`

**Interfaces:**
- Consumes:
  - `Document` from `@/lib/types`: `{ id: string; name: string; storage_path: string; mime_type: string; size_bytes: number; uploaded_by: string; created_at: string }`
  - `Profile` from `@/lib/types`
  - `ALLOWED_MIME_TYPES`, `fileIcon`, `formatFileSize`, `validateFile` from `@/lib/documents`
- Produces:
  - `SharedDocuments` React component with props:
    ```typescript
    {
      documents: Document[];
      profiles: Record<string, Profile>;
      onUpload: (file: File) => Promise<void>;
      onDelete: (doc: Document) => Promise<void>;
      onDownload: (doc: Document) => Promise<void>;
    }
    ```

- [ ] **Step 1: Create `components/SharedDocuments.tsx`**

```tsx
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
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add components/SharedDocuments.tsx
git commit -m "feat: add SharedDocuments sidebar panel component"
```

---

### Task 4: Wire SharedDocuments into Dashboard

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/Dashboard.tsx`

**Interfaces:**
- Consumes:
  - `Document` from `@/lib/types`
  - `SharedDocuments` from `./SharedDocuments`
  - `ALLOWED_MIME_TYPES` is NOT used here — validation happens in the component via `validateFile`
- Produces: fully wired feature — documents load on page load, update in realtime, upload/delete/download work end-to-end

#### Part A: Fetch initial documents in `app/page.tsx`

- [ ] **Step 1: Add documents fetch to `app/page.tsx`**

Replace the `Promise.all` block and `return` statement. The full new content of `app/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/Dashboard";
import type { ActivityRow } from "@/lib/activity";
import type { Document } from "@/lib/types";
import { recentTaskCutoffIso } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cutoff = recentTaskCutoffIso();
  const [profiles, tasks, teamItems, activity, documents] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase
      .from("tasks")
      .select("*")
      .or(`status.eq.inprogress,completed_at.gte.${cutoff}`),
    supabase.from("team_items").select("*"),
    supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <Dashboard
      initialProfiles={profiles.data ?? []}
      initialTasks={tasks.data ?? []}
      initialTeamItems={teamItems.data ?? []}
      initialActivity={(activity.data ?? []) as ActivityRow[]}
      initialDocuments={(documents.data ?? []) as Document[]}
      currentUserId={user.id}
    />
  );
}
```

#### Part B: Add document state, handlers, realtime, and render in `components/Dashboard.tsx`

- [ ] **Step 2: Add the `Document` import and `initialDocuments` prop**

At the top of `components/Dashboard.tsx`, add `Document` to the types import:

```typescript
import type { Profile, Task, TeamItem, Document } from "@/lib/types";
```

Add `SharedDocuments` to the component imports (near the other component imports):

```typescript
import { SharedDocuments } from "./SharedDocuments";
```

Add `initialDocuments` to the Dashboard props interface and function signature:

```typescript
export function Dashboard({
  initialProfiles,
  initialTasks,
  initialTeamItems,
  initialActivity,
  initialDocuments,
  currentUserId,
}: {
  initialProfiles: Profile[];
  initialTasks: Task[];
  initialTeamItems: TeamItem[];
  initialActivity: ActivityRow[];
  initialDocuments: Document[];
  currentUserId: string;
}) {
```

- [ ] **Step 3: Add documents state**

After the `const [activity, setActivity] = useState<ActivityRow[]>(initialActivity);` line, add:

```typescript
const [documents, setDocuments] = useState<Document[]>(initialDocuments);
```

- [ ] **Step 4: Add the documents realtime handler to the existing channel**

Inside the `useEffect` for realtime (the one that creates `const channel = supabase.channel("team-pulse")`), add a new `.on()` binding after the `activity_log` one (before `.subscribe(...)`):

```typescript
.on(
  "postgres_changes",
  { event: "*", schema: "public", table: "documents" },
  (payload) => {
    if (payload.eventType === "DELETE") {
      const id = (payload.old as { id?: string }).id;
      if (id) setDocuments((prev) => prev.filter((d) => d.id !== id));
    } else {
      const row = payload.new as Document;
      setDocuments((prev) =>
        prev.some((d) => d.id === row.id)
          ? prev.map((d) => (d.id === row.id ? row : d))
          : [row, ...prev].sort((a, b) =>
              b.created_at.localeCompare(a.created_at)
            )
      );
    }
  }
)
```

- [ ] **Step 5: Add the documents fetch inside the `hydrate` function**

Inside the `hydrate` async function, add `documents` to the `Promise.all`. Replace:

```typescript
const [p, t, i, a] = await Promise.all([
  supabase.from("profiles").select("*"),
  supabase
    .from("tasks")
    .select("*")
    .or(`status.eq.inprogress,completed_at.gte.${cutoff}`),
  supabase.from("team_items").select("*"),
  supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50),
]);
if (p.error || t.error || i.error) {
  throw p.error ?? t.error ?? i.error;
}
```

With:

```typescript
const [p, t, i, a, docs] = await Promise.all([
  supabase.from("profiles").select("*"),
  supabase
    .from("tasks")
    .select("*")
    .or(`status.eq.inprogress,completed_at.gte.${cutoff}`),
  supabase.from("team_items").select("*"),
  supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50),
  supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false }),
]);
if (p.error || t.error || i.error) {
  throw p.error ?? t.error ?? i.error;
}
```

And after `if (a.data) setActivity(a.data as ActivityRow[]);`, add:

```typescript
if (docs.data) setDocuments(docs.data as Document[]);
```

- [ ] **Step 6: Add the upload handler**

Add the following function inside `Dashboard`, after the existing `dismissTeamItem` function:

```typescript
async function uploadDocument(file: File) {
  const path = `${currentUserId}/${crypto.randomUUID()}-${file.name}`;
  const { error: storageError } = await supabase.storage
    .from("shared-documents")
    .upload(path, file, { contentType: file.type });
  if (storageError) {
    showToast("Upload failed — try again");
    return;
  }
  const { error: dbError } = await supabase.from("documents").insert({
    name: file.name,
    storage_path: path,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: currentUserId,
  });
  if (dbError) {
    await supabase.storage.from("shared-documents").remove([path]);
    showToast("Upload failed — try again");
  }
}
```

- [ ] **Step 7: Add the delete handler**

Add after `uploadDocument`:

```typescript
async function deleteDocument(doc: Document) {
  setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  const { error: storageError } = await supabase.storage
    .from("shared-documents")
    .remove([doc.storage_path]);
  if (storageError) {
    setDocuments((prev) =>
      [...prev, doc].sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
    showToast("Couldn't delete — try again");
    return;
  }
  const { error: dbError } = await supabase
    .from("documents")
    .delete()
    .eq("id", doc.id);
  if (dbError) {
    setDocuments((prev) =>
      [...prev, doc].sort((a, b) => b.created_at.localeCompare(a.created_at))
    );
    showToast("Couldn't delete — try again");
  }
}
```

- [ ] **Step 8: Add the download handler**

Add after `deleteDocument`:

```typescript
async function downloadDocument(doc: Document) {
  const { data, error } = await supabase.storage
    .from("shared-documents")
    .createSignedUrl(doc.storage_path, 3600);
  if (error || !data) {
    showToast("Couldn't generate download link — try again");
    return;
  }
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
```

- [ ] **Step 9: Render `<SharedDocuments>` in the sidebar**

In the `return` JSX, inside the `<aside>` element (after `<TbdList ... />`), add:

```tsx
<SharedDocuments
  documents={documents}
  profiles={store.profiles}
  onUpload={uploadDocument}
  onDelete={deleteDocument}
  onDownload={downloadDocument}
/>
```

- [ ] **Step 10: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 11: Run full test suite**

```bash
npm test
```

Expected: all tests pass (the new documents tests from Task 2 plus all pre-existing tests)

- [ ] **Step 12: Commit**

```bash
git add app/page.tsx components/Dashboard.tsx
git commit -m "feat: wire SharedDocuments panel into Dashboard with upload, delete, and download"
```

---

## Manual Verification Checklist

After all tasks are complete, verify end-to-end in the browser with `npm run dev`:

- [ ] Shared Documents panel appears in the sidebar below TBD Blockers
- [ ] Uploading a PDF adds it to the list immediately (optimistic via realtime)
- [ ] Uploading an image file (e.g. `.png`) shows a validation error and does not upload
- [ ] Uploading a file larger than 10 MB shows a validation error
- [ ] Clicking the download icon generates a signed URL and opens the file in a new tab
- [ ] Clicking the delete icon removes the document from the list immediately
- [ ] Opening the app in a second browser tab and uploading a document — it appears in the first tab in real time
- [ ] Empty state ("No documents yet. Upload one.") shows when no documents exist
