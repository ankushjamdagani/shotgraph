import { test, expect } from '@playwright/test';

test('creation keeps exactly one story through look, review and submission, and closes without hook errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/ai/test-connection', route => route.fulfill({ json: { success: true, engine: 'antigravity-cli' } }));
  await page.route('**/api/ai/story-directions', route => route.fulfill({ json: { success: true, directions: ['First story', 'Second story', 'Third story'].map(title => ({ title, summary: `${title} explores an unexpected encounter.`, story: `${title} follows a traveler whose chance encounter changes what home means to them.` })) } }));
  await page.route('**/api/ai/suggest-moods', route => route.fulfill({ json: { success: true, moods: [] } }));
  let payload: any;
  await page.route('**/api/projects/create', async route => {
    if (route.request().method() !== 'POST') { await route.fulfill({ status: 404, json: {} }); return; }
    payload = route.request().postDataJSON();
    await route.fulfill({ status: 400, json: { error: 'Test stops before writing a project.' } });
  });
  await page.goto('/projects/new');
  await expect(page.getByRole('heading', { name: 'Start with an idea.' })).toBeVisible();
  await page.getByRole('button', { name: 'Close create project' }).click();
  await page.getByRole('button', { name: 'New Project', exact: true }).first().click();
  await page.getByRole('button', { name: 'Generate story directions', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Selected story' })).toHaveCount(1);
  await expect(page.getByRole('heading', {name: 'Second story', exact: true})).toHaveCount(0);
  await page.getByRole('button', {name: 'Next story direction'}).click();
  await expect(page.getByRole('heading', {name: 'Second story', exact: true})).toBeVisible();
  await expect(page.getByRole('radio', { name: /Second story/, checked: true })).toBeVisible();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  await page.getByRole('button', {name: 'Next story direction'}).click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Visual look' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Third story', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'First story', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Second story', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Project title', { exact: true })).toHaveValue('Third story');
  await page.getByLabel('Project folder', { exact: true }).fill('/tmp/review-folder');
  await page.getByRole('radiogroup', { name: 'Format', exact: true }).getByRole('radio', { name: /Square/ }).click();
  await page.getByRole('radiogroup', { name: 'Duration', exact: true }).getByRole('radio', { name: '60 seconds' }).click();
  await page.getByLabel('Custom prompt', { exact: false }).fill('Keep all dialogue in French.');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect.poll(() => payload).toBeTruthy();
  expect(payload.name).toBe('Third story');
  expect(payload.path).toBe('/tmp/review-folder');
  expect(payload.aspectRatio).toBe('1:1');
  expect(payload.targetDurationSec).toBe(60);
  expect(payload.genesisConfig.customSpecs).toBe('Keep all dialogue in French.');
  expect(payload.genesisConfig.branches).toHaveLength(1);
  expect(payload.genesisConfig.branches[0].title).toBe('Third story');
  expect(payload.genesisConfig.branches[0].story).toContain('chance encounter');
  expect(payload.genesisConfig.branches[0]).not.toHaveProperty('beats');
  await expect(page.getByRole('button', { name: 'Reset setup' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close create project' }).click();
  expect(errors).toEqual([]);
});

test('older drafts with multiple stories restore a single visual choice', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('shotgraph_create_project_draft_v1', JSON.stringify({
      currentStep: 6, furthestStep: 7, selectedCards: [2, 1, 3],
      initialVariations: [1, 2, 3].map(id => ({ id, title: `Restored story ${id}`, durationLabel: '30s', beats: [{ label: 'Opening', text: 'A city wakes.' }] })),
    }));
  });
  await page.route('**/api/ai/test-connection', route => route.fulfill({ json: { success: true, engine: 'antigravity-cli' } }));
  await page.goto('/projects/new');
  await expect(page.getByRole('region', { name: 'Visual look' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Restored story 2', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Restored story 1', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Restored story 3', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('radio', { checked: true })).toHaveCount(1);
  await expect(page.getByRole('radio', { name: 'Restored story 2', checked: true })).toBeVisible();
});


test('approved creation defaults retain input and report a duplicate folder in an error toast', async ({ page }) => {
  await page.route('**/api/ai/test-connection', route => route.fulfill({ json: { success: true, engine: 'antigravity-cli' } }));
  await page.route('**/api/projects/create', route => route.fulfill({ status: 409, json: { error: 'A project already exists in the folder. Choose another folder.' } }));
  await page.goto('/projects/new');
  await expect(page.locator('[data-flow-layout]')).toHaveAttribute('data-flow-layout', 'Quiet focus');
  await expect(page.getByLabel('Project setup progress')).toHaveCount(0);
  await expect(page.locator('header').getByText('Shotgraph', { exact: true })).toBeVisible();
  await expect(page.locator('header').getByText('New project', { exact: true })).toHaveCount(0);
  await page.getByPlaceholder(/A story, a scene, a character/).fill('An existing project idea');
  await expect(page.locator('form').getByRole('button', { name: /Create empty project/ })).toHaveCount(0);
  await expect(page.getByRole('radiogroup', { name: 'Format', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /Create empty project/ }).click();
  await expect(page.locator('[data-sonner-toast][data-type="error"]')).toContainText('A project already exists in the folder');
  await expect(page.locator('form')).not.toContainText('A project already exists in the folder');
  await expect(page.getByPlaceholder(/A story, a scene, a character/)).toHaveValue('An existing project idea');
  await expect(page.getByRole('button', { name: /Create empty project/ })).toBeEnabled();
});


test('a manually edited review title survives changing stories and reloading', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('review-title-seeded')) return;
    sessionStorage.setItem('review-title-seeded', 'true');
    localStorage.setItem('shotgraph_create_project_draft_v1', JSON.stringify({
      currentStep: 7, furthestStep: 7, selectedCards: [1], titleEdited: false,
      initialVariations: [1, 2].map(id => ({ id, title: `Story ${id}`, story: 'An unexpected encounter.', beats: [] })),
    }));
  });
  await page.route('**/api/ai/test-connection', route => route.fulfill({ json: { success: true, engine: 'antigravity-cli' } }));
  await page.goto('/projects/new');
  await expect(page.getByLabel('Project title', { exact: true })).toHaveValue('Story 1');
  await page.getByLabel('Project title', { exact: true }).fill('My film');
  await page.getByLabel('Project folder', { exact: true }).fill('/tmp/my-film');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Next story direction' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByLabel('Project title', { exact: true })).toHaveValue('My film');
  await page.reload();
  await expect(page.getByLabel('Project title', { exact: true })).toHaveValue('My film');
  await expect(page.getByLabel('Project folder', { exact: true })).toHaveValue('/tmp/my-film');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Custom prompt', { exact: false }).fill('Keep the original ending.');
  await expect.poll(() => page.locator('[role=dialog]').evaluate(element => ({ scroll: element.scrollTop, bottom: element.querySelector('[data-setup-footer]')!.getBoundingClientRect().bottom }))).toEqual({ scroll: 0, bottom: 844 });
});
