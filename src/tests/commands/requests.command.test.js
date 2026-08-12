import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInteraction, lastReplyContent, lastReplyPayload } from '../helpers/discordFactory.js';

vi.mock('#api/services/radioDjApi.js', () => ({
  addRequest: vi.fn(),
  listRequests: vi.fn(),
  searchSongs: vi.fn()
}));

const radioDjApi = await import('#api/services/radioDjApi.js');
const requestsCommand = (await import('#bot/commands/requests/index.js')).default;
const listSubcommand = (await import('#bot/commands/requests/requests-list.js')).default;

describe('requests command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('refuse les membres sans role de requests', async () => {
    const interaction = createInteraction({
      optionValues: { subcommand: 'search', query: 'x' },
      roleIds: []
    });

    await requestsCommand.execute(interaction);

    expect(radioDjApi.searchSongs).not.toHaveBeenCalled();
    expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining('autorisation'),
      ephemeral: true
    }));
  });

  it('affiche les resultats de recherche avec un bouton "Demander" par morceau', async () => {
    radioDjApi.searchSongs.mockResolvedValue([
      { ID: 1, artist: 'Artist A', title: 'Title A' },
      { ID: 2, artist: 'Artist B', title: 'Title B' }
    ]);
    const interaction = createInteraction({
      optionValues: { subcommand: 'search', query: 'artist', limit: 2 },
      roleIds: [process.env.REQ_ROLE_ID]
    });

    await requestsCommand.execute(interaction);

    expect(radioDjApi.searchSongs).toHaveBeenCalledWith('artist', 2);

    const payload = lastReplyPayload(interaction);
    expect(payload.embeds[0].data.description).toContain('Artist A - Title A');
    expect(payload.embeds[0].data.description).toContain('Artist B - Title B');

    const buttons = payload.components[0].data.components;
    expect(buttons).toHaveLength(2);
    expect(buttons[0].data.customId).toBe('request_add_1');
    expect(buttons[1].data.customId).toBe('request_add_2');
  });

  it('retourne un message vide lisible quand la recherche ne trouve rien', async () => {
    radioDjApi.searchSongs.mockResolvedValue([]);
    const interaction = createInteraction({
      optionValues: { subcommand: 'search', query: 'missing' },
      roleIds: [process.env.REQ_ROLE_ID]
    });

    await requestsCommand.execute(interaction);

    expect(lastReplyContent(interaction)).toContain('Aucun resultat');
  });

  it('liste les requests en attente via le sous-module dedie', async () => {
    radioDjApi.listRequests.mockResolvedValue([
      { artist: 'Artist', title: 'Song', username: 'tester#0001' }
    ]);
    const interaction = createInteraction();

    await listSubcommand.execute(interaction);

    expect(lastReplyContent(interaction)).toContain('Song - Artist (demandé par tester#0001)');
  });

  it('gere une liste de requests vide', async () => {
    radioDjApi.listRequests.mockResolvedValue([]);
    const interaction = createInteraction();

    await listSubcommand.execute(interaction);

    expect(lastReplyContent(interaction)).toContain('Aucune request en attente');
  });
});
