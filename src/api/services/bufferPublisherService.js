// api/services/bufferPublisherService.js
//
// Single responsibility: publish one already-hosted image + caption to a
// single Buffer profile, immediately (no scheduling). This module knows
// nothing about Templated, local storage, or Discord — it only accepts a
// plain `{ text, mediaUrl }` and talks to Buffer's classic v1 REST API
// (https://buffer.com/developers/api).
//
// NOTE: this environment has no network access to api.bufferapp.com while
// this module was written, so the request/response shape below follows
// Buffer's documented v1 API (POST /updates/create.json, form-encoded body
// with `text`, `profile_ids[]`, `media[photo]`, `now=true` to publish
// immediately, Bearer auth). Re-verify against the live docs / a real
// access token before relying on this in production, and adjust
// `parsePublishResponse` if the live response shape differs.

import axios from 'axios';
import botConfig from '#bot/config.js';

const DEFAULT_BASE_URL = 'https://api.bufferapp.com/1';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * Resolves and validates the Buffer configuration from env vars.
 */
function getBufferConfig () {
  const accessToken = botConfig.BUFFER_ACCESS_TOKEN || botConfig.api?.bufferAccessToken;
  const profileId = botConfig.BUFFER_PROFILE_ID || botConfig.api?.bufferProfileId;
  const baseUrl = botConfig.BUFFER_API_BASE_URL || botConfig.api?.bufferApiBaseUrl || DEFAULT_BASE_URL;

  if (!accessToken || !profileId) {
    throw new Error('Buffer is not configured (BUFFER_ACCESS_TOKEN / BUFFER_PROFILE_ID)');
  }

  return { accessToken, profileId, baseUrl };
}

/**
 * Normalizes Buffer's response into the shape the rest of the app relies
 * on. Throws if the response doesn't look like a successful publication,
 * so callers treat "malformed response" the same as any other failure.
 * @param {unknown} data
 */
function parsePublishResponse (data) {
  const update = data?.updates?.[0];

  if (!data?.success || !update?.id) {
    const message = data?.message || 'Buffer response did not confirm a successful publication';
    throw new Error(message);
  }

  return { id: update.id, status: update.status || 'sent' };
}

/**
 * Publishes a single image + caption to the configured Buffer profile,
 * immediately (Buffer's `now: true` behavior — no queue/schedule).
 *
 * @param {{ text: string, mediaUrl: string }} payload
 * @returns {Promise<{ id: string, status: string }>}
 */
export async function publishToBuffer ({ text, mediaUrl }) {
  const { accessToken, profileId, baseUrl } = getBufferConfig();

  const body = new URLSearchParams();
  body.append('text', text);
  body.append('profile_ids[]', profileId);
  body.append('media[photo]', mediaUrl);
  body.append('now', 'true');

  const response = await axios.post(`${baseUrl}/updates/create.json`, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    timeout: REQUEST_TIMEOUT_MS
  });

  return parsePublishResponse(response?.data);
}
