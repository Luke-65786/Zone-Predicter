import { test, expect } from "@playwright/test";

const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
  "base64",
);
const mockMap = (page) =>
  page.route("**/maps/fortnite-map.png", (route) =>
    route.fulfill({ contentType: "image/png", body: image }),
  );

test("combined planner saves independent targets, drops, routes, notes, and a downloadable plan", async ({
  page,
}) => {
  await mockMap(page);
  await page.goto("/#plans");
  await page.getByLabel("Plan name", { exact: true }).fill("Solo Finals");
  await page.getByLabel("Plan target points", { exact: true }).fill("312");
  await page.getByLabel("Plan total games", { exact: true }).fill("12");
  await page
    .getByLabel("Drop and loot notes", { exact: true })
    .fill("Roof first, then shield.");
  await page
    .getByLabel("Rotation notes", { exact: true })
    .fill("Follow the ridge and keep cover.");
  const map = page.getByRole("application", {
    name: "Tournament planning map",
  });
  await map.click({ position: { x: 90, y: 120 } });
  await expect(page.getByTestId("plan-marker-landing")).toHaveCount(1);
  await page.getByRole("button", { name: "Backup spot", exact: true }).click();
  await map.click({ position: { x: 150, y: 200 } });
  await page.getByRole("button", { name: "Loot route", exact: true }).click();
  await map.click({ position: { x: 90, y: 120 } });
  await map.click({ position: { x: 150, y: 200 } });
  await expect(page.getByTestId("plan-marker-loot-1")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Rotation route", exact: true })
    .click();
  await map.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("plan-marker-rotation-1")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Good position", exact: true })
    .click();
  await page
    .getByLabel("Map marker label (optional)", { exact: true })
    .fill("Ridge");
  await map.click({ position: { x: 180, y: 140 } });
  await page
    .getByRole("button", { name: "Save tournament plan", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue(
    "Solo Finals",
  );
  await expect(page.getByLabel("Rotation notes", { exact: true })).toHaveValue(
    "Follow the ridge and keep cover.",
  );
  await expect(page.getByTestId("plan-marker-position-0")).toContainText(
    "Ridge",
  );
  const landingBefore = await page
    .getByTestId("plan-marker-landing")
    .locator("circle")
    .getAttribute("cx");
  const firstId = await page
    .getByLabel("Saved tournament plan", { exact: true })
    .inputValue();
  await page
    .getByRole("button", { name: "Duplicate plan", exact: true })
    .click();
  await page.getByLabel("Plan name", { exact: true }).fill("Duo Cup");
  await page.getByRole("button", { name: "Landing spot", exact: true }).click();
  await map.click({ position: { x: 240, y: 240 } });
  await page
    .getByLabel("Saved tournament plan", { exact: true })
    .selectOption(firstId);
  await expect(
    page.getByTestId("plan-marker-landing").locator("circle"),
  ).toHaveAttribute("cx", landingBefore);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download plan", exact: true })
    .click();
  const download = await downloadPromise;
  const { readFile } = await import("node:fs/promises");
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(exported.plan.name).toBe("Solo Finals");
  expect(exported.plan.loot).toHaveLength(2);
  expect(exported.plan.rotation).toHaveLength(2);
  await page
    .getByRole("button", { name: "Delete this plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Undo plan deletion", exact: true })
    .click();
  await expect(page.getByLabel("Plan name", { exact: true })).toHaveValue(
    "Solo Finals",
  );
});

test("tracker loads a saved target and handles logging, correction, deletion, and remaining pace", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "compiq-plans-v1",
      JSON.stringify({
        plans: [{ id: "cup", name: "Cup", target: "100", games: "4" }],
        activeId: "cup",
      }),
    ),
  );
  await page.goto("/#tracker");
  await page
    .getByLabel("Load target from saved plan", { exact: true })
    .selectOption("cup");
  await page
    .getByRole("button", { name: "Apply plan target", exact: true })
    .click();
  await page.getByLabel("Game points", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Add game", exact: true }).click();
  await expect(page.getByTestId("tracker-status")).toContainText(
    "15 points ahead",
  );
  await expect(page.getByTestId("tracker-average")).toHaveText("20");
  await page.getByLabel("Game points", { exact: true }).fill("20");
  await page.getByRole("button", { name: "Add game", exact: true }).click();
  await page.getByLabel("Game 1 points", { exact: true }).fill("10");
  await expect(page.getByTestId("tracker-status")).toContainText(
    "20 points behind",
  );
  await expect(page.getByTestId("tracker-average")).toHaveText("35");
  await page
    .getByRole("button", { name: "Remove game 1", exact: true })
    .click();
  await expect(page.getByTestId("tracker-earned")).toHaveText("20");
  await page.getByRole("button", { name: "Undo removal", exact: true }).click();
  await page.reload();
  await expect(page.getByTestId("tracker-earned")).toHaveText("30");
  await page.getByLabel("Tracker total games", { exact: true }).fill("2");
  await expect(page.getByTestId("tracker-status")).toHaveText(
    "Tournament complete",
  );
  await expect(page.getByTestId("tracker-average")).toHaveText("—");
  await page.getByLabel("Game 2 points", { exact: true }).fill("90");
  await expect(page.getByTestId("tracker-status")).toHaveText("Target reached");
});

test("scoring calculator applies custom rules and rejects inconsistent placement tiers", async ({
  page,
}) => {
  await page.goto("/#scoring");
  await page.getByLabel("Points per elimination", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Add placement tier", exact: true })
    .click();
  await page.getByLabel("Tier 1 top finish", { exact: true }).fill("1");
  await page.getByLabel("Tier 1 total points", { exact: true }).fill("20");
  await page
    .getByRole("button", { name: "Add placement tier", exact: true })
    .click();
  await page.getByLabel("Tier 2 top finish", { exact: true }).fill("10");
  await page.getByLabel("Tier 2 total points", { exact: true }).fill("5");
  await page.getByLabel("Scoring finish", { exact: true }).fill("1");
  await page.getByLabel("Scoring eliminations", { exact: true }).fill("3");
  await expect(page.getByTestId("match-score")).toHaveText("26");
  await page.getByLabel("Points needed this game", { exact: true }).fill("25");
  await expect(
    page
      .getByRole("table", { name: "Placement and elimination combinations" })
      .locator("tbody tr"),
  ).toHaveCount(3);
  await page.reload();
  await expect(page.getByTestId("match-score")).toHaveText("26");
  await page.getByLabel("Points per elimination", { exact: true }).fill("0");
  await expect(page.getByText("Not reachable", { exact: true })).toHaveCount(3);
  await page.getByLabel("Tier 2 top finish", { exact: true }).fill("1");
  await expect(page.getByRole("alert")).toContainText("only once");
  await expect(page.getByTestId("match-score")).toHaveCount(0);
});

test("practice saves per-date checks, custom drills, notes, and reversible resets", async ({
  page,
}) => {
  await page.goto("/#practice");
  const date = await page
    .getByLabel("Practice date", { exact: true })
    .inputValue();
  await page
    .getByRole("checkbox", { name: /Tracking and shotgun aim/ })
    .check();
  await page.getByLabel("Drill name", { exact: true }).fill("Tarp into cover");
  await page
    .getByLabel("Drill category", { exact: true })
    .selectOption("Building");
  await page.getByLabel("Drill minutes", { exact: true }).fill("12");
  await page.getByRole("button", { name: "Add drill", exact: true }).click();
  await page.getByRole("checkbox", { name: /Tarp into cover/ }).check();
  await page
    .getByLabel("Session notes and takeaway", { exact: true })
    .fill("Rotate before pressure arrives.");
  await expect(page.getByTestId("practice-completed")).toHaveText("2 / 6");
  await page.getByLabel("Practice date", { exact: true }).fill("2027-01-01");
  await expect(page.getByTestId("practice-completed")).toHaveText("0 / 6");
  await page.getByLabel("Practice date", { exact: true }).fill(date);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: /Tarp into cover/ }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Session notes and takeaway", { exact: true }),
  ).toHaveValue("Rotate before pressure arrives.");
  await page
    .getByRole("button", { name: "Reset this session", exact: true })
    .click();
  await expect(page.getByTestId("practice-completed")).toHaveText("0 / 6");
  await page
    .getByRole("button", { name: "Undo last reset or removal", exact: true })
    .click();
  await expect(page.getByTestId("practice-completed")).toHaveText("2 / 6");
});

test("new tools fit mobile, tolerate unavailable storage, and keep the original tools usable", async ({
  page,
}) => {
  await mockMap(page);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Unavailable", "QuotaExceededError");
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const id of ["tracker", "scoring", "plans", "practice"]) {
    await page.goto(`/#${id}`);
    await expect(page.locator(`#panel-${id}`)).toBeVisible();
    await expect(page.locator(`#panel-${id} .comp-storage`)).toContainText(
      "unavailable",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/#tracker");
  await page.getByLabel("Tracker target points", { exact: true }).fill("100");
  await page.getByLabel("Tracker total games", { exact: true }).fill("4");
  await page.getByLabel("Game points", { exact: true }).fill("40");
  await page.getByRole("button", { name: "Add game", exact: true }).click();
  await expect(page.getByTestId("tracker-earned")).toHaveText("40");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/#points");
  await expect(page.getByLabel("Target points", { exact: true })).toHaveValue(
    "",
  );
  await page.goto("/#zones");
  await expect(page.getByTestId("fixed-zone1-radius")).toHaveText("32%");
  expect(errors).toEqual([]);
});
