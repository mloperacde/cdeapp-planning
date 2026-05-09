import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function AccessibleButton({
  children,
  ariaLabel,
  ariaPressed,
  ariaDescribedBy,
  disabled,
  className,
  ...props
}) {
  return (
    <Button
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-describedby={ariaDescribedBy}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}