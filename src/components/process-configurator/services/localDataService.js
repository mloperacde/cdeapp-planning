import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  ACTIVITIES: 'pc_activities',
  PROCESSES: 'pc_processes',
  ARTICLES: 'pc_articles'
};

// Helper to simulate async delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

const API_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + '/api';

export const localDataService = {
  // --- Data Management (Excel Parsing) ---
  
  // New method to fetch master activities from API
  async fetchApiActivities() {
      try {
          const response = await fetch(`${API_URL}/activities`).catch(err => {
              console.warn("API not reachable, using local data only:", err);
              return null;
          });
          
          if (!response || !response.ok) {
              console.warn('Failed to fetch from API or offline');
              return this.getActivities();
          }
          
          const apiActivities = await response.json();
          
          // Merge with local data
          const localActivities = await this.getActivities();
          const localMap = new Map(localActivities.map(a => [a.number.toString(), a]));
          
          const merged = apiActivities.map(apiAct => {
              const local = localMap.get(apiAct.number.toString());
              return {
                  id: `act_${apiAct.number}`,
                  number: apiAct.number,
                  name: apiAct.name, // API is source of truth for names
                  time_seconds: local?.time_seconds || apiAct.time_seconds || 0 // Local is source of truth for time (if > 0)
              };
          });

          // Add local-only activities (from Excel) that are not in API
          const apiNumbers = new Set(apiActivities.map(a => a.number.toString()));
          localActivities.forEach(local => {
              if (!apiNumbers.has(local.number.toString())) {
                  merged.push(local);
              }
          });
          
          localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(merged));
          return merged;
      } catch (error) {
          console.error("Error syncing with API:", error);
          // Return local data on error instead of throwing
          return this.getActivities();
      }
  },

  async fetchApiProcesses() {
    try {
        // Ensure activities are synced first to have proper linking
        const activities = await this.getActivities();
        const activityMap = new Map(activities.map(a => [a.number.toString(), a]));

        const response = await fetch(`${API_URL}/processes`).catch(err => {
             console.warn("API not reachable, using local data only:", err);
             return null;
        });

        if (!response || !response.ok) {
            console.warn('Failed to fetch processes from API or offline');
            return this.getProcesses();
        }

        const apiProcesses = await response.json();
        console.log("API Processes raw:", apiProcesses);

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
                id: `proc_${pCode.replace(/\s+/g, '_')}`,
                code: pCode,
                name: p.name || pCode,
                activity_numbers: activityRefs,
                total_time_seconds: totalTime,
                activities_count: procActivities.length,
                activity_ids: procActivities.map(a => a.id)
            };
        });

        // Merge with local processes
        const localProcesses = await this.getProcesses();
        // Normalize codes to strings for comparison
        const existingCodes = new Set(localProcesses.map(p => String(p.code)));
        
        let addedCount = 0;
        convertedProcesses.forEach(proc => {
            if (!existingCodes.has(proc.code)) {
                localProcesses.push(proc);
                addedCount++;
            }
        });
        
        console.log(`Added ${addedCount} new processes from API`);

        localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(localProcesses));
        return localProcesses;
    } catch (error) {
        console.error("Error syncing processes with API:", error);
        return this.getProcesses();
    }
  },

  async processExcel(file) {
    await delay(500);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
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
              activities = this._parseActivitiesFromData(data);
            }
            
            // Parse PROCESOS sheet
            if (sheetProcesses) {
              const data = XLSX.utils.sheet_to_json(sheetProcesses, { header: 1 });
              processes = this._parseProcessesFromData(data);
            }

            // Parse LISTADO DE PROCESOS sheet
             if (sheetListadoProcesos) {
                const data = XLSX.utils.sheet_to_json(sheetListadoProcesos, { header: 1 });
                
                // Determine strategy based on shape
                // If it has many columns (>5), it's likely a Matrix
                const isLikelyMatrix = data.length > 0 && (data[0].length > 5 || (data[1] && data[1].length > 5));
                
                let foundProcesses = [];
                
                if (isLikelyMatrix) {
                    // Try Matrix parsing FIRST for wide sheets
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
            
            // Try to extract both from same sheet
            activities = this._parseActivitiesFromData(data);
            processes = this._parseProcessesFromData(data);
          }

          // Calculate process totals
          const activityMap = new Map(activities.map(a => [a.number.toString(), a]));
          
          processes.forEach(proc => {
            let totalTime = 0;
            const procActivities = [];
            
            proc.activity_numbers.forEach(num => {
              const act = activityMap.get(num.toString());
              if (act) {
                totalTime += act.time_seconds;
                procActivities.push(act);
              }
            });
            
            proc.total_time_seconds = totalTime;
            proc.activities_count = procActivities.length;
            proc.activity_ids = procActivities.map(a => a.id);
          });

          // Save to localStorage
          if (activities.length > 0) localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
          if (processes.length > 0) localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(processes));

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
      const numberRaw = activityNumIdx !== -1 ? row[activityNumIdx] : row[0]; // Fallback to col 0
      
      // LOGIC: Activities are named with numbers.
      // We accept strings that look like numbers (e.g. "1", "10")
      if (numberRaw !== undefined && numberRaw !== null) {
         // Check if it's a valid number (strict check)
         // parseFloat parses "1A" as 1, which is bad. We want strict numbers.
         const strVal = numberRaw.toString().trim();
         const isNumeric = !isNaN(Number(strVal)) && strVal !== "";
         
         if (!isNumeric) continue; // Skip if not a strict number

         const number = Number(strVal);

        const name = activityNameIdx !== -1 ? row[activityNameIdx] : (row[1] || `Actividad ${number}`);
        const timeVal = activityTimeIdx !== -1 ? row[activityTimeIdx] : row[2];
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

      const name = processNameIdx !== -1 ? row[processNameIdx] : row[0]; // Fallback to col 0
      
      // LOGIC: Processes are named with letters or combinations of letters.
      // We validate that the name contains letters.
      if (name && typeof name === 'string') {
        // Simple check: should have at least one letter and preferably not just numbers
        // But user said "Letters or combinations of letters", so "A", "AB" are valid. "1" is not.
        const isLetterBased = /[a-zA-Z]/.test(name) && !/^\d+$/.test(name);
        
        if (isLetterBased || (processNameIdx !== -1)) { // Trust explicit header if present
            const activityRefsRaw = processActivitiesIdx !== -1 ? row[processActivitiesIdx] : (row[1] || "");
            
            const activityRefs = activityRefsRaw 
            ? activityRefsRaw.toString().split(/[\s,-]+/).filter(token => !isNaN(parseFloat(token))) // Filter only numbers for activities
            : [];
            
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
                 processActivities.push(col.activityNumber);
             }
        });

        if (processActivities.length > 0) {
            processes.push({
                id: `proc_${processName.replace(/[^a-zA-Z0-9]/g, '_')}_${i}`,
                code: processName,
                name: processName,
                activity_numbers: processActivities
            });
        }
    }
    return processes;
  },

  // --- Activities & Processes ---

  async getActivities() {
    await delay();
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    return data ? JSON.parse(data) : [];
  },

  async getProcesses() {
    await delay();
    const data = localStorage.getItem(STORAGE_KEYS.PROCESSES);
    return data ? JSON.parse(data) : [];
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

  // --- Articles ---

  async getArticles() {
    await delay();
    const data = localStorage.getItem(STORAGE_KEYS.ARTICLES);
    return data ? JSON.parse(data) : [];
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

  async saveArticle(articleData) {
    await delay();
    let articles = await this.getArticles();
    
    // Calculate total time
    const allActivities = await this.getActivities();
    const activityMap = new Map(allActivities.map(a => [a.id, a]));
    
    let totalTime = 0;
    (articleData.selected_activities || []).forEach(actId => {
      const act = activityMap.get(actId);
      if (act) totalTime += act.time_seconds;
    });
    
    const newArticle = {
      ...articleData,
      total_time_seconds: totalTime,
      updated_at: new Date().toISOString()
    };

    if (articleData.id) {
      // Update
      const index = articles.findIndex(a => a.id === articleData.id);
      if (index !== -1) {
        articles[index] = { ...articles[index], ...newArticle };
      }
    } else {
      // Create
      newArticle.id = `art_${Date.now()}`;
      newArticle.created_at = new Date().toISOString();
      articles.push(newArticle);
    }

    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
    return newArticle;
  },

  async deleteArticle(id) {
    await delay();
    let articles = await this.getArticles();
    articles = articles.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ARTICLES, JSON.stringify(articles));
  },

  // --- Stats ---

  async getStats() {
    await delay();
    const articles = await this.getArticles();
    const activities = await this.getActivities();
    const processes = await this.getProcesses();
    
    const totalTime = articles.reduce((sum, a) => sum + (a.total_time_seconds || 0), 0);
    const avgTime = articles.length > 0 ? totalTime / articles.length : 0;

    return {
      activities_count: activities.length,
      processes_count: processes.length,
      articles_count: articles.length,
      average_time_seconds: avgTime,
      recent_articles: articles.slice(-5).reverse()
    };
  },
  
  async calculateTime(activityIds) {
    await delay(100);
    const allActivities = await this.getActivities();
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
