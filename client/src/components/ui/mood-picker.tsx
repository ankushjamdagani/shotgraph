import { VisualChoiceList, type VisualListVariant, type VisualChoice } from './visual-choice-list';
import { getMoodVisual, moodVisuals } from './mood-visuals';
import { Textarea, Label } from './input';
import { Button } from './button';
import { Sparkles } from 'lucide-react';

export const presetMoods = [
  {
    value: 'Calm & reflective',
    label: 'Calm & reflective',
    description: 'Gentle pacing, quiet moments and space to breathe.',
  },
  {
    value: 'Warm & uplifting',
    label: 'Warm & uplifting',
    description: 'Hopeful, human and full of possibility.',
  },
  {
    value: 'Bold & energetic',
    label: 'Bold & energetic',
    description: 'Fast rhythm, confident movement and impact.',
  },
  {
    value: 'Tense & mysterious',
    label: 'Tense & mysterious',
    description: 'Slow reveals, anticipation and uncertainty.',
  },
  {
    value: 'Playful & light',
    label: 'Playful & light',
    description: 'Curiosity, humor and unexpected little moments.',
  },
  {
    value: 'Dreamlike & atmospheric',
    label: 'Dreamlike & atmospheric',
    description: 'Soft transitions, texture and a sense of wonder.',
  },
];

export interface MoodPickerProps {
  value: string;
  customMood?: string;
  onChange: (title: string, description: string) => void;
  onCustomMoodChange?: (text: string) => void;
  suggestion?: { title: string; desc: string };
  loading?: boolean;
  error?: boolean;
  hasIdea?: boolean;
  onRetry?: () => void;
  variant?: VisualListVariant;
}

export function MoodPicker({
  value,
  customMood = '',
  onChange,
  onCustomMoodChange,
  suggestion,
  loading,
  error,
  hasIdea,
  onRetry,
  variant = 'Arched fan',
}: MoodPickerProps) {
  // Build options array with:
  // 1. AI Suggested card (if suggestion exists or loading)
  // 2. Curated Presets
  // 3. Custom Prompt card
  const options: VisualChoice[] = [];

  // 1. AI Suggested Card
  if (suggestion) {
    const visual = getMoodVisual(suggestion.title, suggestion.desc);
    options.push({
      value: suggestion.title,
      label: suggestion.title,
      description: suggestion.desc,
      image: `/look-previews/${visual.image}`,
      grade: visual.grade,
      detail: `${visual.pace} · ${visual.light}`,
      badge: 'AI Suggested',
      isAiSuggested: true,
    });
  } else if (loading) {
    options.push({
      value: 'ai-analyzing',
      label: 'AI Reading Brief…',
      description: 'Extracting mood, pace, and lighting from your story concept…',
      isAiSuggested: true,
    });
  }

  // 2. Curated presets
  presetMoods.forEach((mood, index) => {
    // Avoid exact duplicate title if suggestion matches a preset title
    if (suggestion && mood.value.toLowerCase() === suggestion.title.toLowerCase()) return;
    options.push({
      ...mood,
      image: `/look-previews/${moodVisuals[index].image}`,
      grade: moodVisuals[index].grade,
      detail: `${moodVisuals[index].pace} · ${moodVisuals[index].light}`,
    });
  });

  // 3. Custom Prompt Card
  options.push({
    value: 'custom',
    label: 'Custom prompt',
    description: customMood.trim()
      ? customMood
      : 'Write your own emotional direction, camera pacing, and references',
    isCustom: true,
  });

  const isCustomActive = value === 'custom' || value === 'Custom prompt';

  const handleChoiceChange = (selectedKey: string) => {
    if (selectedKey === 'custom' || selectedKey === 'Custom prompt') {
      onChange('Custom prompt', customMood);
    } else if (suggestion && selectedKey === suggestion.title) {
      onChange(suggestion.title, suggestion.desc);
    } else {
      const found = presetMoods.find((m) => m.value === selectedKey);
      if (found) {
        onChange(found.value, found.description);
      } else {
        onChange(selectedKey, '');
      }
    }
  };

  const handleCustomTextChange = (text: string) => {
    onCustomMoodChange?.(text);
    onChange('Custom prompt', text);
  };

  return (
    <div className="space-y-4">
      {/* AI Suggestion status alert if error or retry available */}
      {hasIdea && !suggestion && !loading && (
        <div className="mx-auto flex max-w-[832px] items-center justify-between gap-3 rounded-lg border border-subtle bg-card/60 px-4 py-2 text-xs text-text-muted">
          <span className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent-primary" />
            {error
              ? 'Could not connect for AI mood suggestions.'
              : 'Want AI to suggest a mood based on your brief?'}
          </span>
          {onRetry && (
            <Button variant="soft" size="sm" onClick={onRetry}>
              {error ? 'Retry AI' : 'Suggest mood'}
            </Button>
          )}
        </div>
      )}

      {/* Main Focus: Horizontal Cards Carousel */}
      <VisualChoiceList
        label="Mood"
        value={isCustomActive ? 'custom' : value}
        variant={variant}
        onChange={handleChoiceChange}
        options={options}
      />

      {/* Custom Input Box at Bottom (only when Custom card is selected) */}
      {isCustomActive && (
        <div className="mx-auto max-w-[832px] px-2 sm:px-4">
          <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <Label htmlFor="project-mood" className="text-xs font-medium text-text-primary">
              Your custom mood prompt
            </Label>
            <Textarea
              variant="plain"
              id="project-mood"
              rows={3}
              value={customMood}
              onChange={(e) => handleCustomTextChange(e.target.value)}
              placeholder="Describe your emotional direction, lighting tone, pacing, or film references…"
              className="text-xs"
              autoFocus
            />
          </div>
        </div>
      )}
    </div>
  );
}
