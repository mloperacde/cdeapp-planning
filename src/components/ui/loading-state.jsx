import { Spinner } from './spinner';
import { cn } from '@/lib/utils';

export function LoadingState({ 
  message = 'Cargando...', 
  description,
  fullScreen = false,
  className 
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-12',
        fullScreen && 'min-h-screen',
        className
      )}
    >
      <Spinner size="lg" className="text-primary" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{message}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title = 'Sin resultados',
  description,
  action,
  className
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-12 text-center',
        className
      )}
    >
      {Icon && <Icon className="h-12 w-12 text-muted-foreground opacity-50" />}
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Error al cargar',
  description,
  retry,
  className
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 py-12 text-center',
        className
      )}
    >
      <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <svg
          className="h-6 w-6 text-destructive"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {retry && <div className="mt-4">{retry}</div>}
    </div>
  );
}