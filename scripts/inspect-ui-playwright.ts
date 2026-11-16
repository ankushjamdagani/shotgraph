import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function run() {
  console.log('🚀 Starting Playwright UI Inspection Suite for Canvas-Native Studio Revamp...');
  const screenshotsDir = path.resolve('exports/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const artifactDir = process.env.ARTIFACT_DIR || null;
  if (artifactDir && !fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1720, height: 1080 },
    deviceScaleFactor: 2, // HiDPI retina quality
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser Error]: ${msg.text()}`);
    }
  });

  const saveBoth = async (filename: string) => {
    const p1 = path.join(screenshotsDir, filename);
    await page.screenshot({ path: p1 });
    if (artifactDir && artifactDir !== screenshotsDir) {
      fs.copyFileSync(p1, path.join(artifactDir, filename));
    }
    console.log(`   📸 Saved screenshot: ${filename}`);
  };

  try {
    // -------------------------------------------------------------
    // Step 1: Projects Hub
    // -------------------------------------------------------------
    console.log('📸 Step 1: Inspecting Projects Hub (http://localhost:3000/)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await saveBoth('01_projects_hub.png');

    // -------------------------------------------------------------
    // Step 2: Open Project and Inspect Spatial Canvas
    // -------------------------------------------------------------
    console.log('📸 Step 2: Entering Workspace & Inspecting Spatial Director Canvas...');
    await page.goto('http://localhost:3000/?projectId=Vguj34w5', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Verify top mini-nav strip
    const canvasPill = page.locator('text=/spatial canvas/i').first();
    console.log(`   Spatial Canvas Indicator: ${await canvasPill.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const beautifyBtn = page.getByRole('button', { name: /Beautify Flow/i }).first();
    console.log(`   Beautify Flow Button: ${await beautifyBtn.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    // Verify Bottom Playback Dock
    const dockTimecode = page.locator('text=/00:00:00/').first();
    console.log(`   Bottom Playback Dock Timecode: ${await dockTimecode.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    await saveBoth('02_spatial_canvas_overview.png');

    // -------------------------------------------------------------
    // Step 3: Hover over Anya Asset Node to reveal Action Toolbar
    // -------------------------------------------------------------
    console.log('📸 Step 3: Hovering over Anya Asset Node...');
    const anyaNode = page.locator('.react-flow__node').filter({ hasText: 'Anya Turnaround' }).first();
    await anyaNode.hover();
    await page.waitForTimeout(600);
    await saveBoth('03_node_hover_toolbar.png');

    // -------------------------------------------------------------
    // Step 4: Open Asset Floating HUD
    // -------------------------------------------------------------
    console.log('📸 Step 4: Opening Asset Floating HUD...');
    await anyaNode.click();
    await page.waitForTimeout(600);

    const assetHudTitle = page.getByText('Asset & Character HUD').first();
    console.log(`   Asset Floating HUD Header: ${await assetHudTitle.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const srefBox = page.getByText('--sref ACTIVE').first();
    console.log(`   Midjourney --sref prompt badge: ${await srefBox.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    await saveBoth('04_asset_floating_hud.png');

    // Close HUD with Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 5: Open Script Floating HUD
    // -------------------------------------------------------------
    console.log('📸 Step 5: Opening Script Floating HUD...');
    const scriptNode = page.locator('.react-flow__node').filter({ hasText: 'Scene 1: The Hook Script' }).first();
    await scriptNode.click();
    await page.waitForTimeout(600);

    const scriptHudTitle = page.getByText('Screenplay & Voiceover HUD').first();
    console.log(`   Script Floating HUD Header: ${await scriptHudTitle.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const kokoroBtn = page.getByRole('button', { name: /Generate Voice/i }).first();
    console.log(`   Kokoro TTS Button: ${await kokoroBtn.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    await saveBoth('05_script_floating_hud.png');

    // Close HUD with Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 6: Open Shot Floating HUD (Camera Trajectory & Optics)
    // -------------------------------------------------------------
    console.log('📸 Step 6: Opening Shot Director Floating HUD...');
    const shotNode = page.locator('.react-flow__node').filter({ hasText: 'Shot 1.1: Slow Push-in Medium' }).first();
    await shotNode.click();
    await page.waitForTimeout(600);

    const shotHudTitle = page.getByText('Shot Director & Optics HUD').first();
    console.log(`   Shot Director Floating HUD Header: ${await shotHudTitle.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const pushInTrajectory = page.getByRole('button', { name: /Push-In Z/i }).first();
    console.log(`   Push-in Z Trajectory Preset: ${await pushInTrajectory.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    await saveBoth('06_shot_floating_hud.png');

    // Close HUD with Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 7: Open Take Floating HUD (Video Review & Star Cut)
    // -------------------------------------------------------------
    console.log('📸 Step 7: Opening Take Review Floating HUD...');
    const takeNode = page.locator('.react-flow__node').filter({ hasText: 'Take 1: Runway Gen-3' }).first();
    await takeNode.click();
    await page.waitForTimeout(600);

    const takeHudTitle = page.getByText('Video Take Review HUD').first();
    console.log(`   Video Take Review HUD Header: ${await takeHudTitle.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const starBtn = page.getByRole('button', { name: /Active Cut/i }).first();
    console.log(`   Star Active Cut Button: ${await starBtn.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    await saveBoth('07_take_floating_hud.png');

    // Close HUD with Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 8: Open Composition Floating HUD (Multi-Track)
    // -------------------------------------------------------------
    console.log('📸 Step 8: Opening Composition Floating HUD...');
    const assemblyNode = page.locator('.react-flow__node').filter({ hasText: 'Scene 1 Active Assembly' }).first();
    await assemblyNode.click();
    await page.waitForTimeout(600);

    const compHudTitle = page.getByText('Composition & Timeline HUD').first();
    console.log(`   Composition Floating HUD Header: ${await compHudTitle.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const trackV2 = page.getByText('Track V2: Alpha Overlays').first();
    console.log(`   Track V2 Channel Strip: ${await trackV2.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    await saveBoth('08_composition_floating_hud.png');

    // -------------------------------------------------------------
    // Step 9: Open DaVinci Resolve Export Modal
    // -------------------------------------------------------------
    console.log('📸 Step 9: Opening DaVinci Export Modal...');
    const exportBtn = page.getByRole('button', { name: /Export DaVinci Resolve Bundle/i }).first();
    await exportBtn.click();
    await page.waitForTimeout(800);

    const modalTitle = page.getByText('DaVinci Resolve Multi-Track Export Bundle').first();
    console.log(`   DaVinci Modal Heading: ${await modalTitle.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    await saveBoth('09_davinci_export_modal.png');

    // Close modal with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // -------------------------------------------------------------
    // Step 10: Toggle Scrubber Dock Expanded View
    // -------------------------------------------------------------
    console.log('📸 Step 10: Testing Bottom Scrubber Playback...');
    // Hit space to toggle playback
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);

    // Expand bottom tracks
    const tracksToggle = page.getByRole('button', { name: /Tracks/i }).first();
    if (await tracksToggle.isVisible()) {
      await tracksToggle.click();
      await page.waitForTimeout(600);
    }
    await saveBoth('10_bottom_playback_dock.png');

    console.log('🎉 Playwright UI Inspection Suite Completed Successfully!');
  } catch (error) {
    console.error('❌ Playwright Inspection Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
