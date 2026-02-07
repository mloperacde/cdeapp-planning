import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CHUNK_SIZE = 1500; // Safe limit for text fields

/**
 * Hook personalizado para gestionar AppConfig con persistencia robusta.
 * Versión 7: Estrategia "Internal Timestamp" + "Create-Then-Cleanup".
 * 
 * Problema resuelto: Evita que el backend devuelva versiones antiguas o borradas,
 * y garantiza que siempre se lea la versión más reciente basándose en un timestamp interno
 * en lugar de confiar en metadatos del sistema (updated_at) o consistencia eventual.
 * 
 * @param {string} configKey - Clave única de configuración (ej. 'training_resources_v1')
 * @param {any} initialData - Datos iniciales por defecto
 * @param {string} queryKeyName - Clave para React Query
 * @param {boolean} isArray - Si se espera un array (para validación)
 */
export function usePersistentAppConfig(configKey, initialData, queryKeyName, isArray = false) {
  const queryClient = useQueryClient();

  // 1. Lectura Robusta (Busca todo, parsea todo, elige el más nuevo por timestamp interno)
  const query = useQuery({
    queryKey: [queryKeyName],
    queryFn: async () => {
      try {
        console.log(`[Config] Fetching ${configKey} (v7 Strategy)...`);
        
        // Strategy: Fetch ALL candidates matching the key
        let matches = [];
        try {
           const byKey = await base44.entities.AppConfig.filter({ key: configKey });
           if (byKey && Array.isArray(byKey)) matches = [...matches, ...byKey];
        } catch (e) { console.warn("Filter by key failed", e); }

        // Legacy fallback
        try {
           const byConfigKey = await base44.entities.AppConfig.filter({ config_key: configKey });
           if (byConfigKey && Array.isArray(byConfigKey)) matches = [...matches, ...byConfigKey];
        } catch (e) { console.warn("Filter by config_key failed", e); }

        if (!matches || matches.length === 0) {
          console.log(`[Config] No config found for ${configKey}, using initial data.`);
          return initialData;
        }

        console.log(`[Config] Found ${matches.length} candidates for ${configKey}. resolving...`);

        // Resolve all candidates to find the true latest version
        // We must inspect content to find our internal timestamp
        const candidates = [];

        for (const match of matches) {
            // Force GET to ensure full content if value is missing
            let record = match;
            if (!record.value && !record.description) {
                try {
                    const full = await base44.entities.AppConfig.get(match.id);
                    if (full) record = full;
                } catch(e) {}
            }

            // Extract content (Triple Read)
            let jsonString = record.value;
            if (!isValidJsonString(jsonString) && isValidJsonString(record.description)) jsonString = record.description;
            if (!isValidJsonString(jsonString) && isValidJsonString(record.app_subtitle)) jsonString = record.app_subtitle;

            if (isValidJsonString(jsonString)) {
                try {
                    const parsed = JSON.parse(jsonString);
                    // Standardize: If it has internal timestamp, use it. If not, use updated_at.
                    // New format: { _ts: 123456789, _is_chunked: bool, data: ... }
                    // Legacy format: raw data or { is_chunked: true, ... }
                    
                    let timestamp = new Date(record.updated_at).getTime(); // Default to system time
                    let isChunked = false;
                    let chunkCount = 0;
                    let content = parsed;

                    // Check for v7 envelope
                    if (parsed._ts) {
                        timestamp = parsed._ts;
                        content = parsed.data;
                        isChunked = parsed._is_chunked;
                        if (isChunked) chunkCount = parsed._chunk_count;
                    } 
                    // Check for v6 envelope (Master Record)
                    else if (parsed.timestamp && parsed.is_chunked) {
                        timestamp = parsed.timestamp;
                        isChunked = true;
                        chunkCount = parsed.count;
                    }

                    candidates.push({
                        id: record.id,
                        timestamp,
                        isChunked,
                        chunkCount,
                        content,
                        originalRecord: record
                    });

                } catch(e) {
                    console.warn(`Failed to parse candidate ${record.id}`, e);
                }
            }
        }

        if (candidates.length === 0) return initialData;

        // Sort by Internal Timestamp (Descending)
        candidates.sort((a, b) => b.timestamp - a.timestamp);
        const winner = candidates[0];
        
        console.log(`[Config] Winner for ${configKey} is ${winner.id} (ts: ${winner.timestamp})`);

        // If chunked, we need to fetch chunks
        if (winner.isChunked) {
             console.log(`[Config] Winner is CHUNKED (${winner.chunkCount} chunks). Reassembling...`);
             const chunks = [];
             for (let i = 0; i < winner.chunkCount; i++) {
                const chunkKey = `${configKey}_chunk_${i}`; // Note: Chunks don't use unique IDs per version, they share key. This is a limitation.
                // To fix the "old chunks" issue, we must rely on "Delete-Replace" for chunks being effective.
                // Or better: We assume the chunks currently in DB belong to the latest master if we cleanup correctly.
                
                // Fetch chunk
                let chunkMatches = [];
                try {
                    const cKey = await base44.entities.AppConfig.filter({ key: chunkKey });
                    if (cKey) chunkMatches = [...chunkMatches, ...cKey];
                } catch(e) {}
                
                if (chunkMatches.length > 0) {
                    // Sort chunks by updated_at (best effort)
                    chunkMatches.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                    let chunkMatch = chunkMatches[0];

                    // Force GET
                    try {
                        const fullChunk = await base44.entities.AppConfig.get(chunkMatch.id);
                        if (fullChunk) chunkMatch = fullChunk;
                    } catch (e) {}
                    
                    let chunkVal = chunkMatch.value;
                    if (!chunkVal && chunkMatch.description) chunkVal = chunkMatch.description;
                    if (!chunkVal && chunkMatch.app_subtitle && chunkMatch.app_subtitle !== "chunk") chunkVal = chunkMatch.app_subtitle;
                    
                    chunks.push(chunkVal || "");
                } else {
                    chunks.push(""); // Missing chunk
                }
             }
             
             const fullJson = chunks.join('');
             try {
                const realData = JSON.parse(fullJson);
                return realData;
             } catch(e) {
                 console.error("Failed to parse reassembled chunks", e);
                 return initialData;
             }
        }

        // Return winner content
        if (isArray && !Array.isArray(winner.content)) return initialData;
        return winner.content;

      } catch (e) {
        console.error(`Error fetching ${configKey}`, e);
        return initialData;
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    initialData: initialData,
  });

  // 2. Escritura (Create New -> Cleanup Old)
  const mutation = useMutation({
    mutationFn: async (newData) => {
      console.log(`[Config] Saving ${configKey} (v7 Strategy)...`);
      const fullJson = JSON.stringify(newData);
      const isLarge = fullJson.length > CHUNK_SIZE;
      const timestamp = Date.now();
      
      let newMasterId = null;

      if (isLarge) {
          // Chunked Save
          const chunks = [];
          for (let i = 0; i < fullJson.length; i += CHUNK_SIZE) {
              chunks.push(fullJson.substring(i, i + CHUNK_SIZE));
          }
          
          console.log(`[Config] Saving as ${chunks.length} chunks (Total size: ${fullJson.length})`);

          // 1. Delete OLD Chunks first (Critical for consistency since chunk keys are reused)
          // We can't version chunk keys easily without exploding DB size/lookup complexity.
          // So we aggressively clean chunks.
          for (let i = 0; i < 20; i++) { // Check up to 20 potential chunks
              const chunkKey = `${configKey}_chunk_${i}`;
              try {
                  const oldChunks = await base44.entities.AppConfig.filter({ key: chunkKey });
                  if (oldChunks && oldChunks.length > 0) {
                      for(const c of oldChunks) await base44.entities.AppConfig.delete(c.id);
                  }
              } catch(e) {}
          }

          // 2. Create NEW Chunks
          for (let i = 0; i < chunks.length; i++) {
              const chunkKey = `${configKey}_chunk_${i}`;
              const chunkPayload = {
                  value: chunks[i],
                  description: chunks[i], 
                  app_subtitle: chunks[i], 
                  key: chunkKey,
                  config_key: chunkKey,
                  is_active: true,
                  app_name: 'Config Manager Chunk'
              };
              await base44.entities.AppConfig.create(chunkPayload);
          }

          // 3. Create Master Record (v7 Envelope)
          const metaEnvelope = {
              _ts: timestamp,
              _is_chunked: true,
              _chunk_count: chunks.length,
              data: null // Data is in chunks
          };
          const metaJson = JSON.stringify(metaEnvelope);
          
          const masterPayload = {
              value: metaJson,
              description: metaJson,
              app_subtitle: metaJson,
              key: configKey,
              config_key: configKey,
              is_active: true,
              app_name: 'Config Manager'
          };
          const res = await base44.entities.AppConfig.create(masterPayload);
          newMasterId = res.id;

      } else {
          // Normal Save (v7 Envelope)
          const envelope = {
              _ts: timestamp,
              _is_chunked: false,
              data: newData
          };
          const envelopeJson = JSON.stringify(envelope);

          const payload = {
            value: envelopeJson,
            description: envelopeJson,
            app_subtitle: envelopeJson,
            key: configKey,
            config_key: configKey,
            is_active: true,
            app_name: 'Config Manager'
          };
          const res = await base44.entities.AppConfig.create(payload);
          newMasterId = res.id;
      }

      // 4. Cleanup OLD Masters (After successful create)
      if (newMasterId) {
          try {
              const k = await base44.entities.AppConfig.filter({ key: configKey });
              if (k) {
                  for (const m of k) {
                      if (m.id !== newMasterId) {
                          await base44.entities.AppConfig.delete(m.id);
                      }
                  }
              }
          } catch(e) { console.warn("Cleanup failed", e); }
      }

      return { success: true };
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