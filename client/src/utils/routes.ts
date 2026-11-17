/**
 * Shotgraph routing helpers for Studio and Genesis Project Creation flow.
 */

export const isCreateProjectRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  const search = new URLSearchParams(window.location.search);
  return (
    path === '/projects/new' ||
    path === '/new' ||
    search.get('flow') === 'new' ||
    search.get('flow') === 'create' ||
    search.get('route') === 'new' ||
    search.get('route') === 'create'
  );
};

export const navigateToCreateProject = () => {
  if (typeof window === 'undefined') return;
  if (!isCreateProjectRoute()) {
    window.history.pushState({}, '', '/projects/new');
  }
  window.dispatchEvent(
    new CustomEvent('studio:route-change', { detail: { route: 'create' } }),
  );
};

export const navigateToProjectsHub = () => {
  if (typeof window === 'undefined') return;
  window.history.pushState({}, '', '/');
  window.dispatchEvent(
    new CustomEvent('studio:route-change', { detail: { route: 'hub' } }),
  );
};

export const navigateToProject = (projectId: string) => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.pathname = '/';
  url.searchParams.set('projectId', projectId);
  url.searchParams.delete('flow');
  url.searchParams.delete('route');
  window.history.pushState({}, '', url.toString());
  window.dispatchEvent(
    new CustomEvent('studio:route-change', {
      detail: { route: 'editor', projectId },
    }),
  );
};
