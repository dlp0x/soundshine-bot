// api/gateways/httpDiscordGateway.js
//
// Phase 2 of the API extraction (see docs/api-extraction-plan.md).
//
// Same contract as `discordGateway.js`, but backed by HTTP calls to the
// internal control server (`#bot/internal/discordControlServer.js`)
// instead of a live discord.js Client reference. This is what actually
// lets the API run without the bot's Client object in scope — the only
// thing it needs is a URL and a shared secret.
//
// Failures (auth, network, timeout, unexpected response shape) are never
// thrown to the caller for `sendChannelMessage` — they're normalized into
// the same `{ delivered: false, reason, error }` shape the in-process
// gateway uses, so routes don't need to know which implementation is
// live.

import axios from 'axios';

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * @param {{ baseUrl: string, secret: string, timeoutMs?: number, logger?: { error: Function } }} options
 * @returns {import('./discordGateway.js').DiscordGateway}
 */
export function createHttpDiscordGateway ({ baseUrl, secret, timeoutMs = DEFAULT_TIMEOUT_MS, logger }) {
  const client = axios.create({
    baseURL: baseUrl,
    timeout: timeoutMs,
    headers: { 'x-internal-secret': secret }
  });

  return {
    async getBotTag () {
      try {
        const { data } = await client.get('/internal/v1/discord/bot-tag');
        return data?.tag || null;
      } catch (err) {
        logger?.error?.(`⚠️ [gateway] getBotTag via HTTP a échoué: ${describeAxiosError(err)}`);
        return null;
      }
    },

    async sendChannelMessage (channelId, payload) {
      try {
        const { data } = await client.post('/internal/v1/discord/send-channel-message', {
          channelId,
          payload
        });

        if (typeof data?.delivered !== 'boolean') {
          return { delivered: false, reason: 'malformed_response', error: 'Unexpected control server response.' };
        }

        return data;
      } catch (err) {
        const reason = err.response ? 'control_server_error' : 'gateway_unreachable';

        logger?.error?.(`⚠️ [gateway] sendChannelMessage via HTTP a échoué: ${describeAxiosError(err)}`);

        return { delivered: false, reason, error: describeAxiosError(err) };
      }
    }
  };
}

function describeAxiosError (err) {
  if (err.response) {
    return err.response.data?.error || `HTTP ${err.response.status}`;
  }

  return err.message;
}

export default createHttpDiscordGateway;
