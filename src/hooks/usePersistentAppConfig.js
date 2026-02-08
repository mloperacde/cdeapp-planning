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
        console.log(`[Config] Fetching ${configKey} (v8 Aggressive Strategy)...`);
        
        // CLIENT-SIDE CONSISTENCY CHECK
        // If we recently saved data, ensure we don't return older data.
        let minRequiredTimestamp = 0;
        try {
            const localTs = localStorage.getItem(`last_save_ts_${configKey}`);
            if (localTs) minRequiredTimestamp = parseInt(localTs, 10);
        } catch(e) {}

        const MAX_RETRIES = 5;
                        const RETRY_DELAY = 1000;
                        let bestCandidateSoFar = null;

                        // ESTRATEGIA v9: DIRECT ID FETCH (Bypass Indexing Lag)
                        // Si tenemos un ID conocido localmente, intentemos leerlo directamente antes de buscar.
                        try {
                            const lastSaveId = localStorage.getItem(`last_save_id_${configKey}`);
                            if (lastSaveId) {
                                console.log(`[Config] Direct Fetch Attempt for ${configKey} using ID ${lastSaveId}...`);
                                const directRecord = await base44.entities.AppConfig.get(lastSaveId);
                                if (directRecord) {
                                    // Validar que corresponda a la key
                                    if (directRecord.key === configKey || directRecord.config_key === configKey) {
                                        console.log(`[Config] Direct Fetch SUCCESS for ${lastSaveId}`);
                                        toast.success(`⚡ Datos sincronizados instantáneamente (v9)`, { duration: 2000 });
                                        
                                        // LOGICA DE PARSEO DUPLICADA (Para evitar refactor masivo)
                                        let record = directRecord;
                                        let jsonString = record.value;
                                        // Simple heuristic instead of helper function to avoid reference errors
                                        if ((!jsonString || !jsonString.trim().startsWith('{')) && record.description && record.description.trim().startsWith('{')) jsonString = record.description;
                                        if ((!jsonString || !jsonString.trim().startsWith('{')) && record.app_subtitle && record.app_subtitle.trim().startsWith('{')) jsonString = record.app_subtitle;

                                        if (jsonString && jsonString.trim().startsWith('{')) {
                                            const parsed = JSON.parse(jsonString);
                                            // Asumimos v8 porque acabamos de guardar
                                            if (parsed._v === 8) {
                                                if (parsed._is_chunked && parsed._chunk_ids && parsed._chunk_ids.length > 0) {
                                                    // Fetch Chunks
                                                    const chunkPromises = parsed._chunk_ids.map(id => base44.entities.AppConfig.get(id).catch(e => null));
                                                    const chunkResults = await Promise.all(chunkPromises);
                                                    const chunks = chunkResults.map(c => {
                                                        if (!c) return "";
                                                        let val = c.value || c.description || (c.app_subtitle !== "chunk" ? c.app_subtitle : "") || "";
                                                        return val;
                                                    });
                                                    const fullJson = chunks.join('');
                                                    if (fullJson) return JSON.parse(fullJson);
                                                } else {
                                                    return parsed.data;
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        } catch(e) {
                            console.warn(`[Config] Direct fetch failed for ${configKey}`, e);
                        }

                        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            if (attempt > 0) {
                console.log(`[Config] Attempt ${attempt}: Data stale (TS < ${minRequiredTimestamp}), retrying in ${RETRY_DELAY}ms...`);
                await new Promise(r => setTimeout(r, RETRY_DELAY));
            }

            // ESTRATEGIA AGRESIVA DE LECTURA (Paralela)
            const [byKey, byConfigKey, recentItems] = await Promise.all([
                 base44.entities.AppConfig.filter({ key: configKey }).catch(() => []),
                 base44.entities.AppConfig.filter({ config_key: configKey }).catch(() => []),
                 base44.entities.AppConfig.list('-updated_at', 50).catch(() => [])
            ]);
    
            let matches = [...(byKey || []), ...(byConfigKey || [])];
    
            // Merge manual matches from recent list
            const manualMatches = recentItems.filter(item => 
                item.key === configKey || item.config_key === configKey
            );
            
            if (manualMatches.length > 0) {
                matches = [...matches, ...manualMatches];
            }
    
            // Deduplicate matches by ID
            matches = Array.from(new Map(matches.map(item => [item.id, item])).values());
    
            if (!matches || matches.length === 0) {
              if (minRequiredTimestamp > 0 && attempt < MAX_RETRIES) continue; // Retry if we expect data
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
                        let chunkIds = []; 
                        let chunkCount = 0;
                        let useVersionedKeys = false;
                        let content = parsed;
                        let version = parsed._v || 7;
    
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
                            timestamp: isNaN(timestamp) ? 0 : timestamp,
                            isChunked,
                            chunkIds,
                            chunkCount,
                            useVersionedKeys,
                            content,
                            version
                        });
                    } catch(e) { console.warn(`Failed to parse ${record.id}`, e); }
                }
            }
    
            if (candidates.length === 0) {
                 if (minRequiredTimestamp > 0 && attempt < MAX_RETRIES) continue;
                 return initialData;
            }
    
            // Sort by Internal Timestamp (Descending)
            candidates.sort((a, b) => b.timestamp - a.timestamp);
            const winner = candidates[0];
            
        // CHECK CONSISTENCY
        if (minRequiredTimestamp > 0 && winner.timestamp < minRequiredTimestamp) {
            console.warn(`[Config] Found winner TS ${winner.timestamp} < Required ${minRequiredTimestamp}. Retrying...`);
            continue; // Retry loop
        }

        console.log(`[Config] Winner: ${winner.id} (v${winner.version}, ts: ${winner.timestamp})`);
        
        // Save best candidate if we need to fallback
        bestCandidateSoFar = winner;

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
                         if (attempt < MAX_RETRIES) continue; // Retry might find missing chunks? Unlikely for ID fetch but good practice
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
                     if (attempt < MAX_RETRIES) continue;
                     return initialData;
                 }
            }
    
            if (isArray && !Array.isArray(winner.content)) return initialData;
            return winner.content;
        } // End Retry Loop

        // Fallback if consistency check failed but we found SOMETHING
        if (!initialData && bestCandidateSoFar) {
             console.warn(`[Config] Consistency Timeout. Using best candidate found (TS: ${bestCandidateSoFar.timestamp})`);
             const winner = bestCandidateSoFar;

             if (winner.isChunked) {
                 if (winner.version === 8 && winner.chunkIds.length > 0) {
                     try {
                         const chunkPromises = winner.chunkIds.map(id => base44.entities.AppConfig.get(id).catch(e => null));
                         const chunkResults = await Promise.all(chunkPromises);
                         const chunks = chunkResults.map(c => {
                             if (!c) return "";
                             let val = c.value || c.description || (c.app_subtitle !== "chunk" ? c.app_subtitle : "") || "";
                             return val;
                         });
                         const fullJson = chunks.join('');
                         if (fullJson) return JSON.parse(fullJson);
                     } catch(e) { console.error("Fallback chunk fetch failed", e); }
                 }
             } else {
                 return winner.content;
             }
        }
        
        return initialData; // Should theoretically not reach here if loop works right

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
          // Store Local Timestamp AND ID for Client-Side Consistency Check
          try {
             if (typeof localStorage !== 'undefined') {
                 localStorage.setItem(`last_save_ts_${configKey}`, timestamp.toString());
                 localStorage.setItem(`last_save_id_${configKey}`, newMasterId);
                 console.log(`[Config] Saved local consistency tokens: TS=${timestamp}, ID=${newMasterId}`);
             }
          } catch(e) {}
          
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
          // AWAIT CLEANUP to ensure old data is gone before returning
          await cleanupOldVersions(configKey, newMasterId);
      }

      return { success: true };
    },
    onSuccess: (data, variables) => {
      // Invalidate both the writer key AND the reader key if they differ
      // Common reader keys: 'rolesConfig', 'onboardingTrainingResources', 'roles_config'
      
      const keysToInvalidate = [
          [queryKeyName],
          [configKey], // often the same as configKey
          ['rolesConfig'], // explicitly for roles
          ['roles_config']
      ];
      
      keysToInvalidate.forEach(k => {
          queryClient.removeQueries({ queryKey: k });
          queryClient.invalidateQueries({ queryKey: k });
      });

      queryClient.setQueryData([queryKeyName], variables);
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
    save: mutation.mutateAsync,
    isSaving: mutation.isPending
  };
}

