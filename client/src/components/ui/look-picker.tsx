import { VisualChoiceList, type VisualListVariant, type VisualChoice } from './visual-choice-list';
import { Input, Label } from './input';
import { cn } from './cn';

export const visualLooks = [
  {
    value: 'Liquid Glass',
    image: '/look-previews/liquid-glass.svg',
    description: 'Translucent layers, cool light and crisp reflections.',
  },
  {
    value: 'Editorial 35mm',
    image: '/look-previews/editorial.jpg',
    description: 'Warm tones, soft highlights and a natural film texture.',
  },
  {
    value: 'Pop Kinetic',
    image: '/look-previews/pop-kinetic.svg',
    description: 'Bold type, saturated color and graphic energy.',
  },
  {
    value: 'Cyber Noir',
    image: '/look-previews/cyber-noir.jpg',
    description: 'Neon light, deep shadows and city atmosphere.',
  },
];

export function LookThumbnail({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const look = visualLooks.find((item) => item.value === value) || visualLooks[0];
  return (
    <img
      src={look.image}
      alt={`${look.value} visual reference`}
      className={cn(
        'rounded-md object-cover',
        look.value === 'Editorial 35mm' && 'sepia-[.35] saturate-75',
        className,
      )}
      loading="lazy"
    />
  );
}

export interface LookPickerProps {
  label: string;
  value: string;
  customLook?: string;
  onChange: (value: string) => void;
  onCustomLookChange?: (value: string) => void;
  variant?: VisualListVariant;
}

export function LookPicker({
  label,
  value,
  customLook = '',
  onChange,
  onCustomLookChange,
  variant = 'Arched fan',
}: LookPickerProps) {
  // Build options array with:
  // 1. Curated visual looks
  // 2. Custom look prompt card
  const options: VisualChoice[] = visualLooks.map((look) => ({
    ...look,
    label: look.value,
    grade: look.value === 'Editorial 35mm' ? 'sepia-[.35] saturate-75' : undefined,
  }));

  // Add Custom Look Card
  options.push({
    value: 'custom',
    label: 'Custom look',
    description: customLook.trim()
      ? customLook
      : 'Specify custom lighting, lenses, color palette, or references',
    isCustom: true,
  });

  const isCustomActive = value === 'custom' || value === 'Custom look';

  const handleChoiceChange = (selectedKey: string) => {
    if (selectedKey === 'custom' || selectedKey === 'Custom look') {
      onChange('Custom look');
    } else {
      onChange(selectedKey);
    }
  };

  const handleCustomTextChange = (text: string) => {
    onCustomLookChange?.(text);
    onChange('Custom look');
  };

  return (
    <div className="space-y-4">
      {/* Main Focus: Horizontal Cards List */}
      <VisualChoiceList
        label={label}
        value={isCustomActive ? 'custom' : value}
        onChange={handleChoiceChange}
        variant={variant}
        options={options}
      />

      {/* Custom Look Input (only when Custom card is selected) */}
      {isCustomActive && (
        <div className="mx-auto max-w-[832px] px-2 sm:px-4">
          <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <Label htmlFor={`look-custom-${label}`} className="text-xs font-medium text-text-primary">
              Your custom visual look prompt
            </Label>
            <Input
              variant="plain"
              id={`look-custom-${label}`}
              value={customLook}
              onChange={(e) => handleCustomTextChange(e.target.value)}
              placeholder="e.g. Anamorphic lens flare, Kodak 500T grain, high-contrast cyan shadows…"
              className="text-xs"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
}
