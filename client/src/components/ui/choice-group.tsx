import { selectedCardData } from './selection';
import { RadioGroup } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from './cn';
export function ChoiceGroup({ label, value, onChange, options, className }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: {
        value: string;
        label: string;
        description?: string;
    }[];
    className?: string;
}) {
    return <RadioGroup.Root aria-label={label} value={value} onValueChange={onChange} className={cn('grid gap-3 sm:grid-cols-3', className)}>
    {options.map(option => <RadioGroup.Item key={option.value} value={option.value} className={cn(selectedCardData, "relative rounded-thumbnail border border-subtle bg-transparent p-4 text-left text-sm outline-none transition-colors duration-fast hover:bg-hover focus-visible:ring-1 focus-visible:ring-focus focus-visible:ring-offset-1 focus-visible:ring-offset-app ")} >
      <span className="block pr-5 font-medium">{option.label}</span>
      {option.description && <span className="mt-2 block text-xs leading-relaxed text-text-muted">{option.description}</span>}
      <RadioGroup.Indicator className="absolute right-3 top-4"><Check className="size-3.5"/></RadioGroup.Indicator>
    </RadioGroup.Item>)}
  </RadioGroup.Root>;
}
