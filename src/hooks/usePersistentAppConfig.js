import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CHUNK_SIZE = 1500; // Safe limit for text fields

/**
 * Hook personalizado para gestionar AppConfig con persistencia robusta.
 * Versión 7.1: Estrategia "Internal Timestamp" + "Versioned Chunk Keys".
 * 
 * Problema resuelto: Evita condiciones de carrera y borrado accidental de chunks
 * al usar claves únicas por versión (ej. key_TIMESTAMP_chunk_0).
 * Garantiza atomicidad: o tienes toda la versión o no tienes nada.
 */
export function usePersistentAppConfig(configKey, initialData, queryKeyName, isArray = false) {
  const queryClient = useQueryClient();

  // 1. Lectura Robusta (Busca todo, parsea todo, elige el más nuevo por timestamp interno)
  const query = useQuery({
    queryKey: [queryKeyName],
    queryFn: async () => {
      try {
        console.log(`[Config] Fetching ${configKey} (v7.1 Strategy)...`);
        
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
                    
                    let timestamp = new Date(record.updated_at).getTime(); // Default to system time
                    let isChunked = false;
                    let chunkCount = 0;
                    let useVersionedKeys = false;
                    let content = parsed;

                    // Check for v7.1 envelope
                    if (parsed._ts) {
                        timestamp = parsed._ts;
                        content = parsed.data;
                        isChunked = parsed._is_chunked;
                        if (isChunked) chunkCount = parsed._chunk_count;
                        useVersionedKeys = parsed._use_versioned_keys || false;
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
                        useVersionedKeys,
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
             console.log(`[Config] Winner is CHUNKED (${winner.chunkCount} chunks, versioned: ${winner.useVersionedKeys}). Reassembling...`);
             const chunks = [];
             for (let i = 0; i < winner.chunkCount; i++) {
                // Construct Key based on versioning strategy
                let chunkKey;
                if (winner.useVersionedKeys) {
                    chunkKey = `${configKey}_${winner.timestamp}_chunk_${i}`;
                } else {
                    chunkKey = `${configKey}_chunk_${i}`; // Legacy
                }

                // Fetch chunk
                let chunkMatches = [];
                // Try searching by Key (primary)
                try {
                    const cKey = await base44.entities.AppConfig.filter({ key: chunkKey });
                    if (cKey) chunkMatches = [...chunkMatches, ...cKey];
                } catch(e) {}
                
                // Fallback: Search by config_key (just in case)
                if (chunkMatches.length === 0) {
                     try {
                        const cConfigKey = await base44.entities.AppConfig.filter({ config_key: chunkKey });
                        if (cConfigKey) chunkMatches = [...chunkMatches, ...cConfigKey];
                    } catch(e) {}
                }
                
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
                    console.error(`[Config] MISSING CHUNK: ${chunkKey}`);
                    chunks.push(""); // Missing chunk
                }
             }
             
             const fullJson = chunks.join('');
             if (!fullJson) {
                 console.error("[Config] Reassembly failed: Empty content");
                 return initialData;
             }

             try {
                const realData = JSON.parse(fullJson);
                return realData;
             } catch(e) {
                 console.error("Failed to parse reassembled chunks", e);
                 // If parse fails, return initialData to avoid crashing app, 
                 // but log error clearly.
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

  // 2. Escritura (Create New Versioned Chunks -> Create Master -> Cleanup Old Masters & Chunks)
  const mutation = useMutation({
    mutationFn: async (newData) => {
      console.log(`[Config] Saving ${configKey} (v7.1 Strategy)...`);
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
          
          console.log(`[Config] Saving as ${chunks.length} chunks (Versioned Key: ${configKey}_${timestamp}_chunk_*)`);

          // 1. Create NEW Chunks (With Versioned Keys)
          // We DO NOT delete old chunks here. We rely on unique keys.
          for (let i = 0; i < chunks.length; i++) {
              const chunkKey = `${configKey}_${timestamp}_chunk_${i}`;
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

          // 2. Create Master Record (v7.1 Envelope)
          const metaEnvelope = {
              _ts: timestamp,
              _is_chunked: true,
              _chunk_count: chunks.length,
              _use_versioned_keys: true, // Flag for v7.1
              data: null 
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

      // 3. Cleanup OLD Masters AND Their Chunks (After successful create)
      if (newMasterId) {
          try {
              // Fetch all masters for this configKey
              const k = await base44.entities.AppConfig.filter({ key: configKey });
              if (k) {
                  for (const m of k) {
                      // Skip the one we just created
                      if (m.id === newMasterId) continue;

                      // Identify if this old master has chunks
                      let oldChunksToDelete = [];
                      try {
                          const val = m.value || m.description || m.app_subtitle;
                          if (isValidJsonString(val)) {
                              const parsed = JSON.parse(val);
                              // Case A: v7.1 (Versioned Keys)
                              if (parsed._use_versioned_keys && parsed._ts) {
                                  for(let i=0; i<parsed._chunk_count; i++) {
                                      oldChunksToDelete.push(`${configKey}_${parsed._ts}_chunk_${i}`);
                                  }
                              }
                              // Case B: v7/v6 (Legacy Shared Keys)
                              else if (parsed._is_chunked || parsed.is_chunked) {
                                  const count = parsed._chunk_count || parsed.count || 20;
                                  for(let i=0; i<count; i++) {
                                      oldChunksToDelete.push(`${configKey}_chunk_${i}`);
                                  }
                              }
                          }
                      } catch(e) {}

                      // Delete linked chunks
                      for (const ck of oldChunksToDelete) {
                          try {
                              const chunks = await base44.entities.AppConfig.filter({ key: ck });
                              if (chunks) {
                                  for (const c of chunks) await base44.entities.AppConfig.delete(c.id);
                              }
                          } catch(e) {}
                      }

                      // Finally, delete the old master
                      await base44.entities.AppConfig.delete(m.id);
                  }
              }

              // Extra Cleanup: Orphaned Legacy Chunks (Safety Net)
              // Only run this if we are sure we are using versioned keys now.
              // We check up to 20 legacy chunk keys and delete them if no master points to them?
              // No, too risky. The loop above handles it per-master.
              
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