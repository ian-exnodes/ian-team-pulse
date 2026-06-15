# Profile Name Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each user pick a color for their own display name (preset swatches + a custom color picker) and render that color everywhere their name appears.

**Architecture:** Add a nullable `name_color` hex column to `profiles` (`null` = current default). The edit modal writes it through the existing `onSave` → `saveProfile` path. Every name render site applies `style={{ color: profile.name_color ?? undefined }}`, keeping the existing class color as the fallback. The activity-log renderer is extended to carry each name segment's `userId` so the component can look up that user's color.

**Tech Stack:** Next.js (React, client components), Supabase (Postgres), Tailwind v4 (`@theme` CSS vars), Vitest.

**Spec:** `docs/superpowers/specs/2026-06-15-profile-name-color-design.md`

**Commands:**
- Run all tests: `npm test`
- Run one test file: `npx vitest run lib/__tests__/activity.test.ts`
- Lint: `npm run lint`
- Type-check / build: `npm run build`

---

### Task 1: Database column + types

**Files:**
- Create: `supabase/migrations/0008_profile_name_color.sql`
- Modify: `lib/types.ts` (profiles `Row`/`Insert`/`Update`)

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0008_profile_name_color.sql`:

```sql
-- Per-user display name color. Null means "use the app default color".
-- Stored as a #rrggbb hex string; the CHECK keeps stray values out.
alter table public.profiles
  add column if not exists name_color text;

alter table public.profiles
  add constraint profiles_name_color_format
  check (name_color is null or name_color ~ '^#[0-9a-fA-F]{6}$');
```

- [ ] **Step 2: Add `name_color` to the `Row` type**

In `lib/types.ts`, in `profiles.Row` (after the `avatar_url: string | null;` line):

```ts
          avatar_url: string | null;
          name_color: string | null;
```

- [ ] **Step 3: Add `name_color` to the `Insert` type**

In `lib/types.ts`, in `profiles.Insert` (after `avatar_url?: string | null;`):

```ts
          avatar_url?: string | null;
          name_color?: string | null;
```

- [ ] **Step 4: Add `name_color` to the `Update` type**

In `lib/types.ts`, in `profiles.Update` (after `avatar_url?: string | null;`):

```ts
          avatar_url?: string | null;
          name_color?: string | null;
```

- [ ] **Step 5: Verify it type-checks**

Run: `npm run build`
Expected: build succeeds (no TypeScript errors). The new `Profile.name_color` field is now available.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0008_profile_name_color.sql lib/types.ts
git commit -m "Add name_color column and type to profiles"
```

---

### Task 2: Carry `userId` on activity name segments (TDD)

The activity log must know which user each name refers to so it can apply that user's color. Extend the pure renderer to include `userId` on `name` segments.

**Files:**
- Modify: `lib/activity.ts` (`Segment` type ~L30-33, `renderActivity` ~L48-62)
- Test: `lib/__tests__/activity.test.ts` (~L27, ~L33, plus new cases)

- [ ] **Step 1: Update the two full-object assertions and add userId cases (failing test)**

In `lib/__tests__/activity.test.ts`, replace the assertion on line 27:

```ts
    expect(segs[0]).toEqual({ kind: "name", value: "You", isYou: true });
```

with:

```ts
    expect(segs[0]).toEqual({
      kind: "name",
      value: "You",
      isYou: true,
      userId: "me",
    });
```

Replace the assertion on line 33:

```ts
    expect(segs[0]).toEqual({ kind: "name", value: "Henry", isYou: false });
```

with:

```ts
    expect(segs[0]).toEqual({
      kind: "name",
      value: "Henry",
      isYou: false,
      userId: "henry",
    });
```

Then add a new test inside the `describe("renderActivity", ...)` block (e.g. after the "names the target member" test):

