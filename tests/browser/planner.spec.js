import { test, expect } from "@playwright/test";

test("planner generates nested circles, updates sizes and persists settings", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Think one circle ahead." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Phase 6", exact: true }).click();
  await page.locator("#next-size").fill("45");
  await page.locator("#circle-size").fill("25");
  await page.getByRole("button", { name: "Generate next zone" }).click();
  await expect(
    page.getByRole("button", { name: "Generate next zone" }),
  ).toBeEnabled();
  await expect(page.getByTestId("next-circle")).toHaveAttribute("r", "112.5");
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("zoneiq-setup-v1")),
  );
  const next = await page
    .getByTestId("next-circle")
    .evaluate((node) => ({
      x: +node.getAttribute("cx"),
      y: +node.getAttribute("cy"),
      radius: +node.getAttribute("r"),
    }));
  expect(
    Math.hypot(next.x - state.circle.x, next.y - state.circle.y) + next.radius,
  ).toBeLessThanOrEqual(state.circle.radius + 0.001);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Phase 6", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#next-size")).toHaveValue("45");
  expect(errors).toEqual([]);
});

test("map supports placement, keyboard controls, layers, and reset", async ({
  page,
}) => {
  await page.goto("/");
  const map = page.getByRole("application");
  await page
    .getByRole("button", { name: "Your position", exact: true })
    .click();
  const before = await page
    .getByTestId("player-marker")
    .getAttribute("transform");
  await map.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("player-marker")).not.toHaveAttribute(
    "transform",
    before,
  );
  await map.click({ position: { x: 200, y: 200 } });
  await expect(page.getByTestId("player-marker")).not.toHaveAttribute(
    "transform",
    "translate(320 650)",
  );
  await page.getByRole("button", { name: "Show possible center area" }).click();
  await expect(page.getByTestId("possible-centers")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset planner" }).click();
  await expect(page.getByTestId("possible-centers")).toBeVisible();
  await expect(page.getByTestId("player-marker")).toHaveAttribute(
    "transform",
    "translate(315 650)",
  );
  await expect(
    page.getByRole("button", { name: "Current circle", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("upload stays local and SVG export embeds the custom image", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Upload a map image").setInputFiles({
    name: "my-map.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("my-map.png", { exact: true })).toBeVisible();
  await expect(page.locator("[data-map-image]")).toHaveAttribute(
    "href",
    /^blob:/,
  );
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export plan" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("zoneiq-plan.svg");
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const svg = Buffer.concat(chunks).toString();
  expect(svg).toContain("data:image/png;base64,");
  expect(svg).not.toContain("blob:");
  expect(svg).toContain("Sampled scenario only");
  await page
    .getByLabel("Upload a map image")
    .setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("not an image"),
    });
  await expect(page.getByRole("status")).toContainText("could not be opened");
});

test("guide is keyboard accessible and mobile layout fits the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Quick guide" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Moving endgame circles are not modeled");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Generate next zone" }).click();
  await expect(
    page.getByRole("button", { name: "Generate next zone" }),
  ).toBeEnabled();
  await expect(page.getByTestId("next-circle")).toBeVisible();
});
