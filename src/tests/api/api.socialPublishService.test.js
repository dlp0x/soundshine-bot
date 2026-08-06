import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("#shared/logging/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("#bot/config.js", () => ({
  default: {
    STREAM_URL: undefined,
  },
}));

const mockResolveShowMedia = vi.fn();
vi.mock("#api/services/showMediaResolver.js", () => ({
  resolveShowMedia: (...args) => mockResolveShowMedia(...args),
}));

const mockPublishToBuffer = vi.fn();
vi.mock("#api/services/bufferPublisherService.js", () => ({
  publishToBuffer: (...args) => mockPublishToBuffer(...args),
}));

const mockNotifyPublishSuccess = vi.fn();
const mockNotifyPublishFailure = vi.fn();
const mockNotifyMissingMedia = vi.fn();
vi.mock("#api/services/discordSocialNotifier.js", () => ({
  notifyPublishSuccess: (...args) => mockNotifyPublishSuccess(...args),
  notifyPublishFailure: (...args) => mockNotifyPublishFailure(...args),
  notifyMissingMedia: (...args) => mockNotifyMissingMedia(...args),
}));

import logger from "#shared/logging/logger.js";
import {
  publishPlaylistUpdate,
  formatProgramAnnouncement,
  buildSocialCaption,
} from "#api/services/socialPublishService.js";

const FOUND_MEDIA = {
  found: true,
  slug: "lofi",
  localPath: "/app/media/shows/lofi.png",
  publicUrl: "https://media.soundshineradio.com/shows/lofi.png",
};

const MISSING_MEDIA = { found: false, slug: "lofi" };

const SUCCESSFUL_BUFFER = { id: "update-123", status: "sent" };

const GATEWAY = { sendChannelMessage: vi.fn() };

describe("socialPublishService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("formatProgramAnnouncement", () => {
    it("combines the topic with the current hour in America/Toronto", () => {
      // 2026-01-15T23:00:00Z -> 18:00 in America/Toronto (EST, UTC-5)
      const fixedDate = new Date("2026-01-15T23:00:00Z");
      expect(formatProgramAnnouncement("Lofi", fixedDate)).toBe("Lofi — 18h");
    });
  });

  describe("buildSocialCaption", () => {
    it("builds a caption with the listening URL and hashtags", () => {
      const caption = buildSocialCaption("Lofi", "Chill Vibes");
      expect(caption).toContain("Chill Vibes is live now on soundSHINE!");
      expect(caption).toContain("https://soundshineradio.com");
      expect(caption).toContain("#soundSHINE");
      expect(caption).toContain("#radio");
      expect(caption).toContain("#Lofi");
    });
  });

  describe("publishPlaylistUpdate", () => {
    it("resolves media, publishes to Buffer with the image, and notifies success", async () => {
      mockResolveShowMedia.mockReturnValue(FOUND_MEDIA);
      mockPublishToBuffer.mockResolvedValue(SUCCESSFUL_BUFFER);

      const result = await publishPlaylistUpdate({
        playlist: "Chill Vibes",
        topic: "Lofi",
        gateway: GATEWAY,
      });

      expect(mockResolveShowMedia).toHaveBeenCalledWith("Lofi");
      expect(mockPublishToBuffer).toHaveBeenCalledTimes(1);
      expect(mockPublishToBuffer.mock.calls[0][0]).toEqual(
        expect.objectContaining({ mediaUrl: FOUND_MEDIA.publicUrl })
      );

      expect(mockNotifyMissingMedia).not.toHaveBeenCalled();
      expect(mockNotifyPublishSuccess).toHaveBeenCalledTimes(1);
      expect(mockNotifyPublishSuccess).toHaveBeenCalledWith(GATEWAY, {
        program: "Lofi",
        playlist: "Chill Vibes",
        bufferUpdateId: "update-123",
        mediaUrl: FOUND_MEDIA.publicUrl,
      });

      expect(result).toEqual({
        status: "published",
        program: "Lofi",
        playlist: "Chill Vibes",
        mediaUrl: FOUND_MEDIA.publicUrl,
        bufferUpdateId: "update-123",
        bufferStatus: "sent",
      });
    });

    it("still publishes text-only and notifies missing media when no local asset is found", async () => {
      mockResolveShowMedia.mockReturnValue(MISSING_MEDIA);
      mockPublishToBuffer.mockResolvedValue(SUCCESSFUL_BUFFER);

      const result = await publishPlaylistUpdate({
        playlist: "Chill Vibes",
        topic: "Lofi",
        gateway: GATEWAY,
      });

      expect(mockNotifyMissingMedia).toHaveBeenCalledTimes(1);
      expect(mockNotifyMissingMedia).toHaveBeenCalledWith(GATEWAY, {
        program: "Lofi",
        slug: "lofi",
      });

      expect(mockPublishToBuffer).toHaveBeenCalledWith(
        expect.objectContaining({ mediaUrl: undefined })
      );

      expect(result).toEqual(
        expect.objectContaining({ status: "published", mediaUrl: null })
      );
      // Publication is never blocked by a missing asset.
      expect(mockNotifyPublishSuccess).toHaveBeenCalledTimes(1);
    });

    it("logs and returns a normalized failure result when Buffer publication fails, and notifies failure", async () => {
      mockResolveShowMedia.mockReturnValue(FOUND_MEDIA);
      mockPublishToBuffer.mockRejectedValue(new Error("Invalid access token"));

      const result = await publishPlaylistUpdate({
        playlist: "Chill Vibes",
        topic: "Lofi",
        gateway: GATEWAY,
      });

      expect(result).toEqual({
        status: "failed",
        stage: "publish",
        error: "Invalid access token",
        program: "Lofi",
        playlist: "Chill Vibes",
        mediaUrl: FOUND_MEDIA.publicUrl,
      });
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(mockNotifyPublishFailure).toHaveBeenCalledTimes(1);
      expect(mockNotifyPublishFailure).toHaveBeenCalledWith(GATEWAY, {
        program: "Lofi",
        playlist: "Chill Vibes",
        error: "Invalid access token",
      });
      expect(mockNotifyPublishSuccess).not.toHaveBeenCalled();
    });

    it("does not throw on a Buffer network failure, still returns a normalized failure result", async () => {
      mockResolveShowMedia.mockReturnValue(FOUND_MEDIA);
      mockPublishToBuffer.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        publishPlaylistUpdate({ playlist: "Chill Vibes", topic: "Lofi", gateway: GATEWAY })
      ).resolves.toEqual(
        expect.objectContaining({ status: "failed", stage: "publish", error: "ECONNREFUSED" })
      );
    });
  });
});