```ts
  it("carries the actor and target user ids on name segments", () => {
    const segs = renderActivity(
      row({ type: "task_assigned", actor_id: "henry", target_user_id: "me" }),
      "me",
      NAMES
    );
    const names = segs.filter((s) => s.kind === "name");
    expect(names[0]).toMatchObject({ value: "Henry", userId: "henry" });
    expect(names[1]).toMatchObject({ value: "you", userId: "me" });
  });

  it("uses a null userId for an unknown/deleted actor", () => {
    const segs = renderActivity(row({ actor_id: null }), "me", NAMES);
    expect(segs[0]).toMatchObject({ value: "Someone", userId: null });
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/__tests__/activity.test.ts`
Expected: FAIL — the existing `toEqual` cases fail because segments lack `userId`, and the new cases fail (`userId` is `undefined`).

- [ ] **Step 3: Add `userId` to the `Segment` name variant**

In `lib/activity.ts`, replace the `Segment` type (lines ~30-33):

```ts
export type Segment =
  | { kind: "text"; value: string }
  | { kind: "name"; value: string; isYou: boolean }
  | { kind: "detail"; value: string };
```

with:

```ts
export type Segment =
  | { kind: "text"; value: string }
  | { kind: "name"; value: string; isYou: boolean; userId: string | null }
  | { kind: "detail"; value: string };
```

- [ ] **Step 4: Populate `userId` in `renderActivity`**

In `lib/activity.ts`, update the `actor` segment (lines ~48-52):

```ts
  const actor: Segment = {
    kind: "name",
    value: actorIsYou ? "You" : actorName,
    isYou: actorIsYou,
    userId: entry.actor_id,
  };
```

And the `target` segment (lines ~58-62):

```ts
  const target: Segment = {
    kind: "name",
    value: targetIsYou ? "you" : targetName,
    isYou: targetIsYou,
    userId: entry.target_user_id,
  };
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run lib/__tests__/activity.test.ts`
Expected: PASS (all cases green).

- [ ] **Step 6: Commit**

```bash
git add lib/activity.ts lib/__tests__/activity.test.ts
git commit -m "Carry userId on activity name segments"
```

---

### Task 3: Name color picker in the edit modal + save path

Add the color UI to the modal and thread the value through `onSave` → `saveProfile` → Supabase. Done in one task so the changed `onSave` signature stays compiling.

**Files:**
- Modify: `components/ProfileEditModal.tsx`
- Modify: `components/Dashboard.tsx` (`saveProfile` ~L605-655, `ProfileEditModal` call site ~L1046-1052)

- [ ] **Step 1: Add presets, color state, and validation to the modal**

In `components/ProfileEditModal.tsx`, add the preset list above the `initials` function (top of file, after the imports):

```tsx
// Presets tuned to read clearly on the dark olivia surface. "Default" (null)
// falls back to the app's normal name color.
const NAME_COLOR_PRESETS = [
  "#ff8fa3", // coral
  "#f5c451", // amber
  "#8fe388", // lime
  "#6cc5ff", // sky
  "#c4a3ff", // violet
  "#5fe3c0", // teal
  "#ff9f6b", // orange
] as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
```

Then add color state next to the other `useState` calls (after the `name` state on ~L37):

```tsx
  const [color, setColor] = useState<string | null>(profile.name_color);
```

- [ ] **Step 2: Extend the `onSave` prop type**

In `components/ProfileEditModal.tsx`, change the `onSave` prop type (~L35):

```tsx
  onSave: (displayName: string, avatar: PreparedAvatar | null) => void;
```

to:

```tsx
  onSave: (
    displayName: string,
    avatar: PreparedAvatar | null,
    nameColor: string | null
  ) => void;
```

- [ ] **Step 3: Include color in the `dirty` check and color the live preview**

In `components/ProfileEditModal.tsx`, replace the `dirty` line (~L117):

```tsx
  const dirty = avatar !== null || trimmed !== profile.display_name;
```

with:

```tsx
  const dirty =
    avatar !== null ||
    trimmed !== profile.display_name ||
    color !== profile.name_color;
```

Update the initials-fallback preview (~L149) so the initials use the chosen color. Replace:

