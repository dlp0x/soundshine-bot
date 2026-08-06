import axios from 'axios';
import botConfig from '#bot/config.js';

const DEFAULT_BASE_URL = 'https://api.buffer.com';
const REQUEST_TIMEOUT_MS = 10000;

function getBufferConfig () {
  const accessToken =
    botConfig.BUFFER_ACCESS_TOKEN || botConfig.api?.bufferAccessToken;

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

function parsePublishResponse (data) {
  const result = data?.data?.createPost;

  if (!result) {
    const errors = data?.errors?.map((error) => error.message).join('; ');
    throw new Error(errors || 'Buffer returned no createPost result');
  }

  if (result.message) {
    throw new Error(result.message);
  }

  const post = result.post;

  if (!post?.id) {
    throw new Error('Buffer did not confirm a created post');
  }

  return {
    id: post.id,
    status: post.status || 'addToQueue'
  };
}

/**
 * Publie une mise à jour via Buffer. Quand un `mediaUrl` est fourni, elle
 * est publiée comme story Instagram (comportement historique). Sans
 * `mediaUrl` (Sprint 1: aucun visuel local trouvé pour le programme), le
 * post est envoyé texte seul, sans bloquer la publication.
 *
 * @param {{ text: string, mediaUrl?: string }} payload
 * @returns {Promise<{ id: string, status: string }>}
 */
export async function publishToBuffer ({ text, mediaUrl }) {
  const { accessToken, channelId, baseUrl } = getBufferConfig();

  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
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

  const input = {
    channelId,
    text,
    schedulingType: 'automatic',
    mode: 'addToQueue',
    saveToDraft: true
  };

  if (mediaUrl) {
    input.metadata = {
      instagram: {
        type: 'story',
        shouldShareToFeed: false
      }
    };
    input.assets = [
      {
        image: {
          url: mediaUrl
        }
      }
    ];
  }

  const variables = { input };

  const response = await axios.post(
    baseUrl,
    {
      query: mutation,
      variables
    },
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