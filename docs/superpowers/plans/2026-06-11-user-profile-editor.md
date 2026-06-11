# User Profile Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user change their avatar (photo/GIF upload to Supabase Storage) and display name from a header-avatar-triggered modal, synced live to the team.

**Architecture:** A new `avatars` storage bucket (one object per user, path = bare user id, RLS-bounded). A pure helper module `lib/avatar.ts` prepares uploads (canvas resize to 256×256 JPEG; GIFs pass through untouched under a 3 MB cap) and builds cache-busted public URLs. A new `ProfileEditModal` follows the ReportModal pattern; `Dashboard` owns the save flow with the codebase's optimistic-update + rollback dispatch pattern; the existing realtime `profiles` binding broadcasts changes.

**Tech Stack:** Next.js 16 / React 19, Supabase (storage + postgres + realtime), Tailwind v4, vitest (node env — no canvas in tests).

**Spec:** `docs/superpowers/specs/2026-06-11-user-profile-editor-design.md`

---

### Task 1: Avatars storage bucket migration

**Files:**
- Create: `supabase/migrations/0006_avatars_bucket.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Avatars: one public image per user, stored at the bare user id (no
-- extension) so switching jpg <-> gif overwrites the same object.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public bucket: reads go through the public object URL. Writes are
-- limited to your own single object.
create policy "upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text);

create policy "replace own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text);
```

- [ ] **Step 2: Apply the migration**

If the Supabase CLI is linked to the project: `npx supabase db push`.
Otherwise paste the SQL into the Supabase dashboard SQL editor and run it
(same procedure as previous migrations; see `DEPLOY.md`).
Expected: bucket `avatars` appears under Storage, public.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0006_avatars_bucket.sql
git commit -m "Add avatars storage bucket with per-user write policies"
```

---

### Task 2: `lib/avatar.ts` — prepare + URL helpers (TDD)

**Files:**
- Create: `lib/avatar.ts`
- Test: `lib/__tests__/avatar.test.ts`

vitest runs in a node environment: `File` and `Blob` exist (Node 24), but
canvas/`createImageBitmap` do not — so tests cover `avatarPublicUrl`, the
GIF pass-through, the GIF size cap, and unsupported-type rejection. The
canvas resize path is verified manually in Task 5.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/__tests__/avatar.test.ts
import { describe, expect, it } from "vitest";
import { avatarPublicUrl, MAX_GIF_BYTES, prepareAvatar } from "../avatar";

describe("avatarPublicUrl", () => {
  it("builds the public object URL with a version param", () => {
    expect(avatarPublicUrl("https://abc.supabase.co", "user-1", 1770000000000)).toBe(
      "https://abc.supabase.co/storage/v1/object/public/avatars/user-1?v=1770000000000"
    );
  });

  it("tolerates a trailing slash on the base URL", () => {
    expect(avatarPublicUrl("https://abc.supabase.co/", "user-1", 5)).toBe(
      "https://abc.supabase.co/storage/v1/object/public/avatars/user-1?v=5"
    );
  });
});

describe("prepareAvatar", () => {
  it("passes a small GIF through untouched (animation preserved)", async () => {
    const gif = new File([new Uint8Array(1024)], "party.gif", { type: "image/gif" });
    const result = await prepareAvatar(gif);
    expect(result.contentType).toBe("image/gif");
    expect(result.blob).toBe(gif); // identity: no re-encode
  });

  it("rejects a GIF over the size cap", async () => {
    const big = new File([new Uint8Array(MAX_GIF_BYTES + 1)], "huge.gif", { type: "image/gif" });
    await expect(prepareAvatar(big)).rejects.toThrow(/3 ?MB/i);
  });

  it("rejects unsupported types", async () => {
    const svg = new File(["<svg/>"], "a.svg", { type: "image/svg+xml" });
    await expect(prepareAvatar(svg)).rejects.toThrow(/unsupported/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/avatar.test.ts`
Expected: FAIL — cannot resolve `../avatar`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/avatar.ts
export const AVATAR_SIZE = 256;
export const MAX_GIF_BYTES = 3 * 1024 * 1024;

export type PreparedAvatar = { blob: Blob; contentType: "image/jpeg" | "image/gif" };

export function avatarPublicUrl(
  baseUrl: string,
  userId: string,
  version: number
): string {
  return `${baseUrl.replace(/\/$/, "")}/storage/v1/object/public/avatars/${userId}?v=${version}`;
}

