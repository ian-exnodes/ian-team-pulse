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
