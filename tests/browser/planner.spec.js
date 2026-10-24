import { test, expect } from "@playwright/test";
import { MAP_SOURCE_URL } from "../../src/map-source.js";
const bundledImage = "**/maps/fortnite-map.png";

// Explicit image fixtures test bundling, fallback, and failures without
// claiming that the remotely hosted image itself was verified in this cloud.
const mapPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
  "base64",
);
async function mockMap(page) {
  await page.route(bundledImage, (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: mapPng,
    }),
  );
}
async function openPlanner(page) {
  await mockMap(page);
  await page.goto("/#zones");
  await expect(
    page.getByText("Your Fortnite map", { exact: true }),
  ).toBeVisible();
}
async function placeZone1(page) {
  await page.getByRole("application").click({ position: { x: 190, y: 190 } });
}

test("auto-loads the bundled map without external requests and estimates zone 4 through three nested transitions", async ({
  page,
}) => {
  const errors = [];
  const externalRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (
      !request.url().startsWith("http://127.0.0.1:5173/") &&
      !request.url().startsWith("blob:") &&
      !request.url().startsWith("data:")
    )
      externalRequests.push(request.url());
  });
  await openPlanner(page);
  await expect(page.locator("input[type=file]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Estimate zone 4" }),
  ).toBeDisabled();
  await placeZone1(page);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.getByTestId("fixed-zone1-radius")).toHaveText("32%");
  await expect(page.getByTestId("fixed-zone-shrink")).toHaveText("60%");
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  await expect(page.getByTestId("zone-4")).toBeVisible();
  await expect(page.getByText("2,000", { exact: true })).toBeVisible();
  const setup = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zoneiq-setup-v2")),
  );
  const circles = [setup.circle];
  for (const zone of [2, 3, 4]) {
    circles.push(
      await page.getByTestId(`zone-${zone}`).evaluate((node) => ({
        x: +node.getAttribute("cx"),
        y: +node.getAttribute("cy"),
        radius: +node.getAttribute("r"),
      })),
    );
  }
  expect(circles[3].radius).toBeCloseTo(320 * 0.6 ** 3, 8);
  for (let zone = 1; zone < 4; zone++) {
    expect(
      Math.hypot(
        circles[zone].x - circles[zone - 1].x,
        circles[zone].y - circles[zone - 1].y,
      ) + circles[zone].radius,
    ).toBeLessThanOrEqual(circles[zone - 1].radius + 0.001);
  }
  await page.getByText("Fine-tune placement", { exact: true }).click();
  await page.getByLabel("Zone 1 X position percent").fill("60");
  await expect(page.getByTestId("zone-4")).toHaveCount(0);
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  expect(+(await page.getByTestId("zone-4").getAttribute("r"))).toBeCloseTo(
    69.12,
    8,
  );
  await page.reload();
  await expect(page.getByTestId("fixed-zone1-radius")).toHaveText("32%");
  await expect(page.getByTestId("fixed-zone-shrink")).toHaveText("60%");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zoneiq-setup-v2")),
  );
  expect(saved.circle.x).toBe(600);
  expect(saved.circle.radius).toBe(320);
  expect(saved.ratio).toBe(0.6);
  await expect(
    page.getByRole("button", { name: "Estimate zone 4" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
  expect(externalRequests).toEqual([]);
});

test("placement, keyboard controls, intermediate zones, heat layer, and reset work", async ({
  page,
}) => {
  await openPlanner(page);
  await placeZone1(page);
  await page
    .getByRole("button", { name: "Your position", exact: true })
    .click();
  const before = await page
    .getByTestId("player-marker")
    .getAttribute("transform");
  await page.getByRole("application").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("player-marker")).not.toHaveAttribute(
    "transform",
    before,
  );
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  await page
    .getByRole("button", { name: "Show zone 4 center density" })
    .click();
  await expect(page.getByTestId("possible-centers")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Hide simulated zones 2 and 3" })
    .click();
  await expect(page.getByTestId("zone-2")).toHaveCount(0);
  await expect(page.getByTestId("zone-4")).toBeVisible();
  await page.getByRole("button", { name: "Reset planner" }).click();
  await expect(page.getByTestId("zone-4")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Estimate zone 4" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Your Fortnite map", { exact: true }),
  ).toBeVisible();
});

test("export includes the selected map and zone 4 without external image dependencies", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.25;
  });
  await openPlanner(page);
  await page
    .getByRole("switch", { name: "Deadside and congestion overlay" })
    .click();
  await placeZone1(page);
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export plan" }).click();
  const download = await downloadEvent;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const svg = Buffer.concat(chunks).toString();
  expect(svg).toContain("data:image/png;base64,");
  expect(svg).not.toContain("blob:");
  expect(svg).toContain("ZONE 4 ESTIMATE");
  expect(svg).toContain("not a live prediction");
  expect(svg).toContain("estimated deadside");
  expect(svg).toContain("estimated congestion");
  expect(svg).toContain("#45df92");
  expect(svg).toContain("#fa6478");
  expect(svg).toContain("POIs");
  expect(svg).not.toContain("Zone 3 → 4 geometry");
});

test("image failure shows a clear error and can be retried", async ({
  page,
}) => {
  await page.route(bundledImage, (route) => route.abort("failed"));
  await page.route(MAP_SOURCE_URL, (route) => route.abort("failed"));
  await page.goto("/#zones");
  await expect(
    page.getByText("Your map image couldn’t load", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-map-image]")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Estimate zone 4" }),
  ).toBeDisabled();
  await page.unroute(bundledImage);
  await mockMap(page);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByText("Your Fortnite map", { exact: true }),
  ).toBeVisible();
});

