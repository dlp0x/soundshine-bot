// api/services/socialPublishService.js
//
// Social orchestration entry point for playlist updates:
// 1. Resolves the predefined local visual for the on-air program (see
//    showMediaResolver.js). No image is generated dynamically.
// 2. Builds a caption (hook + listening URL + hashtags).
// 3. Publishes the caption, and the local visual when one was found, to
//    Buffer.
// 4. Notifies the editorial team on Discord: publication success, failure,
//    or a missing media asset — each independent of the others.
//
// Sprint 1: Templated.io has been removed from this pipeline. Images are
// no longer rendered on demand; each program has a static asset under
// media/shows/<slug>.<ext>. A missing asset never blocks publication — it
// only triggers a dedicated Discord notification so the editorial team can
// add the missing artwork.
//
// Each stage remains an independent, isolated failure point: nothing here
// ever propagates up to affect the Discord playlist/stage update or the
// API response.

import logger from '#shared/logging/logger.js';
import botConfig from '#bot/config.js';
import { publishToBuffer } from '#api/services/bufferPublisherService.js';
import { resolveShowMedia } from '#api/services/showMediaResolver.js';
import {
  notifyPublishSuccess,
  notifyPublishFailure,
  notifyMissingMedia
} from '#api/services/discordSocialNotifier.js';

const ANNOUNCEMENT_TIMEZONE = 'America/Toronto';
const DEFAULT_STREAM_URL = 'https://soundshineradio.com';

/**
 * Builds the programming announcement text, e.g. "Lofi — 18h", from the
 * topic/program title and the current hour in the station's timezone.
 * Deliberately does not use any "now playing" artist/title data.
 *
 * @param {string} topic
 * @param {Date} [now]
 */
export function formatProgramAnnouncement (topic, now = new Date()) {
  const hour = new Intl.DateTimeFormat('en-CA', {
    timeZone: ANNOUNCEMENT_TIMEZONE,
    hour: '2-digit',
    hour12: false
  }).format(now).replace(/\D/g, '');

  return `${topic} — ${hour}h`;
}

/**
 * Strips a program name down to a bare hashtag token, e.g.
 * "Morning Show" -> "MorningShow".
 * @param {string} text
 */
function slugifyHashtag (text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '');
}

/**
 * Builds the Buffer post caption from the playlist-update fields: a hook
 * line, the listening URL, and a small set of hashtags. Independent of
 * whether a media asset was found for the program.
 *
 * @param {string} topic
 * @param {string} playlist
 */
export function buildSocialCaption (topic, playlist) {
  const streamUrl = botConfig.STREAM_URL || DEFAULT_STREAM_URL;
  const hashtags = ['#soundSHINE', '#radio', slugifyHashtag(topic) && `#${slugifyHashtag(topic)}`]
    .filter(Boolean)
    .join(' ');

  return `🎶 ${playlist} is live now on soundSHINE!\n🔗 ${streamUrl}\n\n${hashtags}`;
}

/**
 * Social orchestration entry point for a playlist update. See module
 * header for the stages. Media resolution and Buffer publication are
 * best-effort: failures are logged, reported via a Discord notification,
 * and returned as a normalized result rather than thrown.
 *
 * @param {{
 *   playlist: string,
 *   topic: string,
 *   gateway?: import('#api/gateways/discordGateway.js').DiscordGateway
 * }} payload
 * @returns {Promise<
 *   { status: 'published', program: string, playlist: string, mediaUrl: string|null,
 *     bufferUpdateId: string, bufferStatus: string } |
 *   { status: 'failed', stage: 'publish', error: string, program: string,
 *     playlist: string, mediaUrl: string|null }
 * >}
 */
export async function publishPlaylistUpdate ({ playlist, topic, gateway }) {
  const media = resolveShowMedia(topic);

  if (!media.found) {
    logger.warn(
      `⚠️ [social] Aucun visuel local trouvé pour le programme "${topic}" (slug attendu: "${media.slug}").`
    );

    await notifyMissingMedia(gateway, { program: topic, slug: media.slug });
  }

  const caption = buildSocialCaption(topic, playlist);

  try {
    const buffer = await publishToBuffer({
      text: caption,
      mediaUrl: media.found ? media.publicUrl : undefined
    });

    await logger.info(
      `✅ [social] Publié sur Buffer (update ${buffer.id}) — programme "${topic}"` +
      (media.found ? ` avec visuel ${media.publicUrl}` : ' sans visuel')
    );

    await notifyPublishSuccess(gateway, {
      program: topic,
      playlist,
      bufferUpdateId: buffer.id,
      mediaUrl: media.found ? media.publicUrl : null
    });

    return {
      status: 'published',
      program: topic,
      playlist,
      mediaUrl: media.found ? media.publicUrl : null,
      bufferUpdateId: buffer.id,
      bufferStatus: buffer.status
    };
  } catch (err) {
    await logger.error(
      `⚠️ [social] Publication Buffer échouée pour "${topic}" (playlist="${playlist}"): ${err.message}`
    );

    await notifyPublishFailure(gateway, { program: topic, playlist, error: err.message });

    return {
      status: 'failed',
      stage: 'publish',
      error: err.message,
      program: topic,
      playlist,
      mediaUrl: media.found ? media.publicUrl : null
    };
  }
}
