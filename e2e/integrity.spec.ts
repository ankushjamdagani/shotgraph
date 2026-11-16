import { test, expect } from './fixtures';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
test('unknown IDs do not initialize projects and stale settings are rejected', async ({ request, project }) => {
    const missing = await request.get('/api/projects/does-not-exist-regression');
    expect(missing.status()).toBe(404);
    const save = await request.patch(`/api/projects/${project.id}`, { data: { revision: 0, name: 'Saved', styleOverrides: { palette: { accent: '#00aabb' } }, additionalConstraints: ['Keep subject visible'] } });
    expect(save.ok()).toBeTruthy();
    const reload = await (await request.get(`/api/projects/${project.id}`)).json();
    expect(reload.name).toBe('Saved');
    expect(reload.styleTokens.palette.accent).toBe('#00aabb');
    expect((await request.patch(`/api/projects/${project.id}`, { data: { revision: 0, name: 'Stale' } })).status()).toBe(409);
    expect((await request.patch(`/api/projects/${project.id}`, { data: { targetDurationSec: -1 } })).status()).toBe(400);
});
test('export failure stays an error and sends the visible project', async ({ page, project }) => {
    await page.goto(`/?projectId=${project.id}`);
    await page.getByRole('button', { name: /Export DaVinci/i }).click();
    let body: any;
    await page.route('**/api/export/davinci', async (route) => { body = route.request().postDataJSON(); await route.fulfill({ status: 422, json: { success: false, error: 'Missing footage regression' } }); });
    await page.getByRole('button', { name: 'Export DaVinci Bundle' }).click();
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Missing footage regression');
    expect(body.projectId).toBe(project.id);
    await expect(page.getByText('Export Complete!')).toHaveCount(0);
});
test('settings trap focus, close with Escape, and persist model commands', async ({ page, project, request }) => {
    await page.goto(`/?projectId=${project.id}`);
    const settings = page.getByRole('button', { name: /Settings/i }).first();
    await settings.click();
    const dialog = page.getByRole('dialog', { name: 'Project Settings' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Save Settings' }).focus();
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(settings).toBeFocused();
    await page.keyboard.press('Control+k');
    await expect(page.getByPlaceholder(/Type a command/)).toBeVisible();
    await page.getByText('Switch to Local Ollama', { exact: true }).click();
    await expect.poll(async () => (await (await request.get(`/api/projects/${project.id}`)).json()).nodes[Object.keys(project.nodes)[0]].modelEngine).toBe('ollama');
});
test('mobile has a reachable review flow', async ({ page, project }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?projectId=${project.id}`);
    await expect(page.getByText('Review your active cut here.', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: /1. Scene 1/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
test('real media import, frame-aligned export, and portable bundle', async ({ page, request, project, scratch }) => {
    const source = path.join(scratch, 'source.mp4');
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:r=30:d=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', source]);
    const scene = project.scenes[0];
    const nodeId = project.activeCut[scene.id];
    const imported = await request.post(`/api/projects/${project.id}/nodes/${nodeId}/media?filename=test.mp4&start=0&duration=3`, { headers: { 'Content-Type': 'application/octet-stream' }, data: await fs.readFile(source) });
    expect(imported.ok(), await imported.text()).toBeTruthy();
    const { project: fresh } = await imported.json();
    expect(fresh.nodes[nodeId].artifacts.metadata.waveform.length).toBeGreaterThan(0);
    const playback = await request.get(`/api/projects/${project.id}/media/${fresh.nodes[nodeId].artifacts.mediaUrl}`);
    expect(playback.status()).toBe(200);
    const patch = await request.patch(`/api/projects/${project.id}`, { data: { name: 'Film & "friends"', scenes: [scene], activeCut: { [scene.id]: nodeId } } });
    expect(patch.ok()).toBeTruthy();
    await page.goto(`/?projectId=${project.id}`);
    await expect.poll(() => page.locator('.studio-dock video').evaluate((element: HTMLVideoElement) => element.videoWidth)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Play / Pause (Space)' }).click();
    await expect.poll(() => page.locator('.studio-dock video').evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.2);
    await page.getByRole('button', { name: 'Play / Pause (Space)' }).click();
    const shots = path.join(process.cwd(), 'audits/2026-11-16/after');
    await fs.mkdir(shots, { recursive: true });
    for (const width of [1440, 1024, 390]) {
        await page.setViewportSize({ width, height: 900 });
        await page.screenshot({ path: path.join(shots, `studio-${width}-dark.png`), animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('html')).toHaveClass(/theme-paper-ink/);
    await expect(page.locator('.studio-dock')).toHaveCSS('color', 'rgb(28, 25, 23)');
    await page.screenshot({ path: path.join(shots, 'studio-1440-light.png'), animations: 'disabled' });
    const exported = await request.post('/api/export/davinci', { data: { projectId: project.id, fps: 29.97 } });
    expect(exported.ok(), await exported.text()).toBeTruthy();
    const result = await exported.json();
    const xml = await fs.readFile(path.join(result.bundlePath, 'timeline.fcpxml'), 'utf8');
    expect(xml).toContain('1001/30000s');
    expect(xml).toContain('Film &amp; &quot;friends&quot;');
    execFileSync('python3', ['-c', 'import sys,xml.etree.ElementTree as E; E.fromstring(sys.stdin.read())'], { input: xml });
    const manifest = JSON.parse(await fs.readFile(path.join(result.bundlePath, 'manifest.json'), 'utf8'));
    for (const clip of manifest.clips)
        expect((await fs.stat(path.join(result.bundlePath, clip.relativeFilePath))).size).toBeGreaterThan(1000);
});

test('session and origin guards reject unauthorized mutations',async({playwright,request,project})=>{
 const unauthenticated=await playwright.request.newContext({baseURL:'http://127.0.0.1:3100'});
 expect((await unauthenticated.patch(`/api/projects/${project.id}`,{data:{name:'Unauthorized'}})).status()).toBe(401);
 expect((await request.patch(`/api/projects/${project.id}`,{headers:{Origin:'https://untrusted.example'},data:{name:'Unauthorized'}})).status()).toBe(403);
 await unauthenticated.dispose();
 const style=await request.post(`/api/projects/${project.id}/style/resolve`,{data:{basePresetId:'editorial_grain',styleOverrides:{palette:{accent:'#a84422'}},additionalConstraints:['No flicker']}});expect(style.ok()).toBeTruthy();
 const saved=await(await request.get(`/api/projects/${project.id}`)).json();expect(saved.styleTokens.palette.accent).toBe('#a84422');expect(saved.additionalConstraints).toContain('No flicker');
 const file=path.join(project.projectRoot,'.studio/project.json');const original=await fs.readFile(file,'utf8');
 try{await fs.writeFile(file,'{broken');expect((await request.get(`/api/projects/${project.id}`)).status()).toBe(422);expect(await fs.readFile(file,'utf8')).toBe('{broken');}finally{await fs.writeFile(file,original);}
});
