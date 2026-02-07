import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CHUNK_SIZE = 1500; // Safe limit for text fields

/**
 * Hook personalizado para gestionar AppConfig con persistencia robusta.
 * Implementa estrategia "Triple Write" (value, description, app_subtitle) 
 * y "Chunked Storage" para datos grandes, más "Delete-Replace" para limpieza.
 * 
 * @param {string} configKey - Clave única de configuración (ej. 'training_resources_v1')
 * @param {any} initialData - Datos iniciales por defecto
 * @param {string} queryKeyName - Clave para React Query
 * @param {boolean} isArray - Si se espera un array (para validación)
 */
export function usePersistentAppConfig(configKey, initialData, queryKeyName, isArray = false) {
  const queryClient = useQueryClient();

  // 1. Lectura Robusta con soporte para Chunking
  const query = useQuery({
    queryKey: [queryKeyName],
    queryFn: async () => {
      try {
        console.log(`[Config] Fetching ${configKey}...`);
        
        // Strategy: Search by exact key matches instead of listing all to avoid limits and signature issues
        // 1. Try finding by 'key'
        let matches = [];
        try {
           const byKey = await base44.entities.AppConfig.filter({ key: configKey });
           if (byKey && Array.isArray(byKey)) matches = [...matches, ...byKey];
        } catch (e) { console.warn("Filter by key failed", e); }

        // 2. Try finding by 'config_key' (legacy support)
        try {
           const byConfigKey = await base44.entities.AppConfig.filter({ config_key: configKey });
           if (byConfigKey && Array.isArray(byConfigKey)) matches = [...matches, ...byConfigKey];
        } catch (e) { console.warn("Filter by config_key failed", e); }

        if (!matches || matches.length === 0) {
          console.log(`[Config] No config found for ${configKey}, using initial data.`);
          return initialData;
        }

        // Sort by update time to get latest master
        matches.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
        let latest = matches[0];

        // Force GET to ensure full content (some APIs might return partial objects in list/filter)
        try {
          const fullConfig = await base44.entities.AppConfig.get(latest.id);
          if (fullConfig) latest = fullConfig;
        } catch (e) {
          // console.warn(`Force GET failed for ${configKey}, using list item.`);
        }

        // Recover JSON string (Triple Read)
        let jsonString = latest.value;
        if (!isValidJsonString(jsonString) && isValidJsonString(latest.description)) jsonString = latest.description;
        if (!isValidJsonString(jsonString) && isValidJsonString(latest.app_subtitle)) jsonString = latest.app_subtitle;

        if (!isValidJsonString(jsonString)) {
           console.warn(`[Config] Invalid JSON for ${configKey}`);
           return initialData;
        }

        // Check for Chunking
        try {
          const parsed = JSON.parse(jsonString);
          
          if (parsed && parsed.is_chunked) {
             console.log(`[Config] Detected CHUNKED data for ${configKey} (${parsed.count} chunks)`);
             // Reassemble chunks
             const chunks = [];
             for (let i = 0; i < parsed.count; i++) {
                const chunkKey = `${configKey}_chunk_${i}`;
                // Fetch specific chunk
                let chunkMatches = [];
                try {
                    const cKey = await base44.entities.AppConfig.filter({ key: chunkKey });
                    if (cKey) chunkMatches = [...chunkMatches, ...cKey];
                } catch(e) {}
                
                // Fallback check
                if (chunkMatches.length === 0) {
                     try {
                        const cConfigKey = await base44.entities.AppConfig.filter({ config_key: chunkKey });
                        if (cConfigKey) chunkMatches = [...chunkMatches, ...cConfigKey];
                     } catch(e) {}
                }

                if (chunkMatches.length > 0) {
                    // Get latest chunk version if multiple
                    chunkMatches.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                    const chunkMatch = chunkMatches[0];
                    
                    let chunkVal = chunkMatch.value;
                    if (!chunkVal && chunkMatch.description) chunkVal = chunkMatch.description;
                    chunks.push(chunkVal || "");
                } else {
                    console.error(`[Config] Missing chunk ${i} for ${configKey}`);
                    // If a chunk is missing, the data is corrupted. 
                    // We could return partial data or fail. Failing is safer to avoid overwriting with bad data.
                    // But to be user friendly, maybe we assume empty string?
                    chunks.push(""); 
                }
             }
             
             const fullJson = chunks.join('');
             console.log(`[Config] Reassembled ${configKey}, length: ${fullJson.length}`);
             const realData = JSON.parse(fullJson);
             return realData;
          }
          
          if (isArray && !Array.isArray(parsed)) return initialData;
          return parsed;

        } catch (e) {
          console.error(`JSON parse error for ${configKey}`, e);
          return initialData;
        }
      } catch (e) {
        console.error(`Error fetching ${configKey}`, e);
        return initialData;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    initialData: initialData,
  });

  // 2. Escritura con Chunking y Delete-Replace
  const mutation = useMutation({
    mutationFn: async (newData) => {
      console.log(`[Config] Saving ${configKey}...`);
      const fullJson = JSON.stringify(newData);
      const isLarge = fullJson.length > CHUNK_SIZE;
      
      // 1. Clean up OLD versions (Master + Chunks)
      // Instead of listing all, we search for what we know might exist.
      
      // Find existing master(s)
      let existingMasters = [];
      try {
          const k = await base44.entities.AppConfig.filter({ key: configKey });
          if(k) existingMasters = [...existingMasters, ...k];
          const ck = await base44.entities.AppConfig.filter({ config_key: configKey });
          if(ck) existingMasters = [...existingMasters, ...ck];
      } catch(e) { console.warn("Cleanup search failed", e); }
      
      // Delete found masters and their chunks
      for (const master of existingMasters) {
          try {
             // Delete master
             await base44.entities.AppConfig.delete(master.id);
             
             // Check if it was chunked to delete its chunks
             let chunkCount = 0;
             if (master.value && master.value.includes("is_chunked")) {
                 try {
                     const parsed = JSON.parse(master.value);
                     if (parsed.is_chunked) chunkCount = parsed.count;
                 } catch(e) {}
             }
             
             // Delete chunks
             for (let i = 0; i < chunkCount; i++) {
                 const chunkKey = `${configKey}_chunk_${i}`;
                 const chunks = await base44.entities.AppConfig.filter({ key: chunkKey });
                 for (const c of chunks) {
                     await base44.entities.AppConfig.delete(c.id);
                 }
             }
          } catch(e) {
              console.warn(`Failed to cleanup ${master.id}`, e);
          }
      }
      
      // Safety: Attempt to delete potential orphaned chunks from previous failed overwrites
      // We'll check for a reasonable number of chunks (e.g., up to 20) to be safe
      for(let i=0; i<20; i++) {
          try {
             const chunkKey = `${configKey}_chunk_${i}`;
             const orphans = await base44.entities.AppConfig.filter({ key: chunkKey });
             if (orphans && orphans.length > 0) {
                 for(const o of orphans) await base44.entities.AppConfig.delete(o.id);
             }
          } catch(e) {}
      }

      // 2. Create New Records

      if (isLarge) {
          // Chunked Save
          const chunks = [];
          for (let i = 0; i < fullJson.length; i += CHUNK_SIZE) {
              chunks.push(fullJson.substring(i, i + CHUNK_SIZE));
          }
          
          console.log(`[Config] Saving as ${chunks.length} chunks (Total size: ${fullJson.length})`);

          // Save Chunks first
          for (let i = 0; i < chunks.length; i++) {
              const chunkKey = `${configKey}_chunk_${i}`;
              const chunkPayload = {
                  value: chunks[i],
                  description: chunks[i], // Backup
                  app_subtitle: "chunk",
                  key: chunkKey,
                  config_key: chunkKey,
                  is_active: true,
                  app_name: 'Config Manager Chunk'
              };
              await base44.entities.AppConfig.create(chunkPayload);
          }

          // Save Master Record
          const metaJson = JSON.stringify({ is_chunked: true, count: chunks.length, timestamp: Date.now() });
          const masterPayload = {
              value: metaJson,
              description: metaJson, // Backup: Triple Write for Master Record too
              app_subtitle: metaJson, // Backup: Triple Write for Master Record too
              key: configKey,
              config_key: configKey,
              is_active: true,
              app_name: 'Config Manager'
          };
          return await base44.entities.AppConfig.create(masterPayload);

      } else {
          // Normal Save (Triple Write)
          const payload = {
            value: fullJson,
            description: fullJson,
            app_subtitle: fullJson,
            key: configKey,
            config_key: configKey,
            is_active: true,
            app_name: 'Config Manager'
          };
          return await base44.entities.AppConfig.create(payload);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData([queryKeyName], variables);
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
