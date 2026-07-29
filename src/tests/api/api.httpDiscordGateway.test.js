import { describe, expect, it, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const instance = {
    get: vi.fn(),
    post: vi.fn()
  };

  return {
    default: {
      create: vi.fn(() => instance)
    }
  };
});

import { createHttpDiscordGateway } from '#api/gateways/httpDiscordGateway.js';

describe('httpDiscordGateway', () => {
  let axiosInstance;
  let logger;

  beforeEach(() => {
    axiosInstance = axios.create();
    axiosInstance.get.mockReset();
    axiosInstance.post.mockReset();
    logger = { error: vi.fn() };
  });

  function buildGateway () {
    return createHttpDiscordGateway({
      baseUrl: 'http://127.0.0.1:3100',
      secret: 'shh',
      logger
    });
  }

  it('configure le client axios avec le secret partage', () => {
    buildGateway();

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: 'http://127.0.0.1:3100',
        headers: { 'x-internal-secret': 'shh' }
      })
    );
  });

  it('getBotTag retourne le tag du bot en cas de succes', async () => {
    axiosInstance.get.mockResolvedValue({ data: { tag: 'soundshine#0001' } });

    const gateway = buildGateway();
    const tag = await gateway.getBotTag();

    expect(tag).toBe('soundshine#0001');
    expect(axiosInstance.get).toHaveBeenCalledWith('/internal/v1/discord/bot-tag');
  });

  it('getBotTag retourne null et journalise si le serveur de controle est injoignable', async () => {
    axiosInstance.get.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const gateway = buildGateway();
    const tag = await gateway.getBotTag();

    expect(tag).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });

  it('sendChannelMessage relaie un envoi reussi', async () => {
    axiosInstance.post.mockResolvedValue({ data: { delivered: true } });

    const gateway = buildGateway();
    const result = await gateway.sendChannelMessage('chan-1', { embeds: [] });

    expect(result).toEqual({ delivered: true });
    expect(axiosInstance.post).toHaveBeenCalledWith(
      '/internal/v1/discord/send-channel-message',
      { channelId: 'chan-1', payload: { embeds: [] } }
    );
  });

  it('sendChannelMessage normalise une erreur reseau en gateway_unreachable', async () => {
    const networkError = new Error('timeout of 5000ms exceeded');
    axiosInstance.post.mockRejectedValue(networkError);

    const gateway = buildGateway();
    const result = await gateway.sendChannelMessage('chan-1', {});

    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('gateway_unreachable');
    expect(result.error).toContain('timeout');
  });

  it('sendChannelMessage normalise une reponse HTTP d\'erreur en control_server_error', async () => {
    const httpError = new Error('Request failed with status code 401');
    httpError.response = { status: 401, data: { error: 'Invalid or missing internal control secret.' } };
    axiosInstance.post.mockRejectedValue(httpError);

    const gateway = buildGateway();
    const result = await gateway.sendChannelMessage('chan-1', {});

    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('control_server_error');
    expect(result.error).toBe('Invalid or missing internal control secret.');
  });

  it('sendChannelMessage signale une reponse malformee', async () => {
    axiosInstance.post.mockResolvedValue({ data: { unexpected: true } });

    const gateway = buildGateway();
    const result = await gateway.sendChannelMessage('chan-1', {});

    expect(result.delivered).toBe(false);
    expect(result.reason).toBe('malformed_response');
  });
});
