import { cn } from '@/lib/utils';

export function SkipLinks() {
  return (
    <>
      <a
        href="#main-content"
        className={cn(
          'fixed -top-20 left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded transition-all',
          'focus:top-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        Saltar al contenido principal
      </a>
      <a
        href="#navigation"
        className={cn(
          'fixed -top-20 left-52 z-50 bg-primary text-primary-foreground px-4 py-2 rounded transition-all',
          'focus:top-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
        )}
      >
        Saltar a navegación
      </a>
    </>
  );
}