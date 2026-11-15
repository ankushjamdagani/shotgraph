import { test, expect } from '@playwright/test';

test.describe('Spatial Director Canvas & Composable DAG', () => {
  test('renders canvas nodes, allows selection, and displays playback dock', async ({ page }) => {
    // 1. Navigate to workspace canvas with known project Vguj34w5
    await page.goto('/?projectId=Vguj34w5');

    // 2. Assert Spatial Canvas header and node count pill
    const canvasPill = page.locator('text=/spatial canvas/i').first();
    await expect(canvasPill).toBeVisible({ timeout: 15000 });

    const beautifyBtn = page.getByRole('button', { name: /Beautify Flow/i }).first();
    await expect(beautifyBtn).toBeVisible();

    // 3. Assert React Flow nodes are rendered on canvas
    const flowNodes = page.locator('.react-flow__node');
    await expect(flowNodes.first()).toBeVisible({ timeout: 10000 });
    const count = await flowNodes.count();
    expect(count).toBeGreaterThan(0);

    // 4. Click a node to select it
    await flowNodes.first().click();

    // 5. Assert Bottom Playback Dock exists with SMPTE timecode
    const dockTimecode = page.locator('text=/00:00:00/').first();
    await expect(dockTimecode).toBeVisible();

    // 6. Assert Blender and DaVinci export buttons are present in dock
    const davinciBtn = page.getByRole('button', { name: /Export DaVinci/i }).first();
    await expect(davinciBtn).toBeVisible();

    const blenderBtn = page.getByRole('button', { name: /Blender/i }).first();
    await expect(blenderBtn).toBeVisible();
  });
});
