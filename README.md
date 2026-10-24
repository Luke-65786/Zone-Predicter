# CompIQ

A dark Fortnite competitive toolkit built with React and Vite, with separate points-calculator and zone-predictor tabs.

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

## Points calculator

The homepage opens the **Points calculator** tab (`#points`). Target points and total games are separate inputs. Optional points-earned and games-played inputs calculate the remaining pace:

`pointsPerGame = max(0, targetPoints − pointsEarned) ÷ (totalGames − gamesPlayed)`

- **312 points in 12 games = 26 points per game.**
- With 100 points earned in 4 of those games, 212 points remain over 8 games: **26.5 per game**.
- Fractional averages are displayed to two decimal places. A whole-point plan preserves the exact goal; 313 points in 12 games becomes one 27-point game and eleven 26-point games.
- The game-by-game table includes remaining game numbers and running totals, with 12-row pagination for longer plans.
- Invalid values, games played exceeding the allowance, exhausted games, and already achieved targets have separate outcomes. A positive average below 0.01 is shown as `<0.01` rather than zero.
- Inputs save in this browser under `compiq-points-v1`. The tool calculates immediately and needs no network request, event data, or scoring API.
- Goals are entered manually. The tool does not infer placement/elimination scoring, qualification thresholds, or future match scores.

## Tabs and saved state

The **Zone predictor** tab is at `#zones`; old `#planner` links still open it. Tabs support arrow keys, Home/End, browser Back/Forward, and direct links. Switching tabs preserves calculator inputs, the zone forecast, and filter settings. The map loads only when the zone tab is first opened. The existing `zoneiq-setup-v2` browser key is intentionally retained to preserve earlier zone setups. The website and exported zone plans are branded CompIQ; the repository name and deployed URL remain unchanged.

## Zone predictor

- Use the map image selected by the user: `https://fortnite-api.com/images/map_en.png`. The GitHub Pages workflow downloads and bundles this PNG with the site. No map API is used. Local development falls back to the selected image URL when the bundled file is absent.
- Dark theme throughout, including controls, map overlays, results, exports controls, notifications, help, and browser form controls. The map image retains its original colors.
- Place zone 1's center. Its radius is locked at 32% of map width, and radius retention is locked at 60% per subsequent zone. There are no radius or shrink sliders. Set your player marker optionally.
- Estimate zone 4 with 2,000 paths, each simulating zones 2, 3, and 4 sequentially. Circle sizes use the fixed 60% radius retention for each of the three transitions.
- View zone 4 center density, the boundary containing 80% of simulated centers, and a representative fully nested path. Toggle intermediate zones 2 and 3 and the direct rotation route.
- Toggle the zone 4 deadside/congestion filter: green faces the fewest mapped POIs; red faces the opposite half with more POIs. Yellow map markers and numeric POI counts show what is being considered. The filter is off initially and includes an explicit no-live-player-data explanation.
- Export the annotated map and zone estimates as a standalone SVG, including the selected image and any enabled deadside/congestion overlay and legend.
- Zone 1 setup persists in local storage. Moving its center clears the previous estimate and its side overlay; generate again to recompute them. Legacy browser settings are normalized to the locked 32% radius and 60% retention on restore, while preserving a valid center and player position.
- Use the map with a pointer, touch, or arrow keys. Shift + arrow moves in larger steps. Numeric zone 1 position controls are under “Fine-tune placement.”

## Zone prediction model

This is a manual geometric scenario tool using the specific map image selected by the user. It does not fetch a map from an API or automatically choose a newer island. It does not identify your match or game mode and has no match telemetry, hidden storm data, or connection to Epic's game servers.

For each simulated path, each next circle's center is sampled uniformly by area from the disk of radius `previousRadius - nextRadius`. Every next circle stays inside its immediate predecessor. The radius ratio is applied three times, so `zone4Radius = zone1Radius × ratio³`. The requested radius is 320 in the 1,000-unit map coordinate system and the fixed retention is 0.6. This gives a zone 4 radius of `320 × 0.6³ = 69.12` units (6.912% of map width). These are fixed modeling assumptions, not verified Fortnite storm data. Moving zones, terrain, and opponents are not modeled.

Cyan cells show the frequency of simulated zone 4 centers. The dashed cyan boundary is centered on their mean and uses the empirical 80th percentile of center distances. **80% coverage describes the simulations, not a calibrated probability for a real match.** The blue zone 4 belongs to the sampled path whose final center is closest to the simulation mean; the optional zones 2 and 3 are from that same path.

The rotation line ends slightly inside the representative zone 4 using a straight-line geometric route. Distances use map-width percentages, not in-game meters. Zone 1 alone cannot reveal the actual future zone 4.

## Deadside and congestion estimates

The optional filter compares named POI counts in facing halves of the map through the representative zone 4 center. It examines every distinct dividing direction, colors the half containing the **fewest mapped POIs** green, and colors its opposite red. **All named POIs on the map count, including those outside zone 4.** It no longer depends on the zone 3 center or short-rotation distance.

`src/map-pois.js` contains the 13 named POIs visible in the image supplied by the user. Positions are approximate named-label anchors, manually normalized from that square image into the 1,000-unit map coordinate system. No API is used. When the filter is on, yellow markers show these annotations and their names appear on hover; the result panel reports both counts. **Update this catalog when replacing the map image.** The app does not automatically discover new POIs or verify that a remote replacement image matches these annotations.

The algorithm places candidate dividers between POI bearings so a divider cannot artificially hide points by passing through them. Among orientations with the same minimum count, it chooses the widest interval of equivalent orientations to avoid placing the divider unnecessarily close to a POI. Equal opposing counts produce no red/green preference; empty data or POIs exactly at the zone center produce no directional preference either. A centered zone pull can still have a POI-based deadside when the POI counts differ.

This is a count-based traffic proxy. It does not observe live player counts, landing popularity, POI size, terrain, routes, or actual rotations. The filter can be toggled with a pointer or keyboard, follows newly generated forecasts, clears on reset, and is included with its count legend in SVG exports. The cyan simulated-center layer remains separate from the red/green POI overlay.

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
