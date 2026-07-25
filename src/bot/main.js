// ========================================
// bot/main.js - Point d'entree "bot seul"
// ========================================
//
// Phase 3 of the API extraction (see docs/api-extraction-plan.md).
//
// This process owns the Discord client and the internal control server
// only — it never starts the public Express API. Run it alongside
// `src/api/main.js` (with API_GATEWAY_MODE=http) to run the bot and the
// API as two separate processes.
//
// The monolithic `src/index.js` entrypoint still exists and is untouched;
// this is an additive alternative, not a replacement.

import 'dotenv/config';
import { createDiscordControlServer } from './internal/discordControlServer.js';
import { startBot, stopBot } from './startup.js';
import config from './config.js';
import logger from '#shared/logging/logger.js';
import logMemory from './tasks/logMemory.js';
import { logStartupBanner } from '#core/bootstrap/appInfo.js';
import { registerProcessHandlers } from '#core/lifecycle.js';
import appState from '#core/services/AppState.js';
import { db as database } from '#shared/database/database.js';
import { retryDiscord } from '#core/services/retry.js';

let botClient = null;
let controlServer = null;
let isShuttingDown = false;

appState.initialize();
appState.setConfigLoaded(config);

async function gracefulShutdown (signal = 'UNKNOWN') {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.warn(`Fermeture demandee (signal: ${signal})`);

  try {
    if (controlServer) {
      await controlServer.stop();
    }

    if (botClient) {
      await stopBot();
      appState.setBotConnected(false);
      appState.setBotReady(false);
    }

    await database.connect();
    appState.setDatabaseConnected(false);
    appState.setDatabaseHealthy(false);

    process.exit(0);
  } catch (error) {
    logger.error('Erreur durant la fermeture:', error);
    process.exit(1);
  }
}

async function startApplication () {
  try {
    logStartupBanner(logger, config, 'bot');

    if (!config.hasInternalControlSecret()) {
      throw new Error(
        'INTERNAL_CONTROL_SECRET doit etre defini pour demarrer src/bot/main.js '
        + '(le processus API en a besoin pour parler au bot). '
        + 'Sinon, utilisez le point d\'entree monolithique src/index.js.'
      );
    }

    botClient = await retryDiscord(
      async () => {
        const client = await startBot();
        appState.setBotConnected(true);
        appState.setBotReady(true);
        return client;
      },
      {
        onRetry: (error, attempt) =>
          logger.warn(`Retry Discord ${attempt}: ${error.message}`)
      }
    );

    controlServer = createDiscordControlServer(botClient, logger, config);
    controlServer.start(config.INTERNAL_CONTROL_PORT);

    logger.success(`Bot en ligne. Serveur de controle interne sur le port ${config.INTERNAL_CONTROL_PORT}`);
    registerProcessHandlers({ gracefulShutdown });

    logMemory.execute();
    logger.banner('Bot pret (mode processus separe). Logging en cours...');
  } catch (error) {
    logger.error('Erreur critique au demarrage:', error);

    try {
      if (botClient) await stopBot();
      if (controlServer) await controlServer.stop();
      await database.disconnect();
    } catch (cleanupError) {
      logger.error('Erreur lors du cleanup:', cleanupError);
    }

    process.exit(1);
  }
}

startApplication();
