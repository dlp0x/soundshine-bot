import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('axios');

const radioDjApi = await import('#api/services/radioDjApi.js');

describe('RadioDJ API service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('liste les requests en attente (bot only)', async () => {
    axios.get.mockResolvedValue({ data: { requests: [{ title: 'Song' }] } });

    await expect(radioDjApi.listRequests()).resolves.toEqual([{ title: 'Song' }]);

    expect(axios.get).toHaveBeenCalledWith('https://radiodj.example.test/api/requests/list', {
      headers: { 'x-api-key': 'radiodj-key' },
      timeout: 10000
    });
  });

  it('retourne une liste vide si la reponse ne contient pas de requests', async () => {
    axios.get.mockResolvedValue({ data: {} });

    await expect(radioDjApi.listRequests()).resolves.toEqual([]);
  });

  it('cree une request avec un songID et un username', async () => {
    axios.post.mockResolvedValue({ data: { success: true, song: { ID: 10, artist: 'A', title: 'T' } } });

    await expect(radioDjApi.addRequest({ songID: 10, username: 'tester#0001' }))
      .resolves.toEqual({ ID: 10, artist: 'A', title: 'T' });

    expect(axios.post).toHaveBeenCalledWith(
      'https://radiodj.example.test/api/requests/add',
      { songID: 10, username: 'tester#0001' },
      { headers: { 'x-api-key': 'radiodj-key' }, timeout: 10000 }
    );
  });

  it('recherche les morceaux et respecte la limite cote client', async () => {
    axios.get.mockResolvedValue({
      data: {
        results: [
          { ID: 1, artist: 'A', title: 'T' },
          { ID: 2, artist: 'B', title: 'U' },
          { ID: 3, artist: 'C', title: 'V' }
        ]
      }
    });

    await expect(radioDjApi.searchSongs('abc', 2))
      .resolves.toEqual([
        { ID: 1, artist: 'A', title: 'T' },
        { ID: 2, artist: 'B', title: 'U' }
      ]);

    expect(axios.get).toHaveBeenCalledWith('https://radiodj.example.test/api/requests/search', {
      headers: { 'x-api-key': 'radiodj-key' },
      params: { query: 'abc' },
      timeout: 10000
    });
  });

  it('retourne une liste vide si la recherche ne renvoie rien', async () => {
    axios.get.mockResolvedValue({ data: {} });

    await expect(radioDjApi.searchSongs('missing')).resolves.toEqual([]);
  });

  it('recupere les events pour une categorie', async () => {
    axios.get.mockResolvedValue({ data: { events: [{ id: 1, name: 'Event' }] } });

    await expect(radioDjApi.getEvents(5)).resolves.toEqual([{ id: 1, name: 'Event' }]);

    expect(axios.get).toHaveBeenCalledWith('https://radiodj.example.test/api/events', {
      headers: { 'x-api-key': 'radiodj-key' },
      params: { catID: 5 },
      timeout: 10000
    });
  });

  it('recupere le horaire des events pour un jour et une categorie', async () => {
    axios.get.mockResolvedValue({ data: { schedule: [{ id: 1, name: 'Event' }] } });

    await expect(radioDjApi.getEventsSchedule('monday', 5)).resolves.toEqual([{ id: 1, name: 'Event' }]);

    expect(axios.get).toHaveBeenCalledWith('https://radiodj.example.test/api/events/schedule', {
      headers: { 'x-api-key': 'radiodj-key' },
      params: { day: 'monday', catID: 5 },
      timeout: 10000
    });
  });
});
