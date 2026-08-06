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
    SOCIAL_NOTIFICATIONS_CHANNEL_ID: "channel-social",
    PLAYLIST_CHANNEL_ID: "channel-playlist",
  },
}));

import logger from "#shared/logging/logger.js";
import {
  notifyPublishSuccess,
  notifyPublishFailure,
  notifyMissingMedia,
} from "#api/services/discordSocialNotifier.js";

describe("discordSocialNotifier", () => {
  let gateway;

  beforeEach(() => {
    vi.clearAllMocks();
    gateway = { sendChannelMessage: vi.fn().mockResolvedValue({ delivered: true }) };
  });

  it("sends a success embed to the configured social notifications channel", async () => {
    await notifyPublishSuccess(gateway, {
      program: "Lofi",
      playlist: "Chill Vibes",
      bufferUpdateId: "update-123",
      mediaUrl: "https://media.soundshineradio.com/shows/lofi.png",
    });

    expect(gateway.sendChannelMessage).toHaveBeenCalledTimes(1);
    const [channelId, payload] = gateway.sendChannelMessage.mock.calls[0];
    expect(channelId).toBe("channel-social");
    expect(payload.embeds[0].title).toContain("Publication sociale envoyée");
    expect(payload.embeds[0].description).toContain("Chill Vibes");
  });

  it("sends a failure embed with the error message", async () => {
    await notifyPublishFailure(gateway, {
      program: "Lofi",
      playlist: "Chill Vibes",
      error: "Invalid access token",
    });

    const [, payload] = gateway.sendChannelMessage.mock.calls[0];
    expect(payload.embeds[0].title).toContain("échouée");
    expect(payload.embeds[0].fields[0].value).toBe("Invalid access token");
  });

  it("sends a missing-media embed naming the expected file", async () => {
    await notifyMissingMedia(gateway, { program: "Lofi", slug: "lofi" });

    const [, payload] = gateway.sendChannelMessage.mock.calls[0];
    expect(payload.embeds[0].title).toContain("Visuel manquant");
    expect(payload.embeds[0].fields[0].value).toBe("media/shows/lofi.png");
  });

  it("logs and does not throw when the gateway is unavailable", async () => {
    await expect(
      notifyPublishSuccess(undefined, {
        program: "Lofi",
        playlist: "Chill Vibes",
        bufferUpdateId: "update-123",
        mediaUrl: null,
      })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it("logs and does not throw when sendChannelMessage rejects", async () => {
    gateway.sendChannelMessage.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(
      notifyPublishFailure(gateway, { program: "Lofi", playlist: "Chill Vibes", error: "x" })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("logs and does not throw when delivery is reported as failed", async () => {
    gateway.sendChannelMessage.mockResolvedValue({ delivered: false, reason: "invalid_channel" });

    await notifyMissingMedia(gateway, { program: "Lofi", slug: "lofi" });

    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
