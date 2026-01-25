import * as XLSX from 'xlsx';

const STORAGE_KEYS = {
  ACTIVITIES: 'pc_activities',
  PROCESSES: 'pc_processes',
  ARTICLES: 'pc_articles'
};

// Helper to simulate async delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export const localDataService = {
  // --- Data Management (Excel Parsing) ---
  
  async processExcel(file) {
    await delay(500);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Assume first sheet contains the data
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          // Parse Logic:
          // Look for "ACTIVIDADES" and "PROCESOS" sections or columns
          // This is a simplified parser based on the user description
          
          const activities = [];
          const processes = [];
          
          // Header detection
          const headers = jsonData[0] || [];
          const activityNumIdx = headers.findIndex(h => h?.toString().toLowerCase().includes('número') || h?.toString().toLowerCase().includes('numero'));
          const activityNameIdx = headers.findIndex(h => h?.toString().toLowerCase().includes('actividad'));
          const activityTimeIdx = headers.findIndex(h => h?.toString().toLowerCase().includes('tiempo'));
          
          const processNameIdx = headers.findIndex(h => h?.toString().toLowerCase().includes('proceso'));
          const processActivitiesIdx = headers.findIndex(h => h?.toString().toLowerCase().includes('referencias'));

          // Iterate rows
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            // Extract Activity
            if (activityNumIdx !== -1 && row[activityNumIdx]) {
              activities.push({
                id: `act_${row[activityNumIdx]}`,
                number: row[activityNumIdx],
                name: row[activityNameIdx] || `Actividad ${row[activityNumIdx]}`,
                time_seconds: parseFloat(row[activityTimeIdx]) || 0
              });
            }

            // Extract Process
            if (processNameIdx !== -1 && row[processNameIdx]) {
              const activityRefs = row[processActivitiesIdx] 
                ? row[processActivitiesIdx].toString().split(/[\s,-]+/).filter(Boolean)
                : [];
              
              processes.push({
                id: `proc_${row[processNameIdx].replace(/\s+/g, '_')}`,
                code: row[processNameIdx],
                name: row[processNameIdx],
                activity_numbers: activityRefs,
                // We will calculate totals later based on activities
              });
            }
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
          localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
          localStorage.setItem(STORAGE_KEYS.PROCESSES, JSON.stringify(processes));

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
  }
};
