import type { ReactNode } from 'react';
import { ChoiceGroup } from './choice-group';
import { Label, Textarea } from './input';

export function ProjectSettingsFields({ aspect, onAspectChange, duration, onDurationChange, notes, onNotesChange, references }: {
  aspect: '9:16' | '16:9' | '1:1';
  onAspectChange: (value: '9:16' | '16:9' | '1:1') => void;
  duration: number;
  onDurationChange: (value: number) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  references?: ReactNode;
}) {
  return (
                        <div className="mt-8 space-y-7 border-t border-subtle pt-6">
                        <section className="space-y-3">
                          <h2 className="text-sm font-medium">Format</h2>
                          <ChoiceGroup
                            label="Format"
                            value={aspect}
                            onChange={(v) => onAspectChange(v as typeof aspect)}
                            options={[
                              {
                                value: '9:16',
                                label: 'Portrait · 9:16',
                                description: '1080 × 1920',
                              },
                              {
                                value: '16:9',
                                label: 'Landscape · 16:9',
                                description: '1920 × 1080',
                              },
                              {
                                value: '1:1',
                                label: 'Square · 1:1',
                                description: '1080 × 1080',
                              },
                            ]}
                          />
                        </section>
                        <section className="space-y-3">
                          <h2 className="text-sm font-medium">Duration</h2>
                          <ChoiceGroup
                            label="Duration"
                            value={String(duration)}
                            onChange={(v) => onDurationChange(Number(v))}
                            options={[15, 30, 60].map((n) => ({
                              value: String(n),
                              label: `${n} seconds`,
                            }))}
                          />
                        </section>
                        <div className="space-y-2">
                          <Label htmlFor="project-specs">
                            Custom prompt{' '}
                            <span className="font-normal text-text-muted">
                              (optional)
                            </span>
                          </Label>
                          <Textarea
                            variant="plain"
                            id="project-specs"
                            value={notes}
                            onChange={event => onNotesChange(event.target.value)}
                            rows={3}
                            placeholder="Anything else we should know? Add preferences, context, constraints, or references."
                            aria-describedby="format-notes-help"
                          />
                          {references}
                          <p id="format-notes-help" className="text-xs text-text-muted">
                            Share any extra information or instructions for the project. Format and duration are set separately above.
                          </p>
                        </div>
                        </div>
  );
}
