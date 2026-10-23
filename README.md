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

- Automatically request Fortnite-API's maintained Battle Royale map at `https://media.fortnite-api.com/map_with_pois.png`. No photo upload or API key is required. Refresh on demand.
- Place zone 1's center and adjust its radius to match your in-game first circle. Set your player marker optionally.
- Estimate zone 4 with 2,000 paths, each simulating zones 2, 3, and 4 sequentially. Circle sizes use the adjustable assumed radius retention (65% per zone by default).
- View zone 4 center density, the boundary containing 80% of simulated centers, and a representative fully nested path. Toggle intermediate zones 2 and 3 and the direct rotation route.
- Export the annotated map and zone estimates as a standalone SVG with the provider image embedded.
- Zone 1 setup persists in local storage. Changing its center, radius, or assumed shrink clears the previous estimate; generate again to recompute it.
- Use the map with a pointer, touch, or arrow keys. Shift + arrow moves in larger steps. Numeric zone 1 position controls are under “Fine-tune placement.”

## What the model means

This is a manual geometric scenario tool. The map is the latest image available from the provider, whose updates may lag the game. The app does not identify your match or game mode and has no match telemetry, hidden storm data, or connection to Epic's game servers. It uses the Battle Royale map; other islands and modes are not inferred.

For each simulated path, each next circle's center is sampled uniformly by area from the disk of radius `previousRadius - nextRadius`. Every next circle stays inside its immediate predecessor. The radius ratio is applied three times, so `zone4Radius = zone1Radius × ratio³`. The default 65% ratio is an editable modeling assumption, not verified Fortnite storm data. Moving zones, terrain, and opponents are not modeled.

Green cells show the frequency of simulated zone 4 centers. The dashed green boundary is centered on their mean and uses the empirical 80th percentile of center distances. **80% coverage describes the simulations, not a calibrated probability for a real match.** The blue zone 4 belongs to the sampled path whose final center is closest to the simulation mean; the optional zones 2 and 3 are from that same path.

The rotation line ends slightly inside the representative zone 4 using a straight-line geometric route. Distances use map-width percentages, not in-game meters. Zone 1 alone cannot reveal the actual future zone 4.

## Map access

The browser needs HTTPS access to `media.fortnite-api.com` and a provider response that allows cross-origin requests. Requests omit credentials and revalidate the image cache. The app checks the HTTP status, image type, nonempty size (maximum 20 MB), and browser image decoding before displaying a map. Loading failures show an error and retry button; an older or illustrative island is never presented as the current map. The original illustration is no longer used.

In this cloud, the provider was blocked by the egress proxy (HTTP 403), so live map availability and freshness could not be verified here. `media.fortnite-api.com` was added to the environment configuration draft for review. Browser tests use explicit provider image fixtures and cover successful loading, failures, invalid images, and recovery. These tests do not establish live provider availability or real-match prediction accuracy.

## Browser tests

```sh
npx playwright install chromium
npm run test:e2e
```

The browser tests start their own Vite server and use `/usr/bin/chromium` automatically when it is installed. Otherwise install Playwright's Chromium as above. You can choose another installed browser with `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.

This independent fan tool is not affiliated with Epic Games.
