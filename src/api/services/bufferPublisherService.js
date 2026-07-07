import axios from 'axios';
import botConfig from '#bot/config.js';

const DEFAULT_BASE_URL = 'https://api.buffer.com';
const REQUEST_TIMEOUT_MS = 10000;

function getBufferConfig () {
  const accessToken =
    botConfig.BUFFER_ACCESS_TOKEN || botConfig.api?.bufferAccessToken;

  // Compatibilité avec ton .env actuel.
  // À renommer BUFFER_CHANNEL_ID plus tard si tu veux clarifier.
  const channelId =
    botConfig.BUFFER_CHANNEL_ID ||
    botConfig.BUFFER_PROFILE_ID ||
    botConfig.api?.bufferChannelId ||
    botConfig.api?.bufferProfileId;

  const baseUrl =
    botConfig.BUFFER_API_BASE_URL ||
    botConfig.api?.bufferApiBaseUrl ||
    DEFAULT_BASE_URL;

  if (!accessToken || !channelId) {
    throw new Error(
      'Buffer is not configured (BUFFER_ACCESS_TOKEN / BUFFER_CHANNEL_ID)'
    );
  }

  return { accessToken, channelId, baseUrl };
}

function escapeGraphqlString (value) {
  return JSON.stringify(String(value));
}

function parsePublishResponse (data) {
  const result = data?.data?.createPost;

  if (!result) {
    const errors = data?.errors?.map((error) => error.message).join('; ');
    throw new Error(errors || 'Buffer returned no createPost result');
  }

  // GraphQL union: Buffer retourne ceci pour une erreur métier.
  if (result.message) {
    throw new Error(result.message);
  }

  const post = result.post;

  if (!post?.id) {
    throw new Error('Buffer did not confirm a created post');
  }

  return {
    id: post.id,
    status: post.status || 'scheduled'
  };
}

/**
 * Publie immédiatement un post image sur un channel Buffer.
 *
 * @param {{ text: string, mediaUrl: string }} payload
 * @returns {Promise<{ id: string, status: string }>}
 */
export async function publishToBuffer ({ text, mediaUrl }) {
  const { accessToken, channelId, baseUrl } = getBufferConfig();

  const mutation = `
    mutation CreateImagePost {
      createPost(
       input: {
  text: ${escapeGraphqlString(text)}
  channelIds: [${escapeGraphqlString(channelId)}]
  schedulingType: automatic
  mode: draft
  assets: [
    {
      image: {
        url: ${escapeGraphqlString(mediaUrl)}
      }
    }
  ]
}
      ) {
        ... on PostActionSuccess {
          post {
            id
            status
            text
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  const response = await axios.post(
    baseUrl,
    { query: mutation },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: REQUEST_TIMEOUT_MS
    }
  );

  return parsePublishResponse(response.data);
}