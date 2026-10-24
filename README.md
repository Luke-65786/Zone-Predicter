# CompIQ

A Fortnite competitive toolkit built with React and Vite, with a home page for choosing six tools: points calculator, zone predictor, tournament tracker, scoring calculator, tournament planner, and practice checklist.

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

## Home page

The default page and `#home` open a chooser for all six tools. The Home tab and CompIQ logos return here from any tool. Tools mount only when first opened, so the chooser makes no map request or changes to saved calculator inputs. Returning home preserves tool state, and its appearance shortcut opens the shared Settings menu. The navigation row scrolls horizontally on smaller screens and brings the active tab into view.

## Tournament tracker (`#tracker`)

Enter a target and game allowance, or load these from a saved tournament plan. Log each game's total points, optional finish, eliminations, and notes. The tracker shows earned points, remaining games, the required average, and whether the results are ahead or behind the straight-line pace for the target. Edit game points directly, remove games, or clear the log; removals can be undone. Achieved targets and exhausted game allowances have separate results. Game limits are 1–200 and individual scores and targets are whole points up to 1,000,000. State saves under `compiq-tracker-v1`.

## Scoring calculator (`#scoring`)

Use **Upload screenshot** to read a PNG, JPG, or WebP scoring table (up to 10 MB and 20 megapixels). A local Tesseract.js worker enlarges small text, handles dark backgrounds, and reads placement ranks and **total** points: `60 (+7)` imports as 60, not 67 or 7. Review and correct the recognized rows, add missed rows, then choose **Apply screenshot numbers**. Applying replaces placement tiers and preserves game/target inputs; **Undo screenshot import** restores the previous rules. Explicitly labelled elimination points are included when found; otherwise the calculator keeps the current elimination value. Uncertain or recovered ordinal digits are highlighted, and no missing points total is invented. Duplicate, invalid, and inconsistent rows must be corrected before applying.

Images remain in the browser and are not sent to an OCR service or saved in local storage. English recognition, worker JavaScript, and both supported WASM CPU variants are bundled from pinned npm dependencies via `scripts/prepare-ocr.mjs` (`predev` and `prebuild`) and served from the site's own `/ocr/` directory, respecting the GitHub Pages base path. The reader loads only after choosing an image. Progress, cancellation, a timeout, and retryable errors cover slow or failed reads. A cropped, clear table gives the best result; recognition is not guaranteed for every screenshot. Tests use real browser OCR on synthetic light and narrow 50-row dark tables rather than claiming to have processed the original chat attachment.

Supply the event's whole points per elimination (including zero) and placement tiers. A tier records the **total** placement points at that threshold, not an incremental bonus: Top 1 = 20 and Top 10 = 5 means a win earns 20 placement points, finishes 2–10 earn 5, and lower finishes earn zero. The calculator sorts tiers, rejects duplicates and tiers that reward worse finishes more, and calculates individual game scores. **Ways to reach a game target** shows only **1st, 3rd, 5th, 10th, 15th, and 25th**, looking up each finish in the full scoring table and calculating the minimum eliminations needed. Zero elimination scoring reports unreachable targets without division by zero. **Clear all placements** removes all placement rules in one action while keeping elimination points, the target, and game-result inputs; **Undo clear placements** restores them until the next placement edit. The cleared rules persist after reload. Scoring is user-defined; no official Fortnite format or cutoff is assumed. Rules and calculator inputs save under `compiq-scoring-v1`.

## Combined tournament planner (`#plans`)

Tournament plans, drop planning, and rotation notes share one workspace. Save up to 50 named plans, each with its own event date, team format, optional points/game target, drop notes, and rotation notes. A new plan is an unsaved draft until **Save tournament plan** is selected; saved plans update automatically. Plans can be switched, duplicated, downloaded as readable JSON with map coordinates, or deleted with an undo option. The tracker can load a saved plan's target without replacing its game log.

On the same Fortnite image used by the zone predictor, choose a landing marker, backup marker, loot route, rotation route, or good-position marker. Click/tap to place points; route waypoints connect in insertion order. Arrow keys move the map cursor (Shift moves faster), and Enter/Space places a point. Marker labels are optional. Remove the last point, clear the selected layer, or undo the last map edit. Plans keep their own independent coordinates, including up to 300 waypoints per route and 50 good positions. Map loading failures show a retry without blocking saved notes or targets. Plans persist under `compiq-plans-v1`; the map loads only after opening this tool or the zone predictor.

