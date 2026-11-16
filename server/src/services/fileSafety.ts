import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const pending = new Map<string, Promise<unknown>>();
export async function serialized<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = pending.get(key) || Promise.resolve();
    const next = previous.catch(() => { }).then(action);
    pending.set(key, next);
    try {
        return await next;
    }
    finally {
        if (pending.get(key) === next)
            pending.delete(key);
    }
}
export async function atomicWrite(file: string, content: string) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
        await fs.writeFile(temporary, content, 'utf8');
        await fs.rename(temporary, file);
    }
    finally {
        await fs.rm(temporary, { force: true }).catch(() => { });
    }
}
export function containedPath(root: string, relative: string) {
    const full = path.resolve(root, relative);
    const rel = path.relative(path.resolve(root), full);
    if (!rel || rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
        throw Object.assign(new Error('Path must stay inside the project'), { statusCode: 403 });
    }
    return full;
}
export async function moveToTrash(file: string) {
    // A failed recoverable delete must leave the file intact on every platform.
    if (process.platform !== 'darwin')
        throw new Error('System Trash is unavailable. Files were kept.');
    const script = 'on run argv\ntell application "Finder" to delete POSIX file (item 1 of argv)\nend run';
    await promisify(execFile)('osascript', ['-e', script, file]);
}
