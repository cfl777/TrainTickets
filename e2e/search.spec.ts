// tsconfig.node.json has no DOM lib; the page.evaluate callbacks below need it.
/// <reference lib="dom" />
import { expect, test } from "@playwright/test";

/** Tomorrow as yyyy-mm-dd in this machine's zone; the browser runs in the same zone. */
function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

test("searches from an empty form to a results table", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Train journeys" }),
  ).toBeVisible();

  // The station fields are comboboxes once their chunk has loaded.
  const origin = page.getByRole("combobox", { name: "Origin" });
  await origin.pressSequentially("En");
  await expect(page.getByRole("option", { name: "Enschede" })).toBeVisible();
  await origin.press("ArrowDown");
  await origin.press("Enter");
  await expect(origin).toHaveValue("Enschede");
  const destination = page.getByRole("combobox", { name: "Destination" });
  await destination.fill("Hengelo");
  // While a lookup popup is open the rest of the page is hidden from assistive
  // tech, so role queries cannot see the button until the popup closes.
  await destination.press("Escape");
  await page.getByRole("button", { name: "Search journeys" }).click();

  await expect(page).toHaveURL(/origin=Enschede&destination=Hengelo/);
  await expect(page.getByRole("status")).toHaveText("Searching for journeys");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("2 journeys found");
  await expect(page.getByRole("row")).toHaveCount(3);
  await expect(page).toHaveTitle("Enschede to Hengelo | Train journeys");
  await expect(
    page.getByRole("region", { name: "Search results" }),
  ).toBeFocused();
});

test("shows the field error for an invalid URL and does not search", async ({
  page,
}) => {
  await page.goto(
    "/?origin=Enschede&destination=Hengelo&date=2025-04-20&passengers=2",
  );
  await expect(
    page.getByText("Choose a date from today onwards"),
  ).toBeVisible();
  await expect(page.getByLabel("Travel date")).toBeFocused();
  await expect(page.getByLabel("Travel date")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByRole("combobox", { name: "Origin" })).toHaveValue(
    "Enschede",
  );
  await expect(page.getByRole("status")).toHaveText("");
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("rejects an unknown station under its field and does not search", async ({
  page,
}) => {
  await page.goto("/");
  const origin = page.getByRole("combobox", { name: "Origin" });
  await origin.fill("Zwolle");
  await origin.press("Escape");
  const destination = page.getByRole("combobox", { name: "Destination" });
  await destination.fill("Hengelo");
  await destination.press("Escape");
  await page.getByRole("button", { name: "Search journeys" }).click();

  await expect(page.getByText("Choose a station from the list")).toBeVisible();
  await expect(origin).toBeFocused();
  await expect(origin).toHaveAttribute("aria-invalid", "true");
  await expect(origin).toHaveValue("Zwolle");
  await expect(destination).not.toHaveAttribute("aria-invalid", "true");
  await expect(page).not.toHaveURL(/origin=/);
  await expect(page.getByRole("status")).toHaveText("");
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("shows the unknown-station message for a URL with an unknown origin and does not search", async ({
  page,
}) => {
  await page.goto(
    `/?origin=Zwolle&destination=Hengelo&date=${tomorrow()}&passengers=2`,
  );
  await expect(page.getByText("Choose a station from the list")).toBeVisible();
  const origin = page.getByRole("combobox", { name: "Origin" });
  await expect(origin).toHaveValue("Zwolle");
  await expect(origin).toHaveAttribute("aria-invalid", "true");
  await expect(origin).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("");
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("shows a focused error with a retry when the search fails", async ({
  page,
}) => {
  await page.goto(
    `/?origin=Almelo&destination=Enschede&date=${tomorrow()}&passengers=2`,
  );
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toBeFocused();
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("focuses the first invalid station field when the URL has an error on load", async ({
  page,
}) => {
  await page.goto(
    `/?origin=&destination=Hengelo&date=${tomorrow()}&passengers=2`,
  );
  await expect(page.getByRole("alert")).toHaveText("1 field needs attention");
  await expect(page.getByText("Enter an origin")).toBeVisible();
  // The field is a plain input until the lookup chunk arrives; the focus
  // given to it on load must survive the swap to the combobox.
  const origin = page.getByRole("combobox", { name: "Origin" });
  await expect(origin).toBeFocused();
  await expect(origin).toHaveAttribute("aria-invalid", "true");
});

test("keeps the stub's route line inside the card, also at a large font size", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Train journeys" }),
  ).toBeVisible();
  // Pixels the page scrolls sideways, and pixels the decorative route line
  // runs past the card's right edge; both must stay at or below zero.
  const measure = () =>
    page.evaluate(() => {
      const heading = document.querySelector("search h1");
      const card = heading?.closest("search")?.firstElementChild;
      const route = heading?.nextElementSibling;
      if (!card || !route) {
        throw new Error("ticket stub not found");
      }
      return {
        pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
        routeOverflow:
          route.getBoundingClientRect().right -
          card.getBoundingClientRect().right,
      };
    });

  const normal = await measure();
  expect(normal.pageOverflow).toBeLessThanOrEqual(0);
  expect(normal.routeOverflow).toBeLessThanOrEqual(0);

  // A browser text-size setting scales the root font; 150 % is a common one.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "150%";
  });
  const large = await measure();
  expect(large.pageOverflow).toBeLessThanOrEqual(0);
  expect(large.routeOverflow).toBeLessThanOrEqual(0);
});

test("says what the results are for once a field changes, until the next search", async ({
  page,
}) => {
  await page.goto(
    `/?origin=Enschede&destination=Hengelo&date=${tomorrow()}&passengers=2`,
  );
  await expect(page.getByRole("status")).toHaveText("2 journeys found");

  const destination = page.getByRole("combobox", { name: "Destination" });
  await destination.fill("Almelo");
  await destination.press("Escape");
  await expect(page.getByRole("status")).toHaveText(
    "Results are for Enschede to Hengelo. Search again to update.",
  );
  // The old rows stay readable and the address is untouched until a submit.
  await expect(page.getByRole("row")).toHaveCount(3);
  await expect(page).toHaveURL(/destination=Hengelo/);

  await page.getByRole("button", { name: "Search journeys" }).click();
  await expect(page).toHaveURL(/destination=Almelo/);
  await expect(page.getByRole("status")).toHaveText("2 journeys found");
  await expect(page.getByRole("table")).toHaveAccessibleName(
    /Enschede to Almelo/,
  );
});

test("greys the origin out as a destination and objects at once when it is typed anyway", async ({
  page,
}) => {
  await page.goto("/");
  const origin = page.getByRole("combobox", { name: "Origin" });
  await origin.pressSequentially("En");
  await expect(page.getByRole("option", { name: "Enschede" })).toBeVisible();
  await origin.press("ArrowDown");
  await origin.press("Enter");
  await expect(origin).toHaveValue("Enschede");

  await page.getByRole("button", { name: "Show stations Destination" }).click();
  await expect(
    page.getByRole("option", { name: "Enschede Origin" }),
  ).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByRole("option", { name: "Hengelo" })).toBeVisible();
  await expect(page.getByText("3 stations")).toBeVisible();

  const destination = page.getByRole("combobox", { name: "Destination" });
  await destination.fill("Enschede");
  await destination.press("Escape");
  await expect(
    page.getByText("Destination must differ from origin"),
  ).toBeVisible();
  await expect(destination).toHaveAttribute("aria-invalid", "true");
  // Nothing was submitted: the address is unchanged and the count alert is absent.
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
