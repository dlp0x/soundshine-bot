import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock("#bot/config.js", () => ({
  default: {
    BUFFER_ACCESS_TOKEN: "test-buffer-token",
    BUFFER_PROFILE_ID: "test-profile-id",
    BUFFER_API_BASE_URL: undefined,
    api: {
      bufferAccessToken: "test-buffer-token",
      bufferProfileId: "test-profile-id",
      bufferApiBaseUrl: undefined,
    },
  },
}));

import axios from "axios";
import { publishToBuffer } from "#api/services/bufferPublisherService.js";

describe("bufferPublisherService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes immediately and returns normalized metadata on success", async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        updates: [{ id: "update-123", status: "sent" }],
      },
    });

    const result = await publishToBuffer({
      text: "🎶 Lofi is live now on soundSHINE! Playlist: Chill Vibes",
      mediaUrl: "https://media.soundshineradio.com/social/2026/07/06/abc.jpg",
    });

    expect(axios.post).toHaveBeenCalledTimes(1);
    const [url, body, options] = axios.post.mock.calls[0];
    expect(url).toBe("https://api.bufferapp.com/1/updates/create.json");
    expect(body.get("text")).toBe("🎶 Lofi is live now on soundSHINE! Playlist: Chill Vibes");
    expect(body.get("profile_ids[]")).toBe("test-profile-id");
    expect(body.get("media[photo]")).toBe(
      "https://media.soundshineradio.com/social/2026/07/06/abc.jpg"
    );
    expect(body.get("now")).toBe("true");
    expect(options.headers.Authorization).toBe("Bearer test-buffer-token");

    expect(result).toEqual({ id: "update-123", status: "sent" });
  });

  it("throws when Buffer rejects the request (API rejection)", async () => {
    const apiError = Object.assign(new Error("Request failed with status code 401"), {
      response: { status: 401, data: { success: false, message: "Invalid access token" } },
    });
    axios.post.mockRejectedValue(apiError);

    await expect(
      publishToBuffer({ text: "caption", mediaUrl: "https://media.soundshineradio.com/x.jpg" })
    ).rejects.toThrow("Request failed with status code 401");
  });

  it("throws on network failure", async () => {
    axios.post.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      publishToBuffer({ text: "caption", mediaUrl: "https://media.soundshineradio.com/x.jpg" })
    ).rejects.toThrow("ECONNREFUSED");
  });

  it("throws on a malformed/unsuccessful response", async () => {
    axios.post.mockResolvedValue({ data: { success: false, message: "Profile not found" } });

    await expect(
      publishToBuffer({ text: "caption", mediaUrl: "https://media.soundshineradio.com/x.jpg" })
    ).rejects.toThrow("Profile not found");
  });

  it("throws a configuration error when credentials are missing", async () => {
    vi.resetModules();
    vi.doMock("#bot/config.js", () => ({
      default: { BUFFER_ACCESS_TOKEN: undefined, BUFFER_PROFILE_ID: undefined, api: {} },
    }));

    const { publishToBuffer: publishToBufferUnconfigured } = await import(
      "#api/services/bufferPublisherService.js"
    );

    await expect(
      publishToBufferUnconfigured({ text: "x", mediaUrl: "https://media.soundshineradio.com/x.jpg" })
    ).rejects.toThrow(/not configured/i);
  });
});