```tsx
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-olivia-raised text-2xl font-semibold text-olivia-pink">
              {initials(trimmed || profile.display_name)}
            </div>
```

with:

```tsx
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-olivia-raised text-2xl font-semibold text-olivia-pink"
              style={{ color: color ?? undefined }}
            >
              {initials(trimmed || profile.display_name)}
            </div>
```

And color the name input text live. Replace the `<input id="profile-edit-name" ...>` (~L171-177):

```tsx
        <input
          id="profile-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          className="mb-1 w-full rounded-lg border border-olivia-border bg-olivia-raised px-2.5 py-1.5 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
        />
```

with:

```tsx
        <input
          id="profile-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          style={{ color: color ?? undefined }}
          className="mb-1 w-full rounded-lg border border-olivia-border bg-olivia-raised px-2.5 py-1.5 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
        />
```

- [ ] **Step 4: Add the "Name color" section UI**

In `components/ProfileEditModal.tsx`, insert this block right after the name validation/error lines (after the `{error && ...}` line ~L181, before the `{showJira && (` block):

```tsx
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
            Name color
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setColor(null)}
              title="Default color"
              aria-label="Default color"
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] text-olivia-cream ${
                color === null
                  ? "border-olivia-pink ring-2 ring-olivia-pink"
                  : "border-olivia-border"
              }`}
            >
              A
            </button>
            {NAME_COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColor(preset)}
                title={preset}
                aria-label={`Color ${preset}`}
                style={{ backgroundColor: preset }}
                className={`h-7 w-7 rounded-full border ${
                  color?.toLowerCase() === preset
                    ? "border-olivia-cream ring-2 ring-olivia-cream"
                    : "border-transparent"
                }`}
              />
            ))}
            <label
              title="Custom color"
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-olivia-border text-olivia-muted hover:text-olivia-cream"
            >
              <span aria-hidden>🎨</span>
              <input
                type="color"
                value={color && HEX_RE.test(color) ? color : "#e8c4b8"}
                onChange={(e) => setColor(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>
        </div>
```

- [ ] **Step 5: Pass color through the Save button**

In `components/ProfileEditModal.tsx`, update the Save `onClick` (~L231):

```tsx
            onClick={() => onSave(trimmed, avatar)}
```

to (color is the third argument, matching the `onSave` type from Step 2):

```tsx
            onClick={() => onSave(trimmed, avatar, color)}
```

- [ ] **Step 6: Extend `saveProfile` in Dashboard**

In `components/Dashboard.tsx`, change the `saveProfile` signature (~L605):

```tsx
  async function saveProfile(displayName: string, avatar: PreparedAvatar | null) {
```

to:

```tsx
  async function saveProfile(
    displayName: string,
    avatar: PreparedAvatar | null,
    nameColor: string | null
  ) {
```

In the optimistic object (~L629-633), add `name_color`:

```tsx
      const optimistic: Profile = {
        ...profile,
        display_name: displayName,
        avatar_url: avatarUrl,
        name_color: nameColor,
      };
```

In the Supabase update (~L635-639), add `name_color`:

```tsx
      const { data, error } = await supabase
        .from("profiles")
        .update({ display_name: displayName, avatar_url: avatarUrl, name_color: nameColor })
        .eq("id", currentUserId)
        .select("id");
```

- [ ] **Step 7: Update the modal call site**

In `components/Dashboard.tsx`, update the `onSave` handler at the `ProfileEditModal` call site (~L1051):

```tsx
          onSave={(displayName, avatar) => void saveProfile(displayName, avatar)}
```

to:

```tsx
          onSave={(displayName, avatar, nameColor) =>
            void saveProfile(displayName, avatar, nameColor)
          }
```

- [ ] **Step 8: Verify it builds**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 9: Manual check**

Run: `npm run dev`, open the app, open Edit profile. Verify: preset swatches and the 🎨 custom picker change the live name + initials preview; the "A" chip resets to default; Save enables when only the color changed; after Save the modal closes without error.

- [ ] **Step 10: Commit**

```bash
git add components/ProfileEditModal.tsx components/Dashboard.tsx
git commit -m "Add name color picker to profile edit modal and save path"
```

---

### Task 4: Apply name color on the member card and TBD list

**Files:**
- Modify: `components/ProfileCard.tsx` (initials ~L66-68, name `<p>` ~L71-76)
- Modify: `components/TbdList.tsx` (`raisedBy` ~L40-42, and its render site)

- [ ] **Step 1: Color the ProfileCard initials fallback**

In `components/ProfileCard.tsx`, replace the initials `<div>` (~L66-68):

```tsx
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-olivia-raised text-sm font-semibold text-olivia-pink">
            {initials(profile.display_name)}
          </div>
```

with:

```tsx
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full bg-olivia-raised text-sm font-semibold text-olivia-pink"
            style={{ color: profile.name_color ?? undefined }}
          >
            {initials(profile.display_name)}
          </div>
```

- [ ] **Step 2: Color the ProfileCard name**

In `components/ProfileCard.tsx`, replace the name `<p>` (~L71-76):

```tsx
          <p className="truncate font-medium text-olivia-cream">
            {profile.display_name}
            {isCurrentUser && (
              <span className="ml-1.5 text-xs text-olivia-muted">(you)</span>
            )}
          </p>
```

with:

```tsx
          <p className="truncate font-medium text-olivia-cream">
            <span style={{ color: profile.name_color ?? undefined }}>
              {profile.display_name}
            </span>
            {isCurrentUser && (
              <span className="ml-1.5 text-xs text-olivia-muted">(you)</span>
            )}
          </p>
```

- [ ] **Step 3: Color the TBD "raised by" name**

In `components/TbdList.tsx`, find where `raisedBy` is rendered in the JSX (the attribution text that shows the name). Wrap the name in a colored span using the raiser's color. First capture the color alongside the name near line 40-42:

```tsx
            const raisedBy = item.created_by
              ? profiles[item.created_by]?.display_name ?? "someone"
              : "someone";
```

Add right below it:

```tsx
            const raisedByColor = item.created_by
              ? profiles[item.created_by]?.name_color ?? undefined
              : undefined;
```

Then update the render site (~L66). Replace:

```tsx
                    <span className="text-olivia-pink/90">{raisedBy}</span>
```

with:

```tsx
                    <span
                      className="text-olivia-pink/90"
                      style={{ color: raisedByColor }}
                    >
                      {raisedBy}
                    </span>
```

- [ ] **Step 4: Verify it builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual check**

Run/refresh `npm run dev`. After picking a color in Task 3 and saving, the member card name and (if no avatar) the initials show the chosen color; the TBD list shows the raiser's name in their color. Members with no color picked look unchanged.

- [ ] **Step 6: Commit**

```bash
git add components/ProfileCard.tsx components/TbdList.tsx
git commit -m "Apply name color on member card and TBD list"
```

---

### Task 5: Apply name color in the header

The header receives the current user's profile fields from Dashboard. Add a `nameColor` prop and pass it through.

**Files:**
- Modify: `components/Header.tsx` (props ~L3-17, initials ~L62-69, name ~L72-74)
- Modify: `components/Dashboard.tsx` (`Header` call site ~L945-949)

- [ ] **Step 1: Add the `nameColor` prop to Header**

In `components/Header.tsx`, add `nameColor` to the destructured params and the prop types:

```tsx
export function Header({
  displayName,
  avatarUrl,
  nameColor,
  onOpenProfile,
  onOpenReport,
  notifState,
  onToggleNotifications,
}: {
  displayName: string;
  avatarUrl: string | null;
  nameColor: string | null;
  onOpenProfile: () => void;
  onOpenReport: () => void;
  notifState: "on" | "off" | "hidden";
  onToggleNotifications: () => void;
}) {
```

- [ ] **Step 2: Color the header initials fallback**

In `components/Header.tsx`, replace the initials `<span>` opening tag (~L62):

```tsx
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-olivia-raised text-[10px] font-semibold text-olivia-pink">
```

with:

```tsx
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-olivia-raised text-[10px] font-semibold text-olivia-pink"
                style={{ color: nameColor ?? undefined }}
              >
```

- [ ] **Step 3: Color the header name label**

In `components/Header.tsx`, replace the name `<span>` (~L72-74):

```tsx
          <span className="hidden text-sm text-olivia-muted sm:inline">
            {displayName}
          </span>
```

with:

```tsx
          <span
            className="hidden text-sm text-olivia-muted sm:inline"
            style={{ color: nameColor ?? undefined }}
          >
            {displayName}
          </span>
```

- [ ] **Step 4: Pass `nameColor` from Dashboard**

In `components/Dashboard.tsx`, at the `Header` call site (~L945-949), add the prop next to `displayName`/`avatarUrl`:

```tsx
      <Header
        displayName={currentProfile?.display_name ?? "…"}
        avatarUrl={currentProfile?.avatar_url ?? null}
        nameColor={currentProfile?.name_color ?? null}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenReport={() => setReportOpen(true)}
```

(Keep the remaining `Header` props unchanged.)

- [ ] **Step 5: Verify it builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add components/Header.tsx components/Dashboard.tsx
git commit -m "Apply name color in header"
```

---

### Task 6: Apply name color in the activity log

Use the `userId` now on name segments (Task 2) to look up each person's color. Custom color overrides the existing you=pink / others=chill scheme; fall back to that scheme when the user has no color.

**Files:**
- Modify: `components/ActivityLog.tsx` (`namesById` memo ~L55-61, name segment render ~L124-137)

- [ ] **Step 1: Build a `colorsById` lookup**

In `components/ActivityLog.tsx`, right after the `namesById` `useMemo` (~L55-61), add:

```tsx
  const colorsById = useMemo(
    () =>
      Object.fromEntries(
        Object.values(profiles).map((p) => [p.id, p.name_color])
      ),
    [profiles]
  );
```

- [ ] **Step 2: Apply the color in the name segment render**

In `components/ActivityLog.tsx`, replace the `seg.kind === "name"` branch (~L124-137):

```tsx
                          if (seg.kind === "name") {
                            return (
                              <span
                                key={i}
                                className={
                                  seg.isYou
                                    ? "font-semibold text-olivia-pink"
                                    : "font-semibold text-status-chill"
                                }
                              >
                                {seg.value}
                              </span>
                            );
                          }
```

with:

```tsx
                          if (seg.kind === "name") {
                            const custom = seg.userId
                              ? colorsById[seg.userId] ?? null
                              : null;
                            return (
                              <span
                                key={i}
                                className={
                                  custom
                                    ? "font-semibold"
                                    : seg.isYou
                                      ? "font-semibold text-olivia-pink"
                                      : "font-semibold text-status-chill"
                                }
                                style={custom ? { color: custom } : undefined}
                              >
                                {seg.value}
                              </span>
                            );
                          }
```

- [ ] **Step 3: Verify it builds**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual check**

Run/refresh `npm run dev`. In the activity log, names of users who picked a color show in that color; users without a color keep the you=pink / others=green styling.

- [ ] **Step 5: Commit**

```bash
git add components/ActivityLog.tsx
git commit -m "Apply name color in activity log"
```

---

### Task 7: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the test suite**

Run: `npm test`
Expected: all tests pass (including the updated `activity.test.ts`).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: End-to-end manual check**

Run: `npm run dev`. Pick a preset color, save, and confirm the color appears on: your member card name + initials, the header name + initials, the activity log (your future entries), and the TBD list when you raise a blocker. Then pick a custom color via 🎨, save, confirm it applies. Then reset to "A" (default), save, and confirm everything returns to the default cream/pink.

- [ ] **Step 5: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "Verify profile name color feature"
```

(Skip if there were no changes in this task.)
