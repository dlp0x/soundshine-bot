// api/gateways/discordGateway.js
//
// This module is the single seam between the API layer and Discord.
//
// This file is the in-process implementation: it wraps the live discord.js
// Client directly, and behavior is unchanged from before the seam existed.
// A sibling implementation, `httpDiscordGateway.js`, talks to the same
// contract over HTTP instead — see that file and
// `#bot/internal/discordControlServer.js` for how the API can run without
// holding a reference to the live client at all.
//
// Any new capability the API needs from Discord should be added as a
// method here (and mirrored in the HTTP implementation) rather than
// reaching back into a raw client somewhere else.

/**
 * @typedef {Object} DiscordGateway
 * @property {() => Promise<string|null>} getBotTag
 * @property {(channelId: string, payload: object) =>
 *   Promise<{delivered: boolean, reason?: string, error?: string}>} sendChannelMessage
 * @property {(channelId: string, topic: string) =>
 *   Promise<{updated: boolean, reason?: string, error?: string}>} updateStageTopic
 */

/**
 * Builds a DiscordGateway backed directly by a live discord.js Client.
 * This is the in-process implementation: it preserves the exact behavior
 * the API previously got from touching `client` directly in routes, and
 * it's also what the internal control server (see
 * `#bot/internal/discordControlServer.js`) delegates to under the hood —
 * that way the actual channel-lookup/send logic only lives in one place.
 *
 * @param {import('discord.js').Client} client
 * @returns {DiscordGateway}
 */
export function createDiscordGateway (client) {
  return {
    async getBotTag () {
      return client?.user?.tag || null;
    },

    async sendChannelMessage (channelId, payload) {
      const channel = client?.channels?.cache?.get(channelId);

      if (!channel?.isTextBased?.()) {
        return { delivered: false, reason: 'invalid_channel', error: 'Canal Discord invalide.' };
      }

      try {
        await channel.send(payload);
        return { delivered: true };
      } catch (err) {
        return { delivered: false, reason: 'send_failed', error: err.message };
      }
    },

    async updateStageTopic (channelId, topic) {
      let channel;

      try {
        channel = await client?.channels?.fetch?.(channelId);
      } catch (err) {
        return { updated: false, reason: 'fetch_failed', error: err.message };
      }

      if (!channel?.createStageInstance) {
        return { updated: false, reason: 'invalid_channel', error: 'Canal Stage invalide.' };
      }

      try {
        if (channel.stageInstance?.setTopic) {
          await channel.stageInstance.setTopic(topic);
        } else {
          await channel.createStageInstance({ topic });
        }

        return { updated: true };
      } catch (err) {
        return { updated: false, reason: 'update_failed', error: err.message };
      }
    }
  };
}

export default createDiscordGateway;
