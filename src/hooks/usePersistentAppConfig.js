import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

/**
 * Hook personalizado para gestionar AppConfig con persistencia robusta.
 * Implementa estrategia "Triple Write" (value, description, app_subtitle) 
 * y "Delete-Replace" para asegurar limpieza de versiones antiguas.
 * 
 * @param {string} configKey - Clave única de configuración (ej. 'training_resources_v1')
 * @param {any} initialData - Datos iniciales por defecto
 * @param {string} queryKeyName - Clave para React Query
 * @param {boolean} isArray - Si se espera un array (para validación)
 */
export function usePersistentAppConfig(configKey, initialData, queryKeyName, isArray = false) {
  const queryClient = useQueryClient();

  // 1. Lectura Robusta
  const query = useQuery({
    queryKey: [queryKeyName],
    queryFn: async () => {
      try {
        // Fetch ALL configs (bypass API filter quirks)
        const allConfigs = await base44.entities.AppConfig.list({ limit: 1000 });
        const matches = allConfigs.filter(c => 
          c.config_key === configKey || 
          c.key === configKey
        );

        if (!matches || matches.length === 0) {
          return initialData;
        }

        // Ordenar por fecha de actualización (más reciente primero)
        matches.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        
        let latest = matches[0];
        
        // Intento de GET por ID para asegurar contenido completo
        try {
          const fullConfig = await base44.entities.AppConfig.get(latest.id);
          if (fullConfig) latest = fullConfig;
        } catch (e) {
          console.warn(`Force GET failed for ${configKey}, using list item.`);
        }

        // Estrategia de Recuperación (Triple Check)
        let jsonString = latest.value;
        
        if (!isValidJsonString(jsonString) && isValidJsonString(latest.description)) {
          console.log(`[${configKey}] Recovered from description`);
          jsonString = latest.description;
        }
        
        if (!isValidJsonString(jsonString) && isValidJsonString(latest.app_subtitle)) {
          console.log(`[${configKey}] Recovered from app_subtitle`);
          jsonString = latest.app_subtitle;
        }

        if (isValidJsonString(jsonString)) {
          try {
            const parsed = JSON.parse(jsonString);
            if (isArray && !Array.isArray(parsed)) return initialData;
            return parsed;
          } catch (e) {
            console.error(`JSON parse error for ${configKey}`, e);
            return initialData;
          }
        }

        return initialData;
      } catch (e) {
        console.error(`Error fetching ${configKey}`, e);
        return initialData;
      }
    },
    // Mantener datos frescos pero no re-fetchear obsesivamente
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // 2. Escritura (Delete All + Create New)
  const mutation = useMutation({
    mutationFn: async (newData) => {
      const value = JSON.stringify(newData);
      
      // Payload Triple Write
      const payload = {
        value,
        description: value,
        app_subtitle: value,
        key: configKey,
        config_key: configKey,
        is_active: true,
        app_name: 'Config Manager'
      };

      // 1. Buscar TODAS las versiones existentes
      const allConfigs = await base44.entities.AppConfig.list({ limit: 1000 });
      const matches = allConfigs.filter(c => 
        c.config_key === configKey || 
        c.key === configKey
      );

      // 2. Eliminar TODAS las versiones antiguas
      if (matches.length > 0) {
        console.log(`[${configKey}] Deleting ${matches.length} old versions...`);
        // Ejecutar en serie para evitar rate limits o race conditions
        for (const match of matches) {
            try {
                await base44.entities.AppConfig.delete(match.id);
            } catch(e) {
                console.warn(`Failed to delete old config ${match.id}`, e);
            }
        }
      }

      // 3. Crear NUEVA versión limpia
      console.log(`[${configKey}] Creating new version...`);
      return await base44.entities.AppConfig.create(payload);
    },
    onSuccess: (data, variables) => {
      // Actualizar caché inmediatamente con los datos que acabamos de guardar
      queryClient.setQueryData([queryKeyName], variables);
      // Invalidar para asegurar consistencia futura
      queryClient.invalidateQueries({ queryKey: [queryKeyName] });
      toast.success("Cambios guardados correctamente");
    },
    onError: (e) => {
      console.error(`Error saving ${configKey}`, e);
      toast.error("Error al guardar los cambios");
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    save: mutation.mutate,
    isSaving: mutation.isPending
  };
}

// Helper para validar si un string parece JSON válido
function isValidJsonString(str) {
  if (!str || str === "undefined" || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (trimmed.startsWith('{') || trimmed.startsWith('['));
}
