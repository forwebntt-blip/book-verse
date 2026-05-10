import type { Page } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  await page.goto("/login?returnTo=%2Fadmin");
  await page.locator('input[type="email"]').fill("admin@bookverse.local");
  await page.locator('input[type="password"]').fill("Admin@123456");
  await page.locator('button[type="submit"]').click();
}
