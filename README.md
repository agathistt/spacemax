# SpaceMax

SpaceMax explores custom-fit storage through two static website prototypes, interactive planning tools, concept imagery, and pitch materials.

## Project contents

| Path | Contents |
| --- | --- |
| `spacemax/` | Consumer website, residential and commercial browsing, photo-assisted measurements, and a customization gallery. |
| `spacemax-website/` | Bathroom storage website and four-step interactive planning studio. |
| `SpaceMax-grant-pitch-journey.md` | Grant pitch and product journey. |
| `SpaceMax-two-minute-script.md` | Two-minute presentation script. |
| `SpaceMax-two-presenter-script.md` | Two-presenter script. |
| Root preview images | Screenshots of the project's iterations. |

Both sites use static HTML, CSS, and JavaScript. Their `dist/` directories contain the editable source and deployment assets; no dependency installation or build step is required.

## Preview locally

From the repository root, run either site:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory spacemax/dist
```

Open <http://127.0.0.1:4173>.

```sh
python3 -m http.server 5174 --bind 127.0.0.1 --directory spacemax-website/dist
```

Open <http://127.0.0.1:5174>.

## Validate the planning studio

With Node.js installed:

```sh
node --test spacemax-website/tests/*.test.mjs
```

See each site's README and asset documents for functionality, image provenance, and prototype limitations. These are concept prototypes; pricing, payments, order submission, and manufacturing validation are not connected.

## Repository history and deployment

This repository combines both original site histories into one project. The initial combined commit has both original site tips as parents, preserving earlier source revisions. Original commits show each site's files at its former repository root; the combined project stores them under the directories listed above.

Deployment archives are excluded because their content is already preserved in the site histories. Existing archives remain available locally. QA screenshots, current source, source images, and pitch materials are included. Each site's `.openai/hosting.json` retains its existing Sites project configuration.
