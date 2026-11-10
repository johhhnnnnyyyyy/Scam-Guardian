import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

// Full-screen alert dialog (same role as shadcn's AlertDialog). It is hand-built on purpose: Radix dialogs inject an
// inline <style> for scroll locking, which the app's strict CSP (style-src 'self') blocks. Focus moves in on open and
// returns on close; Escape dismisses.
export function AlertOverlay({ open, onClose, labelledBy, describedBy, className, children }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    ref.current?.querySelector('[data-autofocus]')?.focus();
    const key = e => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === 'Tab') {
        const items = [...ref.current.querySelectorAll('button,a[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled);
        if (!items.length) return;
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/80 p-4">
      <div ref={ref} role="alertdialog" aria-modal="true" aria-labelledby={labelledBy} aria-describedby={describedBy} className={cn('w-full max-w-xl rounded-2xl border-4 border-destructive bg-danger p-5 text-center text-danger-foreground shadow-2xl sm:p-8', className)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
