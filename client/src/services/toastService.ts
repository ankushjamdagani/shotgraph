export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

type ToastListener = (toasts: ToastMessage[]) => void;

class ToastService {
  private toasts: ToastMessage[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.toasts]));
  }

  show(message: string, type: ToastType = 'info', title?: string, duration = 3500) {
    const id = Math.random().toString(36).slice(2, 9);
    const toastItem: ToastMessage = { id, type, title, message, duration };
    this.toasts = [...this.toasts, toastItem];
    this.notify();

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }
  }

  success(message: string, title?: string, duration = 3500) {
    this.show(message, 'success', title, duration);
  }

  error(message: string, title?: string, duration = 5000) {
    this.show(message, 'error', title, duration);
  }

  info(message: string, title?: string, duration = 3000) {
    this.show(message, 'info', title, duration);
  }

  warning(message: string, title?: string, duration = 4000) {
    this.show(message, 'warning', title, duration);
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

export const toast = new ToastService();
