import { test, expect } from "@playwright/test";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
  "base64",
);
async function mockMap(page) {
  await page.route("**/maps/fortnite-map.png", (route) =>
    route.fulfill({ contentType: "image/png", body: png }),
  );
}

test("CompIQ opens with clear fields and no example, including previously saved defaults", async ({
  page,
}) => {
  const mapRequests = [];
  page.on("request", (request) => {
    if (/fortnite-map\.png|fortnite-api\.com/.test(request.url()))
      mapRequests.push(request.url());
  });
  await page.addInitScript(() =>
    localStorage.setItem("compiq-points-v1", JSON.stringify({
      target: "312", games: "12", current: "0", played: "0",
    })),
  );
  await page.goto("/");
  await expect(page).toHaveTitle("Points Calculator · CompIQ");
  await expect(
    page.getByRole("tab", { name: "Points calculator" }),
  ).toHaveAttribute("aria-selected", "true");
  for (const label of [
    "Target points", "Total games", "Points earned", "Games played",
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("aria-invalid", "false");
  }
  await expect(page.getByTestId("points-average")).toHaveText("—");
  await expect(page.getByTestId("points-equation")).toHaveCount(0);
  await expect(page.getByTestId("game-plan-row")).toHaveCount(0);
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.waitForLoadState("networkidle");
  expect(mapRequests).toEqual([]);
  await page.getByLabel("Target points", { exact: true }).fill("312");
  await page.getByLabel("Total games", { exact: true }).fill("12");
  await expect(page.getByTestId("points-average")).toHaveText("26");
  await page.reload();
  await expect(page.getByTestId("points-average")).toHaveText("26");
});

test("point and game inputs calculate independently and whole-point plans preserve the exact goal", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Target points", { exact: true }).fill("313");
  await page.getByLabel("Total games", { exact: true }).fill("12");
  await expect(page.getByTestId("points-average")).toHaveText("26.08");
  await expect(page.getByTestId("whole-point-plan")).toContainText("27 points");
  await expect(page.getByTestId("whole-point-plan")).toContainText("11 games");
  await expect(
    page.getByTestId("game-plan-row").last().locator("td").nth(2),
  ).toHaveText("313 pts");
  await page.getByLabel("Total games", { exact: true }).fill("10");
  await expect(page.getByTestId("points-average")).toHaveText("31.3");
  await expect(page.getByTestId("game-plan-row")).toHaveCount(10);
});

test("progress, exhausted games, and achieved targets have distinct outcomes", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Target points", { exact: true }).fill("312");
  await page.getByLabel("Total games", { exact: true }).fill("12");
  await page.getByLabel("Points earned", { exact: true }).fill("100");
  await page.getByLabel("Games played", { exact: true }).fill("4");
  await expect(page.getByTestId("points-average")).toHaveText("26.5");
  await expect(page.getByTestId("points-needed")).toHaveText("212");
  await expect(page.getByTestId("games-remaining")).toHaveText("8");
  await expect(page.getByTestId("game-plan-row").first()).toContainText(
    "GAME 05",
  );
  await page.getByLabel("Games played", { exact: true }).fill("12");
  await expect(page.getByTestId("points-average")).toHaveText("—");
  await expect(
    page.getByText("but you have no games left.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("game-plan-row")).toHaveCount(0);
  await page.getByLabel("Points earned", { exact: true }).fill("350");
  await expect(page.getByText("TARGET REACHED", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "100",
  );
  await expect(page.locator("body")).not.toContainText("Infinity");
});

test("invalid values show clear errors and do not retain a stale pace", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Target points", { exact: true }).fill("312");
  await page.getByLabel("Total games", { exact: true }).fill("0");
  await expect(page.getByText("Enter at least one total game.")).toBeVisible();
  await expect(page.getByTestId("points-average")).toHaveText("—");
  await page.getByLabel("Total games", { exact: true }).fill("12");
  await page.getByLabel("Games played", { exact: true }).fill("13");
  await expect(
    page.getByText("Games played cannot exceed total games."),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Clear points calculator",
    })
    .click();
  for (const label of [
    "Target points", "Total games", "Points earned", "Games played",
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
    await expect(page.getByLabel(label, { exact: true })).toHaveAttribute("aria-invalid", "false");
  }
  await expect(page.getByTestId("game-plan-row")).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Target points", { exact: true })).toHaveValue("");
  await page.getByLabel("Target points", { exact: true }).fill("312");
  await page.getByLabel("Total games", { exact: true }).fill("12");
  await expect(page.getByTestId("points-average")).toHaveText("26");
});

test("switching tools preserves calculator and zone state, including browser Back from the guide", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockMap(page);
  await page.goto("/");
  await page.getByLabel("Target points", { exact: true }).fill("400");
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
  await page.getByRole("tab", { name: "Points calculator" }).click();
  await expect(page.getByLabel("Target points", { exact: true })).toHaveValue(
    "400",
  );
  await page.getByRole("tab", { name: "Zone predictor" }).click();
  await expect(page.getByTestId("zone-4")).toHaveAttribute("cx", before);
  await expect(
    page.getByRole("switch", { name: "Deadside and congestion overlay" }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Quick guide" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("tab", { name: "Points calculator" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  expect(errors).toEqual([]);
});

test("tabs support arrow-key navigation and legacy zone links", async ({
  page,
}) => {
  await mockMap(page);
  await page.goto("/");
  await page.getByRole("tab", { name: "Points calculator" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Zone predictor" })).toBeFocused();
  await expect(
    page.getByRole("tabpanel", { name: "Zone predictor" }),
  ).toBeVisible();
  await page.keyboard.press("Home");
  await expect(
    page.getByRole("tab", { name: "Points calculator" }),
  ).toBeFocused();
  await expect(page.getByTestId("points-average")).toBeVisible();
  await page.goto("/#planner");
  await expect(
    page.getByRole("tab", { name: "Zone predictor" }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page).toHaveTitle("Zone Predictor · CompIQ");
});

test("mobile calculator paginates and restores custom inputs from the previous version", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem("compiq-points-v1", JSON.stringify({
      target: "25", games: "13", current: "0", played: "0",
    })),
  );
  await page.goto("/");
  await expect(page.getByTestId("game-plan-row")).toHaveCount(12);
  await page.getByRole("button", { name: "Next games" }).click();
  await expect(page.getByTestId("game-plan-row")).toHaveCount(1);
  await expect(page.getByTestId("game-plan-row").last()).toContainText(
    "GAME 13",
  );
  await expect(
    page.getByTestId("game-plan-row").last().locator("td").nth(2),
  ).toHaveText("25 pts");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByLabel("Target points", { exact: true })).toHaveValue(
    "25",
  );
  await expect(page.getByLabel("Total games", { exact: true })).toHaveValue(
    "13",
  );
  await expect(page.getByTestId("points-average")).toHaveText("1.92");
});
