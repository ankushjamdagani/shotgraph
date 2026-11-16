import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { Button } from './button';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './alert-dialog';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from './dialog';
const meta = {
  title: 'Overlays/Dialogs',
  parameters: {
    docs: {
      description: {
        component:
          'Radix owns focus trapping, Escape, screen-reader semantics, scroll locking, and focus restoration. Alert dialogs focus Cancel first. Prevent default on the action while an async mutation runs; close only after success.',
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Confirmation: Story = {
  render: () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete project</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <div className="p-7">
          <AlertDialogTitle>Move “Summer film” to Trash?</AlertDialogTitle>
          <AlertDialogDescription>
            The project folder, footage, and assets will move to Finder Trash.
            You can restore them until Trash is emptied.
          </AlertDialogDescription>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Move to Trash</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Delete project' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    await expect(body.getByRole('alertdialog')).toBeVisible();
    await expect(body.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveFocus();
  },
};
export const StandardDialog: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary">Project details</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Project details</DialogTitle>
        <DialogDescription>
          Use this pattern for tasks that need their own focused space.
        </DialogDescription>
        <p className="mt-6 text-sm">Summer film · 9:16 · 30 fps</p>
      </DialogContent>
    </Dialog>
  ),
};
