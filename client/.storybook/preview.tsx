import { useEffect } from 'react';
import type { Preview } from '@storybook/react-vite';
import { Toaster } from 'sonner';
import { TooltipProvider } from '../src/components/ui';
import '../src/index.css';
const preview: Preview = {
  tags: ['autodocs'],
  globalTypes: {
    theme: {
      description: 'Studio theme',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Paper & Ink' },
          { value: 'dark', title: 'Film Lab' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    a11y: { test: 'error' },
  },
  decorators: [
    (Story, context) => {
      const theme =
        context.globals.theme === 'dark' ? 'film-lab-mono' : 'paper-ink';
      useEffect(() => {
        document.documentElement.classList.remove(
          'theme-film-lab-mono',
          'theme-paper-ink',
        );
        document.documentElement.classList.add(`theme-${theme}`);
      }, [theme]);
      return (
        <TooltipProvider delayDuration={300}>
          <div className="w-full bg-app p-6 font-sans text-text-primary">
            <Story />
          </div>
          <Toaster
            position="bottom-right"
            closeButton
            toastOptions={{
              style: {
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-subtle)',
              },
            }}
          />
        </TooltipProvider>
      );
    },
  ],
};
export default preview;
