import { toast } from './toastService';
const revisions = new Map<string, number>();
let tokenPromise: Promise<string> | null = null;
export function sessionToken(): Promise<string> {
    return tokenPromise ||= fetch('/api/session').then(async (response) => {
        if (!response.ok)
            throw new Error('Studio service is unavailable');
        return (await response.json()).token;
    }).catch(error => { tokenPromise = null; throw error; });
}
/** Same-origin transport with a per-server session token for mutations. */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
    const url = input.replace('http://localhost:3030', '');
    const headers = new Headers(init.headers);
    if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase()))
        headers.set('x-studio-token', await sessionToken());
    let projectId = url.match(/\/api\/projects\/([^/?]+)/)?.[1];
    if (init.body && typeof init.body === 'string') {
        try {
            projectId ||= JSON.parse(init.body).projectId;
        }
        catch { }
    }
    if (projectId && revisions.has(projectId) && init.method)
        headers.set('x-project-revision', String(revisions.get(projectId)));
    const response = await fetch(url, { ...init, headers });
    if (response.status === 401)
        tokenPromise = null;
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (init.method) {
            toast.error(data.error || 'Changes could not be saved');
            if (projectId) {
                const current = await fetch(`/api/projects/${projectId}`).then(r => r.ok ? r.json() : null).catch(() => null);
                if (current?.id) {
                    revisions.set(current.id, current.revision || 0);
                    window.dispatchEvent(new CustomEvent('studio:project-saved', { detail: current }));
                }
            }
        }
        throw new Error(data.error || `Request failed (${response.status})`);
    }
    if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.clone().json().catch(() => null);
        const project = data?.project || (data?.id && data?.nodes ? data : null);
        if (project)
            revisions.set(project.id, project.revision || 0);
    }
    if (init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase()) && response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.clone().json().catch(() => null);
        if (result?.project)
            window.dispatchEvent(new CustomEvent('studio:project-saved', { detail: result.project }));
    }
    return response;
}
export async function apiJson<T = any>(url: string, init?: RequestInit): Promise<T> {
    const response = await apiFetch(url, init);
    const data = await response.json();
    if (!response.ok || data.success === false)
        throw new Error(data.error || `Request failed (${response.status})`);
    return data;
}
