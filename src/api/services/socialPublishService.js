// api/services/socialPublishService.js
//
// Social orchestration entry point for playlist updates:
// 1. Requests a rendered "programming announcement" visual from Templated.
// 2. Downloads and persists that render locally, producing a stable
//    public HTTPS URL under media.soundshineradio.com.
// 3. Publishes that stable URL + a short caption to Buffer, immediately.
//
// Each stage is an independent, isolated failure point: a failure at any
// stage is caught and logged here and never propagates up to affect the
// Discord update or the API response. Only the stable local media URL is
// ever handed to Buffer — never a Discord CDN URL or the temporary
// Templated render URL.

import logger from '#shared/logging/logger.js';
import alertManager from '#core/services/AlertManager.js';
import { requestRender } from '#api/services/templatedClient.js';
import { storeRenderedImage } from '#api/services/mediaStorageService.js';
import { publishToBuffer } from '#api/services/bufferPublisherService.js';

// Layer names on the configured Templated template that receive the
// programming title ("Lofi — 18h") and the playlist name. Adjust these to
// match the actual template's layer names in the Templated dashboard.
const TITLE_LAYER = 'title';
const SUBTITLE_LAYER = 'subtitle';

const ANNOUNCEMENT_TIMEZONE = 'America/Toronto';

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
 * Small, isolated helper: builds the Buffer post caption from the same
 * playlist-update fields, independently of the visual's own text layers.
 *
 * @param {string} topic
 * @param {string} playlist
 */
export function buildSocialCaption (topic, playlist) {
  logger.info(`🎨 Templated render requested: ${topic} / ${playlist}`);
  return `🎶 ${playlist} is live now on soundSHINE!`;
}

/**
 * Social orchestration entry point for a playlist update. See module
 * header for the three stages. Every stage is best-effort: failures are
 * logged and returned as a normalized `{ status: 'failed', stage, ... }`
 * result rather than thrown.
 *
 * @param {{ playlist: string, topic: string }} payload
 * @returns {Promise<
 *   { status: 'published', id: string, template: string, renderStatus: string,
 *     templatedUrl: string, localPath: string, publicUrl: string,
 *     bufferUpdateId: string, bufferStatus: string } |
 *   { status: 'failed', stage: 'render' | 'storage' | 'publish', error: string,
 *     id?: string, templatedUrl?: string, localPath?: string, publicUrl?: string }
 * >}
 */

export async function publishPlaylistUpdate ({ playlist, topic }) {
  const announcement = formatProgramAnnouncement(topic);

  let render;
  try {
    render = await requestRender({
      [TITLE_LAYER]: { text: announcement },
      [SUBTITLE_LAYER]: { text: playlist }
    });
  } catch (err) {
    await logger.error(
      `⚠️ [social] Templated render failed for "${announcement}" (playlist="${playlist}"): ${err.message}`
    );

    return { status: 'failed', stage: 'render', error: err.message };
  }

  let stored;
  try {
    stored = await storeRenderedImage(render.url);

    await logger.info(
      `📣 [social] Stored render for "${announcement}" (playlist="${playlist}") → ${stored.publicUrl}`
    );
  } catch (err) {
    await logger.error(
      `⚠️ [social] Storing render failed for "${announcement}" (playlist="${playlist}"): ${err.message}`
    );

    return {
      status: 'failed',
      stage: 'storage',
      error: err.message,
      id: render.id,
      templatedUrl: render.url
    };
  }

  const caption = buildSocialCaption(topic, playlist);

  try {
    const buffer = await publishToBuffer({ text: caption, mediaUrl: stored.publicUrl });

    await logger.info(
      `✅ [social] Published to Buffer (update ${buffer.id}) → ${stored.publicUrl}`
    );

    return {
      status: 'published',
      id: render.id,
      template: render.template,
      renderStatus: render.status,
      templatedUrl: render.url,
      localPath: stored.localPath,
      publicUrl: stored.publicUrl,
      bufferUpdateId: buffer.id,
      bufferStatus: buffer.status
    };
  } catch (err) {
    // Concise, actionable log: what failed, and the URL an admin could
    // publish manually in the meantime.
    await logger.error(
      `⚠️ [social] Buffer publication failed for "${announcement}" (media: ${stored.publicUrl}): ${err.message}`
    );

    alertManager.createAlert(
      'social_buffer_publish_failed',
      'warning',
      `Publication Buffer échouée pour "${announcement}"`,
      { playlist, topic, mediaUrl: stored.publicUrl, error: err.message }
    );

    return {
      status: 'failed',
      stage: 'publish',
      error: err.message,
      id: render.id,
      templatedUrl: render.url,
      localPath: stored.localPath,
      publicUrl: stored.publicUrl
    };
  }
}
