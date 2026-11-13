import { z } from 'zod';

/**
 * A2UI (Agent-to-User Interface) Specification
 * Declarative component blueprints rendered natively by the frontend.
 * Guarantees zero arbitrary unvetted code execution while allowing agents
 * to generate dynamic, interactive parameter knobs and inspection panels.
 */

export const A2UIComponentTypeSchema = z.enum([
  'slider_knob',
  'select_option',
  'color_palette_picker',
  'text_refinement_field',
  'comparison_card',
  'prompt_copy_action',
  'media_trimmer_trigger',
  'toggle_switch',
]);
export type A2UIComponentType = z.infer<typeof A2UIComponentTypeSchema>;

// Slider Knob Component (e.g. motion overshoot, duration, cut rhythm)
export const SliderKnobBlueprintSchema = z.object({
  id: z.string(),
  type: z.literal('slider_knob'),
  label: z.string(),
  description: z.string().optional(),
  min: z.number(),
  max: z.number(),
  step: z.number().default(1),
  unit: z.string().optional(), // e.g. "s", "%", "px"
  currentValue: z.number(),
  targetProperty: z.string(), // e.g. "motion.overshoot"
});
export type SliderKnobBlueprint = z.infer<typeof SliderKnobBlueprintSchema>;

// Select Option Component (e.g. Archetype: Liquid Glass vs Pop Bold vs Kinetic Type)
export const SelectOptionBlueprintSchema = z.object({
  id: z.string(),
  type: z.literal('select_option'),
  label: z.string(),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
      description: z.string().optional(),
    })
  ),
  selected: z.string(),
  targetProperty: z.string(),
});
export type SelectOptionBlueprint = z.infer<typeof SelectOptionBlueprintSchema>;

// Color Palette Picker Component
export const ColorPalettePickerBlueprintSchema = z.object({
  id: z.string(),
  type: z.literal('color_palette_picker'),
  label: z.string(),
  colors: z.object({
    background: z.string(),
    card: z.string(),
    accent: z.string(),
    text: z.string(),
  }),
  targetProperty: z.string(),
});
export type ColorPalettePickerBlueprint = z.infer<typeof ColorPalettePickerBlueprintSchema>;

// Prompt Copy Action Blueprint (1-click export for external AI tools)
export const PromptCopyActionBlueprintSchema = z.object({
  id: z.string(),
  type: z.literal('prompt_copy_action'),
  label: z.string(),
  targetPlatform: z.enum(['midjourney', 'flux', 'kling', 'runway', 'elevenlabs', 'generic']),
  generatedPrompt: z.string(),
  injectedStyleSummary: z.string(),
});
export type PromptCopyActionBlueprint = z.infer<typeof PromptCopyActionBlueprintSchema>;

// Union of all declarative A2UI components
export const A2UIComponentBlueprintSchema = z.discriminatedUnion('type', [
  SliderKnobBlueprintSchema,
  SelectOptionBlueprintSchema,
  ColorPalettePickerBlueprintSchema,
  PromptCopyActionBlueprintSchema,
  z.object({
    id: z.string(),
    type: z.literal('text_refinement_field'),
    label: z.string(),
    placeholder: z.string(),
    currentValue: z.string(),
    targetProperty: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('toggle_switch'),
    label: z.string(),
    checked: z.boolean(),
    targetProperty: z.string(),
  }),
  z.object({
    id: z.string(),
    type: z.literal('media_trimmer_trigger'),
    label: z.string(),
    mediaUrl: z.string(),
    currentStartSec: z.number(),
    currentEndSec: z.number(),
    shotDurationSec: z.number(),
  }),
]);
export type A2UIComponentBlueprint = z.infer<typeof A2UIComponentBlueprintSchema>;

// A complete A2UI Blueprint View rendered in an Inspector or Modal
export const A2UIViewSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  components: z.array(A2UIComponentBlueprintSchema),
  agentAuthorId: z.string(),
  updatedAt: z.number(),
});
export type A2UIView = z.infer<typeof A2UIViewSchema>;
