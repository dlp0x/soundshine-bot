// api/services/mediaStorageService.js
//
// Single responsibility: download a rendered image from a (temporary)
// source URL and persist it locally under the configured storage root,
// returning both the local file path and a stable public HTTPS URL.
//
// Kept isolated from Templated-specific logic (it only ever sees a plain
// `sourceUrl`) and from any future "publish to a platform" logic. No
// Buffer manipulation: the download is streamed straight to disk. No
// database, queue, retry, or cleanup job — a storage failure is simply
// surfaced to the caller to log and move on.

import fs from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import axios from 'axios';
import botConfig from '#bot/config.js';

const DOWNLOAD_TIMEOUT_MS = 15000;

// Only these content types are accepted for a rendered social visual.
// Anything else is treated as an invalid/unexpected download.
const ACCEPTED_CONTENT_TYPES = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png'
};

/**
 * Resolves the configured storage root and public base URL.
 * Both have safe defaults set in bot/config.js, but this still guards
 * against an empty override reaching the filesystem/URL logic below.
 */
function getStorageConfig () {
  const root = botConfig.SOCIAL_MEDIA_STORAGE_ROOT || botConfig.api?.socialMediaStorageRoot;
  const publicBaseUrl = botConfig.SOCIAL_MEDIA_PUBLIC_BASE_URL || botConfig.api?.socialMediaPublicBaseUrl;

  if (!root || !publicBaseUrl) {
    throw new Error(
      'Media storage is not configured (SOCIAL_MEDIA_STORAGE_ROOT / SOCIAL_MEDIA_PUBLIC_BASE_URL)'
    );
  }

  return { root, publicBaseUrl: publicBaseUrl.replace(/\/+$/, '') };
}

/**
 * Builds the YYYY/MM/DD path segments for a given date, in UTC so the
 * folder structure doesn't depend on the server's local timezone.
 * @param {Date} date
 */
function buildDateSegments (date) {
  const yyyy = String(date.getUTCFullYear());
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');

  return { yyyy, mm, dd };
}

/**
 * Generates an immutable, collision-resistant filename. Never produces a
 * mutable/reusable name such as "latest.jpg".
 * @param {string} extension
 */
function buildUniqueFilename (extension) {
  return `${Date.now()}-${crypto.randomUUID()}.${extension}`;
}

/**
 * Downloads the image at `sourceUrl` and persists it under
 * `<root>/YYYY/MM/DD/<unique-filename>.<ext>`.
 *
 * @param {string} sourceUrl - temporary URL of the rendered image (e.g. from Templated)
 * @param {{ now?: Date }} [options]
 * @returns {Promise<{ localPath: string, publicUrl: string }>}
 */
export async function storeRenderedImage (sourceUrl, { now = new Date() } = {}) {
  const { root, publicBaseUrl } = getStorageConfig();

  const response = await axios.get(sourceUrl, {
    responseType: 'stream',
    timeout: DOWNLOAD_TIMEOUT_MS,
    validateStatus: (status) => status === 200
  });

  const contentType = String(response.headers['content-type'] || '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const extension = ACCEPTED_CONTENT_TYPES[contentType];

  if (!extension) {
    response.data.destroy();
    throw new Error(`Unexpected content type for rendered image: "${contentType || 'unknown'}"`);
  }

  const { yyyy, mm, dd } = buildDateSegments(now);
  const targetDir = path.join(root, yyyy, mm, dd);

  await mkdir(targetDir, { recursive: true });

  const filename = buildUniqueFilename(extension);
  const localPath = path.join(targetDir, filename);

  // 'wx' = create exclusively, fail instead of overwriting if it somehow
  // already exists.
  await pipeline(response.data, fs.createWriteStream(localPath, { flags: 'wx' }));

  const publicUrl = [publicBaseUrl, yyyy, mm, dd, filename].join('/');
  console.log('LOCAL PATH:', localPath);
  console.log('PUBLIC URL:', publicUrl);
  return { localPath, publicUrl };
}
