# Sprint 5 — Extracting the API into an independent soundSHINE API service

## Why this is hard to do in one step

The API isn't just co-located with the bot in the same repo — it's
co-located in the same **process**, and the `playlist-update` route reaches
directly into the live `discord.js` `Client` (`client.channels.cache.get(...)`,
`channel.send(...)`) and the `health` route reads `client.user.tag`. That's
the one real coupling point standing between "API that happens to live in
this repo" and "API that can run as its own service." Everything else
(config, logger, alerting) is easy to duplicate or share as plain modules.

So the extraction has to happen in phases that are each independently
shippable and testable, rather than as one large rewrite.

## Phase 1 — Introduce a Discord gateway seam (this sprint, done)

Added `src/api/gateways/discordGateway.js`: a small port with exactly the
two capabilities routes need (`getBotTag()`, `sendChannelMessage(channelId,
payload)`). `WebServer` builds one gateway from the live client and passes
*that* to routes instead of the raw client. `health.js` and
`playlist-update.js` no longer touch `client.*` directly.

Behavior is byte-for-byte identical today (the only implementation is a
thin in-process wrapper around the same client calls), but every route now
depends on an interface instead of a concrete Discord client. That's the
seam a later phase swaps out.

No route signatures changed from the outside (`loadRoutes(app, gateway,
logger)` mirrors the old `(app, client, logger)` shape), so this shipped
without changing any deployment behavior — just an internal refactor.

## Phase 2 — HTTP-backed gateway + internal control endpoint (done)

Added `src/bot/internal/discordControlServer.js`: a small, separate
Express app (not part of `WebServer`) that the bot process owns, exposing
`GET /internal/v1/discord/bot-tag` and `POST
/internal/v1/discord/send-channel-message`, both authenticated with a
server-to-server shared secret (`INTERNAL_CONTROL_SECRET`) distinct from
`API_TOKEN`. It delegates to the same in-process `discordGateway.js` used
in Phase 1, so the actual channel-lookup/send logic still only lives in
one place.

Added `src/api/gateways/httpDiscordGateway.js`: same `DiscordGateway`
contract, implemented as HTTP calls to that control server instead of a
live client reference. New config: `API_GATEWAY_MODE` (`inprocess`
default, or `http`), `INTERNAL_CONTROL_SECRET`, `INTERNAL_CONTROL_PORT`,
`INTERNAL_CONTROL_URL`. `WebServer` picks the implementation based on
`API_GATEWAY_MODE`; default behavior is unchanged.

This is the point where the API can be started as a **separate process**
on a separate port while the bot process runs its own tiny internal
server — verified with a real end-to-end smoke test (two real processes,
real sockets) alongside the automated tests.

## Phase 3 — Separate entrypoints, same repo (done)

Two additive entrypoints, alongside the untouched monolith:

- `src/bot/main.js` — owns the Discord client and the internal control
  server. Requires `INTERNAL_CONTROL_SECRET`; refuses to start without it
  (the API process would have no way to reach it).
- `src/api/main.js` — owns only the public Express API, talking to
  Discord exclusively through `httpDiscordGateway.js`. Requires
  `API_GATEWAY_MODE=http` and a matching `INTERNAL_CONTROL_SECRET`;
  refuses to start otherwise, with an error pointing back at
  `src/index.js` for the monolith.

New npm scripts: `start:bot:dev` / `start:bot:prod` and `start:api:dev` /
`start:api:prod`. The existing `start:dev` / `start:prod` / `start:update`
scripts still run the monolith exactly as before — nothing about the
default deployment changed.

**Config split:** `#bot/config.js` is still one shared schema (simplest
thing that works), but `DISCORD_TOKEN` and `ADMIN_ROLE_ID` — the two
fields only the bot side ever touches — are only required when the
resolved entrypoint isn't `src/api/main.js`. Detected via `process.argv[1]`
rather than an env var, since the config singleton is built eagerly at
import time, before any code in an importing entrypoint file gets to run
— a shell-level env var would have needed to exist before `node` even
started, which is exactly the ordering trap this sidesteps.
`PLAYLIST_CHANNEL_ID` stays required in both processes; the API route
reads it directly off config.

**Verified end-to-end**, not just unit-tested: ran the bot-side control
server and `src/api/main.js` as two real, separate OS processes with no
`DISCORD_TOKEN` set on the API side at all, and confirmed `/v1/health`
and `/v1/playlist-update` both worked correctly over the real HTTP hop
between them (bot tag resolved correctly, playlist embed delivered).
Also confirmed the API process degrades gracefully — `bot: "Unknown"`,
`playlistSent: false`, still `200 OK` — when the bot-side control server
isn't reachable at all, which is the whole point of the isolation
guarantee carried over from Sprint 4.

To run split in production: set `API_GATEWAY_MODE=http` and
`INTERNAL_CONTROL_SECRET` (same value) in both processes' env, then run
`start:bot:prod` and `start:api:prod` as two units under your process
manager instead of `start:prod`.

## Phase 4 — Independent deployable (later, optional)

If/when it's worth it: move `src/api` (+ its own `package.json`,
lockfile, CI job) into its own repo or a workspace package, publish the
internal-control contract as a small versioned interface so the bot and
API repos can evolve independently.

## What stays true at every phase

- `playlist-update` failure isolation: social-publishing failures must
  never affect the Discord response, regardless of which gateway is live.
- Buffer/Templated/media-storage code is already 100% Discord-agnostic —
  it doesn't need to move again once the API is extracted.
- Config-key collisions are a real risk when multiple sprints touch env
  vars in parallel (as already seen with `MEDIA_*` vs `SOCIAL_MEDIA_*`) —
  worth double-checking when Phase 3 splits the config schema.
