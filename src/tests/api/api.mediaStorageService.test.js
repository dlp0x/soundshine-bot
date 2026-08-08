import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "os";
import path from "path";
import { Readable } from "stream";

// The global test setup mocks "fs" (readdirSync/statSync/existsSync only).
// This service needs the real filesystem (createWriteStream, mkdir) so we
// restore the real module just for this test file.
vi.unmock("fs");
vi.unmock("path");

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
  },
}));

const STORAGE_ROOT_HOLDER = { root: "" };
vi.mock("#bot/config.js", () => ({
  default: {
    get SOCIAL_MEDIA_STORAGE_ROOT () {
      return STORAGE_ROOT_HOLDER.root;
    },
    SOCIAL_MEDIA_PUBLIC_BASE_URL: "https://media.soundshineradio.com/social",
    api: {},
  },
}));

import fs from "fs";
import { rm, mkdtemp, readFile, writeFile } from "fs/promises";
import axios from "axios";
import { storeRenderedImage } from "#api/services/mediaStorageService.js";

const FIXED_DATE = new Date("2026-03-04T12:00:00Z");

function fakeImageResponse (contentType = "image/jpeg", body = "fake-image-bytes") {
  return {
    headers: { "content-type": contentType },
    data: Readable.from([body]),
  };
}

describe("mediaStorageService", () => {
  let tmpRoot;

  beforeEach(async () => {
    tmpRoot = await mkdtemp(path.join(os.tmpdir(), "soundshine-media-"));
    STORAGE_ROOT_HOLDER.root = tmpRoot;
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  it("creates a YYYY/MM/DD folder structure under the storage root", async () => {
    axios.get.mockResolvedValue(fakeImageResponse());

    const result = await storeRenderedImage("https://cdn.templated.io/render.png", {
      now: FIXED_DATE,
    });

    expect(result.localPath).toBe(
      path.join(tmpRoot, "2026", "03", "04", path.basename(result.localPath))
    );
    expect(fs.existsSync(path.dirname(result.localPath))).toBe(true);
  });

  it("generates a unique, immutable filename on every call (never 'latest.jpg')", async () => {
    axios.get.mockResolvedValue(fakeImageResponse());

    const first = await storeRenderedImage("https://cdn.templated.io/render.png", {
      now: FIXED_DATE,
    });
    const second = await storeRenderedImage("https://cdn.templated.io/render.png", {
      now: FIXED_DATE,
    });

    expect(first.localPath).not.toBe(second.localPath);
    expect(path.basename(first.localPath)).not.toMatch(/latest/i);
    expect(fs.existsSync(first.localPath)).toBe(true);
    expect(fs.existsSync(second.localPath)).toBe(true);
  });

  it("downloads and writes the file successfully, returning a matching public URL", async () => {
    axios.get.mockResolvedValue(fakeImageResponse("image/jpeg", "hello-world"));

    const result = await storeRenderedImage("https://cdn.templated.io/render.png", {
      now: FIXED_DATE,
    });

    const written = await readFile(result.localPath, "utf-8");
    expect(written).toBe("hello-world");

    const filename = path.basename(result.localPath);
    expect(result.publicUrl).toBe(
      `https://media.soundshineradio.com/social/2026/03/04/${filename}`
    );
    expect(filename).toMatch(/\.jpg$/);
  });

  it("rejects an unexpected content type instead of saving it", async () => {
    const destroy = vi.fn();
    axios.get.mockResolvedValue({
      headers: { "content-type": "text/html" },
      data: { destroy },
    });

    await expect(
      storeRenderedImage("https://cdn.templated.io/render.png", { now: FIXED_DATE })
    ).rejects.toThrow(/unexpected content type/i);

    expect(destroy).toHaveBeenCalled();
  });

  it("propagates a download failure (network error)", async () => {
    axios.get.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      storeRenderedImage("https://cdn.templated.io/render.png", { now: FIXED_DATE })
    ).rejects.toThrow("ECONNREFUSED");
  });

  it("propagates a filesystem failure (e.g. a path segment blocked by an existing file)", async () => {
    axios.get.mockResolvedValue(fakeImageResponse());

    // Create a plain file where a directory needs to go, forcing mkdir to fail.
    await writeFile(path.join(tmpRoot, "2026"), "not a directory");

    await expect(
      storeRenderedImage("https://cdn.templated.io/render.png", { now: FIXED_DATE })
    ).rejects.toThrow();
  });
});