// JPEG/PNG/WebP are center-cropped + downscaled to a small square JPEG.
// GIFs pass through untouched - a canvas pass would freeze the animation
// to its first frame - bounded by a size cap instead.
export async function prepareAvatar(file: File): Promise<PreparedAvatar> {
  if (file.type === "image/gif") {
    if (file.size > MAX_GIF_BYTES) {
      throw new Error("GIF is too large — keep it under 3 MB");
    }
    return { blob: file, contentType: "image/gif" };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Unsupported image type — use JPG, PNG, WebP, or GIF");
  }
  return { blob: await resizeToSquareJpeg(file), contentType: "image/jpeg" };
}

async function resizeToSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file); // rejects on broken images
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Couldn't encode image"))),
        "image/jpeg",
        0.85
      )
    );
  } finally {
    bitmap.close();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/avatar.test.ts`
Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/avatar.ts lib/__tests__/avatar.test.ts
git commit -m "Add avatar prepare/URL helpers (GIF pass-through, 3MB cap)"
```

---

### Task 3: `ProfileEditModal` component

**Files:**
- Create: `components/ProfileEditModal.tsx`

No component test framework in this repo (lib-only tests) — verified by
typecheck here and manually in Task 5.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { prepareAvatar, type PreparedAvatar } from "@/lib/avatar";
import type { Profile } from "@/lib/types";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

// Edit your own avatar + display name. Nothing uploads until Save;
// the preview shows the prepared blob (GIFs animate).
export function ProfileEditModal({
  open,
  profile,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  profile: Profile;
  saving: boolean;
  onClose: () => void;
  onSave: (displayName: string, avatar: PreparedAvatar | null) => void;
}) {
  const [name, setName] = useState(profile.display_name);
  const [avatar, setAvatar] = useState<PreparedAvatar | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Re-seed local state each time the modal opens.
  useEffect(() => {
    if (!open) return;
    setName(profile.display_name);
    setAvatar(null);
    setError(null);
    setPreviewUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return null;
    });
  }, [open, profile.display_name]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function pickFile(file: File | undefined) {
    if (!file) return;
    try {
      const prepared = await prepareAvatar(file);
      setAvatar(prepared);
      setError(null);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(prepared.blob);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that image");
    }
  }

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 1 && trimmed.length <= 80;
  const dirty = avatar !== null || trimmed !== profile.display_name;
  const shownAvatar = previewUrl ?? profile.avatar_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-olivia-border bg-olivia-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-olivia-cream">Edit profile</h2>
          <button
            onClick={onClose}
            className="text-olivia-muted hover:text-olivia-cream"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 flex flex-col items-center gap-3">
          {shownAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={shownAvatar}
              alt=""
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-olivia-raised text-2xl font-semibold text-olivia-pink">
              {initials(trimmed || profile.display_name)}
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => void pickFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-lg border border-olivia-border px-3 py-1.5 text-sm text-olivia-muted hover:bg-olivia-raised hover:text-olivia-cream"
          >
            Choose photo
          </button>
        </div>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-olivia-pink">
          Display name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="mb-1 w-full rounded-lg border border-olivia-border bg-olivia-raised px-2.5 py-1.5 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
        />
        {!nameValid && (
          <p className="text-xs text-red-400">Name must be 1–80 characters.</p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-olivia-border px-3 py-1.5 text-sm text-olivia-muted hover:bg-olivia-raised hover:text-olivia-cream"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(trimmed, avatar)}
            disabled={!nameValid || !dirty || saving}
            className="rounded-lg bg-olivia-pink px-4 py-1.5 text-sm font-medium text-olivia-bg hover:bg-olivia-pink-deep disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/ProfileEditModal.tsx
git commit -m "Add ProfileEditModal (avatar pick + name edit, no upload until save)"
```

---

### Task 4: Header avatar button

**Files:**
- Modify: `components/Header.tsx`

- [ ] **Step 1: Add `avatarUrl` + `onOpenProfile` props and the avatar button**

In the props type, after `displayName: string;` add:

```ts
  avatarUrl: string | null;
  onOpenProfile: () => void;
```

(and destructure `avatarUrl, onOpenProfile` in the parameter list).

Replace the name `<span>`:

```tsx
          <span className="hidden text-sm text-olivia-muted sm:inline">
            {displayName}
          </span>
```

with an avatar button followed by the same name span:

```tsx
          <button
            onClick={onOpenProfile}
            title="Edit profile"
            aria-label="Edit profile"
            className="rounded-full ring-olivia-pink/60 transition hover:ring-2"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-olivia-raised text-[10px] font-semibold text-olivia-pink">
                {displayName
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]!.toUpperCase())
                  .join("")}
              </span>
            )}
          </button>
          <span className="hidden text-sm text-olivia-muted sm:inline">
            {displayName}
          </span>
