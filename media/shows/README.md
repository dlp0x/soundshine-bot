# media/shows

Static visuals used for social publications, keyed by program name
(the `topic` field sent to `POST /v1/playlist-update`).

## Naming convention

Each file is named after the **slug** of the program name:
lowercase, accents stripped, anything that isn't `a-z0-9` collapsed to a
single `-`.

| Program (`topic`) | Expected filename    |
|--------------------|----------------------|
| `Lofi Beats`        | `lofi-beats.png`      |
| `Morning Show`       | `morning-show.png`    |
| `Playlist Hits`      | `playlist-hits.png`   |
| `EDM`                | `edm.png`             |

Accepted extensions, checked in order: `.png`, `.jpg`, `.jpeg`.

## Behavior when an asset is missing

Publication is **never blocked** by a missing visual: the post still goes
out (text-only) and a dedicated Discord notification is sent to the
editorial channel so the missing artwork can be added.

## Configuration

- `SOCIAL_SHOW_MEDIA_ROOT` (optional): overrides the local folder read by
  the resolver. Defaults to this `media/shows/` directory.
- `SOCIAL_SHOW_MEDIA_PUBLIC_BASE_URL` (optional): the public HTTPS base URL
  these files are served under. Defaults to
  `https://media.soundshineradio.com/shows`. This directory must be
  reachable at that URL in production (e.g. served statically, or synced
  to the media host) for Buffer to be able to fetch the image.
