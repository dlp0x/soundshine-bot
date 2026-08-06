import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

let tmpRoot;

vi.mock("#bot/config.js", () => ({
  default: {
    get SOCIAL_SHOW_MEDIA_ROOT() {
      return globalThis.__TEST_MEDIA_ROOT__;
    },
    SOCIAL_SHOW_MEDIA_PUBLIC_BASE_URL: "https://media.soundshineradio.com/shows",
  },
}));

import { slugifyProgramName, resolveShowMedia } from "#api/services/showMediaResolver.js";

describe("showMediaResolver", () => {
  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "soundshine-media-"));
    globalThis.__TEST_MEDIA_ROOT__ = tmpRoot;
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
    delete globalThis.__TEST_MEDIA_ROOT__;
  });

  describe("slugifyProgramName", () => {
    it("lowercases, strips accents, and dashes non-alphanumerics", () => {
      expect(slugifyProgramName("Lofi Beats")).toBe("lofi-beats");
      expect(slugifyProgramName("Éveil du matin!")).toBe("eveil-du-matin");
      expect(slugifyProgramName("  EDM  ")).toBe("edm");
    });

    it("returns an empty string for empty/nullish input", () => {
      expect(slugifyProgramName("")).toBe("");
      expect(slugifyProgramName(undefined)).toBe("");
    });
  });

  describe("resolveShowMedia", () => {
    it("finds a .png asset matching the slugified program name", () => {
      fs.writeFileSync(path.join(tmpRoot, "lofi-beats.png"), "fake-image");

      const result = resolveShowMedia("Lofi Beats");

      expect(result).toEqual({
        found: true,
        slug: "lofi-beats",
        localPath: path.join(tmpRoot, "lofi-beats.png"),
        publicUrl: "https://media.soundshineradio.com/shows/lofi-beats.png",
      });
    });

    it("falls back to .jpg when .png is absent", () => {
      fs.writeFileSync(path.join(tmpRoot, "edm.jpg"), "fake-image");

      const result = resolveShowMedia("EDM");

      expect(result.found).toBe(true);
      expect(result.publicUrl).toBe("https://media.soundshineradio.com/shows/edm.jpg");
    });

    it("returns found: false when no matching asset exists, without throwing", () => {
      const result = resolveShowMedia("Morning Show");

      expect(result).toEqual({ found: false, slug: "morning-show" });
    });

    it("returns found: false for an empty program name", () => {
      expect(resolveShowMedia("")).toEqual({ found: false, slug: "" });
    });
  });
});
