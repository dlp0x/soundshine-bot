// ========================================
// bot/utils/SafeStringify.js - Utilitaire pour sérialiser en toute sécurité
// ========================================

/**
 * Sérialise un objet en JSON en gérant les BigInt et les références circulaires
 */
export function safeStringify (obj) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    // Gérer les BigInt
    if (typeof value === 'bigint') {
      return value.toString();
    }

    // Gérer les références circulaires
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Reference]';
      }
      seen.add(value);
    }

    return value;
  });
}
