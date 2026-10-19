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

test("shows a focused error with a retry when the search fails", async ({
  page,
}) => {
  await page.goto(
    `/?origin=error&destination=Hengelo&date=${tomorrow()}&passengers=2`,
  );
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toBeFocused();
  await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
