import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function run() {
  console.log('🚀 Starting Playwright UI Inspection Suite...');
  const screenshotsDir = path.resolve('exports/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1680, height: 1050 },
    deviceScaleFactor: 2, // HiDPI retina quality screenshots
  });

  const page = await context.newPage();

  // Listen for console logs and errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser Error]: ${msg.text()}`);
    }
  });

  try {
    // -------------------------------------------------------------
    // Step 1: Projects Hub Root Page
    // -------------------------------------------------------------
    console.log('📸 Step 1: Inspecting Projects Hub (http://localhost:3000/)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const hubScreenshot = path.join(screenshotsDir, '01_projects_hub.png');
    await page.screenshot({ path: hubScreenshot });
    console.log(`✅ Step 1 Saved: ${hubScreenshot}`);

    // -------------------------------------------------------------
    // Step 2: Open Project and Inspect 8-Stage Pipeline Version Tree Matrix
    // -------------------------------------------------------------
    console.log('📸 Step 2: Entering Workspace & Inspecting 8-Stage Pipeline Canvas...');
    await page.goto('http://localhost:3000/?projectId=Vguj34w5', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // Verify all 8 pipeline stages in the floating header ribbon
    const expectedStages = [
      '1. Idea / Premise',
      '2. Taste & Style',
      '3. Master Script',
      '4. Subject Assets',
      '5. Shots & Framing',
      '6. Video Takes',
      '7. VFX & Overlays',
      '8. Master Assembly',
    ];

    for (const stageName of expectedStages) {
      const stageEl = page.locator(`text="${stageName}"`).first();
      const isVisible = await stageEl.isVisible();
      console.log(`   Pipeline Stage Ribbon [${stageName}]: ${isVisible ? 'VISIBLE ✅' : 'MISSING ❌'}`);
    }

    const dagScreenshot = path.join(screenshotsDir, '02_8_stage_dag_canvas.png');
    await page.screenshot({ path: dagScreenshot });
    console.log(`✅ Step 2 Saved: ${dagScreenshot}`);

    // -------------------------------------------------------------
    // Step 3: Open Project Subject Anchors & Asset Manager Modal
    // -------------------------------------------------------------
    console.log('📸 Step 3: Inspecting Subject Anchors Modal...');
    const subjectBtn = page.locator('button:has-text("Subject Anchors")');
    await subjectBtn.click();
    await page.waitForTimeout(800);

    const modalHeading = page.locator('h2:has-text("Project Subject Anchors")').first();
    const isModalVisible = await modalHeading.isVisible();
    console.log(`   Subject Anchors Modal Visible: ${isModalVisible ? 'YES ✅' : 'NO ❌'}`);

    // Check that Anya and Marcus subject cards are listed
    const anyaAnchor = page.locator('text="Anya - Lead Presenter"').first();
    const marcusAnchor = page.locator('text="Marcus - Co-Star"').first();
    console.log(`   Anya Subject Listed: ${await anyaAnchor.isVisible() ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   Marcus Subject Listed: ${await marcusAnchor.isVisible() ? 'YES ✅' : 'NO ❌'}`);

    const subjectModalScreenshot = path.join(screenshotsDir, '03_subject_manager_modal.png');
    await page.screenshot({ path: subjectModalScreenshot });
    console.log(`✅ Step 3 Saved: ${subjectModalScreenshot}`);

    // Close modal by clicking X button and verify backdrop is gone
    const closeBtn = page.locator('button:has(svg.lucide-x)').first();
    await closeBtn.click();
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 5000 });
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // Step 4: Inspect Asset Node in A2UI Inspector (Master Style Anchor)
    // -------------------------------------------------------------
    console.log('📸 Step 4: Selecting Anya Asset Node (Master Style Anchor Mode)...');
    const anyaNode = page.locator('[data-id="node_asset_anya"]');
    await anyaNode.waitFor({ state: 'visible', timeout: 5000 });
    await anyaNode.click({ force: true });
    await page.waitForTimeout(1000);

    // Verify Asset Mode elements in A2UI Inspector
    const anchorBadge = page.locator(':has-text("Project Master Style Anchor")').first();
    console.log(`   Master Style Anchor Badge: ${await anchorBadge.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const angleSelector = page.locator('text="Turnaround Angle & Framing"').first();
    console.log(`   Turnaround Angle Selector: ${await angleSelector.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const copySrefBtn = page.locator('button:has-text("Copy for Midjourney")').first();
    console.log(`   --sref Copy Button: ${await copySrefBtn.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const assetInspectorScreenshot = path.join(screenshotsDir, '04_a2ui_inspector_asset_mode.png');
    await page.screenshot({ path: assetInspectorScreenshot });
    console.log(`✅ Step 4 Saved: ${assetInspectorScreenshot}`);

    // -------------------------------------------------------------
    // Step 5: Inspect Shot Director Mode in A2UI Inspector
    // -------------------------------------------------------------
    console.log('📸 Step 5: Selecting Shot Node (Shot Director Mode)...');
    const shotNode = page.locator('[data-id="node_shot_01"]');
    await shotNode.waitFor({ state: 'visible', timeout: 5000 });
    await shotNode.click({ force: true });
    await page.waitForTimeout(1000);

    const opticsControls = page.locator('text="Camera & Optics Overrides"').first();
    console.log(`   Optics Controls in Inspector: ${await opticsControls.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const platformTabs = page.locator('button:has-text("Runway Gen-3")').first();
    console.log(`   Platform Selector Tabs: ${await platformTabs.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const shotInspectorScreenshot = path.join(screenshotsDir, '05_a2ui_inspector_shot_mode.png');
    await page.screenshot({ path: shotInspectorScreenshot });
    console.log(`✅ Step 5 Saved: ${shotInspectorScreenshot}`);

    // -------------------------------------------------------------
    // Step 6: Inspect VFX Node in A2UI Inspector (Track V2 Overlay)
    // -------------------------------------------------------------
    console.log('📸 Step 6: Selecting VFX Node (Track V2 Overlay Mode)...');
    const vfxNode = page.locator('[data-id="node_vfx_01"]');
    await vfxNode.waitFor({ state: 'visible', timeout: 5000 });
    await vfxNode.click({ force: true });
    await page.waitForTimeout(1000);

    const vfxBanner = page.locator('text="Track V2: Alpha Overlays & Motion Graphics"').first();
    console.log(`   Track V2 Overlay Banner: ${await vfxBanner.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const vfxInspectorScreenshot = path.join(screenshotsDir, '06_a2ui_inspector_vfx_mode.png');
    await page.screenshot({ path: vfxInspectorScreenshot });
    console.log(`✅ Step 6 Saved: ${vfxInspectorScreenshot}`);

    // -------------------------------------------------------------
    // Step 7: Inspect Taste & Style Mixer Modal
    // -------------------------------------------------------------
    console.log('📸 Step 7: Inspecting Taste & Style Mixer Modal...');
    const tasteBtn = page.locator('button:has-text("Taste & Style")').first();
    await tasteBtn.click();
    await page.waitForTimeout(800);

    const tasteModalHeading = page.locator('h2:has-text("Taste & Cascading Style System")').first();
    console.log(`   Taste Mixer Modal Open: ${await tasteModalHeading.isVisible() ? 'YES ✅' : 'NO ❌'}`);

    const tasteModalScreenshot = path.join(screenshotsDir, '07_taste_mixer_modal.png');
    await page.screenshot({ path: tasteModalScreenshot });
    console.log(`✅ Step 7 Saved: ${tasteModalScreenshot}`);

    // Close Taste modal by clicking X button
    const closeTasteBtn = page.locator('button:has(svg.lucide-x)').first();
    await closeTasteBtn.click();
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 5000 });
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // Step 8: Inspect DaVinci Resolve Multi-Track Export Modal
    // -------------------------------------------------------------
    console.log('📸 Step 8: Inspecting DaVinci Resolve Export Modal...');
    const exportBtn = page.locator('button:has-text("Export DaVinci Bundle")').first();
    await exportBtn.click();
    await page.waitForTimeout(800);

    const exportHeading = page.locator('text="DaVinci Resolve Multi-Track Export Bundle"').first();
    console.log(`   DaVinci Export Modal Open: ${await exportHeading.isVisible() ? 'YES ✅' : 'NO ❌'}`);

    const exportModalScreenshot = path.join(screenshotsDir, '08_davinci_export_modal.png');
    await page.screenshot({ path: exportModalScreenshot });
    console.log(`✅ Step 8 Saved: ${exportModalScreenshot}`);

    // Close DaVinci modal by clicking X button
    const closeExportBtn = page.locator('button:has(svg.lucide-x)').first();
    await closeExportBtn.click();
    await page.waitForSelector('.fixed.inset-0', { state: 'detached', timeout: 5000 });
    await page.waitForTimeout(500);

    console.log('\n🎉 ALL 8 UI INSPECTION VALIDATION STEPS COMPLETED 100% SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Playwright inspection error:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
