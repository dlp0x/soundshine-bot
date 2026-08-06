import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("#shared/logging/logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockCreateAlert = vi.fn();
vi.mock("#core/services/AlertManager.js", () => ({
  default: { createAlert: (...args) => mockCreateAlert(...args) },
}));

const mockRequestRender = vi.fn();
vi.mock("#api/services/templatedClient.js", () => ({
  requestRender: (...args) => mockRequestRender(...args),
}));

const mockStoreRenderedImage = vi.fn();
vi.mock("#api/services/mediaStorageService.js", () => ({
  storeRenderedImage: (...args) => mockStoreRenderedImage(...args),
}));

const mockPublishToBuffer = vi.fn();
vi.mock("#api/services/bufferPublisherService.js", () => ({
  publishToBuffer: (...args) => mockPublishToBuffer(...args),
}));

import logger from "#shared/logging/logger.js";
import {
  publishPlaylistUpdate,
  formatProgramAnnouncement,
  buildSocialCaption,
} from "#api/services/socialPublishService.js";

const SUCCESSFUL_RENDER = {
  id: "render-123",
  url: "https://cdn.templated.io/renders/render-123.png",
  status: "completed",
  template: "test-template-id",
};

const SUCCESSFUL_STORAGE = {
  localPath: "/home/soundshine/web/media.soundshineradio.com/public_html/social/2026/03/04/abc.jpg",
  publicUrl: "https://media.soundshineradio.com/social/2026/03/04/abc.jpg",
};

const SUCCESSFUL_BUFFER = { id: "update-123", status: "sent" };

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
    it("builds a simple caption from the topic and playlist", () => {
      expect(buildSocialCaption("Lofi", "Chill Vibes")).toBe(
        "🎶 Chill Vibes is live now on soundSHINE!"
      );
    });
  });

  describe("publishPlaylistUpdate", () => {
    it("renders, stores, and publishes to Buffer, returning a normalized success result", async () => {
      mockRequestRender.mockResolvedValue(SUCCESSFUL_RENDER);
      mockStoreRenderedImage.mockResolvedValue(SUCCESSFUL_STORAGE);
      mockPublishToBuffer.mockResolvedValue(SUCCESSFUL_BUFFER);

      const result = await publishPlaylistUpdate({ playlist: "Test Playlist", topic: "Lofi" });

      expect(mockRequestRender).toHaveBeenCalledTimes(1);
      expect(mockStoreRenderedImage).toHaveBeenCalledWith(SUCCESSFUL_RENDER.url);

      expect(mockPublishToBuffer).toHaveBeenCalledTimes(1);
      expect(mockPublishToBuffer).toHaveBeenCalledWith({
        text: "🎶 Test Playlist is live now on soundSHINE!",
        mediaUrl: SUCCESSFUL_STORAGE.publicUrl,
      });
      // Never Buffer the temporary Templated URL or anything else.
      expect(mockPublishToBuffer.mock.calls[0][0].mediaUrl).not.toBe(SUCCESSFUL_RENDER.url);

      expect(result).toEqual({
        status: "published",
        id: "render-123",
        template: "test-template-id",
        renderStatus: "completed",
        templatedUrl: "https://cdn.templated.io/renders/render-123.png",
        localPath: SUCCESSFUL_STORAGE.localPath,
        publicUrl: SUCCESSFUL_STORAGE.publicUrl,
        bufferUpdateId: "update-123",
        bufferStatus: "sent",
      });
      expect(mockCreateAlert).not.toHaveBeenCalled();
    });

    it("logs and returns a normalized failure result when Templated rendering fails, without attempting storage or Buffer", async () => {
      mockRequestRender.mockRejectedValue(
        new Error("Templated render response is missing required fields (id/url)")
      );

      const result = await publishPlaylistUpdate({ playlist: "Test Playlist", topic: "Lofi" });

      expect(result).toEqual({
        status: "failed",
        stage: "render",
        error: "Templated render response is missing required fields (id/url)",
      });
      expect(mockStoreRenderedImage).not.toHaveBeenCalled();
      expect(mockPublishToBuffer).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it("does not throw on a render network failure, still returns a normalized failure result", async () => {
      mockRequestRender.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        publishPlaylistUpdate({ playlist: "Test Playlist", topic: "Lofi" })
      ).resolves.toEqual(
        expect.objectContaining({ status: "failed", stage: "render", error: "ECONNREFUSED" })
      );
      expect(mockPublishToBuffer).not.toHaveBeenCalled();
    });

    it("logs and returns a normalized failure result when storage fails, without attempting Buffer", async () => {
      mockRequestRender.mockResolvedValue(SUCCESSFUL_RENDER);
      mockStoreRenderedImage.mockRejectedValue(new Error("ENOSPC: no space left on device"));

      const result = await publishPlaylistUpdate({ playlist: "Test Playlist", topic: "Lofi" });

      expect(result).toEqual({
        status: "failed",
        stage: "storage",
        error: "ENOSPC: no space left on device",
        id: "render-123",
        templatedUrl: "https://cdn.templated.io/renders/render-123.png",
      });
      expect(mockPublishToBuffer).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledTimes(1);
    });

    it("logs, alerts, and returns a normalized failure result when Buffer publication fails, without blocking Discord (render+storage still succeeded)", async () => {
      mockRequestRender.mockResolvedValue(SUCCESSFUL_RENDER);
      mockStoreRenderedImage.mockResolvedValue(SUCCESSFUL_STORAGE);
      mockPublishToBuffer.mockRejectedValue(new Error("Invalid access token"));

      const result = await publishPlaylistUpdate({ playlist: "Test Playlist", topic: "Lofi" });

      expect(result).toEqual({
        status: "failed",
        stage: "publish",
        error: "Invalid access token",
        id: "render-123",
        templatedUrl: "https://cdn.templated.io/renders/render-123.png",
        localPath: SUCCESSFUL_STORAGE.localPath,
        publicUrl: SUCCESSFUL_STORAGE.publicUrl,
      });
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(mockCreateAlert).toHaveBeenCalledTimes(1);
      expect(mockCreateAlert).toHaveBeenCalledWith(
        "social_buffer_publish_failed",
        "warning",
        expect.any(String),
        expect.objectContaining({ error: "Invalid access token" })
      );
    });

    it("does not throw on a Buffer network failure, still returns a normalized failure result", async () => {
      mockRequestRender.mockResolvedValue(SUCCESSFUL_RENDER);
      mockStoreRenderedImage.mockResolvedValue(SUCCESSFUL_STORAGE);
      mockPublishToBuffer.mockRejectedValue(new Error("ECONNREFUSED"));

      await expect(
        publishPlaylistUpdate({ playlist: "Test Playlist", topic: "Lofi" })
      ).resolves.toEqual(
        expect.objectContaining({ status: "failed", stage: "publish", error: "ECONNREFUSED" })
      );
    });
  });
});
