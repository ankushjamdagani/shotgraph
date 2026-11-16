import { Check, X } from 'lucide-react';
import { Input } from './input';
import { IconButton } from './button';
export function InlineRename({
  value,
  onChange,
  onSave,
  onCancel,
  busy,
  error,
  label = 'Project name',
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string;
  label?: string;
}) {
  return (
    <form
      className="absolute -inset-y-0.5 inset-x-0 flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSave();
      }}
      onBlur={(e) => {
        if (!busy && !e.currentTarget.contains(e.relatedTarget as Node | null))
          onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !busy) {
          e.stopPropagation();
          onCancel();
        }
      }}
    >
      <Input
        autoFocus
        onFocus={(e) => e.currentTarget.select()}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={busy}
        maxLength={200}
        aria-invalid={!!error}
        aria-describedby={error ? 'inline-rename-error' : undefined}
        className="h-7 flex-1 bg-card px-1.5 font-semibold"
      />
      <IconButton
        type="submit"
        label="Save name"
        size="icon-sm"
        loading={busy}
        disabled={!value.trim() || busy}
      >
        <Check />
      </IconButton>
      <IconButton
        label="Cancel rename"
        size="icon-sm"
        disabled={busy}
        onClick={onCancel}
      >
        <X />
      </IconButton>
      {error && (
        <p
          id="inline-rename-error"
          role="alert"
          className="absolute left-0 top-8 z-10 rounded-md bg-surface px-3 py-2 text-xs text-danger shadow-dialog"
        >
          {error}
        </p>
      )}
    </form>
  );
}
