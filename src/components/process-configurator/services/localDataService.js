import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';

const STORAGE_KEYS = {
  ACTIVITIES: 'pc_activities',
  PROCESSES: 'pc_processes',
  ARTICLES: 'pc_articles'
};

// Helper to simulate async delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const localDataService = {
  // --- API Persistence Helpers ---

  async _findEntity(entityName, criteria) {
      try {
          // Use filter method from base44 client
          // Note: Real SDK might behave differently than Mock. 
          // We assume filter returns an array of matches.
          const results = await base44.entities[entityName].filter(criteria);
          return results && results.length > 0 ? results[0] : null;
      } catch (error) {
          console.warn(`Failed to find ${entityName} with criteria ${JSON.stringify(criteria)}:`, error);
          return null;
      }
  },

  async saveActivityToApi(activity) {
      try {
          // Check if exists by number
          const existing = await this._findEntity('Activity', { number: activity.number });
          
          if (existing) {
              console.log(`Updating Activity ${activity.number}...`);
              return await base44.entities.Activity.update(existing.id, {
                  name: activity.name,
                  time_seconds: activity.time_seconds
              });
          } else {
              console.log(`Creating Activity ${activity.number}...`);
              return await base44.entities.Activity.create({
                  number: activity.number,
                  name: activity.name,
                  time_seconds: activity.time_seconds
              });
          }
      } catch (error) {
          console.error(`Failed to save Activity ${activity.number}:`, error);
          throw error;
      }
  },

  async saveProcessToApi(process) {
      try {
          const existing = await this._findEntity('Process', { code: process.code });
          
          const payload = {
              code: process.code,
              name: process.name,
              activity_numbers: process.activity_numbers, // Ensure backend handles array
              // API might expect relation IDs instead of numbers, but we'll try sending numbers 
              // as per user's "Guardar en BD" request implies data preservation.
              // If backend has strict schema, this might need adjustment.
          };

          if (existing) {
              return await base44.entities.Process.update(existing.id, payload);
          } else {
              return await base44.entities.Process.create(payload);
          }
      } catch (error) {
          console.error(`Failed to save Process ${process.code}:`, error);
          throw error;
      }
  },

  async saveArticleToApi(article) {
      try {
          const existing = await this._findEntity('Article', { code: article.code });
          
          // Clean payload (remove UI-only fields if necessary, but base44 SDK usually ignores extras)
          // We send everything relevant
          const payload = {
              code: article.code,
              name: article.name,
              description: article.description,
              client: article.client,
              reference: article.reference,
              type: article.type,
              process_code: article.process_code,
              operators_required: article.operators_required,
              total_time_seconds: article.total_time_seconds,
              active: article.active,
              status_article: article.status_article,
              injet: article.injet,
              laser: article.laser,
              etiquetado: article.etiquetado,
              celo: article.celo,
              unid_box: article.unid_box,
              unid_pallet: article.unid_pallet,
              multi_unid: article.multi_unid
          };

          if (existing) {
              return await base44.entities.Article.update(existing.id, payload);
          } else {
              return await base44.entities.Article.create(payload);
          }
      } catch (error) {
          console.error(`Failed to save Article ${article.code}:`, error);
          throw error;
      }
  },

  async deleteArticleFromApi(id) {
      try {
          // If id starts with 'art_', it's a local ID. We need the backend ID.
          // However, if we loaded from API, the 'id' field in memory IS the backend ID 
          // (because we mapped it in fetchApiArticles, see below).
          // Wait, in fetchApiArticles I mapped `id: existing ? existing.id : 'art_' + code`.
          // So if it came from API, it has a backend ID.
          // If it's local-only (art_...), we can't delete from backend (it's not there).
          
          if (String(id).startsWith('art_')) {
              console.warn("Skipping API delete for local-only ID:", id);
              return;
          }
          
          return await base44.entities.Article.delete(id);
      } catch (error) {
          console.error(`Failed to delete Article ${id}:`, error);
          throw error;
      }
  },

  // --- Data Management (Excel Parsing) ---
  
  // New method to fetch master activities from API
  async fetchApiActivities() {
      try {
          // Use list() from base44 client
          // We fetch all (limit 1000 for now, might need pagination loop for production)
          const apiActivities = await base44.entities.Activity.list(undefined, 1000) || [];
          
          console.log(`Fetched ${apiActivities.length} activities from API`);
          
          // Merge with local data
          const localActivities = await this.getLocalActivities();
          const localMap = new Map(localActivities.map(a => [a.number.toString(), a]));
          
          const merged = apiActivities.map(apiAct => {
              const local = localMap.get(apiAct.number.toString());
              return {
                  id: apiAct.id, // Use backend ID
                  number: apiAct.number,
                  name: apiAct.name, 
                  time_seconds: apiAct.time_seconds || local?.time_seconds || 0 
              };
          });

          // Add local-only activities
          const apiNumbers = new Set(apiActivities.map(a => a.number.toString()));
          localActivities.forEach(local => {
              if (!apiNumbers.has(local.number.toString())) {
                  merged.push(local);
              }
          });
          
          localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(merged));
          return merged;
      } catch (error) {
          console.error("Error syncing activities with API:", error);
          return this.getLocalActivities();
      }
  },

  async fetchApiProcesses() {
    try {
        const activities = await this.getLocalActivities();
        const activityMap = new Map(activities.map(a => [a.number.toString(), a]));

        const apiProcesses = await base44.entities.Process.list(undefined, 1000) || [];
        console.log(`Fetched ${apiProcesses.length} processes from API`);

        // Convert API format to internal format
        const convertedProcesses = apiProcesses.map(p => {
            const activityRefs = p.activity_numbers || [];
            const procActivities = [];
            let totalTime = 0;
            const pCode = String(p.code || '');

            activityRefs.forEach(num => {
                const act = activityMap.get(num.toString());
                if (act) {
                    totalTime += act.time_seconds;
                    procActivities.push(act);
                }
            });

            return {
                id: p.id, // Use backend ID
                code: pCode,
                name: p.name || pCode,
                activity_numbers: activityRefs,
                total_time_seconds: totalTime,
                activities_count: procActivities.length,
                activity_ids: procActivities.map(a => a.id)
            };
        });

        // Merge with local processes
        const localProcesses = await this.getLocalProcesses();
        const existingCodes = new Set(localProcesses.map(p => String(p.code)));
        const apiCodes = new Set(convertedProcesses.map(p => p.code));

        // Add API processes that aren't in local (or update them?)
        // Better: Rebuild list from API + Local-Only
        
        const merged = [...convertedProcesses];
        
        localProcesses.forEach(local => {
            if (!apiCodes.has(local.code)) {
                merged.push(local);
            }
        });
        
        localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(merged));
        return merged;
    } catch (error) {
        console.error("Error syncing processes with API:", error);
        return this.getLocalProcesses();
    }
  },

  async fetchApiArticles() {
    try {
        const apiArticles = await base44.entities.Article.list(undefined, 1000) || [];
        console.log(`Fetched ${apiArticles.length} articles from API`);

        const localArticles = await this.getLocalArticles();
        
        const mergedArticles = [...localArticles];
        const existingMap = new Map(localArticles.map(a => [a.code, a]));

        let addedCount = 0;
        let updatedCount = 0;

        // Helper to find value by multiple keys (case-insensitive)
        const getValue = (obj, keys) => {
            if (!obj) return null;
            const objKeys = Object.keys(obj);
            for (const key of keys) {
                if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                const foundKey = objKeys.find(k => k.toLowerCase() === key.toLowerCase());
                if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) return obj[foundKey];
            }
            return null;
        };

        apiArticles.forEach(apiArt => {
            const code = getValue(apiArt, ['code', 'codigo', 'id', 'article_code']) || `unknown_${Date.now()}`;
            const existing = existingMap.get(code);
            
            // Map API fields
            let articleType = getValue(apiArt, ['type', 'tipo']) || "";
            
            // Fallback: Infer type from code if missing
            if (!articleType && code) {
                const prefix = code.substring(0, 2).toUpperCase();
                const prefix3 = code.substring(0, 3).toUpperCase();
                const prefix4 = code.substring(0, 4).toUpperCase();
                
                if (prefix === 'FR') articleType = 'Frasco';
                else if (prefix === 'SA') articleType = 'Sachet';
                else if (prefix === 'TA') articleType = 'Tarro';
                else if (prefix3 === 'BOL') articleType = 'Bolsa';
                else if (prefix === 'BO') articleType = 'Bote';
                else if (prefix === 'ES') articleType = 'Estuche';
                else if (prefix3 === 'ENV') articleType = 'Envase';
                else if (prefix === 'DP') articleType = 'Diptico';
                else if (prefix === 'ST') articleType = 'Sachet Toallita';
                else if (prefix === 'TU') articleType = 'Tubo';
                else if (prefix4 === 'EASY') articleType = 'Easysnap';
            }

            const mappedArticle = {
                id: apiArt.id, // Use backend ID
                code: code,
                name: getValue(apiArt, ['name', 'nombre']) || code,
                description: getValue(apiArt, ['description', 'descripcion']) || "",
                client: getValue(apiArt, ['client_name', 'client', 'cliente']) || "",
                reference: getValue(apiArt, ['reference', 'referencia']) || "",
                type: articleType,
                process_code: getValue(apiArt, ['process_code', 'process']) || null,
                operators_required: parseInt(getValue(apiArt, ['operators_required', 'operators', 'operator_cost']) || 1),
                total_time_seconds: parseFloat(getValue(apiArt, ['total_time_seconds', 'total_time', 'time_seconds']) || 0),
                updated_at: new Date().toISOString(),
                // Map new fields
                active: getValue(apiArt, ['active', 'activo']) !== false,
                status_article: getValue(apiArt, ['status_article', 'status']) || "PENDIENTE",
                injet: !!getValue(apiArt, ['injet']),
                laser: !!getValue(apiArt, ['laser']),
                etiquetado: !!getValue(apiArt, ['etiquetado']),
                celo: !!getValue(apiArt, ['celo']),
                unid_box: parseInt(getValue(apiArt, ['unid_box']) || 0),
                unid_pallet: parseInt(getValue(apiArt, ['unid_pallet']) || 0),
                multi_unid: parseInt(getValue(apiArt, ['multi_unid']) || 1),
                
                raw_data: apiArt
            };

            if (existing) {
                Object.assign(existing, mappedArticle);
                updatedCount++;
            } else {
                mergedArticles.push(mappedArticle);
                existingMap.set(mappedArticle.code, mappedArticle);
                addedCount++;
            }
        });

        console.log(`Synced Articles: ${addedCount} added, ${updatedCount} updated.`);
        localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(mergedArticles));
        
        return mergedArticles;
    } catch (error) {
        console.error("Error syncing articles with API:", error);
        return this.getLocalArticles();
    }
  },

  async processExcel(file) {
    await delay(500);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          let activities = [];
          let processes = [];
          
          // --- Strategy 1: Look for specific sheets ---
          const sheetActivities = workbook.Sheets['ACTIVIDADES'];
          const sheetProcesses = workbook.Sheets['PROCESOS'];
          const sheetListadoProcesos = workbook.Sheets['LISTADO DE PROCESOS'];
          
          if (sheetActivities || sheetProcesses || sheetListadoProcesos) {
            // Parse ACTIVIDADES sheet
            if (sheetActivities) {
              const data = XLSX.utils.sheet_to_json(sheetActivities, { header: 1 });
              
              // Mapeo específico solicitado: Columna A (0) = Nombre, Columna B (1) = Código
              activities = [];
              data.forEach(row => {
                  if (!row || row.length < 2) return;
                  
                  const nameRaw = row[0]; // Col A
                  const codeRaw = row[1]; // Col B
                  
                  // El código debe ser numérico (regla del proyecto)
                  if (codeRaw !== undefined && codeRaw !== null) {
                      const strVal = String(codeRaw).trim();
                      if (strVal === "") return;
                      
                      const number = Number(strVal);
                      if (!isNaN(number)) {
                          activities.push({
                              id: `act_${number}`,
                              number: number,
                              name: nameRaw ? String(nameRaw).trim() : `Actividad ${number}`,
                              time_seconds: 0
                          });
                      }
                  }
              });
              
              // Fallback si no se encontró nada (por si acaso el usuario se equivocó y usa el formato antiguo)
              if (activities.length === 0 && data.length > 0) {
                  console.warn("Mapeo estricto (A=Nombre, B=Código) no produjo resultados. Intentando detección automática...");
                  activities = this._parseActivitiesFromData(data);
              }
            }
            
            // Parse PROCESOS sheet
            if (sheetProcesses) {
              const data = XLSX.utils.sheet_to_json(sheetProcesses, { header: 1 });
              
              // Mapeo específico solicitado: Columna A (0) = Actividades, Columna B (1) = Código Proceso
              processes = [];
              data.forEach(row => {
                  if (!row || row.length < 2) return;
                  
                  const activitiesRaw = row[0]; // Col A
                  const codeRaw = row[1];       // Col B
                  
                  if (codeRaw !== undefined && codeRaw !== null) {
                      const processCode = String(codeRaw).trim();
                      if (!processCode) return;
                      
                      // Parse activities from Col A
                      let activityRefs = [];
                      if (activitiesRaw !== undefined && activitiesRaw !== null) {
                          const strVal = String(activitiesRaw);
                          // Split by common separators (space, comma, hyphen, etc.)
                          // Filter for valid numbers
                          const tokens = strVal.split(/[\s,.-]+/);
                          const numberSet = new Set();
                          
                          tokens.forEach(token => {
                              const trimmed = token.trim();
                              // Ensure it is a pure number
                              if (!isNaN(Number(trimmed)) && trimmed !== "") {
                                  numberSet.add(Number(trimmed));
                              }
                          });
                          
                          // Sort for consistency
                          activityRefs = Array.from(numberSet).sort((a, b) => a - b);
                      }
                      
                      // Solo agregamos si tiene actividades válidas
                      if (activityRefs.length > 0) {
                          processes.push({
                              id: `proc_${processCode.replace(/\s+/g, '_')}`,
                              code: processCode,
                              name: processCode, // Use code as name by default
                              activity_numbers: activityRefs,
                              activities_count: activityRefs.length,
                              total_time_seconds: 0 // Will be calculated later
                          });
                      }
                  }
              });

              // Fallback logic if strict mapping failed
              if (processes.length === 0 && data.length > 0) {
                   console.warn("Mapeo estricto PROCESOS (A=Actividades, B=Código) sin resultados. Usando detección automática...");
                   processes = this._parseProcessesFromData(data);
              }
            }

            // Parse LISTADO DE PROCESOS sheet
             if (sheetListadoProcesos) {
                const data = XLSX.utils.sheet_to_json(sheetListadoProcesos, { header: 1 });
                
                let foundProcesses = [];
                
                // Try Matrix parsing FIRST
                foundProcesses = this._parseProcessesFromMatrix(data, activities);
                
                // If successful, we might need to backfill activities that don't exist yet
                if (foundProcesses.length > 0) {
                    const existingActivityNums = new Set(activities.map(a => a.number.toString()));
                    const usedActivityNums = new Set();
                    
                    foundProcesses.forEach(p => {
                        p.activity_numbers.forEach(num => usedActivityNums.add(num));
                    });
                    
                    usedActivityNums.forEach(num => {
                        if (!existingActivityNums.has(num.toString())) {
                            activities.push({
                                id: `act_${num}`,
                                number: num,
                                name: `Actividad ${num}`,
                                time_seconds: 0
                            });
                        }
                    });
                }

                // If Matrix parsing found nothing, try Standard parsing
                if (foundProcesses.length === 0) {
                    foundProcesses = this._parseProcessesFromData(data);
                }

                // Append found processes
                if (foundProcesses.length > 0) {
                    const existingCodes = new Set(processes.map(p => p.code));
                    foundProcesses.forEach(p => {
                        if (!existingCodes.has(p.code)) {
                            processes.push(p);
                        }
                    });
                }
             }
            
            // If we have activities but no processes, maybe processes are in the same sheet? 
            // Or maybe the user only uploaded activities.
            // If we have processes but no activities, we might have an issue linking them.
            
          } else {
            // --- Strategy 2: Fallback to first sheet containing everything ---
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            // Try to extract both from same sheet (Standard List Format)
            activities = this._parseActivitiesFromData(data);
            processes = this._parseProcessesFromData(data);

            // Check if we found valid linked processes. 
            // If not, it might be a Matrix format where activities are headers.
            const processesHaveActivities = processes.some(p => p.activity_numbers && p.activity_numbers.length > 0);
            
            if (!processesHaveActivities || activities.length === 0) {
                 console.log("Standard parsing yielded poor results. Attempting Matrix parsing...");
                 const matrixProcesses = this._parseProcessesFromMatrix(data, activities);
                 
                 if (matrixProcesses.length > 0) {
                     console.log(`Matrix parsing found ${matrixProcesses.length} processes.`);
                     // Use matrix processes
                     processes = matrixProcesses;
                     
                     // Backfill activities from Matrix headers (since they weren't in rows)
                     const existingActivityNums = new Set(activities.map(a => a.number.toString()));
                     const usedActivityNums = new Set();
                     
                     matrixProcesses.forEach(p => {
                         p.activity_numbers.forEach(num => usedActivityNums.add(num));
                     });
                     
                     usedActivityNums.forEach(num => {
                         if (!existingActivityNums.has(num.toString())) {
                             activities.push({
                                 id: `act_${num}`,
                                 number: num,
                                 name: `Actividad ${num}`,
                                 time_seconds: 0
                             });
                         }
                     });
                 }
            }
          }

          // Calculate process totals and Deduplicate by Activity Combination
          const activityMap = new Map(activities.map(a => [a.number.toString(), a]));
          const uniqueSignatureMap = new Map();
          
          processes.forEach(proc => {
            let totalTime = 0;
            const procActivities = [];
            
            if (proc.activity_numbers && Array.isArray(proc.activity_numbers)) {
                proc.activity_numbers.forEach(num => {
                  const act = activityMap.get(num.toString());
                  if (act) {
                    totalTime += act.time_seconds;
                    procActivities.push(act);
                  }
                });
            }
            
            // LOGIC: Each process is a set of activities.
            // Different combinations of activities = different process.
            // Therefore, we deduplicate by activity combination.
            if (procActivities.length > 0) {
                // Create unique signature based on sorted activity numbers
                const signature = procActivities
                    .map(a => a.number)
                    .sort((a, b) => a - b)
                    .join('|');

                proc.total_time_seconds = totalTime;
                proc.activities_count = procActivities.length;
                proc.activity_ids = procActivities.map(a => a.id);
                
                // Store in map (Last one wins, effectively merging/updating if duplicate)
                uniqueSignatureMap.set(signature, proc);
            }
          });

          // Replace processes list with unique ones
          processes = Array.from(uniqueSignatureMap.values());

          // Save to localStorage
          if (activities.length > 0) localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
          if (processes.length > 0) localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(processes));

          // --- API Persistence (New) ---
          // Save imported data to backend for persistence
          try {
             if (activities.length > 0) {
                 console.log(`Syncing ${activities.length} activities to API...`);
                 // Use Promise.allSettled to ensure partial failures don't block everything
                 await Promise.allSettled(activities.map(a => this.saveActivityToApi(a)));
             }
             if (processes.length > 0) {
                 console.log(`Syncing ${processes.length} processes to API...`);
                 await Promise.allSettled(processes.map(p => this.saveProcessToApi(p)));
             }
             console.log("Excel data synced to API successfully");
          } catch (apiErr) {
             console.error("Failed to sync Excel data to API:", apiErr);
          }

          resolve({
            activities_count: activities.length,
            processes_count: processes.length
          });
        } catch (error) {
          console.error("Error parsing Excel:", error);
          reject(new Error("Error al procesar el archivo Excel. Verifique el formato."));
        }
      };
      
      reader.onerror = () => reject(new Error("Error al leer el archivo."));
      reader.readAsArrayBuffer(file);
    });
  },

  _parseActivitiesFromData(jsonData) {
    const activities = [];
    if (!jsonData || jsonData.length === 0) return activities;

    // Detect headers
    const headers = jsonData[0] || [];
    // Flexible matching for headers, but favoring "numero" or just assuming if it looks like data
    const activityNumIdx = headers.findIndex(h => h && /n[uú]mero|c[oó]digo|id/i.test(h.toString()));
    const activityNameIdx = headers.findIndex(h => h && /actividad|descripci[oó]n|nombre/i.test(h.toString()));
    const activityTimeIdx = headers.findIndex(h => h && /tiempo|segundos|duraci[oó]n/i.test(h.toString()));

    // If headers not found in first row, try second row (index 1)
    let startRow = 1;
    if (activityNumIdx === -1 && jsonData.length > 1) {
        const headers2 = jsonData[1] || [];
        const numIdx2 = headers2.findIndex(h => h && /n[uú]mero|c[oó]digo|id/i.test(h.toString()));
        if (numIdx2 !== -1) {
             // Found headers in row 1
             return this._parseActivitiesFromData(jsonData.slice(1));
        }
    }

    // Iterate rows
    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      // Ensure we have at least a number/code
      // User Spec: Col A (0) = Name, Col B (1) = Code.
      // If headers detected, use them. Else use specific user mapping.
      
      let numberRaw, nameRaw, timeVal;

      if (activityNumIdx !== -1) {
          // Headers detected
          numberRaw = row[activityNumIdx];
          nameRaw = activityNameIdx !== -1 ? row[activityNameIdx] : (row[1] || `Actividad ${numberRaw}`);
          timeVal = activityTimeIdx !== -1 ? row[activityTimeIdx] : row[2];
      } else {
          // No headers or fallback -> User Spec: Col A=Name, Col B=Code
          nameRaw = row[0];
          numberRaw = row[1];
          timeVal = row[2];
      }
      
      // LOGIC: Activities are named with numbers.
      // We accept strings that look like numbers (e.g. "1", "10")
      if (numberRaw !== undefined && numberRaw !== null) {
         // Check if it's a valid number (strict check)
         const strVal = numberRaw.toString().trim();
         const isNumeric = !isNaN(Number(strVal)) && strVal !== "";
         
         if (!isNumeric) continue; // Skip if not a strict number

         const number = Number(strVal);
         const name = nameRaw ? String(nameRaw).trim() : `Actividad ${number}`;
         const time = parseFloat(timeVal) || 0;

        activities.push({
          id: `act_${number}`,
          number: number,
          name: name,
          time_seconds: time
        });
      }
    }
    return activities;
  },

  _parseProcessesFromData(jsonData) {
    const processes = [];
    if (!jsonData || jsonData.length === 0) return processes;

    const headers = jsonData[0] || [];
    const processNameIdx = headers.findIndex(h => h && /proceso|nombre/i.test(h.toString()));
    const processActivitiesIdx = headers.findIndex(h => h && /referencias|actividades|secuencia/i.test(h.toString()));

    // If headers not found in first row, try second row
    let startRow = 1;
    if (processNameIdx === -1 && jsonData.length > 1) {
         const headers2 = jsonData[1] || [];
         if (headers2.some(h => h && /proceso/i.test(h.toString()))) {
             return this._parseProcessesFromData(jsonData.slice(1));
         }
    }

    for (let i = startRow; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row || row.length === 0) continue;

      let name, activityRefsRaw;

      if (processNameIdx !== -1) {
          // Headers detected
          name = row[processNameIdx];
          activityRefsRaw = processActivitiesIdx !== -1 ? row[processActivitiesIdx] : row[1];
      } else {
          // No headers or fallback -> User Spec: Col A=Activities, Col B=Process Code
          activityRefsRaw = row[0];
          name = row[1];
      }
      
      // LOGIC: Processes are named with letters or combinations of letters.
      // We validate that the name contains letters.
      if (name && typeof name === 'string') {
        // Simple check: should have at least one letter and preferably not just numbers
        // But user said "Letters or combinations of letters", so "A", "AB" are valid. "1" is not.
        const isLetterBased = /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        
        if (isLetterBased || (processNameIdx !== -1)) { // Trust explicit header if present
            const activityRefsRaw = processActivitiesIdx !== -1 ? row[processActivitiesIdx] : (row[1] || "");
            
            let activityRefs = [];
            if (activityRefsRaw) {
                // Split by common separators, filter numbers, convert to Number type
                const tokens = activityRefsRaw.toString().split(/[\s,-]+/);
                const numberSet = new Set();
                
                tokens.forEach(token => {
                     const trimmed = token.trim();
                     if (!isNaN(Number(trimmed)) && trimmed !== "") {
                         numberSet.add(Number(trimmed));
                     }
                });
                // Sort to ensure consistent signature (Set logic)
                activityRefs = Array.from(numberSet).sort((a, b) => a - b);
            }
            
            if (activityRefs.length > 0 || isLetterBased) {
                processes.push({
                id: `proc_${name.replace(/\s+/g, '_')}`,
                code: name,
                name: name,
                activity_numbers: activityRefs,
                });
            }
        }
      }
    }
    return processes;
  },

  _parseProcessesFromMatrix(jsonData, knownActivities = []) {
    const processes = [];
    if (!jsonData || jsonData.length === 0) return processes;

    // LOGIC: Activities are Numbers (Headers). Processes are Letters (Row Labels).

    // 1. Find Header Row: The row that contains mostly Numbers.
    let headerRowIndex = -1;
    let maxNumberMatches = 0;

    for (let r = 0; r < Math.min(10, jsonData.length); r++) {
        const row = jsonData[r];
        if (!row || row.length < 2) continue;

        let numberCount = 0;
        let totalCells = 0;
        for (let c = 1; c < row.length; c++) { // Skip first column (Process names)
            const cell = row[c];
            if (cell !== undefined && cell !== null && cell !== "") {
                totalCells++;
                // Check if cell is a number (Activity ID)
                if (!isNaN(parseFloat(cell))) {
                    numberCount++;
                }
            }
        }
        
        // If this row has significant numeric content, it's likely the header
        if (numberCount > maxNumberMatches && numberCount > 0) {
            maxNumberMatches = numberCount;
            headerRowIndex = r;
        }
    }

    if (headerRowIndex === -1) {
        // Fallback: If we have known activities, try to match them
         if (knownActivities.length > 0) {
             const activityMap = new Map(knownActivities.map(a => [a.number.toString(), a]));
             let maxMatches = 0;
             for (let r = 0; r < Math.min(5, jsonData.length); r++) {
                const row = jsonData[r];
                if (!row) continue;
                let matches = 0;
                for (let c = 1; c < row.length; c++) {
                    if (row[c] && activityMap.has(row[c].toString())) matches++;
                }
                if (matches > maxMatches) {
                    maxMatches = matches;
                    headerRowIndex = r;
                }
             }
         }
    }

    if (headerRowIndex === -1) return [];

    const headers = jsonData[headerRowIndex];
    const activityCols = []; 

    // Identify Activity Columns (Must be numbers)
    for (let i = 1; i < headers.length; i++) {
        const headerVal = headers[i];
        if (headerVal !== undefined && headerVal !== null) {
             const headerStr = headerVal.toString().trim();
             // Strict check: Header must be a number (Activity ID)
             // Using Number() instead of parseFloat() to avoid "1A" -> 1
             if (!isNaN(Number(headerStr)) && headerStr !== "") {
                 activityCols.push({ index: i, activityNumber: headerStr });
             }
        }
    }

    if (activityCols.length === 0) return [];

    // Process rows starting AFTER the header row
    for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || !row[0]) continue; 

        const processName = row[0].toString().trim();
        
        // LOGIC: Processes are Letters.
        // Skip if it looks like a number (likely misinterpretation or just data)
        if (/^\d+$/.test(processName)) continue;
        // Must contain letters
        if (!/[a-zA-Z]/.test(processName)) continue;

        // Skip obvious header repetitions
        if (/^(proceso|nombre|c[oó]digo|descripci[oó]n)$/i.test(processName)) continue;

        const processActivities = [];

        activityCols.forEach(col => {
             const cellValue = row[col.index];
             // In matrix, existence of value usually means "contains activity"
             // Or sometimes it's the time. 
             // We assume if cell is not empty/null/0, it's part of the process.
             if (cellValue !== undefined && cellValue !== null && cellValue !== "" && cellValue != 0) {
                 processActivities.push(Number(col.activityNumber));
             }
        });

        // Ensure unique and sorted (Set logic)
        const uniqueActivities = Array.from(new Set(processActivities)).sort((a, b) => a - b);

        if (uniqueActivities.length > 0) {
            processes.push({
                id: `proc_${processName.replace(/[^a-zA-Z0-9]/g, '_')}_${i}`,
                code: processName,
                name: processName,
                activity_numbers: uniqueActivities
            });
        }
    }
    return processes;
  },

  // --- Activities & Processes ---

  async saveActivities(activities) {
    await delay(300);
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    
    // Add API persistence for bulk save
    if (activities.length > 0) {
        console.log(`Syncing ${activities.length} activities to API...`);
        try {
            const results = await Promise.allSettled(activities.map(a => this.saveActivityToApi(a)));
            
            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                console.warn(`Failed to sync ${failed.length} activities to API. First error:`, failed[0].reason);
            } else {
                console.log("All activities synced to API successfully");
            }
        } catch (e) {
            console.error("Critical error syncing activities batch to API:", e);
        }
    }
    
    return activities;
  },

  async saveProcesses(processes) {
    await delay(300);
    localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(processes));
    
    // Add API persistence for bulk save
    if (processes.length > 0) {
        console.log(`Syncing ${processes.length} processes to API...`);
        try {
            const results = await Promise.allSettled(processes.map(p => this.saveProcessToApi(p)));
            
            const failed = results.filter(r => r.status === 'rejected');
            if (failed.length > 0) {
                console.warn(`Failed to sync ${failed.length} processes to API. First error:`, failed[0].reason);
            } else {
                console.log("All processes synced to API successfully");
            }
        } catch (e) {
            console.error("Critical error syncing processes batch to API:", e);
        }
    }
    
    return processes;
  },

  async getLocalActivities() {
    await delay();
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    return data ? JSON.parse(data) : [];
  },

  async getActivities() {
      // Always try to sync with API first for persistence
      return this.fetchApiActivities();
  },

  async getLocalProcesses() {
    await delay();
    const data = localStorage.getItem(STORAGE_KEYS.PROCESSES);
    return data ? JSON.parse(data) : [];
  },

  async getProcesses() {
      // Always try to sync with API first
      return this.fetchApiProcesses();
  },

  async getProcess(code) {
    await delay();
    const processes = await this.getProcesses();
    const process = processes.find(p => p.code === code);
    
    if (process) {
        // Hydrate activities
        const allActivities = await this.getActivities();
        const activityMap = new Map(allActivities.map(a => [a.id, a]));
        process.activities = (process.activity_ids || []).map(id => activityMap.get(id)).filter(Boolean);
        return process;
    }
    throw new Error("Proceso no encontrado");
  },

  // --- Article Management ---
  async getLocalArticles() {
    await delay(200);
    const data = localStorage.getItem(STORAGE_KEYS.ARTICLES);
    return data ? JSON.parse(data) : [];
  },

  async getArticles() {
      // Always try to sync with API first
      return this.fetchApiArticles();
  },

  async saveArticles(articles) {
    await delay(300);
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
    
    // Add API persistence for bulk save with Smart Diff/Upsert Strategy
    if (articles.length > 0) {
        console.log(`Syncing ${articles.length} articles to API...`);
        try {
            // Check if Article entity is available
            if (!base44.entities?.Article) {
                console.warn("Entity 'Article' not found in base44 client. Skipping API sync.");
                return articles;
            }

            // 1. Fetch ALL existing articles from API to minimize read operations
            // (Assuming reasonable count, e.g. < 5000)
            const existingApiArticles = await base44.entities.Article.list(undefined, 5000) || [];
            const existingMap = new Map();
            existingApiArticles.forEach(a => {
                // Map by code (primary key for sync)
                if (a.code) existingMap.set(String(a.code).trim(), a);
                // Fallback: Map by ID if code missing? Unlikely for articles.
            });

            const promises = [];
            let created = 0;
            let updated = 0;
            let skipped = 0;

            // Helper to find value by multiple keys (case-insensitive)
            const getValue = (obj, keys) => {
                if (!obj) return null;
                const objKeys = Object.keys(obj);
                for (const key of keys) {
                    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                    const foundKey = objKeys.find(k => k.toLowerCase() === key.toLowerCase());
                    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null) return obj[foundKey];
                }
                return null;
            };

            for (const article of articles) {
                const codeRaw = getValue(article, ['code', 'codigo', 'article_code', 'id']);
                const code = String(codeRaw || article.code || "").trim();
                
                if (!code) continue; // Skip invalid articles

                const existing = existingMap.get(code);

                // Ensure Type is populated
                let articleType = getValue(article, ['type', 'tipo']) || article.type || "";
                if (!articleType) {
                    const prefix = code.substring(0, 2).toUpperCase();
                    const prefix3 = code.substring(0, 3).toUpperCase();
                    const prefix4 = code.substring(0, 4).toUpperCase();
                    
                    if (prefix === 'FR') articleType = 'Frasco';
                    else if (prefix === 'SA') articleType = 'Sachet';
                    else if (prefix === 'TA') articleType = 'Tarro';
                    else if (prefix3 === 'BOL') articleType = 'Bolsa';
                    else if (prefix === 'BO') articleType = 'Bote';
                    else if (prefix === 'ES') articleType = 'Estuche';
                    else if (prefix3 === 'ENV') articleType = 'Envase';
                    else if (prefix === 'DP') articleType = 'Diptico';
                    else if (prefix === 'ST') articleType = 'Sachet Toallita';
                    else if (prefix === 'TU') articleType = 'Tubo';
                    else if (prefix4 === 'EASY') articleType = 'Easysnap';
                }

                // Prepare Payload with Flexible Mapping
                const payload = {
                    code: code,
                    name: getValue(article, ['name', 'nombre']) || article.name || code,
                    description: getValue(article, ['description', 'descripcion']) || article.description || "",
                    client: getValue(article, ['client', 'cliente', 'client_name']) || article.client || "",
                    reference: getValue(article, ['reference', 'referencia']) || article.reference || "",
                    type: articleType,
                    process_code: getValue(article, ['process_code', 'process', 'proceso']) || article.process_code || null,
                    operators_required: parseInt(getValue(article, ['operators_required', 'operators', 'operarios', 'operator_cost']) || article.operators_required || 1),
                    total_time_seconds: parseFloat(getValue(article, ['total_time_seconds', 'total_time', 'tiempo']) || article.total_time_seconds || 0),
                    active: getValue(article, ['active', 'activo']) !== false,
                    status_article: getValue(article, ['status_article', 'status', 'estado']) || article.status_article || "PENDIENTE",
                    injet: !!getValue(article, ['injet']),
                    laser: !!getValue(article, ['laser']),
                    etiquetado: !!getValue(article, ['etiquetado']),
                    celo: !!getValue(article, ['celo']),
                    unid_box: parseInt(getValue(article, ['unid_box']) || article.unid_box || 0),
                    unid_pallet: parseInt(getValue(article, ['unid_pallet']) || article.unid_pallet || 0),
                    multi_unid: parseInt(getValue(article, ['multi_unid']) || article.multi_unid || 1)
                };

                if (existing) {
                    // Diff Check: Only update if fields changed
                    const hasChanges = Object.keys(payload).some(key => {
                        const newVal = payload[key];
                        const oldVal = existing[key];
                        
                        // Strict equality check first
                        if (newVal === oldVal) return false;
                        
                        // Loose equality for falsy values (null vs undefined vs "")
                        if (!newVal && !oldVal) return false;
                        
                        // Number comparison (handle string numbers)
                        if (typeof newVal === 'number' && Number(oldVal) === newVal) return false;
                        
                        return true;
                    });

                    if (hasChanges) {
                        promises.push(base44.entities.Article.update(existing.id, payload));
                        updated++;
                    } else {
                        skipped++;
                    }
                } else {
                    promises.push(base44.entities.Article.create(payload));
                    created++;
                }
            }

            // Execute writes in parallel
            if (promises.length > 0) {
                const results = await Promise.allSettled(promises);
                
                const failed = results.filter(r => r.status === 'rejected');
                if (failed.length > 0) {
                    console.warn(`Failed to sync ${failed.length} articles to API. First error:`, failed[0].reason);
                } else {
                    console.log(`All articles synced to API successfully. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
                }
            } else {
                console.log(`Sync complete. No changes detected (${skipped} skipped).`);
            }
        } catch (e) {
            console.error("Critical error syncing articles batch to API:", e);
        }
    }
    
    return articles;
  },

  async getArticle(id) {
    await delay();
    const articles = await this.getArticles();
    const article = articles.find(a => a.id === id);
    if (article) {
      // Hydrate activities detail for display
      const allActivities = await this.getActivities();
      const activityMap = new Map(allActivities.map(a => [a.id, a]));
      article.activities_detail = (article.selected_activities || [])
        .map(actId => activityMap.get(actId))
        .filter(Boolean);
      return article;
    }
    return null;
  },

  async createArticle(data) {
    return this.saveArticle(data);
  },

  async updateArticle(id, data) {
    return this.saveArticle({ ...data, id });
  },

  async saveArticle(articleData) {
    await delay();
    let articles = await this.getLocalArticles();
    
    // Calculate total time
    const allActivities = await this.getLocalActivities();
    const activityMap = new Map(allActivities.map(a => [a.id, a]));
    
    let totalTime = 0;
    (articleData.selected_activities || []).forEach(actId => {
      const act = activityMap.get(actId);
      if (act) totalTime += act.time_seconds;
    });
    
    // Determine ID and basic structure
    let newArticle = {
      ...articleData,
      total_time_seconds: totalTime,
      updated_at: new Date().toISOString()
    };

    if (!newArticle.id) {
         newArticle.id = `art_${Date.now()}`;
         newArticle.created_at = new Date().toISOString();
    }

    // Persist to API FIRST to get the real ID if possible
    try {
        const savedApiArticle = await this.saveArticleToApi(newArticle);
        if (savedApiArticle && savedApiArticle.id) {
             console.log(`Article saved to API, got ID: ${savedApiArticle.id}`);
             newArticle.id = savedApiArticle.id; // Use backend ID
             // Also update other fields that backend might have normalized
             newArticle.updated_at = savedApiArticle.updated_at || newArticle.updated_at;
        }
    } catch (e) {
        console.error("Failed to save article to API (continuing with local save):", e);
    }

    // Update Local Storage
    const index = articles.findIndex(a => a.id === newArticle.id || a.code === newArticle.code);
    if (index !== -1) {
      // Update
      articles[index] = { ...articles[index], ...newArticle };
    } else {
      // Create
      articles.push(newArticle);
    }

    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));

    return newArticle;
  },

  async deleteArticle(id) {
    await delay(200);
    // Delete from API first
    try {
        await this.deleteArticleFromApi(id);
    } catch (e) {
        console.error("Failed to delete article from API:", e);
    }

    const articles = await this.getLocalArticles();
    const newArticles = articles.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(newArticles));
    
    return true;
  },

  // --- Stats ---

  async getStats() {
    await delay();
    const articles = await this.getArticles();
    const activities = await this.getActivities();
    const processes = await this.getProcesses();
    
    const totalTime = articles.reduce((sum, a) => sum + (a.total_time_seconds || 0), 0);
    const avgTime = articles.length > 0 ? totalTime / articles.length : 0;

    // Calculate Articles by Type
    const articlesByType = {};
    articles.forEach(a => {
      const type = a.type || 'Sin Tipo';
      articlesByType[type] = (articlesByType[type] || 0) + 1;
    });

    // Calculate Articles by Client
    const articlesByClient = {};
    articles.forEach(a => {
      const client = a.client || 'Sin Cliente';
      articlesByClient[client] = (articlesByClient[client] || 0) + 1;
    });

    return {
      activities_count: activities.length,
      processes_count: processes.length,
      articles_count: articles.length,
      average_time_seconds: avgTime,
      recent_articles: articles.slice(-5).reverse(),
      articles_by_type: Object.entries(articlesByType).map(([name, value]) => ({ name, value })),
      articles_by_client: Object.entries(articlesByClient).map(([name, value]) => ({ name, value }))
    };
  },
  
  async calculateTime(activityIds) {
    // Use local data for performance (avoiding API call on every checkbox toggle)
    // Data should be fresh enough from initial page load sync
    const allActivities = await this.getLocalActivities();
    const activityMap = new Map(allActivities.map(a => [a.id, a]));
    
    let totalTime = 0;
    const activities = [];
    
    activityIds.forEach(id => {
      const act = activityMap.get(id);
      if (act) {
        totalTime += act.time_seconds;
        activities.push(act);
      }
    });
    
    return {
      total_time_seconds: totalTime,
      activities
    };
  },

  async compareArticles(articleIds) {
      await delay();
      const allArticles = await this.getArticles();
      const selected = allArticles.filter(a => articleIds.includes(a.id));
      
      if (selected.length === 0) throw new Error("No articles selected");

      const times = selected.map(a => a.total_time_seconds || 0);
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);

      // Hydrate activities for each article
      const allActivities = await this.getActivities();
      const activityMap = new Map(allActivities.map(a => [a.id, a]));
      
      const hydratedArticles = selected.map(article => ({
          ...article,
          activities: (article.selected_activities || [])
              .map(id => activityMap.get(id))
              .filter(Boolean),
          activities_count: (article.selected_activities || []).length
      }));

      return {
          articles: hydratedArticles,
          summary: {
              min_time_seconds: minTime,
              max_time_seconds: maxTime,
              time_difference_seconds: maxTime - minTime
          }
      };
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.ACTIVITIES);
    localStorage.removeItem(STORAGE_KEYS.PROCESSES);
    localStorage.removeItem(STORAGE_KEYS.ARTICLES);
  }
};
