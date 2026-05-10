import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("admin orders and analytics pages render after login", async ({ page }) => {
  await loginAsAdmin(page);

  await page.waitForURL(/\/admin/);

  await page.goto("/admin/orders");
  await expect(page.getByText(/order operations/i)).toBeVisible();
  await expect(page.getByText(/order list/i)).toBeVisible();

  await page.goto("/admin/analytics");
  await expect(page.getByText(/analytics dashboard/i)).toBeVisible();
  await expect(page.getByText(/homepage to purchase/i)).toBeVisible();
});
