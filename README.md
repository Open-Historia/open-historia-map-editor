# Open Historia — Map Editor

A standalone version of the [Open Historia](https://github.com/Open-Historia/open-historia)
map editor. Author custom world maps — draw or edit regions, assign countries,
place cities, and apply vector basemaps — or generate an entire world (land,
countries, cities and a biome basemap) with a bundled copy of Azgaar's
[Fantasy Map Generator](https://github.com/Azgaar/Fantasy-Map-Generator). Maps
export as scenario bundles you import into Open Historia.

Built with React + OpenLayers; a small Express server persists your map documents
and basemap library.

## Running it

```bash
npm install
npm run fetch-fmg      # vendor the Fantasy Map Generator into ./fmg (for world generation)
npm run build          # build the app into ./dist
npm run server         # serve the app + API at http://localhost:3000
```

Then open <http://localhost:3000>.

For development with hot-reload, run the server and the Vite dev server side by
side (Vite proxies `/api` and `/fmg` to the server):

```bash
npm run server        # terminal 1  — API on :3000
npm run dev           # terminal 2  — app on :5173
```

## What lives where

- `src/Editor/` — the editor UI (OpenLayers map surface, panels, tools) and the
  Fantasy Map Generator integration (`src/Editor/fmg/`).
- `src/runtime/` — the client for the basemap library and the community hub.
- `server/` — the Express API: map documents, the basemap library, the community
  hub proxy, and the `/fmg` static mount.
- `scripts/fetch-fmg.mjs` — vendors Azgaar's Fantasy Map Generator (pinned).
- `public/assets/` — the real-world region/city seeds and the default palette
  (used when you start from the modern world or import all cities).

## License

MIT © 2026 Nicholas Krol. See [`src/Editor/LICENSE`](src/Editor/LICENSE).

The bundled Fantasy Map Generator is Azgaar's, also MIT-licensed, fetched at
setup time — it is not redistributed in this repository.