// Background cleanup helper
async function cleanupOldVersions(configKey, keepMasterId) {
    try {
        console.log(`[Cleanup] Starting aggressive cleanup for ${configKey}, keeping ${keepMasterId}`);
        
        // 1. Find ALL candidates (Filter + Recent List)
        const [byKey, byConfigKey, recentItems] = await Promise.all([
             base44.entities.AppConfig.filter({ key: configKey }).catch(() => []),
             base44.entities.AppConfig.filter({ config_key: configKey }).catch(() => []),
             base44.entities.AppConfig.list('-updated_at', 100).catch(() => [])
        ]);

        let matches = [...(byKey || []), ...(byConfigKey || [])];
        const recentMatches = recentItems.filter(r => r.key === configKey || r.config_key === configKey);
        matches = [...matches, ...recentMatches];

        // Deduplicate by ID
        matches = Array.from(new Map(matches.map(item => [item.id, item])).values());
        
        if (!matches || matches.length === 0) return;

        let deletedCount = 0;
        for (const m of matches) {
            if (m.id === keepMasterId) continue;
            
            console.log(`[Cleanup] Deleting obsolete master: ${m.id}`);
            
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
            deletedCount++;
        }
        console.log(`[Cleanup] Deleted ${deletedCount} obsolete records.`);
    } catch(e) {
        console.warn("Cleanup error", e);
    }
}

function isValidJsonString(str) {
  if (!str || str === "undefined" || typeof str !== 'string') return false;
  const trimmed = str.trim();
  return (trimmed.startsWith('{') || trimmed.startsWith('['));
}