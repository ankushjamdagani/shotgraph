import { test as base, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
export const test = base.extend<{
    project: any;
    scratch: string;
}>({
    request: async ({ playwright, baseURL }, use) => {
        const bootstrap = await playwright.request.newContext({ baseURL });
        const { token } = await (await bootstrap.get('/api/session')).json();
        const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'x-studio-token': token } });
        await use(request);
        await request.dispose();
        await bootstrap.dispose();
    },
    scratch: async ({}, use) => { const root = path.join(process.cwd(), '.tmp-e2e', 'projects', randomUUID()); await fs.mkdir(root, { recursive: true }); await use(root); await fs.rm(root, { recursive: true, force: true }); },
    project: async ({ request, scratch }, use) => {
        const response = await request.post('/api/projects/create', { data: { name: 'Regression film', path: scratch, emptyDAG: false } });
        expect(response.ok()).toBeTruthy();
        const { project } = await response.json();
        await use(project);
        await request.post(`/api/projects/${project.id}/remove`, { data: { moveToTrash: false } });
    },
});
export { expect };
