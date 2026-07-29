// ========================================
// api/main.js - Point d'entree "API seule"
// ========================================
//
// Phase 3 of the API extraction (see docs/api-extraction-plan.md).
//
// This process never touches discord.js — it only knows how to reach the
// bot process's internal control server over HTTP (see
// `#bot/internal/discordControlServer.js`). Run it alongside
// `src/bot/main.js`. Requires API_GATEWAY_MODE=http and
// INTERNAL_CONTROL_SECRET to match the bot process's.
//
// The monolithic `src/index.js` entrypoint still exists and is untouched;
// this is an additive alternative, not a replacement.

import 'dotenv/config';
import WebServer from './index.js';
import config from '#bot/config.js';
import logger from '#shared/logging/logger.js';
import { logStartupBanner } from '#core/bootstrap/appInfo.js';
import { registerProcessHandlers } from '#core/lifecycle.js';
import appState from '#core/services/AppState.js';
import { retry } from '#core/services/retry.js';

let apiServer = null;
let isShuttingDown = false;

appState.initialize();
appState.setConfigLoaded(config);

async function gracefulShutdown (signal = 'UNKNOWN') {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Fermeture demandee (signal: ${signal})`);

  try {
    if (apiServer) {
      await apiServer.stop();
      appState.setApiRunning(false);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Erreur durant la fermeture:', error);
    process.exit(1);
  }
}

async function startApplication () {
  try {
    logStartupBanner(logger, config, 'api');

    if (config.API_GATEWAY_MODE !== 'http') {
      throw new Error(
        'src/api/main.js requiert API_GATEWAY_MODE=http (ce processus ne detient pas '
        + 'de client Discord). Sinon, utilisez le point d\'entree monolithique src/index.js.'
      );
    }

    if (!config.hasInternalControlSecret()) {
      throw new Error(
        'INTERNAL_CONTROL_SECRET doit etre defini et correspondre a celui du processus bot.'
      );
    }

    // No discord.js Client available in this process — WebServer only
    // needs it for the in-process gateway, which API_GATEWAY_MODE=http
    // bypasses entirely.
    apiServer = new WebServer(null, logger);
    logger.banner('Initialisation du serveur API (processus separe)...');

    await retry(
      async () => {
        await apiServer.start(config.API_PORT);
        appState.setApiRunning(true, config.API_PORT);
      },
      {
        onRetry: (error, attempt) =>
          logger.warn(`Retry API ${attempt}: ${error.message}`)
      }
    );

    logger.success(`API en ligne sur le port ${config.API_PORT} (gateway: ${config.INTERNAL_CONTROL_URL})`);
    registerProcessHandlers({ gracefulShutdown });

    logger.api('Routes API disponibles : /v1/health, /v1/playlist-update');
  } catch (error) {
    logger.error('Erreur critique au demarrage:', error);

    try {
      if (apiServer) await apiServer.stop();
    } catch (cleanupError) {
      logger.error('Erreur lors du cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

startApplication();