```

- [ ] **Step 2: Typecheck (expected to fail in Dashboard)**

Run: `npx tsc --noEmit`
Expected: error in `components/Dashboard.tsx` — `<Header>` missing
`avatarUrl`/`onOpenProfile`. That is the Task 5 wiring; do not commit yet.

---

### Task 5: Dashboard wiring — save flow + modal state

**Files:**
- Modify: `components/Dashboard.tsx`

- [ ] **Step 1: Imports and state**

Add imports:

```ts
import { avatarPublicUrl, type PreparedAvatar } from "@/lib/avatar";
import { ProfileEditModal } from "./ProfileEditModal";
```

Next to `const [reportOpen, setReportOpen] = useState(false);` add:

```ts
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
```

- [ ] **Step 2: Add the save handler** (place after `toggleOff`, following its optimistic + rollback shape)

```ts
  // Upload first (fixed path, upsert), then write the row. If the row
  // write fails after an upload, the old row is restored; the storage
  // object was already replaced, which the next successful save corrects.
  async function saveProfile(displayName: string, avatar: PreparedAvatar | null) {
    const profile = store.profiles[currentUserId];
    if (!profile) return;
    setProfileSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatar) {
        const { error } = await supabase.storage
          .from("avatars")
          .upload(currentUserId, avatar.blob, {
            upsert: true,
            contentType: avatar.contentType,
          });
        if (error) {
          showToast("Couldn't upload the image — try again");
          return;
        }
        avatarUrl = avatarPublicUrl(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          currentUserId,
          Date.now()
        );
      }

      const optimistic: Profile = {
        ...profile,
        display_name: displayName,
        avatar_url: avatarUrl,
      };
      dispatch({ type: "upsert", table: "profiles", row: optimistic });
      const { data, error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, avatar_url: avatarUrl })
        .eq("id", currentUserId)
        .select("id");
      if (error || !data?.length) {
        dispatch({
          type: "rollback",
          table: "profiles",
          id: currentUserId,
          ifCurrentIs: optimistic,
          row: profile,
        });
        showToast("Couldn't save profile");
        return;
      }
      setProfileOpen(false);
    } finally {
      setProfileSaving(false);
    }
  }
```

- [ ] **Step 3: Wire the Header and render the modal**

On the `<Header … />` call add:

```tsx
        avatarUrl={currentProfile?.avatar_url ?? null}
        onOpenProfile={() => setProfileOpen(true)}
```

Next to `<ReportModal … />` add:

```tsx
      {currentProfile && (
        <ProfileEditModal
          open={profileOpen}
          profile={currentProfile}
          saving={profileSaving}
          onClose={() => setProfileOpen(false)}
          onSave={(displayName, avatar) => void saveProfile(displayName, avatar)}
        />
      )}
```

- [ ] **Step 4: Verify — typecheck, tests, lint**

Run: `npx tsc --noEmit && npx vitest run && npm run lint`
Expected: all pass (42 tests: 37 existing + 5 new).

- [ ] **Step 5: Manual verification (canvas path is untestable in node)**

Run `npm run dev`, then:
1. Click the header avatar → modal opens with your current name.
2. Pick a large rectangular JPG → preview shows a centered square crop.
3. Save → header + your card show the new avatar; check the Network tab
   shows the upload to `/storage/v1/object/avatars/<uid>` and the row
   update; reload — avatar persists (cache-buster works).
4. Pick a small animated GIF → preview animates; Save → avatar animates.
5. Pick a >3 MB GIF → inline error "GIF is too large — keep it under 3 MB".
6. Clear the name field → Save disabled, validation message shows.
7. In a second browser/profile, watch the name/avatar update live.

- [ ] **Step 6: Commit**

```bash
git add components/Header.tsx components/Dashboard.tsx
git commit -m "Wire profile editor: header avatar entry, upload + optimistic save"
```
