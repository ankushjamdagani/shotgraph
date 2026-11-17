import { Toaster as SonnerToaster } from 'sonner';
/** Shared Sonner setup for the application and Storybook. */
export function Toaster() {
  return <SonnerToaster position="bottom-right" closeButton visibleToasts={3} offset={24} mobileOffset={16} toastOptions={{
    style: {background:'var(--bg-surface)',color:'var(--text-primary)',borderColor:'var(--border-subtle)',borderRadius:'var(--radius-dialog)',boxShadow:'var(--shadow-preview)',fontFamily:'inherit'},
  }}/>;
}
