import { test, expect } from "@playwright/test";

test("consent banner appears and storefront can reach checkout", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText(/cho phep analytics/i)).toBeVisible();
  await page.getByRole("button", { name: /dong y/i }).click();
  await expect(page.getByText(/cho phep analytics/i)).toHaveCount(0);

  await page.goto("/books");
  await expect(page.getByRole("button", { name: /filter/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /view details/i }).first()).toBeVisible();

  const addButtons = page.getByRole("button", { name: /add to cart/i });
  await addButtons.first().click();

  await page.goto("/checkout");
  await expect(page.getByText(/checkout/i).first()).toBeVisible();
});
