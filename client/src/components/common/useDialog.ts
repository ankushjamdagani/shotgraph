import { useEffect, useRef } from 'react';

export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (!dialog.getAttribute('aria-label')) dialog.setAttribute('aria-label', dialog.querySelector('h1,h2,h3')?.textContent || 'Studio dialog');
    dialog.tabIndex = -1;
    const inertNodes:Array<[HTMLElement,boolean]> = [];
    let branch:HTMLElement = dialog;
    while(branch.parentElement && branch.parentElement!==document.body){
      for(const sibling of branch.parentElement.children)if(sibling!==branch && sibling instanceof HTMLElement){inertNodes.push([sibling,sibling.inert]);sibling.inert=true;}
      branch=branch.parentElement;
    }
    dialog.querySelectorAll<HTMLLabelElement>('label:not([for])').forEach((label,index)=>{
      const input = label.querySelector<HTMLInputElement>('input,select,textarea') || label.parentElement?.querySelector<HTMLInputElement>('input,select,textarea');
      if(input){input.id ||= `studio-field-${crypto.randomUUID()}-${index}`;label.htmlFor=input.id;}
    });
    const controls = () => [...dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]')].filter(el => el.getClientRects().length);
    const timer = requestAnimationFrame(() => (controls()[0] || dialog).focus());
    const keydown = (event: KeyboardEvent) => {
      const dialogs = [...document.querySelectorAll('[aria-modal="true"]')];
      if (dialogs.at(-1) !== dialog) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close.current(); }
      if (event.key === 'Tab') {
        const items = controls(); const first = items[0]; const last = items.at(-1);
        if (!first) { event.preventDefault(); dialog.focus(); }
        else if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown, true);
    return () => { for(const [element,inert] of inertNodes)element.inert=inert; cancelAnimationFrame(timer); document.removeEventListener('keydown', keydown, true); if (previous?.isConnected) previous.focus(); };
  }, [open]);
  return ref;
}
