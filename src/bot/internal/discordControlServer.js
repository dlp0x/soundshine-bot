// bot/internal/discordControlServer.js
//
// Phase 2 of the API extraction (see docs/api-extraction-plan.md).
//
// This is a small, separate Express app — not part of the public API's
// `WebServer` — whose only job is to let the API act on Discord without
// holding a reference to the live `discord.js` Client. It's meant to be
// owned by whichever process holds the bot client; today that's the same
// process as the API, but the point of keeping it as its own app/port is
// that it can move to a bot-only process (Phase 3) without changing its
// contract.
//
// It delegates all actual Discord work to `createDiscordGateway`, so the
// channel-lookup/send logic itself only exists in one place.
//
// Every request must carry a shared secret in the `x-internal-secret`
// header, matching `INTERNAL_CONTROL_SECRET`. This is a server-to-server
// secret, distinct from the public API's `API_TOKEN` — it should never be
// exposed to external callers, and this server should only ever listen on
// localhost / an internal network, not be reachable from the public
// internet.

import express from 'express';
import { createDiscordGateway } from '#api/gateways/discordGateway.js';

/**
 * @param {import('discord.js').Client} client
 * @param {{ info: Function, warn: Function, error: Function }} logger
 * @param {{ INTERNAL_CONTROL_SECRET?: string }} config
 */
export function createDiscordControlServer (client, logger, config) {
  const gateway = createDiscordGateway(client);
  const app = express();
  let server = null;

  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const providedSecret = req.headers['x-internal-secret'];

    if (!config.INTERNAL_CONTROL_SECRET || providedSecret !== config.INTERNAL_CONTROL_SECRET) {
      return res.status(401).json({ error: 'Invalid or missing internal control secret.' });
    }

    return next();
  });

  app.get('/internal/v1/discord/bot-tag', async (req, res) => {
    try {
      const tag = await gateway.getBotTag();
      res.json({ tag });
    } catch (err) {
      logger.error(`Erreur control server (bot-tag): ${err.message}`);
      res.status(500).json({ error: 'Internal control server error.' });
    }
  });

  app.post('/internal/v1/discord/send-channel-message', async (req, res) => {
    const { channelId, payload } = req.body || {};

    if (!channelId || typeof channelId !== 'string') {
      return res.status(400).json({ error: 'channelId is required.' });
    }

    try {
      const result = await gateway.sendChannelMessage(channelId, payload);
      res.json(result);
    } catch (err) {
      logger.error(`Erreur control server (send-channel-message): ${err.message}`);
      res.status(500).json({ error: 'Internal control server error.' });
    }
  });

  app.post('/internal/v1/discord/update-stage-topic', async (req, res) => {
    const { channelId, topic } = req.body || {};

    if (!channelId || typeof channelId !== 'string' || !topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'channelId and topic are required.' });
    }

    try {
      const result = await gateway.updateStageTopic(channelId, topic);
      res.json(result);
    } catch (err) {
      logger.error(`Erreur control server (update-stage-topic): ${err.message}`);
      res.status(500).json({ error: 'Internal control server error.' });
    }
  });

  return {
    app,

    start (port) {
      if (!config.INTERNAL_CONTROL_SECRET) {
        throw new Error(
          'INTERNAL_CONTROL_SECRET must be set to start the internal control server.'
        );
      }

      server = app.listen(port, () => {
        logger.api(`Serveur de contrôle interne en ligne sur le port ${port}`);
      });

      return server;
    },

    async stop () {
      if (!server) return;

      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });

      server = null;
    }
  };
}

export default createDiscordControlServer;
