import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createDiscordControlServer } from '#bot/internal/discordControlServer.js';
import {
  createDiscordClientForPlaylist,
  createTextChannel
} from '../helpers/apiFactory.js';

function buildLogger () {
  return {
    api: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  };
}

describe('discordControlServer', () => {
  it('refuse les requetes sans secret interne valide', async () => {
    const client = createDiscordClientForPlaylist();
    const { app } = createDiscordControlServer(client, buildLogger(), {
      INTERNAL_CONTROL_SECRET: 'correct-secret'
    });

    const response = await request(app).get('/internal/v1/discord/bot-tag');

    expect(response.status).toBe(401);
  });

  it('refuse les requetes avec un mauvais secret', async () => {
    const client = createDiscordClientForPlaylist();
    const { app } = createDiscordControlServer(client, buildLogger(), {
      INTERNAL_CONTROL_SECRET: 'correct-secret'
    });

    const response = await request(app)
      .get('/internal/v1/discord/bot-tag')
      .set('x-internal-secret', 'wrong-secret');

    expect(response.status).toBe(401);
  });

  it('retourne le tag du bot avec le bon secret', async () => {
    const client = createDiscordClientForPlaylist();
    const { app } = createDiscordControlServer(client, buildLogger(), {
      INTERNAL_CONTROL_SECRET: 'correct-secret'
    });

    const response = await request(app)
      .get('/internal/v1/discord/bot-tag')
      .set('x-internal-secret', 'correct-secret');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ tag: 'soundshine#0001' });
  });

  it('delegue l\'envoi de message au gateway en process et relaie le resultat', async () => {
    const playlistSend = vi.fn(async () => ({}));
    const client = createDiscordClientForPlaylist({
      playlistChannel: createTextChannel({ send: playlistSend })
    });
    const { app } = createDiscordControlServer(client, buildLogger(), {
      INTERNAL_CONTROL_SECRET: 'correct-secret'
    });

    const response = await request(app)
      .post('/internal/v1/discord/send-channel-message')
      .set('x-internal-secret', 'correct-secret')
      .send({ channelId: 'playlist-channel', payload: { embeds: [] } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ delivered: true });
    expect(playlistSend).toHaveBeenCalledWith({ embeds: [] });
  });

  it('retourne 400 si channelId est manquant', async () => {
    const client = createDiscordClientForPlaylist();
    const { app } = createDiscordControlServer(client, buildLogger(), {
      INTERNAL_CONTROL_SECRET: 'correct-secret'
    });

    const response = await request(app)
      .post('/internal/v1/discord/send-channel-message')
      .set('x-internal-secret', 'correct-secret')
      .send({ payload: {} });

    expect(response.status).toBe(400);
  });

  it('start() echoue si aucun secret n\'est configure', () => {
    const client = createDiscordClientForPlaylist();
    const controlServer = createDiscordControlServer(client, buildLogger(), {});

    expect(() => controlServer.start(0)).toThrow(/INTERNAL_CONTROL_SECRET/);
  });
});
