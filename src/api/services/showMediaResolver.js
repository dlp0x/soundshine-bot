// api/services/showMediaResolver.js
//
// Sprint 1: replaces the Templated.io dynamic render step. Instead of
// generating an image on every publication, each on-air program has a
// predefined static visual under `media/shows/<slug>.<ext>`.
//
// Single responsibility: given a program name (e.g. "Lofi", "Morning Show"),
// resolve whether a matching local asset exists and, if so, the local path
// plus the stable public HTTPS URL to hand to Buffer. Never throws for a
// missing asset — the caller decides how to proceed (this project's rule is
// that a missing image must never block publication).

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import botConfig from '#bot/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// src/api/services -> src/api -> src -> project root -> media/shows
const DEFAULT_MEDIA_ROOT = path.join(__dirname, '..', '..', '..', 'media', 'shows');

const ACCEPTED_EXTENSIONS = ['png', 'jpg', 'jpeg'];

function getMediaConfig () {
  const root = botConfig.SOCIAL_SHOW_MEDIA_ROOT || botConfig.api?.socialShowMediaRoot || DEFAULT_MEDIA_ROOT;
  const publicBaseUrl = (
    botConfig.SOCIAL_SHOW_MEDIA_PUBLIC_BASE_URL ||
    botConfig.api?.socialShowMediaPublicBaseUrl ||
    'https://media.soundshineradio.com/shows'
  ).replace(/\/+$/, '');

  return { root, publicBaseUrl };
}

/**
 * Normalizes a program name into a filesystem/URL-safe slug, e.g.
 * "Lofi Beats" -> "lofi-beats", "Éveil du matin" -> "eveil-du-matin".
 *
 * @param {string} name
 */
export function slugifyProgramName (name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Resolves the local show image for a given program name, if one exists.
 * Checks each accepted extension in order and returns on the first match.
 *
 * @param {string} programName
 * @returns {
 *   { found: true, slug: string, localPath: string, publicUrl: string } |
 *   { found: false, slug: string }
 * }
 */
export function resolveShowMedia (programName) {
  const slug = slugifyProgramName(programName);

  if (!slug) {
    return { found: false, slug: '' };
  }

  const { root, publicBaseUrl } = getMediaConfig();

  for (const extension of ACCEPTED_EXTENSIONS) {
    const localPath = path.join(root, `${slug}.${extension}`);

    if (fs.existsSync(localPath)) {
      return {
        found: true,
        slug,
        localPath,
        publicUrl: `${publicBaseUrl}/${slug}.${extension}`
      };
    }
  }

  return { found: false, slug };
}

export default resolveShowMedia;
