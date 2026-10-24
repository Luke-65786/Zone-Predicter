import { test, expect } from "@playwright/test";

async function openSettings(page) {
  await page.getByRole("button", { name: "Open settings" }).click();
  await expect(
    page.getByRole("dialog", { name: "Make it yours." }),
  ).toBeVisible();
}
async function choose(page, name) {
  await page.getByText(name, { exact: true }).click();
}

test("theme and accent preferences update live and survive a reload", async ({
  page,
}) => {
  await page.goto("/#points");
  await openSettings(page);
  await choose(page, "Daylight");
  await choose(page, "Mint");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "daylight");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "mint");
  await expect(
    page.getByRole("radio", { name: "Daylight theme" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Close settings" }).click();
  await expect(
    page.getByRole("button", { name: "Open settings" }),
  ).toBeFocused();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "daylight");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "mint");
  await expect(page.getByTestId("points-average")).toHaveText("—");
});

test("System follows device color changes while explicit themes remain stable", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/#points");
  await openSettings(page);
  await choose(page, "System");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "daylight");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
  await choose(page, "Graphite");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
  await expect(
    page.getByRole("radio", { name: "Graphite theme" }),
  ).toBeChecked();
});

test("display controls change row spacing, navigation, glow, and motion and save false values", async ({
  page,
}) => {
  await page.goto("/#points");
  await page.getByLabel("Target points", { exact: true }).fill("312");
  await page.getByLabel("Total games", { exact: true }).fill("12");
  const oldHeight = await page
    .getByTestId("game-plan-row")
    .first()
    .evaluate((node) => node.getBoundingClientRect().height);
  await openSettings(page);
  await page
    .getByRole("combobox", { name: "Layout spacing" })
    .selectOption("compact");
  await choose(page, "Sticky navigation");
  await choose(page, "Ambient glow");
  await choose(page, "Reduce motion");
  await expect(page.locator("html")).toHaveAttribute(
    "data-sticky-nav",
    "false",
  );
  await expect(page.locator("html")).toHaveAttribute("data-glow", "false");
  await expect(page.locator("html")).toHaveAttribute(
    "data-reduce-motion",
    "true",
  );
  expect(
    await page
      .getByRole("dialog")
      .evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  await page.keyboard.press("Escape");
  expect(
    await page
      .getByTestId("game-plan-row")
      .first()
      .evaluate((node) => node.getBoundingClientRect().height),
  ).toBeLessThan(oldHeight);
  expect(
    await page
      .locator(".site-header")
      .evaluate((node) => getComputedStyle(node).position),
  ).toBe("static");
  expect(
    await page
      .locator("body")
      .evaluate((node) => getComputedStyle(node).backgroundImage),
  ).toBe("none");
  await page.reload();
  await openSettings(page);
  await expect(
    page.getByRole("checkbox", { name: "Sticky navigation" }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Ambient glow" }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Reduce motion" }),
  ).toBeChecked();
  await expect(
    page.getByRole("combobox", { name: "Layout spacing" }),
  ).toHaveValue("compact");
});

test("resetting appearance preserves calculator values, zone forecasts, and filters", async ({
  page,
}) => {
  await page.route("**/maps/fortnite-map.png", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("/#points");
  await page.getByLabel("Target points", { exact: true }).fill("400");
  await page.getByLabel("Total games", { exact: true }).fill("10");
  await page.getByRole("tab", { name: "Zone predictor" }).click();
  await expect(
    page.getByText("Your Fortnite map", { exact: true }),
  ).toBeVisible();
  await page.getByRole("application").click({ position: { x: 200, y: 200 } });
  await page.getByRole("button", { name: "Estimate zone 4" }).click();
  await page
    .getByRole("switch", { name: "Deadside and congestion overlay" })
    .click();
  const before = await page.getByTestId("zone-4").getAttribute("cx");
  await openSettings(page);
  await choose(page, "Daylight");
  await choose(page, "Rose");
  await page.getByRole("button", { name: "Reset appearance" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "indigo");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("zone-4")).toHaveAttribute("cx", before);
  await expect(
    page.getByRole("switch", { name: "Deadside and congestion overlay" }),
  ).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("fixed-zone1-radius")).toHaveText("32%");
  await page.getByRole("tab", { name: "Points calculator" }).click();
  await expect(page.getByTestId("points-average")).toHaveText("40");
});

test("settings traps keyboard focus and closes with Escape and a backdrop click", async ({
  page,
}) => {
  await page.goto("/#points");
  await openSettings(page);
  await expect(
    page.getByRole("button", { name: "Close settings" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Reset appearance" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close settings" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open settings" }),
  ).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  await openSettings(page);
  await page.mouse.click(5, 200);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("mobile settings fit the screen and the selected theme applies to both tools", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 780 });
  await page.route("**/maps/fortnite-map.png", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  await page.goto("/#points");
  await openSettings(page);
  const bounds = await page.getByRole("dialog").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
  await choose(page, "Daylight");
  await choose(page, "Amber");
  await page.getByRole("button", { name: "Close settings" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByTestId("points-average")).toHaveText("—");
  await page.getByRole("tab", { name: "Zone predictor" }).click();
  await expect(
    page.getByText("Your Fortnite map", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "daylight");
  await expect(page.locator("html")).toHaveAttribute("data-accent", "amber");
  await expect(page.getByTestId("fixed-zone-shrink")).toHaveText("60%");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("corrupt saved preferences recover to a usable default", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("compiq-appearance-v1", "{broken"),
  );
  await page.goto("/#points");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "midnight");
  await openSettings(page);
  await choose(page, "Graphite");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
});

test("blocked storage does not prevent live appearance changes or calculations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Storage unavailable", "QuotaExceededError");
    };
  });
  await page.goto("/#points");
  await page.getByLabel("Target points", { exact: true }).fill("600");
  await page.getByLabel("Total games", { exact: true }).fill("12");
  await expect(page.getByTestId("points-average")).toHaveText("50");
  await openSettings(page);
  await choose(page, "Graphite");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "graphite");
  await expect(
    page.getByText("Applied for this session", { exact: true }),
  ).toBeVisible();
});
