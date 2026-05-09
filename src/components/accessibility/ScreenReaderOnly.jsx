import { cn } from '@/lib/utils';

export function ScreenReaderOnly({ children, className }) {
  return (
    <span
      className={cn(
        'absolute w-1 h-1 p-0 -m-1 overflow-hidden clip-path-inset',
        'border-0 whitespace-nowrap',
        className
      )}
    >
      {children}
    </span>
  );
}

export function VisuallyHidden({ as: Component = 'span', ...props }) {
  return (
    <Component
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        borderWidth: '0'
      }}
      {...props}
    />
  );
}