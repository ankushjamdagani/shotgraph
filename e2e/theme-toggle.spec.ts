import { test, expect } from './fixtures';

test.describe('Theme Toggle (Light: Paper & Dark: Film Lab)', () => {
  test('Projects hub has icon-toggle and toggles between film lab mono and paper light', async ({ page, project }) => {
    await page.goto('/');

    // 1. Verify that the old Theme switcher dropdown is removed
    const oldThemeDropdown = page.locator('button:has-text("Change Studio Theme")');
    await expect(oldThemeDropdown).toHaveCount(0);
    const themeDropdownMenu = page.locator('text="Visual Theme System"');
    await expect(themeDropdownMenu).toHaveCount(0);

    // 2. Verify icon-toggle button exists on Projects Hub
    const toggleBtn = page.getByTestId('theme-toggle');
    await expect(toggleBtn).toBeVisible();

    // 3. Initial theme should be film-lab-mono (dark)
    const rootHasFilmLab = await page.evaluate(() =>
      document.documentElement.classList.contains('theme-film-lab-mono')
    );
    expect(rootHasFilmLab).toBe(true);

    // 4. Click icon-toggle to switch to Paper (light)
    await toggleBtn.click();
    await page.waitForTimeout(200);

    const rootHasPaper = await page.evaluate(() =>
      document.documentElement.classList.contains('theme-paper-ink')
    );
    expect(rootHasPaper).toBe(true);

    const storedTheme = await page.evaluate(() => localStorage.getItem('studio_theme'));
    expect(storedTheme).toBe('paper-ink');

    // 5. Click again to switch back to Film Lab (dark)
    await toggleBtn.click();
    await page.waitForTimeout(200);

    const rootBackToFilmLab = await page.evaluate(() =>
      document.documentElement.classList.contains('theme-film-lab-mono')
    );
    expect(rootBackToFilmLab).toBe(true);

    const storedThemeDark = await page.evaluate(() => localStorage.getItem('studio_theme'));
    expect(storedThemeDark).toBe('film-lab-mono');
  });

  test('Project Settings modal no longer has theme switcher tab', async ({ page, project }) => {
    await page.goto('/');

    await page.goto(`/?projectId=${project.id}`);
    const settingsBtn = page.getByRole('button', {name:/Settings/i}).first();
      // In studio navbar, verify theme toggle is present
      const studioToggle = page.getByTestId('theme-toggle').first();
      await expect(studioToggle).toBeVisible();

      // Open Settings
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Verify "Visual Theme" tab switcher is gone
      const visualThemeTab = page.locator('button:has-text("Visual Theme")');
      await expect(visualThemeTab).toHaveCount(0);

      // Verify remaining settings tabs exist
      await expect(page.locator('button:has-text("General Specs")')).toBeVisible();
      await expect(page.locator('button:has-text("Typography")')).toBeVisible();
      await expect(page.locator('button:has-text("Taste & Style DNA")')).toBeVisible();
  });
});
