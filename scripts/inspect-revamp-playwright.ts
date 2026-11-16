import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function run() {
  console.log('🚀 Running Comprehensive UI & Theme Revamp Playwright Validation Suite...');
  const screenshotsDir = path.resolve('exports/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const artifactDir = process.env.ARTIFACT_DIR || null;
  if (artifactDir && !fs.existsSync(artifactDir)) {
    fs.mkdirSync(artifactDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1720, height: 1080 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`[Browser Console Error]: ${msg.text()}`);
    }
  });

  const saveShot = async (filename: string) => {
    const p1 = path.join(screenshotsDir, filename);
    await page.screenshot({ path: p1 });
    if (artifactDir && artifactDir !== screenshotsDir) {
      fs.copyFileSync(p1, path.join(artifactDir, filename));
    }
    console.log(`   📸 Saved screenshot: ${filename}`);
  };

  try {
    // -------------------------------------------------------------
    // Step 1: Projects Hub with Theme Customizer
    // -------------------------------------------------------------
    console.log('📸 Step 1: Projects Hub (Root Page with Theme Customizer)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const themeSelect = page.locator('select').first();
    console.log(`   Theme selector on Projects Hub: ${await themeSelect.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);
    await saveShot('01_projects_hub_dark.png');

    // Switch theme to Pure High-Density Mono on Projects Hub
    console.log('   Switching theme to "film-lab-mono" on Projects Hub...');
    await themeSelect.selectOption('film-lab-mono');
    await page.waitForTimeout(600);
    await saveShot('01_projects_hub_mono.png');

    // Switch back to studio-dark
    await themeSelect.selectOption('studio-dark');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 1b: Test Project Deletion Modal (System Trash Option)
    // -------------------------------------------------------------
    console.log('📸 Step 1b: Testing Project Delete Confirmation Dialog (System Trash vs Unlist)...');
    const firstProjectCard = page.locator('.group.relative.flex.flex-col').first();
    if (await firstProjectCard.isVisible()) {
      await firstProjectCard.hover();
      await page.waitForTimeout(300);
      const projectCardDeleteBtn = firstProjectCard.locator('button[title="Delete or remove project"]');
      console.log(`   Delete Project Button on card: ${await projectCardDeleteBtn.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);
      await projectCardDeleteBtn.click();
      await page.waitForTimeout(600);
      const projectDeleteModalHeader = page.getByText('Delete / Remove Project').first();
      console.log(`   Project Delete Dialog Header: ${await projectDeleteModalHeader.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);
      const trashSystemOption = page.getByText('Delete from System (Move to Trash)').first();
      console.log(`   Delete from System Option: ${await trashSystemOption.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);
      await saveShot('14_project_delete_modal.png');
      // Cancel to avoid deleting test project
      const cancelBtn = page.getByRole('button', { name: 'Cancel' }).last();
      await cancelBtn.click();
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // Step 2: Open New Project Wizard
    // -------------------------------------------------------------
    console.log('📸 Step 2: Opening New Project Wizard with Stage 1 Ideation input...');
    const newProjBtn = page.getByRole('button', { name: /New Project/i }).first();
    await newProjBtn.click();
    await page.waitForTimeout(600);

    const ideaInput = page.getByPlaceholder(/Describe the story premise/i).first();
    console.log(`   Stage 1 Ideation Concept Textarea: ${await ideaInput.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);
    await saveShot('02_new_project_wizard_ideation.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 3: Open Project with Full 8-Stage DAG Lineage
    // -------------------------------------------------------------
    console.log('📸 Step 3: Loading Project 5Fci78IA (Full 8-Stage Lineage)...');
    await page.goto('http://localhost:3000/?projectId=5Fci78IA', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await saveShot('03_spatial_canvas_8stage_dag.png');

    // -------------------------------------------------------------
    // Step 4: Click Idea Concept Node -> IdeaFloatingHud
    // -------------------------------------------------------------
    console.log('📸 Step 4: Opening Stage 1 Idea Floating HUD...');
    const ideaNode = page.locator('.react-flow__node').filter({ hasText: 'Idea Concept & Thesis' }).first();
    console.log(`   Idea Node found: ${await ideaNode.isVisible() ? 'YES ✅' : 'NO ❌'}`);
    await ideaNode.click();
    await page.waitForTimeout(600);

    const ideaHudHeader = page.getByText('Creative Ideation & Premise HUD').first();
    console.log(`   Idea Floating HUD: ${await ideaHudHeader.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);
    await saveShot('04_idea_floating_hud.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 5: Click Taste DNA Node -> TasteFloatingHud
    // -------------------------------------------------------------
    console.log('📸 Step 5: Opening Stage 2 Director Taste DNA HUD...');
    const tasteNode = page.locator('.react-flow__node').filter({ hasText: 'Visual Identity & Film DNA' }).first();
    console.log(`   Taste Node found: ${await tasteNode.isVisible() ? 'YES ✅' : 'NO ❌'}`);
    await tasteNode.click();
    await page.waitForTimeout(600);

    const tasteHudHeader = page.getByText('Director Taste & Style DNA HUD').first();
    console.log(`   Taste Floating HUD: ${await tasteHudHeader.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);
    await saveShot('05_taste_floating_hud.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 6: Click Asset Node -> AssetFloatingHud
    // -------------------------------------------------------------
    console.log('📸 Step 6: Opening Stage 4 Asset Floating HUD...');
    const assetNode = page.locator('.react-flow__node').filter({ hasText: 'Lead Presenter (Style Anchor)' }).first();
    await assetNode.click();
    await page.waitForTimeout(600);
    await saveShot('06_asset_floating_hud.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 7: Click Shot Node -> ShotFloatingHud
    // -------------------------------------------------------------
    console.log('📸 Step 7: Opening Stage 5 Shot Director HUD...');
    const shotNode = page.locator('.react-flow__node').filter({ hasText: 'Shot 1.1: Slow Push-In Z' }).first();
    await shotNode.click();
    await page.waitForTimeout(600);
    await saveShot('07_shot_floating_hud.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 8: Click Footage Take Node -> TakeFloatingHud
    // -------------------------------------------------------------
    console.log('📸 Step 8: Opening Stage 6 Video Take HUD...');
    const footageNode = page.locator('.react-flow__node').filter({ hasText: 'Take 1: Runway Gen-3 4K' }).first();
    await footageNode.click();
    await page.waitForTimeout(600);
    await saveShot('08_take_floating_hud.png');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // Step 9: Open Taste & Style Mixer Modal
    // -------------------------------------------------------------
    console.log('📸 Step 9: Opening Taste Mixer Modal...');
    const styleBtn = page.getByRole('button', { name: /Taste & Style/i }).first();
    console.log(`   Taste & Style button visible: ${await styleBtn.isVisible() ? 'YES ✅' : 'NO ❌'}`);
    if (await styleBtn.isVisible()) {
      await styleBtn.click();
      await page.waitForTimeout(600);
      await saveShot('09_taste_mixer_modal.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // Step 10: Open Subject Manager Modal
    // -------------------------------------------------------------
    console.log('📸 Step 10: Opening Subject Manager Modal...');
    const subjectBtn = page.getByRole('button', { name: /Subject Anchors/i }).first();
    console.log(`   Subject Anchors button visible: ${await subjectBtn.isVisible() ? 'YES ✅' : 'NO ❌'}`);
    if (await subjectBtn.isVisible()) {
      await subjectBtn.click();
      await page.waitForTimeout(600);
      await saveShot('10_subject_manager_modal.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // Step 11: Open DaVinci Export Modal
    // -------------------------------------------------------------
    console.log('📸 Step 11: Opening DaVinci Export Modal...');
    const exportBtn = page.getByRole('button', { name: /Export DaVinci Bundle/i }).first();
    console.log(`   Export DaVinci button visible: ${await exportBtn.isVisible() ? 'YES ✅' : 'NO ❌'}`);
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
      await page.waitForTimeout(600);
      await saveShot('11_davinci_export_modal.png');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // Step 12: Switch Themes in Workspace and capture High-Density Mono & Midnight Navy
    // -------------------------------------------------------------
    console.log('📸 Step 12: Testing Studio Theme Switcher in Workspace...');
    const workspaceThemeSelect = page.locator('header select').first();
    await workspaceThemeSelect.selectOption('film-lab-mono');
    await page.waitForTimeout(600);
    await saveShot('12_workspace_film_lab_mono.png');

    await workspaceThemeSelect.selectOption('midnight-navy');
    await page.waitForTimeout(600);
    await saveShot('13_workspace_midnight_navy.png');

    // -------------------------------------------------------------
    // Step 13: Test Canvas Node Deletion Modal (System Trash Option)
    // -------------------------------------------------------------
    console.log('📸 Step 13: Testing Node Deletion Dialog on Canvas (Delete from System vs Unlink)...');
    const nodeCard = page.locator('.group.relative.w-72').first();
    await nodeCard.hover({ position: { x: 100, y: 50 } });
    await page.waitForTimeout(400);

    const deleteNodeBtn = page.locator('button[title="Delete node"]').first();
    console.log(`   Delete Node Button on node: ${await deleteNodeBtn.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);
    if (await deleteNodeBtn.isVisible()) {
      await deleteNodeBtn.click();
    } else {
      // Dispatch click directly
      await deleteNodeBtn.click({ force: true });
    }
    await page.waitForTimeout(600);

    const nodeDeleteModalHeader = page.getByText('Delete Node Version').first();
    console.log(`   Node Delete Dialog Header: ${await nodeDeleteModalHeader.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const systemTrashChoice = page.getByText('Delete from System as Well (Move to Trash)').first();
    console.log(`   Node System Trash Option: ${await systemTrashChoice.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    const dagOnlyChoice = page.getByText('Remove Node from DAG Only').first();
    console.log(`   Node Remove DAG Only Option: ${await dagOnlyChoice.isVisible() ? 'VISIBLE ✅' : 'MISSING ❌'}`);

    await saveShot('15_node_delete_modal.png');

    // Cancel to keep the test project intact
    const cancelNodeDeleteBtn = page.getByRole('button', { name: 'Cancel' }).last();
    await cancelNodeDeleteBtn.click();
    await page.waitForTimeout(400);

    console.log('🎉 Comprehensive UI & Theme Revamp Playwright Validation Suite Completed Successfully!');
  } catch (err) {
    console.error('❌ Validation Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
