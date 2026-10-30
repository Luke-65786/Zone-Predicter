import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
const pixel = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
  "base64",
);
test.beforeEach(async ({ page }) => {
  await page.route("**/maps/fortnite-map.png", (route) =>
    route.fulfill({ contentType: "image/png", body: pixel }),
  );
});
async function chooseNightmare(page) {
  await page
    .getByRole("combobox", { name: "Island map", exact: true })
    .selectOption("nightmare-reload");
  await expect(
    page.locator(
      '[role="tabpanel"]:not([hidden]) svg image[href$="nightmare-island-reload.png"]',
    ),
  ).toBeVisible();
}

test("Nightmare drop map loads the actual image, keeps island routes separate, and exports", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#drops");
  const map = page.getByRole("application", { name: "Interactive drop map" });
  await expect(map).toBeVisible();
  await map.click({ position: { x: 90, y: 90 } });
  const original = await page
    .getByTestId("drop-start")
    .locator("circle")
    .getAttribute("cx");
  await chooseNightmare(page);
  await expect(page.getByTestId("drop-start")).toHaveCount(0);
  await map.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("drop-jump")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Island map" })).toHaveValue(
    "nightmare-reload",
  );
  await expect(
    page.getByTestId("drop-start").locator("circle"),
  ).toHaveAttribute("cx", "500");
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download map (SVG)" }).click();
  const output = await pending;
  const svg = await readFile(await output.path(), "utf8");
  expect(svg).toContain("data:image/png;base64,");
  expect(svg.length).toBeGreaterThan(1000000);
  await page
    .getByRole("combobox", { name: "Island map" })
    .selectOption("battle-royale");
  await expect(
    page.getByTestId("drop-start").locator("circle"),
  ).toHaveAttribute("cx", original);
  expect(errors).toEqual([]);
});

test("Nightmare zones use ten island POIs and preserve each island setup", async ({
  page,
}) => {
  await page.goto("/#zones");
  await chooseNightmare(page);
  await page.getByRole("application").click({ position: { x: 200, y: 200 } });
  await page
    .getByRole("button", { name: "Estimate zone 4", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Deadside and congestion overlay" })
    .click();
  await expect(page.getByTestId("poi-marker")).toHaveCount(10);
  await expect(page.getByTestId("poi-markers")).toContainText("Terror Turrets");
  await page
    .getByRole("combobox", { name: "Island map" })
    .selectOption("battle-royale");
  await expect(page.getByTestId("zone-4")).toHaveCount(0);
  await chooseNightmare(page);
  await page
    .getByRole("button", { name: "Estimate zone 4", exact: true })
    .click();
  await expect(page.getByTestId("zone-4")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Island map" })).toHaveValue(
    "nightmare-reload",
  );
});

test("Nightmare tournament markers persist per island and the selector fits mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/#plans");
  await chooseNightmare(page);
  await page
    .getByRole("application", { name: "Tournament planning map" })
    .click({ position: { x: 100, y: 100 } });
  const x = await page
    .getByTestId("plan-marker-landing")
    .locator("circle")
    .getAttribute("cx");
  await page.getByLabel("Plan name", { exact: true }).fill("Nightmare cup");
  await page
    .getByRole("button", { name: "Save tournament plan", exact: true })
    .click();
  await page.reload();
  await expect(page.getByRole("combobox", { name: "Island map" })).toHaveValue(
    "nightmare-reload",
  );
  await page
    .getByRole("combobox", { name: "Island map" })
    .selectOption("battle-royale");
  await expect(page.getByTestId("plan-marker-landing")).toHaveCount(0);
  await chooseNightmare(page);
  await expect(
    page.getByTestId("plan-marker-landing").locator("circle"),
  ).toHaveAttribute("cx", x);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("tab", { name: "Drop map", exact: true }).click();
  await expect(
    page.getByLabel("Landing from tournament plan", { exact: true }),
  ).toHaveCount(0);
  await chooseNightmare(page);
  await page
    .getByLabel("Landing from tournament plan", { exact: true })
    .selectOption({ label: "Nightmare cup" });
  await page
    .getByRole("button", { name: "Use plan landing spot", exact: true })
    .click();
  await expect(
    page.getByTestId("drop-target").locator("circle"),
  ).toHaveAttribute("cx", x);
});