test("invalid image cannot be presented as a loaded map", async ({ page }) => {
  await page.route(MAP_SOURCE_URL, (route) => route.abort("failed"));
  await page.route(bundledImage, (route) =>
    route.fulfill({
      contentType: "image/png",
      headers: { "access-control-allow-origin": "*" },
      body: "invalid image data",
    }),
  );
  await page.goto("/#zones");
  await expect(
    page.getByText("Your map image couldn’t load", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-map-image]")).toHaveCount(0);
});

test("guide and zone 4 planner remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPlanner(page);
  await page.getByRole("button", { name: "Quick guide" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Zone 1 alone cannot predict the real zone 4",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await placeZone1(page);
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  await expect(page.getByTestId("zone-4")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("uses the exact supplied image URL when a local bundle is not present", async ({
  page,
}) => {
  await page.route(bundledImage, (route) =>
    route.fulfill({ status: 404, body: "Not bundled" }),
  );
  await page.route(MAP_SOURCE_URL, (route) =>
    route.fulfill({ contentType: "image/png", body: mapPng }),
  );
  await page.goto("/#zones");
  await expect(
    page.getByText("Your Fortnite map", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("[data-map-image]")).toHaveAttribute(
    "href",
    MAP_SOURCE_URL,
  );
  await placeZone1(page);
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  await expect(page.getByTestId("zone-4")).toBeVisible();
});

test("old browser settings cannot change the locked percentages after restore or reset", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "zoneiq-setup-v2",
      JSON.stringify({
        circle: { x: 500, y: 470, radius: 80 },
        ratio: 0.9,
        player: { x: 315, y: 650 },
        hasZone1: true,
      }),
    ),
  );
  await openPlanner(page);
  await expect(page.getByRole("slider")).toHaveCount(0);
  await expect(page.getByTestId("fixed-zone1-radius")).toHaveText("32%");
  await expect(page.getByTestId("fixed-zone-shrink")).toHaveText("60%");
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  expect(+(await page.getByTestId("zone-4").getAttribute("r"))).toBeCloseTo(
    69.12,
    8,
  );
  await page.getByRole("button", { name: "Reset planner" }).click();
  await expect(page.getByTestId("fixed-zone1-radius")).toHaveText("32%");
  await expect(page.getByTestId("fixed-zone-shrink")).toHaveText("60%");
});

test("deadside filter toggles green/red zone 4 regions, clears stale sides, and follows the new estimate", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0.25;
  });
  await openPlanner(page);
  await placeZone1(page);
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  await expect(page.getByTestId("zone-sides-overlay")).toHaveCount(0);
  const toggle = page.getByRole("switch", {
    name: "Deadside and congestion overlay",
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("deadside-region")).toHaveAttribute(
    "fill",
    "#45df92",
  );
  await expect(page.getByTestId("congested-region")).toHaveAttribute(
    "fill",
    "#fa6478",
  );
  await expect(
    page.getByText("This is a POI-count estimate, not live player traffic.", {
      exact: false,
    }),
  ).toBeVisible();
  const previous = await page
    .getByTestId("zone-sides-overlay")
    .getAttribute("transform");
  await toggle.click();
  await expect(page.getByTestId("zone-sides-overlay")).toHaveCount(0);
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("zone-sides-overlay")).toBeVisible();
  await page.getByRole("application").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("zone-sides-overlay")).toHaveCount(0);
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  await expect(page.getByTestId("zone-sides-overlay")).not.toHaveAttribute(
    "transform",
    previous,
  );
  await page.getByRole("button", { name: "Reset planner" }).click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
});

test("deadside overlay counts visible mapped POIs in its facing direction and works without a zone shift", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await openPlanner(page);
  await placeZone1(page);
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  await page
    .getByRole("switch", { name: "Deadside and congestion overlay" })
    .click();
  await expect(page.getByTestId("zone-sides-overlay")).toBeVisible();
  await expect(page.getByTestId("poi-marker")).toHaveCount(13);
  const center = await page.getByTestId("zone-4").evaluate((node) => ({
    x: +node.getAttribute("cx"),
    y: +node.getAttribute("cy"),
    radius: +node.getAttribute("r"),
  }));
  const transform = await page
    .getByTestId("zone-sides-overlay")
    .getAttribute("transform");
  const angle = (+transform.match(/rotate\(([^)]+)\)/)[1] * Math.PI) / 180;
  const points = await page.getByTestId("poi-marker").evaluateAll((nodes) =>
    nodes.map((node) => ({
      x: +node.getAttribute("cx"),
      y: +node.getAttribute("cy"),
    })),
  );
  const green = points.filter(
    (poi) =>
      (poi.x - center.x) * Math.cos(angle) +
        (poi.y - center.y) * Math.sin(angle) >
      0,
  ).length;
  const red = points.length - green;
  expect(green).toBeLessThan(red);
  expect(
    points.some(
      (poi) => Math.hypot(poi.x - center.x, poi.y - center.y) > center.radius,
    ),
  ).toBe(true);
  await expect(page.getByTestId("deadside-poi-count")).toHaveText(
    `${green} POIs`,
  );
  await expect(page.getByTestId("congested-poi-count")).toHaveText(
    `${red} POIs`,
  );
  await expect(
    page.getByRole("img", { name: "Lifty Lodge, mapped POI" }),
  ).toBeVisible();
  await page
    .getByRole("switch", { name: "Deadside and congestion overlay" })
    .click();
  await expect(page.getByTestId("poi-marker")).toHaveCount(0);
});
