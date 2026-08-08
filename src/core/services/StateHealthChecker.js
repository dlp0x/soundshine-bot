// core/services/StateHealthChecker.js

export default class StateHealthChecker {
  #storage;

  constructor (storage) {
    this.#storage = storage;
  }

  getStatus () {
    const bot = this.#storage.getBot();
    const database = this.#storage.getDatabase();
    const api = this.#storage.getApi();
    const config = this.#storage.getConfig();

    const components = {
      bot: {
        healthy: bot.isConnected && bot.isReady,
        details: {
          connected: bot.isConnected,
          ready: bot.isReady,
          uptime: bot.uptime
        }
      },
      database: {
        healthy: database.isConnected && database.isHealthy,
        details: {
          connected: database.isConnected,
          healthy: database.isHealthy,
          lastCheck: database.lastCheck
        }
      },
      api: {
        healthy: api.isRunning,
        details: {
          running: api.isRunning,
          port: api.port,
          startTime: api.startTime
        }
      },
      config: {
        healthy: config.isLoaded,
        details: {
          loaded: config.isLoaded,
          environment: config.environment,
          version: config.version
        }
      }
    };

    const overall = Object.values(components).every(c => c.healthy);

    return {
      overall,
      components,
      timestamp: new Date().toISOString()
    };
  }
}