## Practice checklist (`#practice`)

Start with warm-up, aim, building, scrims, and review drills. Add custom named drills with a category and 1–180 estimated minutes, check off completed work, and write a session takeaway. Choose a date to revisit a session or start a fresh one. The task library is shared between dates, while checks and notes are independent for each date (the most recent 366 session dates are retained). Estimated minutes are not a running timer. Session resets and drill removals can be undone until the next edit. State saves under `compiq-practice-v1`.

All tools work without accounts. Data is local to the current browser and device; no cloud sync is implied. If browser storage is blocked, tools still work for the current session and show a storage notice. Appearance preferences remain separate from tool data.

## Points calculator

The **Points calculator** tab (`#points`) starts with all fields empty. Enter target points and total games separately to calculate your pace. Optional points-earned and games-played inputs can stay blank for a fresh start or calculate the remaining pace:

`pointsPerGame = max(0, targetPoints − pointsEarned) ÷ (totalGames − gamesPlayed)`

- **312 points in 12 games = 26 points per game.**
- With 100 points earned in 4 of those games, 212 points remain over 8 games: **26.5 per game**.
- Fractional averages are displayed to two decimal places. A whole-point plan preserves the exact goal; 313 points in 12 games becomes one 27-point game and eleven 26-point games.
- The game-by-game table includes remaining game numbers and running totals, with 12-row pagination for longer plans.
- Invalid values, games played exceeding the allowance, exhausted games, and already achieved targets have separate outcomes. A positive average below 0.01 is shown as `<0.01` rather than zero.
- **Clear all fields** empties the calculator and its results. Missing target or total games shows a quiet prompt without validation errors; blank optional progress fields count as zero.
- Inputs save in this browser under `compiq-points-v2`. Custom inputs from the previous version are restored, while its automatically saved example is cleared. The tool calculates immediately and needs no network request, event data, or scoring API.
- Goals are entered manually. The tool does not infer placement/elimination scoring, qualification thresholds, or future match scores.

## Tabs and saved state

The **Zone predictor** tab is at `#zones`; old `#planner` links still open it. Tabs support arrow keys, Home/End, browser Back/Forward, and direct links. Switching tabs preserves calculator inputs, the zone forecast, and filter settings. Each map loads when its tool is first opened. The existing `zoneiq-setup-v2` browser key is intentionally retained to preserve earlier zone setups. The website and exported zone plans are branded CompIQ; the repository name and deployed URL remain unchanged.

## Appearance settings

Open **Settings** in the header on desktop or mobile, or **Customize appearance** on the home page. Changes apply immediately to the home page and all tools and are stored separately under `compiq-appearance-v1`:

- **Themes:** Midnight (the default), Graphite, Daylight, or System. System follows changes to the device's color preference.
- **Accents:** Indigo, Mint, Rose, or Amber for buttons, highlights, and progress bars.
- **Spacing:** Comfortable or Compact, which reduces vertical spacing without shrinking text.
- **Sticky navigation:** keeps the tool tabs visible while scrolling; sticky side controls account for the header height.
- **Ambient glow:** toggles the soft background and result-card illumination.
- **Reduced motion:** minimizes transitions; the device's own reduced-motion preference is also respected.

The drawer supports keyboard focus wrapping, Escape, backdrop dismissal, and focus return to its trigger. The saved theme is applied before the React interface renders. Invalid saved preferences recover to defaults; when browser storage is blocked, preferences still work for the session and the menu explains that they were not saved.

**Reset appearance** resets only appearance preferences. Calculator inputs, zone forecasts, fixed 32%/60% settings, and filters remain intact. Themes do not recolor the selected map image or its semantic green/red POI overlay. Preferences are local to this browser; no account or extra service is required.

## Zone predictor

- Use the map image selected by the user: `https://fortnite-api.com/images/map_en.png`. The GitHub Pages workflow downloads and bundles this PNG with the site. No map API is used. Local development falls back to the selected image URL when the bundled file is absent.
- Midnight, Graphite, Daylight, or device-matched themes across controls, results, notifications, help, and browser form controls. The map image and green/red POI meanings retain their original colors.
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
