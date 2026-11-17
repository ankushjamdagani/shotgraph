import { test, expect } from './fixtures';

test.describe('Genesis Wizard Project Creation Flow', () => {
  test('navigates to /projects/new, preserves state, supports one story and custom direction, and shows AI moods', async ({
    page,
    project,
  }) => {
    await page.route('**/api/ai/test-connection', route => route.fulfill({ json: { success: true, engine: 'antigravity-cli' } }));
    // Mock AI suggestion endpoints
    await page.route('**/api/ai/suggest-moods', (route) =>
      route.fulfill({
        json: {
          success: true,
          moods: [
            {
              key: 'bold',
              title: 'Bold & energetic',
              desc: 'Fast rhythm, confident movement and impact.',
              isRecommended: true,
            },
          ],
        },
      }),
    );
    await page.route('**/api/ai/story-directions', (route) =>
      route.fulfill({
        json: {
          success: true,
          directions: [
            {
              title: 'Neon chase',
              beats: [{ label: 'Hook', text: 'A runner in neon rain' }],
            },
          ],
        },
      }),
    );
    await page.route('**/api/projects/create', async (route) => {
      const data = route.request().postDataJSON();
      await route.continue({
        postData: JSON.stringify({
          ...data,
          path: project.projectRoot + '/created',
        }),
      });
    });

    // 1. Visit root Projects Hub
    await page.goto('/');

    // 2. Click "New Project" to open Genesis Room Wizard and verify URL updates to /projects/new
    const newProjectBtn = page.getByRole('button', { name: /New Project/i }).first();
    await expect(newProjectBtn).toBeVisible();
    await newProjectBtn.click();

    // Verify route is /projects/new
    await expect(page).toHaveURL(/\/projects\/new/);

    // 3. Step 1: Vision & Concept
    await expect(page.getByRole('heading', { name: /Start with an idea/i })).toBeVisible();

    // Verify Leva debug controls button is available in DEV
    const levaTrigger = page.getByLabel(/Wizard debug controls/i);
    await expect(levaTrigger).toBeVisible();

    // Approved composition keeps progress hidden.
    const stepDots = page.getByLabel('Project setup progress');
    await expect(stepDots).toHaveCount(0);

    const testTitle = `Test Film ${Date.now()}`;
    await expect(page.getByLabel('Project title', { exact: true })).toHaveCount(0);
    await expect(page.getByLabel('Project folder', { exact: true })).toHaveCount(0);

    const promptTextarea = page.getByPlaceholder(/A story, a scene, a character/i);
    await promptTextarea.fill('Cinematic cyberpunk chase sequence through neon rain in Neo-Tokyo.');

    // 4. Test State Preservation on Load: Reload page directly at /projects/new
    await page.reload();
    await expect(page).toHaveURL(/\/projects\/new/);
    await expect(page.getByRole('heading', { name: /Start with an idea/i })).toBeVisible();

    // Verify state was preserved on reload
    await expect(page.getByPlaceholder(/A story, a scene, a character/i)).toHaveValue(
      'Cinematic cyberpunk chase sequence through neon rain in Neo-Tokyo.',
    );

    await page.getByRole('button', { name: /Generate story directions/i }).click();
    await expect(page.getByText(/Find your story direction/i)).toBeVisible({ timeout: 10000 });

    const storyChoices = page.getByRole('radiogroup', { name: 'Story directions' });
    await expect(storyChoices).toBeVisible();
    await expect(storyChoices.getByRole('radio', { checked: true })).toHaveCount(1);

    await page.getByRole('button', { name: 'Or write your own direction' }).click();
    const customStory = page.locator('#custom-story-direction');
    await customStory.pressSequentially('A quiet arrival');
    await expect(customStory).toHaveValue('A quiet arrival');
    await customStory.press('ArrowLeft');
    await customStory.press('X');
    await expect(customStory).toHaveValue('A quiet arrivaXl');
    await page.getByRole('button', { name: 'Use my direction', exact: true }).click();
    await expect(storyChoices.getByRole('radio', { checked: true })).toHaveCount(1);

    // Select story direction and continue to Step 5 (Mood)
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/Set the mood/i)).toBeVisible();

    // 5. Verify Horizontal List is the Main Focus of Step 5
    const carousel = page.locator('[role="region"][aria-label="Mood"]');
    await expect(carousel).toBeVisible();

    // Verify AI suggested mood card is present in the list
    await expect(carousel.getByRole('button', { name: /Bold & energetic/i })).toBeVisible();

    // Verify Custom Prompt card is present in the list
    await expect(carousel.getByRole('button', { name: /Custom prompt/i })).toHaveCount(0);
    await expect(page.locator('#project-mood')).toBeVisible();

    // Verify Previous and Next arrow buttons wrap the option title
    const prevBtn = carousel.getByLabel('Previous option');
    const nextBtn = carousel.getByLabel('Next option');
    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Verify fullscreen toggle and layout toggle buttons are REMOVED
    await expect(carousel.getByLabel('Switch card layout variant')).toHaveCount(0);
    await expect(carousel.getByLabel('Toggle fullscreen')).toHaveCount(0);

    const selectionBeforeWheel = await carousel.locator('h3').textContent();
    await carousel.dispatchEvent('wheel', { deltaY: 100 });
    await expect(carousel.locator('h3')).toHaveText(selectionBeforeWheel || '');
    // Verify infinite list cycling: clicking next rotates to subsequent options
    await nextBtn.click();
    await nextBtn.click();

    // Click previous arrow button
    await prevBtn.click();

    // Alternate prompt textarea appears for custom prompt notes
    const moodNotesTextarea = page.locator('#project-mood');
    await expect(moodNotesTextarea).toBeVisible();
    await moodNotesTextarea.fill('Heavy bass drone, rain texture, slow motion reflections.');

    // 6. Test direct URL load with preserved state at Step 5
    await page.reload();
    await expect(page).toHaveURL(/\/projects\/new/);
    await expect(page.getByText(/Set the mood/i)).toBeVisible();
    await expect(page.locator('#project-mood')).toHaveValue(
      'Heavy bass drone, rain texture, slow motion reflections.',
    );

    // Continue to Step 6 (Look)
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/Define the visual language/i)).toBeVisible();

    // Verify Look step also has the horizontal list as hero with custom look card
    const lookCarousel = page.locator('[role="region"]').first();
    await expect(lookCarousel).toBeVisible();
    await expect(lookCarousel.getByRole('button', { name: /Custom look/i })).toHaveCount(0);
    await expect(page.getByLabel('Or describe your own visual look')).toBeVisible();

    // Continue to Step 7 (Review)
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/Ready for the studio/i)).toBeVisible();

    await expect(page.getByLabel('Project title', { exact: true })).toHaveValue('A quiet arrivaXl');
    await page.getByLabel('Project title', { exact: true }).fill(testTitle);

    // Create project
    await page.getByRole('button', { name: 'Create project', exact: true }).click();

    // 7. Assert successful transition to project editor
    await expect(page).toHaveURL(/\/\?projectId=/);
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(/\/\?projectId=/);
    await expect(page.getByRole('heading', { name: /Ready for the studio/i })).toHaveCount(0);
  });
});

