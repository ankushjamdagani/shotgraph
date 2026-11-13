import React, { useEffect, useState } from 'react';
import { toast, ToastMessage } from '../../services/toastService.js';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toast.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const borderClass =
          t.type === 'success'
            ? 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200'
            : t.type === 'error'
            ? 'border-red-500/40 bg-red-950/85 text-red-200'
            : t.type === 'warning'
            ? 'border-amber-500/40 bg-amber-950/80 text-amber-200'
            : 'border-subtle bg-surface/90 text-text-primary';

        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
            ? AlertCircle
            : t.type === 'warning'
            ? AlertTriangle
            : Info;

        const iconColor =
          t.type === 'success'
            ? 'text-emerald-400'
            : t.type === 'error'
            ? 'text-red-400'
            : t.type === 'warning'
            ? 'text-amber-400'
            : 'text-accent-primary';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start gap-3 animate-slide-up transition-all ${borderClass}`}
          >
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${iconColor}`} />
            <div className="flex-1 min-w-0">
              {t.title && <div className="text-xs font-bold leading-tight truncate">{t.title}</div>}
              <div className="text-xs opacity-90 leading-snug">{t.message}</div>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/10 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
