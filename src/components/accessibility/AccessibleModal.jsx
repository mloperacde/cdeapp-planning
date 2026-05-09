import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useKeyboardNavigation';

export function AccessibleModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className
}) {
  const focusTrapRef = useFocusTrap(open);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => onOpenChange(false)}
        role="presentation"
      />
      <div
        ref={focusTrapRef}
        className={cn(
          'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2',
          'bg-card rounded-lg shadow-lg p-6 space-y-4',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <h2 id="modal-title" className="text-lg font-semibold">
          {title}
        </h2>
        {description && (
          <p id="modal-description" className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
        {children}
      </div>
    </>
  );
}