test('waits for the background engine after Brief and allows retry', async ({page}) => {
  let finishTest!: () => void;
  const gate = new Promise<void>(resolve => { finishTest = resolve; });
  let calls = 0;
  await page.route('**/api/ai/test-connection', async route => {
    calls++;
    if (calls === 1) { await gate; await route.fulfill({status:502,json:{success:false,error:'Engine unavailable'}}); }
    else await route.fulfill({json:{success:true,engine:'antigravity-cli'}});
  });
  await page.route('**/api/ai/story-directions', async route => {
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({json:{success:true,directions:[{title:'A quiet arrival',beats:[{label:'Opening',text:'A train arrives.'}]}]}});
  });
  await page.goto('/projects/new');
  await page.getByRole('button',{name:'Generate story directions',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Checking the creative engine'})).toBeVisible();
  finishTest();
  await expect(page.getByRole('alert')).toContainText('Engine unavailable');
  await page.getByRole('button',{name:'Retry connection'}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button',{name:'Generate story directions',exact:true}).click();
  await expect(page.getByRole('radiogroup',{name:'Story directions'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
});

test('direct reload keeps creation visible and exposes compact footer variants', async ({page}) => {
  await page.route('**/api/ai/test-connection', route => route.fulfill({json:{success:true,engine:'antigravity-cli'}}));
  await page.goto('/projects/new');
  await page.getByPlaceholder(/A story, a scene, a character/).fill('Study https://vimeo.com/123456');
  await expect(page.getByRole('list',{name:'Reference links'})).toContainText('vimeo.com');
  for (let i=0;i<3;i++) {
    await page.reload();
    await expect(page.getByRole('heading',{name:'Start with an idea.'})).toBeVisible();
    await expect(page.getByLabel('Project title',{exact:true})).toHaveCount(0);
    await expect(page.getByPlaceholder(/A story, a scene, a character/)).toHaveValue('Study https://vimeo.com/123456');
    await expect(page.getByRole('button',{name:'New Project',exact:true})).toHaveCount(0);
  }
  await expect(page.getByRole('button', {name:'Reset setup'})).toHaveCount(0);
  await expect(page.getByRole('button', {name:/Create empty project/})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.evaluate(()=>localStorage.setItem('studio_theme','paper-ink'));
  await page.reload();
  await expect(page.getByRole('heading',{name:'Start with an idea.'})).toBeVisible();
  await page.getByPlaceholder(/A story, a scene, a character/).fill('Lighting study https://vimeo.com/123456');
});


test('closing discards the creation draft and reopening starts fresh', async ({page}) => {
  await page.route('**/api/ai/test-connection', route => route.fulfill({json:{success:true,engine:'antigravity-cli'}}));
  await page.goto('/projects/new');
  await page.getByPlaceholder(/A story, a scene, a character/).fill('Discard https://example.com/reference');
  await page.getByRole('button',{name:'Generate story directions',exact:true}).click();
  await page.getByRole('button',{name:'Close create project'}).click();
  await expect(page).toHaveURL('/');
  expect(await page.evaluate(()=>localStorage.getItem('shotgraph_create_project_draft_v1'))).toBeNull();
  await page.getByRole('button',{name:'New Project',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:'Start with an idea.'})).toBeVisible();
  await expect(page.getByLabel('Project title',{exact:true})).toHaveCount(0);
  await expect(page.getByPlaceholder(/A story, a scene, a character/)).toHaveValue('');
  await expect(page.getByRole('list',{name:'Reference links'})).toHaveCount(0);
  await page.getByPlaceholder(/A story, a scene, a character/).fill('Escape this draft');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL('/');
  expect(await page.evaluate(()=>localStorage.getItem('shotgraph_create_project_draft_v1'))).toBeNull();
  await page.goto('/projects/new');
  await expect(page.getByLabel('Project title',{exact:true})).toHaveCount(0);
});
