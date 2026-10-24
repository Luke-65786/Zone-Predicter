import { test, expect } from "@playwright/test";

test("home offers every tool without loading a map or changing saved inputs", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => {
    if (/fortnite-map\.png|fortnite-api\.com/.test(request.url())) requests.push(request.url());
  });
  await page.goto("/");
  await expect(page).toHaveTitle("CompIQ · Fortnite Competitive Toolkit");
  await expect(page.getByRole("tab", { name: "Home", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("link", { name: "Open points calculator" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open zone predictor" })).toBeVisible();
  for (const name of ["tournament tracker", "scoring calculator", "tournament planner", "practice checklist"]) {
    await expect(page.getByRole("link", { name: `Open ${name}` })).toBeVisible();
  }
  await expect(page.getByLabel("Target points", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("application")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("compiq-points-v2"))).toBeNull();
  await page.getByRole("link", { name: "Open points calculator" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#points$/);
  await expect(page.getByLabel("Target points", { exact: true })).toHaveValue("");
  await expect(page.getByTestId("points-average")).toHaveText("—");
  await page.getByLabel("Target points", { exact: true }).fill("240");
  await page.getByLabel("Total games", { exact: true }).fill("10");
  await page.goBack();
  await expect(page.getByRole("tabpanel", { name: "Home", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByTestId("points-average")).toHaveText("24");
  await page.locator(".site-header").getByRole("link", { name: "CompIQ home" }).click();
  await expect(page).toHaveURL(/#home$/);
  await page.reload();
  await expect(page.getByRole("tabpanel", { name: "Home", exact: true })).toBeVisible();
});

test("home zone card opens the predictor and the footer logo returns home", async ({ page }) => {
  await page.route("**/maps/fortnite-map.png", (route) => route.fulfill({
    contentType: "image/png",
    body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=", "base64"),
  }));
  await page.goto("/#home");
  await page.getByRole("link", { name: "Open zone predictor" }).click();
  await expect(page).toHaveTitle("Zone Predictor · CompIQ");
  await expect(page.getByText("Your Fortnite map", { exact: true })).toBeVisible();
  await expect(page.getByTestId("fixed-zone1-radius")).toHaveText("32%");
  await page.locator(".footer-inner").getByRole("link", { name: "CompIQ home" }).click();
  await expect(page.getByRole("tabpanel", { name: "Home", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("mobile home and its appearance shortcut fit the screen and support saved themes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/");
  await page.getByRole("button", { name: "Customize appearance" }).click();
  await page.getByText("Daylight", { exact: true }).click();
  await page.getByText("Mint", { exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Customize appearance" })).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "daylight");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "mint");
  await expect(page.getByRole("link", { name: "Open points calculator" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open zone predictor" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const home = await page.getByRole("tab", { name: "Home", exact: true }).boundingBox();
  expect(home.x).toBeGreaterThanOrEqual(0);
  expect(home.x + home.width).toBeLessThanOrEqual(320);
  await page.getByRole("tab", { name: "Home", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Practice checklist" })).toBeFocused();
  const practice = await page.getByRole("tab", { name: "Practice checklist" }).boundingBox();
  expect(practice.x).toBeGreaterThanOrEqual(0);
  expect(practice.x + practice.width).toBeLessThanOrEqual(320);
});
