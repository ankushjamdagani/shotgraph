import { toast as sonner, type ExternalToast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastAction = { label: string; onClick: () => void | Promise<void> };

// Compatibility adapter for existing callers; Sonner owns rendering and lifecycle.
function show(message: string, type: ToastType = 'info', title?: string, duration = 3500, action?: ToastAction) {
  const options: ExternalToast = { description: title ? message : undefined, duration: duration > 0 ? duration : Infinity };
  if (action) options.action = { label: action.label, onClick: () => {
    Promise.resolve().then(action.onClick).catch(error => sonner.error((error as Error).message));
  } };
  return sonner[type](title || message, options);
}
export const toast = {
  show,
  success: (message: string, title?: string, duration = 3500, action?: ToastAction) => show(message, 'success', title, duration, action),
  error: (message: string, title?: string, duration = 5000) => show(message, 'error', title, duration),
  info: (message: string, title?: string, duration = 3000) => show(message, 'info', title, duration),
  warning: (message: string, title?: string, duration = 4000) => show(message, 'warning', title, duration),
  dismiss: sonner.dismiss,
};
