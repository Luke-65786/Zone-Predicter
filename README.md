# ZoneIQ

A responsive Fortnite storm-planning app built with React and Vite.

## GitHub Pages deployment

In the GitHub repository, open Settings → Pages and select **GitHub Actions** as the source. Pushes to `main` then test, build, and publish the site automatically using `.github/workflows/deploy.yml`. You can also run that workflow manually from the Actions tab.

The deployment builds with the `/Zone-Predicter/` base path. Once the workflow succeeds, the site is available at `https://luke-65786.github.io/Zone-Predicter/`.

## Run

Requires Node.js 22.12+ (Node 24 is supported) and npm.

```sh
npm ci
npm run dev
```

Vite listens on port 5173. Use `npm run build` for the production bundle, `npm run preview` to serve that bundle, and `npm test` for the geometry tests.

## Features

- Use the map image selected by the user: `https://fortnite-api.com/images/map_en.png`. The GitHub Pages workflow downloads and bundles this PNG with the site. No map API is used. Local development falls back to the selected image URL when the bundled file is absent.
- Dark theme throughout, including controls, map overlays, results, exports controls, notifications, help, and browser form controls. The map image retains its original colors.
- Place zone 1's center. Its radius is locked at 32% of map width, and radius retention is locked at 60% per subsequent zone. There are no radius or shrink sliders. Set your player marker optionally.
- Estimate zone 4 with 2,000 paths, each simulating zones 2, 3, and 4 sequentially. Circle sizes use the fixed 60% radius retention for each of the three transitions.
- View zone 4 center density, the boundary containing 80% of simulated centers, and a representative fully nested path. Toggle intermediate zones 2 and 3 and the direct rotation route.
- Toggle the zone 4 deadside/congestion filter: green marks the estimated short-rotation half; red marks the half facing the simulated zone 3 center. The filter is off initially and includes an explicit no-live-player-data explanation.
- Export the annotated map and zone estimates as a standalone SVG, including the selected image and any enabled deadside/congestion overlay and legend.
- Zone 1 setup persists in local storage. Moving its center clears the previous estimate and its side overlay; generate again to recompute them. Legacy browser settings are normalized to the locked 32% radius and 60% retention on restore, while preserving a valid center and player position.
- Use the map with a pointer, touch, or arrow keys. Shift + arrow moves in larger steps. Numeric zone 1 position controls are under “Fine-tune placement.”

## What the model means

This is a manual geometric scenario tool using the specific map image selected by the user. It does not fetch a map from an API or automatically choose a newer island. It does not identify your match or game mode and has no match telemetry, hidden storm data, or connection to Epic's game servers.

For each simulated path, each next circle's center is sampled uniformly by area from the disk of radius `previousRadius - nextRadius`. Every next circle stays inside its immediate predecessor. The radius ratio is applied three times, so `zone4Radius = zone1Radius × ratio³`. The requested radius is 320 in the 1,000-unit map coordinate system and the fixed retention is 0.6. This gives a zone 4 radius of `320 × 0.6³ = 69.12` units (6.912% of map width). These are fixed modeling assumptions, not verified Fortnite storm data. Moving zones, terrain, and opponents are not modeled.

Cyan cells show the frequency of simulated zone 4 centers. The dashed cyan boundary is centered on their mean and uses the empirical 80th percentile of center distances. **80% coverage describes the simulations, not a calibrated probability for a real match.** The blue zone 4 belongs to the sampled path whose final center is closest to the simulation mean; the optional zones 2 and 3 are from that same path.

The rotation line ends slightly inside the representative zone 4 using a straight-line geometric route. Distances use map-width percentages, not in-game meters. Zone 1 alone cannot reveal the actual future zone 4.

## Deadside and congestion estimates

The optional filter uses the representative path's simulated zone 3 and zone 4 circles. The half of zone 4 pointing **away from the zone 3 center**, toward the nearer old-zone edge, is colored green as estimated deadside. The opposite half points toward the zone 3 center and is colored red as estimated congestion. A dashed divider and text legend distinguish the halves; the center-density layer is cyan so green is reserved for deadside.

This short-rotation heuristic does not observe player counts, landing spots, terrain, routes, or live match positions. The reference zone 3 is itself simulated, not supplied by a live match. It cannot establish the actual deadside or traffic in a game. When the centers differ by no more than 5% of zone 3's radius, the UI reports that there is no clear preferred side and leaves the estimate uncolored. The filter can be toggled with a pointer or keyboard; it follows newly generated forecasts and clears on reset.

## Selected map image

`src/map-source.js` records the user-supplied image URL and bundled path. The deployment workflow runs `node scripts/download-map.mjs` to download the PNG over verified HTTPS into `public/maps/fortnite-map.png` before building. HTTP errors and unsupported PNG headers stop that deployment. The generated image is ignored by Git; it is included in the published `dist` artifact. Once published, the image is served by GitHub Pages alongside the application, so viewing it and exporting it require no third-party image or API request.

For local development you can run `node scripts/download-map.mjs` to bundle the image first. If the local image is absent, the browser loads the exact selected URL directly as an image (without requiring CORS for display). Standalone SVG export from this remote fallback requires the image host to allow a fetch; the bundled image avoids that restriction. Loading failures show an error and retry button.

The original chat image was visible but its file was not mounted in the workspace. The user supplied the image URL above. This cloud's egress proxy returned HTTP 403 for that host, so the actual image download and its match to the attachment could not be verified here. The deployment runner downloads and verifies the PNG response before publishing. Browser tests use explicit image fixtures and cover local image loading, the exact remote URL fallback, error recovery, exports, and zone calculations. These fixtures do not verify the remote image's current contents.

## Browser tests

```sh
npx playwright install chromium
npm run test:e2e
```

The browser tests start their own Vite server and use `/usr/bin/chromium` automatically when it is installed. Otherwise install Playwright's Chromium as above. You can choose another installed browser with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

This independent fan tool is not affiliated with Epic Games.
