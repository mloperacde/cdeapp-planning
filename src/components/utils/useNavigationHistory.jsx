import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Hook global para navegación inteligente con historial
 * Permite "volver atrás" de manera ordenada recordando de dónde proviene
 */
export function useNavigationHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = useCallback(() => {
    // Verificar si hay un origen guardado en el state
    const from = location.state?.from;
    
    if (from) {
      // Navegar al origen guardado
      navigate(from, { replace: true });
    } else {
      // Fallback: usar historial del navegador
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        // Si no hay historial, ir al dashboard
        navigate(createPageUrl('Dashboard'));
      }
    }
  }, [navigate, location.state]);

  const navigateWithHistory = useCallback((pageName, state = {}) => {
    // Guardar la página actual como origen
    navigate(createPageUrl(pageName), {
      state: {
        ...state,
        from: location.pathname
      }
    });
  }, [navigate, location.pathname]);

  return { goBack, navigateWithHistory };
}