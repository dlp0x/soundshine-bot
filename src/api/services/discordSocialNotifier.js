// api/services/discordSocialNotifier.js
//
// Sprint 1: replaces the generic AlertManager webhook (system-monitoring
// domain) with domain-specific Discord notifications for the editorial
// team, covering the three outcomes of a social publication attempt:
// success, failure, and missing media asset.
//
// Best-effort by design: a notification failure is logged and swallowed
// here, it never propagates to affect the publication result itself.

import logger from '#shared/logging/logger.js';
import botConfig from '#bot/config.js';

function resolveNotificationChannelId () {
  return botConfig.SOCIAL_NOTIFICATIONS_CHANNEL_ID || botConfig.PLAYLIST_CHANNEL_ID;
}

/**
 * @param {import('#api/gateways/discordGateway.js').DiscordGateway} gateway
 * @param {object} embed
 */
async function sendEmbed (gateway, embed) {
  const channelId = resolveNotificationChannelId();

  if (!channelId) {
    logger.warn('⚠️ [social] Aucun canal de notification configuré (SOCIAL_NOTIFICATIONS_CHANNEL_ID / PLAYLIST_CHANNEL_ID), notification ignorée.');
    return;
  }

  if (!gateway?.sendChannelMessage) {
    logger.warn('⚠️ [social] Gateway Discord indisponible, notification ignorée.');
    return;
  }

  try {
    const result = await gateway.sendChannelMessage(channelId, { embeds: [embed] });

    if (!result?.delivered) {
      logger.error(`⚠️ [social] Notification Discord non livrée: ${result?.error || result?.reason || 'raison inconnue'}`);
    }
  } catch (err) {
    logger.error(`⚠️ [social] Échec d'envoi de la notification Discord: ${err.message}`);
  }
}

/**
 * Notifies the editorial team that a publication succeeded.
 *
 * @param {import('#api/gateways/discordGateway.js').DiscordGateway} gateway
 * @param {{ program: string, playlist: string, bufferUpdateId: string, mediaUrl: string|null }} details
 */
export async function notifyPublishSuccess (gateway, { program, playlist, bufferUpdateId, mediaUrl }) {
  await sendEmbed(gateway, {
    title: '✅ Publication sociale envoyée',
    description: `**${playlist}** (${program}) a été publiée sur Buffer.`,
    color: 0x2ecc71,
    fields: [
      { name: 'Update Buffer', value: bufferUpdateId || 'n/a', inline: true },
      { name: 'Visuel', value: mediaUrl || 'Aucun (texte seul)', inline: true }
    ],
    timestamp: new Date().toISOString()
  });
}

/**
 * Notifies the editorial team that a publication failed.
 *
 * @param {import('#api/gateways/discordGateway.js').DiscordGateway} gateway
 * @param {{ program: string, playlist: string, error: string }} details
 */
export async function notifyPublishFailure (gateway, { program, playlist, error }) {
  await sendEmbed(gateway, {
    title: '❌ Publication sociale échouée',
    description: `La publication de **${playlist}** (${program}) a échoué.`,
    color: 0xe74c3c,
    fields: [
      { name: 'Erreur', value: error || 'Inconnue' }
    ],
    timestamp: new Date().toISOString()
  });
}

/**
 * Notifies the editorial team that no local visual was found for a
 * program, so they can add one under media/shows/. Publication is not
 * blocked by this — it's sent independently of the publish outcome.
 *
 * @param {import('#api/gateways/discordGateway.js').DiscordGateway} gateway
 * @param {{ program: string, slug: string }} details
 */
export async function notifyMissingMedia (gateway, { program, slug }) {
  await sendEmbed(gateway, {
    title: '⚠️ Visuel manquant pour ce programme',
    description: `Aucune image locale trouvée pour **${program}**.`,
    color: 0xf39c12,
    fields: [
      { name: 'Fichier attendu', value: `media/shows/${slug}.png` }
    ],
    timestamp: new Date().toISOString()
  });
}
