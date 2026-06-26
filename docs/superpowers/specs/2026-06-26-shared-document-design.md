# Shared Document Feature — Design Spec

**Date:** 2026-06-26
**Status:** Approved

---

## Overview

A sidebar panel that lets any authenticated team member upload and browse shared documents and images. All members can upload and delete any document. Updates are realtime for all connected users.

**Accepted file types:** PDF, Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx), Markdown (.md)
**Max file size:** 10 MB per file
**Storage service:** Supabase Storage (free tier — 1 GB storage, 2 GB bandwidth/month; already in use)

---

## Data Layer

### Postgres table: `documents`

```sql
create table documents (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  storage_path  text not null,
  mime_type     text not null,
  size_bytes    bigint not null,
  uploaded_by   uuid not null references profiles(id),
  created_at    timestamptz not null default now()
);
```

### RLS policies

- `SELECT`: any authenticated user
- `INSERT`: any authenticated user (own rows only via `uploaded_by = auth.uid()`)
- `DELETE`: any authenticated user (open deletion, mirrors Team Todolist)

### Supabase Storage bucket: `shared-documents`

- Authenticated users can upload and download
- Authenticated users can delete any object
- File path pattern: `{userId}/{uuid}-{originalFilename}`

### Realtime

Add `documents` table to the realtime publication so inserts and deletes propagate instantly to all connected clients.

### Migration

One new migration file: `supabase/migrations/0005_shared_documents.sql`

---

## API / Server Actions

Located in `app/api/documents/` (consistent with existing API pattern).

### `uploadDocument(file: File)`

1. Validate MIME type against allowlist.
2. Validate size ≤ 10 MB.
3. Upload file to Supabase Storage at `{userId}/{uuid}-{filename}`.
4. Insert metadata row into `documents`.
5. Return the new document row.

**Allowed MIME types:**
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `application/vnd.ms-powerpoint`
- `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- `text/markdown`

### `getDocuments()`

- Fetches all rows from `documents` ordered by `created_at DESC`.
- Called once on mount; realtime subscription handles subsequent changes.

### `deleteDocument(id: string, storagePath: string)`

1. Delete Storage object at `storagePath`.
2. Delete DB row by `id`.
3. Both must succeed; surface error if either fails.

---

## UI — Sidebar Panel

New `SharedDocuments` component added to the sidebar, visually consistent with the Team Todolist and TBD Blockers panels.

### Layout

```
[ Shared Documents ]                    [+ Upload]
────────────────────────────────────────────────
  📄 Q2-report.pdf          Ian · 2h ago   [↓] [🗑]
  📝 onboarding.md          Danny · 1d ago [↓] [🗑]
  📊 budget.xlsx            Ian · 3d ago   [↓] [🗑]
────────────────────────────────────────────────
  (empty state: "No documents yet. Upload one.")
```

### Behavior

- **Upload button** — triggers a hidden `<input type="file">` with `accept` restricted to allowed MIME types. Shows a loading spinner during upload.
- **Each row** — file type icon, filename, uploader display name, relative timestamp, download link (signed URL, opens in new tab), delete button.
- **Realtime** — subscribes to `documents` table on mount (insert/delete events). Same pattern as task realtime subscriptions.
- **Error handling** — inline error message below the upload button for validation failures (wrong type, too large) and network errors.
- **Empty state** — friendly prompt shown when no documents exist.

---

## Out of Scope

- In-browser preview/rendering of documents
- Per-member document sections
- Folder/tag organization
- Edit or rename after upload
- Version history

---

## Risks

- Supabase Storage free tier is 1 GB total. For a 5–10 person team sharing occasional docs this is ample, but worth monitoring if usage grows.
- Word/PPT files have no in-browser preview; download is the only viewing option.
