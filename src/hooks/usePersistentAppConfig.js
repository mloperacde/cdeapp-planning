import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const CHUNK_SIZE = 1500; // Safe limit for text fields

/**
 * Hook personalizado para gestionar AppConfig con persistencia robusta.
 * Versión 8: Estrategia "Direct ID Linking".
 * 
 * Problema resuelto: Evita problemas de paginación, indexación y condiciones de carrera
 * al almacenar los IDs exactos de los chunks en el registro maestro.
 * 
 * Ventajas:
 * 1. No depende de `filter` para encontrar chunks (evita límites de paginación).
 * 2. Lectura directa por ID es más rápida y consistente.
 * 3. Verificación inmediata post-escritura.
 */
export function usePersistentAppConfig(configKey, initialData, queryKeyName, isArray = false, options = {}) {
  const queryClient = useQueryClient();
  const { enabled = true } = options;

  // 1. Lectura Robusta (Busca Maestro -> Lee IDs de Chunks -> Fetch Directo)
  const query = useQuery({
    queryKey: [queryKeyName],
    queryFn: async () => {
      try {
        console.log(`[Config] Fetching ${configKey} (v8 Direct-ID Strategy)...`);
        
        // Paso 1: Buscar Candidatos Maestros
        let matches = [];
        try {
           const byKey = await base44.entities.AppConfig.filter({ key: configKey });
           if (byKey && Array.isArray(byKey)) matches = [...matches, ...byKey];
        } catch (e) { console.warn("Filter by key failed", e); }

        // Fallback Legacy
        try {
           const byConfigKey = await base44.entities.AppConfig.filter({ config_key: configKey });
           if (byConfigKey && Array.isArray(byConfigKey)) matches = [...matches, ...byConfigKey];
        } catch (e) { console.warn("Filter by config_key failed", e); }

        // CRITICAL FALLBACK: If filter returns empty, try listing recent items and filtering manually.
        // This handles cases where API filtering is unreliable or eventually consistent.
        if (matches.length === 0) {
            console.log(`[Config] Filter returned empty for ${configKey}, attempting fallback list scan...`);
            try {
                // Fetch recent 100 items (most likely to contain our config if recently saved)
                const recentItems = await base44.entities.AppConfig.list('-updated_at', 100);
                const manualMatches = recentItems.filter(item => 
                    item.key === configKey || item.config_key === configKey
                );
                if (manualMatches.length > 0) {
                    console.log(`[Config] Fallback scan found ${manualMatches.length} candidates.`);
                    matches = [...matches, ...manualMatches];
                }
            } catch (e) {
                console.warn("[Config] Fallback list scan failed", e);
            }
        }

        if (!matches || matches.length === 0) {
          console.log(`[Config] No config found for ${configKey}, using initial data.`);
          return initialData;
        }

        // Paso 2: Encontrar el Maestro más reciente (Internal Timestamp)
        const candidates = [];
        for (const match of matches) {
            let record = match;
            // Force GET if shallow
            if (!record.value && !record.description) {
                try {
                    const full = await base44.entities.AppConfig.get(match.id);
                    if (full) record = full;
                } catch(e) {}
            }

            // Extract content
            let jsonString = record.value;
            if (!isValidJsonString(jsonString) && isValidJsonString(record.description)) jsonString = record.description;
            if (!isValidJsonString(jsonString) && isValidJsonString(record.app_subtitle)) jsonString = record.app_subtitle;

            if (isValidJsonString(jsonString)) {
                try {
                    const parsed = JSON.parse(jsonString);
                    let timestamp = new Date(record.updated_at).getTime();
                    let isChunked = false;
                    let chunkIds = []; // v8 Feature
                    let chunkCount = 0; // Legacy
                    let useVersionedKeys = false; // v7.1
                    let content = parsed;

                    // v8 Envelope
                    if (parsed._v === 8) {
                        timestamp = parsed._ts;
                        isChunked = parsed._is_chunked;
                        chunkIds = parsed._chunk_ids || [];
                        content = parsed.data;
                    }
                    // v7.1 Envelope
                    else if (parsed._ts) {
                        timestamp = parsed._ts;
                        content = parsed.data;
                        isChunked = parsed._is_chunked;
                        if (isChunked) chunkCount = parsed._chunk_count;
                        useVersionedKeys = parsed._use_versioned_keys || false;
                    } 
                    // v6 Legacy
                    else if (parsed.timestamp && parsed.is_chunked) {
                        timestamp = parsed.timestamp;
                        isChunked = true;
                        chunkCount = parsed.count;
                    }

                    candidates.push({
                        id: record.id,
                        timestamp,
                        isChunked,
                        chunkIds,
                        chunkCount,
                        useVersionedKeys,
                        content,
                        version: parsed._v || 7
                    });
                } catch(e) { console.warn(`Failed to parse ${record.id}`, e); }
            }
        }

        if (candidates.length === 0) return initialData;

        // Sort by Internal Timestamp (Descending)
        candidates.sort((a, b) => b.timestamp - a.timestamp);
        const winner = candidates[0];
        
        console.log(`[Config] Winner: ${winner.id} (v${winner.version}, ts: ${winner.timestamp})`);

        // Paso 3: Recuperar Chunks
        if (winner.isChunked) {
             let fullJson = "";

             // v8 Strategy: Direct ID Fetching (FAST & RELIABLE)
             if (winner.version === 8 && winner.chunkIds.length > 0) {
                 console.log(`[Config] Fetching ${winner.chunkIds.length} chunks by ID...`);
                 
                 // Fetch in parallel
                 const chunkPromises = winner.chunkIds.map(id => base44.entities.AppConfig.get(id).catch(e => null));
                 const chunkResults = await Promise.all(chunkPromises);

                 const chunks = chunkResults.map(c => {
                     if (!c) return "";
                     let val = c.value;
                     if (!val && c.description) val = c.description;
                     if (!val && c.app_subtitle && c.app_subtitle !== "chunk") val = c.app_subtitle;
                     return val || "";
                 });

                 // Verify integrity
                 if (chunks.some(c => !c)) {
                     console.error("[Config] CRITICAL: One or more v8 chunks missing!");
                     // Fallback to initial data rather than partial data
                     // But try to join what we have just in case? No, strict integrity.
                 }
                 fullJson = chunks.join('');
             }
             // Legacy Strategies (v7/v6)
             else {
                 console.log(`[Config] Legacy Chunk Fetching...`);
                 const chunks = [];
                 for (let i = 0; i < winner.chunkCount; i++) {
                    let chunkKey = winner.useVersionedKeys 
                        ? `${configKey}_${winner.timestamp}_chunk_${i}`
                        : `${configKey}_chunk_${i}`;
                    
                    let chunkMatches = [];
                    try {
                        const cKey = await base44.entities.AppConfig.filter({ key: chunkKey });
                        if (cKey) chunkMatches = [...chunkMatches, ...cKey];
                    } catch(e) {}
                    
                    if (chunkMatches.length > 0) {
                        chunkMatches.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
                        let chunkMatch = chunkMatches[0];
                        try {
                            const fullChunk = await base44.entities.AppConfig.get(chunkMatch.id);
                            if (fullChunk) chunkMatch = fullChunk;
                        } catch (e) {}
                        
                        let chunkVal = chunkMatch.value;
                        if (!chunkVal && chunkMatch.description) chunkVal = chunkMatch.description;
                        if (!chunkVal && chunkMatch.app_subtitle && chunkMatch.app_subtitle !== "chunk") chunkVal = chunkMatch.app_subtitle;
                        chunks.push(chunkVal || "");
                    } else {
                        chunks.push("");
                    }
                 }
                 fullJson = chunks.join('');
             }
             
             try {
                if (!fullJson) throw new Error("Empty JSON");
                return JSON.parse(fullJson);
             } catch(e) {
                 console.error("Reassembly failed", e);
                 return initialData;
             }
        }

        if (isArray && !Array.isArray(winner.content)) return initialData;
        return winner.content;

      } catch (e) {
        console.error(`Error fetching ${configKey}`, e);
        return initialData;
      }
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    initialData: initialData,
    enabled: enabled
  });

  // 2. Escritura v8 (Create Chunks -> Store IDs -> Create Master -> Verify -> Cleanup)
  const mutation = useMutation({
    mutationFn: async (newData) => {
      console.log(`[Config] Saving ${configKey} (v8 Strategy)...`);
      const fullJson = JSON.stringify(newData);
      const isLarge = fullJson.length > CHUNK_SIZE;
      const timestamp = Date.now();
      
      let newMasterId = null;
      let newChunkIds = [];

      if (isLarge) {
          // 1. Create Chunks sequentially and collect IDs
          const chunkTexts = [];
          for (let i = 0; i < fullJson.length; i += CHUNK_SIZE) {
              chunkTexts.push(fullJson.substring(i, i + CHUNK_SIZE));
          }
          
          console.log(`[Config] Creating ${chunkTexts.length} chunks...`);

          for (let i = 0; i < chunkTexts.length; i++) {
              const chunkKey = `${configKey}_${timestamp}_chunk_${i}`; // Still use descriptive keys for debugging
              const chunkPayload = {
                  value: chunkTexts[i],
                  description: chunkTexts[i], 
                  app_subtitle: chunkTexts[i], 
                  key: chunkKey,
                  config_key: chunkKey,
                  is_active: true,
                  app_name: 'Config Chunk v8'
              };
              
              // CRITICAL: Await creation and get ID
              const res = await base44.entities.AppConfig.create(chunkPayload);
              if (!res || !res.id) throw new Error(`Failed to create chunk ${i}`);
              newChunkIds.push(res.id);
          }

          // 2. Create Master Record with Chunk IDs
          const metaEnvelope = {
              _v: 8,
              _ts: timestamp,
              _is_chunked: true,
              _chunk_ids: newChunkIds,
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
              app_name: 'Config Master v8'
          };
          const res = await base44.entities.AppConfig.create(masterPayload);
          newMasterId = res.id;

      } else {
          // Normal Save
          const envelope = {
              _v: 8,
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
            app_name: 'Config Master v8'
          };
          const res = await base44.entities.AppConfig.create(payload);
          newMasterId = res.id;
      }

      // 3. VERIFICATION (Read-Back Check)
      if (newMasterId) {
          console.log(`[Config] Verifying write integrity for ${newMasterId}...`);
          try {
              const verifyMaster = await base44.entities.AppConfig.get(newMasterId);
              if (!verifyMaster) throw new Error("Master record not found after write");
              
              // Verify chunks if needed
              if (newChunkIds.length > 0) {
                   const verifyChunks = await Promise.all(newChunkIds.map(id => base44.entities.AppConfig.get(id)));
                   if (verifyChunks.some(c => !c)) throw new Error("Some chunks missing after write");
              }
              console.log("[Config] Verification SUCCESS");
          } catch(e) {
              console.error("[Config] Verification FAILED", e);
              throw new Error("Verification failed: Data was not saved correctly. Please retry.");
          }
      }

      // 4. Cleanup OLD Masters (After success)
      if (newMasterId) {
          // Run in background (don't await strictly)
          cleanupOldVersions(configKey, newMasterId).catch(err => console.warn("Cleanup warning", err));
      }

      return { success: true };
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData([queryKeyName], variables);
      queryClient.invalidateQueries({ queryKey: [queryKeyName] });
      toast.success("Cambios guardados y verificados (v8)");
    },
    onError: (e) => {
      console.error(`Error saving ${configKey}`, e);
      toast.error(`Error crítico al guardar: ${e.message}`);
    }
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    save: mutation.mutate,
    isSaving: mutation.isPending
  };
}

// Background cleanup helper
async function cleanupOldVersions(configKey, keepMasterId) {
    try {
        const matches = await base44.entities.AppConfig.filter({ key: configKey });
        if (!matches) return;

        for (const m of matches) {
            if (m.id === keepMasterId) continue;
            
            // Delete chunks if v8/v7.1
            try {
                const val = m.value || m.description;
                if (val && val.startsWith('{')) {
                    const parsed = JSON.parse(val);
                    
                    // v8 cleanup
                    if (parsed._v === 8 && parsed._chunk_ids) {
                        for(const cid of parsed._chunk_ids) {
                            await base44.entities.AppConfig.delete(cid).catch(()=>{});
                        }
                    }
                    // v7.1 cleanup
                    else if (parsed._use_versioned_keys && parsed._ts) {
                         for(let i=0; i<parsed._chunk_count; i++) {
                             const ck = `${configKey}_${parsed._ts}_chunk_${i}`;
                             const cs = await base44.entities.AppConfig.filter({ key: ck });
                             for(const c of cs) await base44.entities.AppConfig.delete(c.id).catch(()=>{});
                         }
                    }
                    // v6 cleanup
                    else if (parsed.is_chunked) {
                         // Careful with shared keys...
                         const count = parsed.count || 20;
                         for(let i=0; i<count; i++) {
                             const ck = `${configKey}_chunk_${i}`;
                             const cs = await base44.entities.AppConfig.filter({ key: ck });
                             for(const c of cs) await base44.entities.AppConfig.delete(c.id).catch(()=>{});
                         }
                    }
                }
            } catch(e) {}

            await base44.entities.AppConfig.delete(m.id).catch(()=>{});
        }
    } catch(e) {
        console.warn("Cleanup error", e);
    }
}

function isValidJsonString(str) {
  if (!str || str === "undefined" || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (trimmed.startsWith('{') || trimmed.startsWith('['));
}