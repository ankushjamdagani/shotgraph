import { test, expect } from './fixtures';

test.describe('Genesis Wizard Project Creation Flow', () => {
  test('creates a project with multi-branch variation matrix and navigates to canvas', async ({ page, project }) => {
    // 1. Visit root Projects Hub
    await page.route('**/api/ai/suggest-moods',route=>route.fulfill({json:{success:true,moods:[{key:'calm',title:'Calm',desc:'Calm pacing',isRecommended:true}]}}));
    await page.route('**/api/ai/story-directions',route=>route.fulfill({json:{success:true,directions:[{title:'Neon chase',beats:[{label:'Hook',text:'A runner in neon rain'}]}]}}));
    await page.route('**/api/projects/create',async route=>{const data=route.request().postDataJSON();await route.continue({postData:JSON.stringify({...data,path:project.projectRoot+'/created'})});});
    await page.goto('/');

    // 2. Click "New Project" to open Genesis Room Wizard
    const newProjectBtn = page.getByRole('button', { name: /New Project/i }).first();
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    // 3. Step 1: Vision & Concept
    await expect(page.getByText(/What is your vision for this film/i)).toBeVisible();
    const titleInput = page.getByPlaceholder(/Project Title/i);
    await titleInput.fill(`E2E Test Film ${Date.now()}`);

    const promptTextarea = page.getByPlaceholder(/Describe the story/i);
    await promptTextarea.fill('Cinematic cyberpunk chase sequence through neon rain in Neo-Tokyo with high speed camera tracking.');

    const step1NextBtn = page.getByRole('button', { name: /Next: Delivery Specs/i });
    await step1NextBtn.click();

    // 4. Step 2: Delivery Format & Specs
    await expect(page.getByText(/What delivery format and duration/i)).toBeVisible();
    const step2NextBtn = page.getByRole('button', { name: /Next: Story Mood/i });
    await step2NextBtn.click();

    // 5. Step 3: Emotional Energy & Story Mood
    await expect(page.getByText(/What emotional mood or energy should this film evoke/i)).toBeVisible();
    const step3NextBtn = page.getByRole('button', { name: /Next: AI Model Engine/i });
    await step3NextBtn.click();

    // 6. Step 4: Model Engine & Directives
    await expect(page.getByText(/Which AI model should direct/i)).toBeVisible();
    const step4NextBtn = page.getByRole('button', { name: /Generate Storyboards/i });
    await step4NextBtn.click();

    // 7. Step 5: Story Directions (Wait for ambient generation to display cards)
    await expect(page.getByText(/Which story direction/i)).toBeVisible({ timeout: 10000 });
    const step5NextBtn = page.getByRole('button', { name: /Next: Assign Aesthetic/i });
    await step5NextBtn.click();

    // 8. Step 6: Visual Aesthetic Matrix
    await expect(page.getByText(/What visual aesthetic should define each story branch/i)).toBeVisible();
    const step6NextBtn = page.getByRole('button', { name: /Next: Review Production/i });
    await step6NextBtn.click();

    // 9. Step 7: Review & Start Production
    await expect(page.getByText(/Ready to direct/i)).toBeVisible();
    const startBtn = page.getByRole('button', { name: /Start Production/i });
    await startBtn.click();

    // 10. Assert transition to live spatial canvas
    await expect(page.locator('text=/spatial canvas/i').first()).toBeVisible({ timeout: 15000 });
  });
});
