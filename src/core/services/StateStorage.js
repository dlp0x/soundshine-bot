// core/services/StateStorage.js

export default class StateStorage {
  #state = {
    bot: {
      isReady: false,
      isConnected: false,
      startTime: null,
      uptime: 0,
      commandsExecuted: 0,
      commandsFailed: 0
    },
    database: {
      isConnected: false,
      isHealthy: false,
      lastCheck: null,
      queriesExecuted: 0,
      queriesFailed: 0
    },
    api: {
      isRunning: false,
      port: null,
      startTime: null,
      requestsHandled: 0,
      requestsFailed: 0
    },
    config: {
      isLoaded: false,
      environment: null,
      version: null,
      lastReload: null
    },
    system: {
      memoryUsage: {},
      cpuUsage: {},
      lastUpdate: null
    }
  };

  // ---- Getters immuables ----

  getBot () {
    return { ...this.#state.bot };
  }

  getDatabase () {
    return { ...this.#state.database };
  }

  getApi () {
    return { ...this.#state.api };
  }

  getConfig () {
    return { ...this.#state.config };
  }

  getSystem () {
    return { ...this.#state.system };
  }

  getFull () {
    return {
      bot: this.getBot(),
      database: this.getDatabase(),
      api: this.getApi(),
      config: this.getConfig(),
      system: this.getSystem()
    };
  }

  // ---- Setters / mutations ----

  setBotReady (isReady) {
    this.#state.bot.isReady = isReady;
    if (isReady && !this.#state.bot.startTime) {
      this.#state.bot.startTime = Date.now();
    }
    this.#updateBotUptime();
  }

  setBotConnected (isConnected) {
    this.#state.bot.isConnected = isConnected;
  }

  incrementCommandsExecuted () {
    this.#state.bot.commandsExecuted++;
    this.#updateBotUptime();
  }

  incrementCommandsFailed () {
    this.#state.bot.commandsFailed++;
    this.#updateBotUptime();
  }

  setDatabaseConnected (isConnected) {
    this.#state.database.isConnected = isConnected;
    this.#state.database.lastCheck = Date.now();
  }

  setDatabaseHealthy (isHealthy) {
    this.#state.database.isHealthy = isHealthy;
    this.#state.database.lastCheck = Date.now();
  }

  incrementQueriesExecuted () {
    this.#state.database.queriesExecuted++;
  }

  incrementQueriesFailed () {
    this.#state.database.queriesFailed++;
  }

  setApiRunning (isRunning, port = null) {
    this.#state.api.isRunning = isRunning;
    if (isRunning && !this.#state.api.startTime) {
      this.#state.api.startTime = Date.now();
      this.#state.api.port = port;
    }
  }

  incrementRequestsHandled () {
    this.#state.api.requestsHandled++;
  }

  incrementRequestsFailed () {
    this.#state.api.requestsFailed++;
  }

  setConfigLoaded (config) {
    this.#state.config.isLoaded = true;
    this.#state.config.environment = config.NODE_ENV;
    this.#state.config.version = process.env.npm_package_version || '2.0.0';
    this.#state.config.lastReload = Date.now();
  }

  updateSystemMetrics (metrics = null) {
    if (metrics) {
      this.#state.system.memoryUsage = metrics.memoryUsage;
      this.#state.system.cpuUsage = metrics.cpuUsage;
      this.#state.system.lastUpdate = Date.now();
    }
  }

  // ---- Utilities ----

  #updateBotUptime () {
    if (this.#state.bot.startTime) {
      this.#state.bot.uptime = Date.now() - this.#state.bot.startTime;
    }
  }

  // ---- Reset ----

  reset () {
    this.#state = {
      bot: {
        isReady: false,
        isConnected: false,
        startTime: null,
        uptime: 0,
        commandsExecuted: 0,
        commandsFailed: 0
      },
      database: {
        isConnected: false,
        isHealthy: false,
        lastCheck: null,
        queriesExecuted: 0,
        queriesFailed: 0
      },
      api: {
        isRunning: false,
        port: null,
        startTime: null,
        requestsHandled: 0,
        requestsFailed: 0
      },
      config: {
        isLoaded: false,
        environment: null,
        version: null,
        lastReload: null
      },
      system: {
        memoryUsage: {},
        cpuUsage: {},
        lastUpdate: null
      }
    };
  }
}
