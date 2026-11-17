import { test, expect } from './fixtures';

test.describe('Genesis Wizard Project Creation Flow', () => {
  test('navigates to /projects/new, preserves state, features infinite arched cards carousel with title-wrapped arrows, custom prompt card, and AI card', async ({
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

    // Verify footer bar has step indicator instead of bulky top progress bar
    const stepDots = page.getByLabel('Project setup progress');
    await expect(stepDots).toBeVisible();

    const titleInput = page.getByLabel(/Project title/i);
    const testTitle = `Test Film ${Date.now()}`;
    await titleInput.fill(testTitle);

    const promptTextarea = page.getByPlaceholder(/A story, a scene, a character/i);
    await promptTextarea.fill('Cinematic cyberpunk chase sequence through neon rain in Neo-Tokyo.');

    // 4. Test State Preservation on Load: Reload page directly at /projects/new
    await page.reload();
    await expect(page).toHaveURL(/\/projects\/new/);
    await expect(page.getByRole('heading', { name: /Start with an idea/i })).toBeVisible();

    // Verify state was preserved on reload
    await expect(page.getByLabel(/Project title/i)).toHaveValue(testTitle);
    await expect(page.getByPlaceholder(/A story, a scene, a character/i)).toHaveValue(
      'Cinematic cyberpunk chase sequence through neon rain in Neo-Tokyo.',
    );

    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/Give your film a format/i)).toBeVisible();

    // Continue to Step 4 (Story Directions)
    await page.getByRole('button', { name: /Generate story directions/i }).click();
    await expect(page.getByText(/Find your story direction/i)).toBeVisible({ timeout: 10000 });

    // Verify Story Deck is rendered as the arched carousel with flanking navigation arrows
    const storyCarousel = page.locator('[role="region"][aria-label="Story directions"]');
    await expect(storyCarousel).toBeVisible();
    await expect(storyCarousel.getByLabel('Previous story direction')).toBeVisible();
    await expect(storyCarousel.getByLabel('Next story direction')).toBeVisible();

    // Verify Custom Direction card is present in the list
    await expect(storyCarousel.getByRole('button', { name: /Custom story direction/i })).toBeVisible();

    // Verify complete story narrative is rendered directly on the cards
    await expect(storyCarousel.getByText(/beats/i).first()).toBeVisible();

    await storyCarousel.getByRole('button', { name: /Custom story direction/i }).click();
    const customStory = page.locator('#custom-story-direction');
    await customStory.pressSequentially('A quiet arrival');
    await expect(customStory).toHaveValue('A quiet arrival');
    await customStory.press('ArrowLeft');
    await customStory.press('X');
    await expect(customStory).toHaveValue('A quiet arrivaXl');
    await storyCarousel.getByRole('button', { name: 'Add direction', exact: true }).click();

    // Select story direction and continue to Step 5 (Mood)
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/Set the mood/i)).toBeVisible();

    // 5. Verify Horizontal List is the Main Focus of Step 5
    const carousel = page.locator('[role="region"][aria-label="Mood"]');
    await expect(carousel).toBeVisible();

    // Verify AI suggested mood card is present in the list
    await expect(carousel.getByRole('button', { name: /Bold & energetic/i })).toBeVisible();

    // Verify Custom Prompt card is present in the list
    await expect(carousel.getByRole('button', { name: /Custom prompt/i })).toBeVisible();

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

    // Select the Custom Prompt card to verify alternate prompt functionality
    const customCard = carousel.getByRole('button', { name: /Custom prompt/i });
    await customCard.click();

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
    await expect(lookCarousel.getByRole('button', { name: /Custom look/i })).toBeVisible();

    // Continue to Step 7 (Review)
    await page.getByRole('button', { name: /Continue/i }).click();
    await expect(page.getByText(/Ready for the studio/i)).toBeVisible();

    // Create project
    await page.getByRole('button', { name: 'Create project', exact: true }).click();

    // 7. Assert successful transition to project editor
    await expect(page).toHaveURL(/\/\?projectId=/);
    await page.waitForTimeout(700);
    await expect(page).toHaveURL(/\/\?projectId=/);
    await expect(page.getByRole('heading', { name: /Ready for the studio/i })).toHaveCount(0);
  });
});

test('waits for the background engine after Format and allows retry', async ({page}) => {
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
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Give your film a format.'})).toBeVisible();
  await page.getByRole('button',{name:'Generate story directions',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Checking the creative engine'})).toBeVisible();
  finishTest();
  await expect(page.getByRole('alert')).toContainText('Engine unavailable');
  await page.getByRole('button',{name:'Retry connection'}).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button',{name:'Generate story directions',exact:true}).click();
  await expect(page.getByRole('region',{name:'Story directions'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();
});

test('direct reload keeps creation visible and exposes compact footer variants', async ({page}) => {
  await page.route('**/api/ai/test-connection', route => route.fulfill({json:{success:true,engine:'antigravity-cli'}}));
  await page.goto('/projects/new');
  await page.getByLabel('Project title', {exact:true}).fill('Reference study');
  await page.getByPlaceholder(/A story, a scene, a character/).fill('Study https://vimeo.com/123456');
  await expect(page.getByRole('list',{name:'Reference links'})).toContainText('vimeo.com');
  for (let i=0;i<3;i++) {
    await page.reload();
    await expect(page.getByRole('heading',{name:'Start with an idea.'})).toBeVisible();
    await expect(page.getByLabel('Project title',{exact:true})).toHaveValue('Reference study');
    await expect(page.getByRole('button',{name:'New Project',exact:true})).toHaveCount(0);
  }
  await page.getByRole('button',{name:'More setup actions'}).click();
  await page.getByRole('menuitem',{name:'Reset setup'}).click();
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button',{name:'Reset setup',exact:true}).click();
  await expect(page.getByLabel('Project title',{exact:true})).toHaveValue('');
  await page.screenshot({path:'audits/2026-11-17-creation-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'audits/2026-11-17-creation-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  await page.evaluate(()=>localStorage.setItem('studio_theme','paper-ink'));
  await page.reload();
  await expect(page.getByRole('heading',{name:'Start with an idea.'})).toBeVisible();
  await page.getByPlaceholder(/A story, a scene, a character/).fill('Lighting study https://vimeo.com/123456');
  await page.screenshot({path:'audits/2026-11-17-creation-mobile-light.png'});
});


test('closing discards the creation draft and reopening starts fresh', async ({page}) => {
  await page.route('**/api/ai/test-connection', route => route.fulfill({json:{success:true,engine:'antigravity-cli'}}));
  await page.goto('/projects/new');
  await page.getByLabel('Project title',{exact:true}).fill('Discard this draft');
  await page.getByPlaceholder(/A story, a scene, a character/).fill('Discard https://example.com/reference');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Close create project'}).click();
  await expect(page).toHaveURL('/');
  expect(await page.evaluate(()=>localStorage.getItem('shotgraph_create_project_draft_v1'))).toBeNull();
  await page.getByRole('button',{name:'New Project',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:'Start with an idea.'})).toBeVisible();
  await expect(page.getByLabel('Project title',{exact:true})).toHaveValue('');
  await expect(page.getByPlaceholder(/A story, a scene, a character/)).toHaveValue('');
  await expect(page.getByRole('list',{name:'Reference links'})).toHaveCount(0);
  await page.getByLabel('Project title',{exact:true}).fill('Escape this draft');
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL('/');
  expect(await page.evaluate(()=>localStorage.getItem('shotgraph_create_project_draft_v1'))).toBeNull();
  await page.goto('/projects/new');
  await expect(page.getByLabel('Project title',{exact:true})).toHaveValue('');
});
