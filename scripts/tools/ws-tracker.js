// tools/ws-tracker.js
import WebSocket from 'ws';

const OriginalWebSocket = WebSocket;

// Interception globale des connexions WebSocket
class DebugWebSocket extends OriginalWebSocket {
  constructor(url, protocols, options) {
    console.warn(`[WS-DEBUG] Tentative de connexion WebSocket: ${url}`);
    super(url, protocols, options);

    this.on('open', () => {
      console.log(`[WS-DEBUG] ✅ Connexion réussie vers: ${url}`);
    });

    this.on('error', (err) => {
      console.error(`[WS-DEBUG] ❌ Erreur de connexion WS vers: ${url}`);
      console.error(`[WS-DEBUG] Erreur: ${err.message}`);
    });

    this.on('close', (code, reason) => {
      console.warn(`[WS-DEBUG] 🔌 Connexion fermée (code ${code}): ${url}`);
      if (reason) console.warn(`[WS-DEBUG] Raison: ${reason}`);
    });
  }
}

// Remplace la classe WebSocket globale
global.WebSocket = DebugWebSocket;
