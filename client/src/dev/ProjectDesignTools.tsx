import { projectsEmptyVariants, type ProjectsEmptyVariant } from '../components/ui/projects-empty';
import { getPageBackground } from '../components/ui/page-background';
import { startPanelBackgrounds, getStartPanelBackground } from './start-panel-backgrounds';
import { useEffect, useState, type CSSProperties } from 'react';
import { LevaPanel, useControls, useCreateStore, button } from 'leva';
import { SlidersHorizontal, X } from 'lucide-react';
import { IconButton, Tooltip } from '../components/ui';
import {
  type ProjectBackgroundStyles,
} from '../components/ui/page-background';

export default function ProjectDesignTools({
  onChange,
  onEmptyChange,
}: {
  onEmptyChange?: (variant: ProjectsEmptyVariant) => void;
  onChange: (styles: ProjectBackgroundStyles) => void;
}) {
  const [open, setOpen] = useState(false);
  const store = useCreateStore();
  const [values, set] = useControls(
    'Projects · appearance',
    () => ({
      emptyView: { value: 'invitation', options: [...projectsEmptyVariants], label: 'Empty list' },
      leftBackground: { value: '36 · ASCII living meadow' as string, options: [...startPanelBackgrounds], label: 'Left panel' },
      leftMotion: { value: true, label: 'ASCII motion' },
      leftDepth: { value: 34, min: 8, max: 40, step: 1, label: 'Art intensity' },
      colorSpeed: { value: 3, min: 0, max: 8, step: .5, label: 'Color drift' },
      divider: { value: false, label: 'Header divider' },
      Reset: button(() =>
        set({
          emptyView: 'invitation',
          leftBackground: '36 · ASCII living meadow',
          leftDepth: 34,
          colorSpeed: 3,
          leftMotion: true,
          divider: false,
        }),
      ),
    }),
    { store },
  );
  useEffect(() => {
    onChange({
      page: getPageBackground(),
      start: { ...getStartPanelBackground(values.leftBackground, values.leftDepth, values.leftMotion), backgroundColor: 'inherit', '--welcome-color-speed': values.colorSpeed } as CSSProperties,
      panel: {
        background: undefined,
        borderBottomColor: values.divider
          ? 'var(--border-subtle)'
          : 'transparent',
      },
    });
  }, [
    values.leftBackground,
    values.leftDepth,
    values.colorSpeed,
    values.leftMotion,
    values.divider,
    onChange,
  ]);
  useEffect(() => { onEmptyChange?.(values.emptyView as ProjectsEmptyVariant); }, [values.emptyView, onEmptyChange]);
  return (
    <>
      <div className="fixed bottom-5 left-5 z-50 lg:left-10">
        <Tooltip label={open ? 'Hide design controls' : 'Design controls'}>
          <IconButton
            variant="secondary"
            borderTone="subtle"
            label={open ? 'Hide design controls' : 'Design controls'}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <SlidersHorizontal />}
          </IconButton>
        </Tooltip>
      </div>
      <LevaPanel
        store={store}
        hidden={!open}
        titleBar={{ title: 'Projects · Appearance', drag: true }}
        theme={{ sizes: { rootWidth: '310px' } }}
      />
    </>
  );
}
