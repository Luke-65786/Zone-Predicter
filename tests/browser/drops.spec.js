import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE7sAAAAASUVORK5CYII=",
  "base64",
);
const mockMap = (page) =>
  page.route("**/maps/fortnite-map.png", (route) =>
    route.fulfill({ contentType: "image/png", body: image }),
  );
async function place(page, x, y) {
  const map = page.getByRole("application", { name: "Interactive drop map" });
  const box = await map.boundingBox();
  await map.click({ position: { x: box.width * x, y: box.height * y } });
}
async function routeAndTarget(page, target = [0.6, 0.55]) {
  await expect(
    page.getByRole("application", { name: "Interactive drop map" }),
  ).toBeVisible();
  await place(page, 0.1, 0.5);
  await expect(
    page.getByRole("button", { name: "Place bus end", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await place(page, 0.9, 0.5);
  await expect(
    page.getByRole("button", { name: "Place landing spot", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await place(page, ...target);
}

test("home opens the drop map; saved drops, edits, route direction, and image export work", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mockMap(page);
  await page.goto("/#home");
  await page.getByRole("link", { name: "Open drop map", exact: true }).click();
  await expect(page).toHaveTitle("Drop Map · CompIQ");
  await routeAndTarget(page);
  await expect(page.getByTestId("drop-jump")).toBeVisible();
  await expect(page.getByTestId("drop-deploy")).toBeVisible();
  await expect(page.getByTestId("drop-jump-time")).toContainText(/\d+\.\d s/);
  const jump = await page.getByTestId("drop-jump-time").textContent();
  await page.getByRole("button", { name: "Reverse bus", exact: true }).click();
  expect(await page.getByTestId("drop-jump-time").textContent()).not.toBe(jump);
  await page
    .getByRole("button", { name: "Undo map edit", exact: true })
    .click();
  await expect(page.getByTestId("drop-jump-time")).toHaveText(jump);
  await page.getByLabel("Drop name", { exact: true }).fill("Finals north drop");
  await page
    .getByLabel("Drop notes", { exact: true })
    .fill("Land on the west roof and take cover.");
  await page.getByRole("button", { name: "Save drop", exact: true }).click();
  const savedId = await page
    .getByLabel("Saved drop", { exact: true })
    .inputValue();
  await page.reload();
  await expect(page.getByLabel("Drop name", { exact: true })).toHaveValue(
    "Finals north drop",
  );
  await expect(page.getByTestId("drop-jump-time")).toHaveText(jump);
  await page.getByRole("button", { name: "New drop", exact: true }).click();
  await expect(page.getByTestId("drop-jump")).toHaveCount(0);
  await page.getByLabel("Saved drop", { exact: true }).selectOption(savedId);
  await expect(page.getByLabel("Drop notes", { exact: true })).toHaveValue(
    "Land on the west roof and take cover.",
  );
  await page
    .getByRole("tab", { name: "Points calculator", exact: true })
    .click();
  await page.getByRole("tab", { name: "Drop map", exact: true }).click();
  await expect(page.getByTestId("drop-jump-time")).toHaveText(jump);
  const promise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download map (SVG)", exact: true })
    .click();
  const download = await promise;
  expect(download.suggestedFilename()).toBe("Finals-north-drop.svg");
  const svg = await readFile(await download.path(), "utf8");
  expect(svg).toContain("data:image/png;base64,");
  expect(svg).toContain("Flat-ground estimate");
  expect(svg).toContain('data-testid="drop-jump"');
  expect(svg).not.toContain("drop-cursor");
  expect(svg).not.toContain("fortnite-api.com");
  expect(
    await page.evaluate(
      (source) =>
        new DOMParser()
          .parseFromString(source, "image/svg+xml")
          .querySelectorAll("parsererror").length,
      svg,
    ),
  ).toBe(0);
  expect(errors).toEqual([]);
});

test("unreachable landings and invalid timing values remove the suggested approach", async ({
  page,
}) => {
  await mockMap(page);
  await page.goto("/#drops");
  await routeAndTarget(page, [0.5, 0.02]);
  await expect(
    page.getByText("This landing is out of reach in this model."),
  ).toBeVisible();
  await expect(page.getByTestId("drop-jump")).toHaveCount(0);
  await place(page, 0.6, 0.55);
  await expect(page.getByTestId("drop-jump")).toBeVisible();
  await page.getByText("Timing model", { exact: true }).click();
  await page.getByLabel("Bus speed (m/s)", { exact: true }).fill("0");
  await expect(page.getByRole("alert")).toContainText("Check the highlighted");
  await expect(page.getByTestId("drop-jump")).toHaveCount(0);
  await page.getByLabel("Bus speed (m/s)", { exact: true }).fill("80.5");
  await expect(page.getByTestId("drop-jump")).toBeVisible();
  await expect(
    page.getByLabel("Image width (m)", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Glider deploy height (m)", { exact: true })
    .fill("1000");
  await expect(page.getByRole("alert")).toBeVisible();
  await page
    .getByRole("button", { name: "Reset timing model", exact: true })
    .click();
  await expect(page.getByTestId("drop-jump")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear bus route", exact: true })
    .click();
  await expect(page.getByTestId("drop-start")).toHaveCount(0);
  await expect(page.getByTestId("drop-target")).toBeVisible();
  await page
    .getByRole("button", { name: "Undo map edit", exact: true })
    .click();
  await expect(page.getByTestId("drop-jump")).toBeVisible();
});

test("keyboard placement, zoom, and pan fit mobile with larger text and daylight", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await mockMap(page);
  await page.goto("/#drops");
  const map = page.getByRole("application", { name: "Interactive drop map" });
  await expect(map).toBeVisible();
  await map.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("drop-jump")).toBeVisible();
  await page
    .getByRole("button", { name: "Zoom in drop map", exact: true })
    .click();
  const zoomed = await map.getAttribute("viewBox");
  expect(zoomed).not.toBe("0 0 1000 1000");
  await page.getByRole("button", { name: "Pan", exact: true }).click();
  await map.focus();
  await page.keyboard.press("Shift+ArrowRight");
  expect(await map.getAttribute("viewBox")).not.toBe(zoomed);
  const [viewX, viewY, viewSize] = (await map.getAttribute("viewBox"))
    .split(" ")
    .map(Number);
  await page
    .getByRole("button", { name: "Place landing spot", exact: true })
    .click();
  await place(page, 0.5, 0.5);
  await expect(
    page.getByTestId("drop-target").locator("circle"),
  ).toHaveAttribute("cx", String(Math.round(viewX + viewSize / 2)));
  await expect(
    page.getByTestId("drop-target").locator("circle"),
  ).toHaveAttribute("cy", String(Math.round(viewY + viewSize / 2)));
  const textPixels = await page
    .getByTestId("drop-target")
    .locator("text")
    .last()
    .evaluate(
      (node) =>
        (parseFloat(node.getAttribute("font-size")) *
          node.ownerSVGElement.getBoundingClientRect().width) /
        node.ownerSVGElement.viewBox.baseVal.width,
    );
  expect(textPixels).toBeGreaterThanOrEqual(10);
  await page
    .getByRole("button", { name: "Show full drop map", exact: true })
    .click();
  await expect(map).toHaveAttribute("viewBox", "0 0 1000 1000");
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  await page.getByText("Daylight", { exact: true }).click();
  await page
    .getByRole("combobox", { name: "Text size", exact: true })
    .selectOption("large");
  await page
    .getByRole("combobox", { name: "Start page", exact: true })
    .selectOption("drops");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await expect(
    page.getByRole("tab", { name: "Drop map", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("saved tournament landings load without changing the original plan", async ({
  page,
}) => {
  await mockMap(page);
  await page.addInitScript(() => {
    if (!localStorage.getItem("compiq-plans-v1"))
      localStorage.setItem(
        "compiq-plans-v1",
        JSON.stringify({
          plans: [
            {
              id: "cup",
              name: "Solo Cup",
              landing: { x: 610, y: 550, label: "Roof" },
            },
          ],
          activeId: "cup",
        }),
      );
  });
  await page.goto("/#drops");
  await page
    .getByLabel("Landing from tournament plan", { exact: true })
    .selectOption("cup");
  await page
    .getByRole("button", { name: "Use plan landing spot", exact: true })
    .click();
  await expect(
    page.getByTestId("drop-target").locator("circle"),
  ).toHaveAttribute("cx", "610");
  await page
    .getByRole("button", { name: "Place landing spot", exact: true })
    .click();
  await place(page, 0.7, 0.5);
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("compiq-plans-v1")).plans[0].landing.x,
    ),
  ).toBe(610);
});

test("map loading can be retried and blocked storage keeps a usable session", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Unavailable", "QuotaExceededError");
    };
  });
  await page.route("**/maps/fortnite-map.png", (route) => route.abort());
  await page.route("https://fortnite-api.com/images/map_en.png", (route) =>
    route.abort(),
  );
  await page.goto("/#drops");
  await expect(
    page.getByRole("button", { name: "Retry drop map", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Browser storage is unavailable/)).toBeVisible();
  await page.getByLabel("Drop notes", { exact: true }).fill("Session notes");
  await page.unroute("**/maps/fortnite-map.png");
  await mockMap(page);
  await page
    .getByRole("button", { name: "Retry drop map", exact: true })
    .click();
  await routeAndTarget(page);
  await expect(page.getByTestId("drop-jump")).toBeVisible();
  await expect(page.getByLabel("Drop notes", { exact: true })).toHaveValue(
    "Session notes",
  );
});
