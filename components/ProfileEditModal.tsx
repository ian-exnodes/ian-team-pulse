"use client";

import { useEffect, useRef, useState } from "react";
import { prepareAvatar, type PreparedAvatar } from "@/lib/avatar";
import type { Profile } from "@/lib/types";

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
// Parent mounts this component only while the modal is open.
type JiraState =
  | { state: "loading" }
  | { state: "connected"; site: string | null }
  | { state: "disconnected" };

export function ProfileEditModal({
  profile,
  saving,
  showJira,
  onClose,
  onSave,
}: {
  profile: Profile;
  saving: boolean;
  showJira: boolean;
  onClose: () => void;
  onSave: (
    displayName: string,
    avatar: PreparedAvatar | null,
    nameColor: string | null
  ) => void;
}) {
  const [name, setName] = useState(profile.display_name);
  const [color, setColor] = useState<string | null>(profile.name_color);
  const [avatar, setAvatar] = useState<PreparedAvatar | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jira, setJira] = useState<JiraState>({ state: "loading" });
  const fileInput = useRef<HTMLInputElement>(null);

  // Load the Jira connection state when the modal opens (DB-only check).
  useEffect(() => {
    if (!showJira) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/jira/status");
        const data = await res.json();
        if (active)
          setJira(
            data.connected
              ? { state: "connected", site: data.siteUrl ?? null }
              : { state: "disconnected" }
          );
      } catch {
        if (active) setJira({ state: "disconnected" });
      }
    })();
    return () => {
      active = false;
    };
  }, [showJira]);

  async function disconnectJira() {
    setJira({ state: "loading" });
    await fetch("/api/jira/disconnect", { method: "POST" });
    setJira({ state: "disconnected" });
  }

  // Revoke the preview object URL when the modal unmounts; the flag also
  // stops a still-resolving pickFile from creating a URL nothing will revoke.
  const previewUrlRef = useRef<string | null>(null);
  const unmountedRef = useRef(false);
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  });
  useEffect(() => {
    // Reset on every effect run: StrictMode mounts, cleans up, and mounts
    // again - a cleanup-only effect would leave the flag stuck on true.
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    try {
      const prepared = await prepareAvatar(file);
      if (unmountedRef.current) return;
      setAvatar(prepared);
      setError(null);
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(prepared.blob);
      });
    } catch (e) {
      if (unmountedRef.current) return;
      setError(e instanceof Error ? e.message : "Couldn't read that image");
    }
  }

  const trimmed = name.trim();
  const nameValid = trimmed.length >= 1 && trimmed.length <= 80;
  const dirty =
    avatar !== null ||
    trimmed !== profile.display_name ||
    color !== profile.name_color;
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
            <div
              className="flex h-24 w-24 items-center justify-center rounded-full bg-olivia-raised text-2xl font-semibold text-olivia-pink"
              style={{ color: color ?? undefined }}
            >
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

        <label htmlFor="profile-edit-name" className="mb-1 block text-xs font-semibold uppercase tracking-widest text-olivia-pink">
          Display name
        </label>
        <input
          id="profile-edit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          style={{ color: color ?? undefined }}
          className="mb-1 w-full rounded-lg border border-olivia-border bg-olivia-raised px-2.5 py-1.5 text-sm text-olivia-cream outline-none placeholder:text-olivia-muted/70 focus:border-olivia-pink"
        />
        {!nameValid && (
          <p className="text-xs text-red-400">Name must be 1–80 characters.</p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}

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
                aria-label="Custom color"
                value={color && HEX_RE.test(color) ? color : "#e8c4b8"}
                onChange={(e) => setColor(e.target.value)}
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {showJira && (
          <div className="mt-5 border-t border-olivia-border pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-olivia-pink">
              Jira
            </p>
            {jira.state === "loading" && (
              <p className="text-sm text-olivia-muted">Checking…</p>
            )}
            {jira.state === "connected" && (
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-sm text-olivia-cream">
                  <span className="text-status-active">●</span> Connected
                  {jira.site && (
                    <span className="block truncate text-xs text-olivia-muted">
                      {jira.site.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </span>
                <button
                  onClick={() => void disconnectJira()}
                  className="shrink-0 rounded-lg border border-olivia-border px-3 py-1.5 text-xs text-olivia-muted hover:bg-olivia-raised hover:text-olivia-cream"
                >
                  Disconnect
                </button>
              </div>
            )}
            {jira.state === "disconnected" && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-olivia-muted">Not connected</span>
                <a
                  href="/api/jira/connect"
                  className="shrink-0 rounded-lg bg-olivia-pink px-3 py-1.5 text-xs font-medium text-olivia-bg hover:bg-olivia-pink-deep"
                >
                  Connect Jira
                </a>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-olivia-border px-3 py-1.5 text-sm text-olivia-muted hover:bg-olivia-raised hover:text-olivia-cream"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(trimmed, avatar, color)}
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
