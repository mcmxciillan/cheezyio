import { test, expect } from '@playwright/test';

test('landing page loads and has join button', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/CheezyIO/);
  
  // Target the Submit button explicitly (handling responsive duplicates)
  // Use :visible to ensure we interact with the one shown in current viewport
  const joinButton = page.locator('button[type="submit"] >> visible=true').first();
  await expect(joinButton).toBeVisible();
});

test('can join a game', async ({ page }) => {
  await page.goto('/');
  
  // Fill name
  const nameInput = page.getByPlaceholder('Enter your name');
  await nameInput.fill('E2ETester');
  
  // Click Play (any visible submit button)
  await page.locator('button[type="submit"] >> visible=true').first().click();
  
  // Expect canvas to load
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
  
  // Optional: Check if HUD appears
  await expect(page.locator('text=Score:')).toBeVisible();
});
