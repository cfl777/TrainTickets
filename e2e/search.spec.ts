import { expect, test } from "@playwright/test";

test("shows the page heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Train journeys" }),
  ).toBeVisible();
});
