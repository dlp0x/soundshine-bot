// ========================================
// bot/events/handlers/CommandTypeHandler.js - Classification des commandes pour le rate limiting
// ========================================

/**
 * Déterminer le type de commande pour le rate limiting
 */
export function getCommandType (commandName) {
  const commandMap = {
    // Commandes de suggestion
    'suggestion': 'suggestion',
    'suggest': 'suggestion',
    'propose': 'suggestion',

    // Commandes DJ/Admin
    'dj': 'dj',
    'admin': 'dj',
    'moderate': 'dj',
    'ban': 'dj',
    'kick': 'dj',

    // Commandes critiques
    'shutdown': 'critical',
    'restart': 'critical',
    'config': 'critical',

    // Commandes générales (par défaut)
    'ping': 'general',
    'help': 'general',
    'info': 'general'
  };

  return commandMap[commandName] || 'general';
}
