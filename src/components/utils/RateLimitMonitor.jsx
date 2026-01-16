import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Monitor para detectar y reportar problemas de rate limiting
 * Componente de utilidad para debugging
 */
export default function RateLimitMonitor() {
  useEffect(() => {
    const requestCounts = new Map();
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const url = args[0];
      
      if (typeof url === 'string' && url.includes('/entities/')) {
        const entity = url.split('/entities/')[1]?.split('?')[0];
        requestCounts.set(entity, (requestCounts.get(entity) || 0) + 1);
        
        // Alertar si una entidad se llama más de 10 veces en 10 segundos
        if (requestCounts.get(entity) > 10) {
          console.warn(`⚠️ Rate limit warning: ${entity} llamado ${requestCounts.get(entity)} veces`);
        }
      }
      
      const response = await originalFetch(...args);
      
      if (response.status === 429) {
        console.error('🔴 Rate limit exceeded:', url);
        const entity = url.includes('/entities/') ? url.split('/entities/')[1]?.split('?')[0] : 'Unknown';
        toast.error(`Rate limit: ${entity}`, {
          description: 'Demasiadas peticiones. Espera unos segundos.',
        });
      }
      
      return response;
    };
    
    // Limpiar contador cada 10 segundos
    const interval = setInterval(() => {
      requestCounts.clear();
    }, 10000);
    
    return () => {
      window.fetch = originalFetch;
      clearInterval(interval);
    };
  }, []);
  
  return null;
}
