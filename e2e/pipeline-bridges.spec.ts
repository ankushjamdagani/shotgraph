import { test, expect } from './fixtures';

test.describe('External Production Tool Bridges (DaVinci & Blender)', () => {
  test('opens DaVinci Resolve modal and verifies FCPXML export UI', async ({ page, project }) => {
    await page.goto(`/?projectId=${project.id}`);

    // Find and click Export DaVinci button in the bottom dock
    const davinciBtn = page.getByRole('button', { name: /Export DaVinci/i }).first();
    await expect(davinciBtn).toBeVisible({ timeout: 15000 });
    await davinciBtn.click();

    // Verify DaVinci Modal appears
    await expect(page.getByText(/DaVinci Resolve Multi-Track Export Bundle/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/FCPXML/i).first()).toBeVisible();

    // Close modal with Escape
    await page.keyboard.press('Escape');
  });

  test('generates Blender scene assembly python script via API bridge', async ({ request, project }) => {
    const res = await request.post('/api/export/blender', {
      data: { projectId: project.id },
    });

    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.scriptContent).toContain('import bpy');
    expect(data.scriptContent).toContain('VS_Camera');
    expect(data.cliCommand).toContain('blender -b -P');
  });
});
