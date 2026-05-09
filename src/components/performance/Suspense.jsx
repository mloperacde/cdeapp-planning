import { Suspense, useEffect, useState } from 'react';
import { LoadingState } from '@/components/ui/loading-state';

export function LazyBoundary({
  children,
  fallback = <LoadingState message="Cargando..." />,
  timeout = null
}) {
  return (
    <Suspense fallback={fallback}>
      {timeout ? (
        <TimeoutWrapper timeout={timeout}>
          {children}
        </TimeoutWrapper>
      ) : (
        children
      )}
    </Suspense>
  );
}

function TimeoutWrapper({ children, timeout }) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), timeout);
    return () => clearTimeout(timer);
  }, [timeout]);

  if (timedOut) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Tiempo de carga agotado</p>
      </div>
    );
  }

  return children;
}