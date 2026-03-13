import { cdeApp } from '../api/cdeAppClient';
import { base44 } from '../api/base44Client';
import { localDataService } from '../components/process-configurator/services/localDataService';
import { buildMachinesMap } from '@/utils/machineResolution';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const retryOp = async (operation, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      const isRateLimit =
        error?.message?.includes('Rate limit') ||
        error?.message?.includes('429') ||
        error?.status === 429;

      if (isRateLimit && i < maxRetries - 1) {
        await sleep(delay * (i + 1));
        continue;
      }

      throw error;
    }
  }
};

export const SyncService = {
  async syncAll(scheduled = false) {
    const log = (msg) => {
      console.log(`[SyncService] ${msg}`);
      if (!scheduled) toast(msg);
    };

    log("Starting full sync...");
    
    // Run in sequence or parallel? Sequence is safer for logging.
    await this.syncRooms(log);
    await this.syncMachines(log);
    await this.syncArticles(log);
    await this.syncOrders(log);
    
    log("Sync completed.");
  },

  async syncMachines(log) {
    log("Syncing Machines...");
    try {
      const machines = await cdeApp.syncMachines();
      const machineList = Array.isArray(machines) ? machines : (machines.data || []);
      
      if (machineList.length === 0) {
        log("No machines found in CDEApp.");
        return;
      }

      // Fetch existing
      let existingMachines = [];
      try {
          const res = await base44.entities.MachineMasterDatabase.list(undefined, 5000);
          existingMachines = Array.isArray(res) ? res : (res.items || []);
      } catch (e) {
          console.warn("Could not fetch existing machines", e);
      }

      const machineMap = new Map();
      existingMachines.forEach(m => {
          if (m.codigo_maquina) machineMap.set(String(m.codigo_maquina).trim(), m.id);
      });

      let updated = 0;
      let created = 0;

      for (const m of machineList) {
          const code = String(m.code || m.id || "").trim();
          if (!code) continue;

          const name = m.name || m.description || `Máquina ${code}`;
          const location = m.room_name || m.sala || "";

          const payload = {
              codigo_maquina: code,
              nombre: name,
              descripcion: name,
              ubicacion: location,
          };

          if (machineMap.has(code)) {
              await base44.entities.MachineMasterDatabase.update(machineMap.get(code), payload);
              updated++;
          } else {
              await base44.entities.MachineMasterDatabase.create(payload);
              created++;
          }
      }
      log(`Machines: ${created} created, ${updated} updated.`);
    } catch (error) {
      log(`Error syncing machines: ${error.message}`);
    }
  },

  async syncRooms(log) {
    log("Syncing Rooms...");
    try {
      const response = await cdeApp.syncRooms();
      const apiRooms = Array.isArray(response) ? response : (response.data || []);
      
      if (apiRooms.length === 0) {
          log("No rooms found in CDEApp.");
          return;
      }

      // 1. Fetch Config
      let configRecord = null;
      try {
          const configs = await base44.entities.AppConfig.filter({ config_key: "manufacturing_config" });
          configRecord = configs[0] || null;
      } catch (e) {
          console.warn("Could not fetch manufacturing_config", e);
      }

      let config = { areas: [], assignments: {}, tasks: [] };
      if (configRecord?.value) {
          try {
              config = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
          } catch (e) {
              console.error("Error parsing manufacturing config", e);
          }
      }

      // 2. Update Areas
      let areas = [...(config.areas || [])];
      const allExistingRooms = new Map(); // id -> areaId

      areas.forEach(area => {
          area.rooms?.forEach(room => {
              allExistingRooms.set(String(room.id), area.id);
          });
      });

      let defaultAreaId = areas.find(a => a.name === "Sin Asignar" || a.name === "Planta Principal")?.id;
      if (!defaultAreaId) {
           if (areas.length > 0) {
               defaultAreaId = areas[0].id; 
           } else {
               defaultAreaId = generateId();
               areas.push({ id: defaultAreaId, name: "Planta Principal", rooms: [] });
           }
      }

      let newCount = 0;
      let updateCount = 0;

      apiRooms.forEach(apiRoom => {
          const roomId = String(apiRoom.external_id || apiRoom.id);
          const roomName = apiRoom.nombre || apiRoom.name;
          const existingAreaId = allExistingRooms.get(roomId);

          if (existingAreaId) {
              const areaIndex = areas.findIndex(a => a.id === existingAreaId);
              if (areaIndex >= 0) {
                  const roomIndex = areas[areaIndex].rooms.findIndex(r => String(r.id) === roomId);
                  if (roomIndex >= 0) {
                       if (areas[areaIndex].rooms[roomIndex].name !== roomName) {
                          areas[areaIndex].rooms[roomIndex] = { ...areas[areaIndex].rooms[roomIndex], name: roomName };
                          updateCount++;
                       }
                  }
              }
          } else {
              const areaIndex = areas.findIndex(a => a.id === defaultAreaId);
              if (areaIndex >= 0) {
                  areas[areaIndex].rooms.push({ id: roomId, name: roomName });
                  newCount++;
              }
          }
      });

      config.areas = areas;

      // 3. Save Config
      const payload = {
          config_key: "manufacturing_config",
          value: JSON.stringify(config),
          description: "Configuración de Fabricación: Áreas, Salas y Asignaciones (Auto-Synced)"
      };

      if (configRecord?.id) {
          await base44.entities.AppConfig.update(configRecord.id, payload);
      } else {
          await base44.entities.AppConfig.create(payload);
      }

      log(`Rooms: ${newCount} added, ${updateCount} updated.`);

    } catch (error) {
      log(`Error syncing rooms: ${error.message}`);
    }
  },

  async syncArticles(log) {
    log("Syncing Articles...");
    try {
      const articles = await cdeApp.syncArticles();
      const articleList = Array.isArray(articles) ? articles : (articles.data || []);
      
      if (articleList.length === 0) {
        log("No articles found in CDEApp.");
        return;
      }

      // Map to internal format if necessary, though localDataService handles flexible keys.
      // We apply the type inference logic here if type is missing or needs standardizing?
      // Actually, let's just pass the data and let localDataService handle persistence.
      // But we might want to ensure fields like 'code' are present.
      
      const mappedArticles = articleList.map(a => {
          const code = String(a.code || a.id || "").trim();
          let articleType = a.type || a.article_type || "";
          
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

          return {
            code: code,
            name: a.name || a.description,
            client: a.client || a.client_name,
            type: articleType, 
            characteristics: a.characteristics || "",
            process_code: a.process_code || a.process || "",
            operators_required: a.operators_required || a.operator_cost || 1, // Use correct field
            total_time_seconds: a.total_time_seconds || a.time_seconds || 0,
            ...a
          };
      });

      // Use localDataService to save, which includes Smart Diff & Upsert logic
      await localDataService.saveArticles(mappedArticles);
      
      log(`Articles: ${mappedArticles.length} processed and synced.`);
    } catch (error) {
      log(`Error syncing articles: ${error.message}`);
    }
  },

  async syncOrders(log) {
    log("Syncing Orders...");
    const currentBatchId = `batch_bg_${Date.now()}`;

    try {
      // 1. Fetch Orders from CDEApp
      const response = await cdeApp.syncProductions();
      let rawData = [];
      if (Array.isArray(response)) rawData = response;
      else if (response?.data && Array.isArray(response.data)) rawData = response.data;
      else if (response?.data) rawData = [response.data];

      if (rawData.length === 0) {
          log("No orders found in CDEApp.");
          return;
      }

      // 2. Fetch Machines for resolution
      let machinesRaw = [];
      try {
          machinesRaw = await base44.entities.MachineMasterDatabase.list(undefined, 2000);
      } catch (e) { console.warn("Error fetching machines for background sync", e); }
      
      const { resolveMachine } = buildMachinesMap(machinesRaw);

      // Helper to extract value with aliases (minimal version of what's in OrderImport.jsx)
      const extractValueMinimal = (obj, key, aliases = []) => {
          if (obj[key] !== undefined) return obj[key];
          for (const alias of aliases) { if (obj[alias] !== undefined) return obj[alias]; }
          return undefined;
      };

      // 3. Process Orders (Upsert Logic with Batch Tagging)
      let successCount = 0;
      let failCount = 0;

      const CHUNK_SIZE = 2;
      const CHUNK_DELAY = 500;

      for (let i = 0; i < rawData.length; i += CHUNK_SIZE) {
          const chunk = rawData.slice(i, i + CHUNK_SIZE);
          
          await Promise.all(chunk.map(async (rawRow) => {
              const orderNumber = extractValueMinimal(rawRow, 'order_number', ['Orden', 'numero_orden', 'wo', 'ORDEN']);
              const machineName = extractValueMinimal(rawRow, 'machine_name', ['Máquina', 'maquina', 'machine', 'recurso']);
              const machineIdSource = extractValueMinimal(rawRow, 'machine_id_source', ['machine_id', 'id_maquina', 'MACHINE_ID']);
              
              let machineId = resolveMachine(machineName, machineIdSource);

              // Fallback to "Sin Asignar" if possible
              if (!machineId && machinesRaw.length > 0) {
                  const fallback = machinesRaw.find(m => m.nombre_maquina === 'Sin Asignar' || m.codigo_maquina === '000') || machinesRaw[0];
                  machineId = fallback.id;
              }

              if (!orderNumber || !machineId) { failCount++; return; }

              // Normalize payload
              const payload = {
                  order_number: String(orderNumber),
                  machine_id: machineId,
                  import_batch_id: currentBatchId,
                  status: rawRow.status || rawRow.Estado || 'Pendiente',
                  priority: parseInt(rawRow.priority || rawRow.Prioridad) || 0,
                  quantity: parseInt(rawRow.quantity || rawRow.Cantidad) || 0,
                  client_name: rawRow.client_name || rawRow.Cliente || '',
                  product_name: rawRow.product_name || rawRow.Nombre || rawRow.Descripción || '',
                  product_article_code: rawRow.product_article_code || rawRow.Artículo || '',
                  committed_delivery_date: rawRow.committed_delivery_date || rawRow['Fecha Entrega'] || '',
                  notes: JSON.stringify({ ...rawRow, import_batch_id: currentBatchId })
              };

              try {
                  let existing = [];
                  try { existing = await retryOp(() => base44.entities.WorkOrder.filter({ order_number: String(orderNumber) })); } catch { 0; }

                  if (existing && existing.length > 0) {
                      await retryOp(() => base44.entities.WorkOrder.update(existing[0].id, payload));
                      if (existing.length > 1) {
                          for (let k = 1; k < existing.length; k++) {
                              try { await retryOp(() => base44.entities.WorkOrder.delete(existing[k].id)); } catch { 0; }
                          }
                      }
                  } else {
                      await retryOp(() => base44.entities.WorkOrder.create(payload));
                  }
                  successCount++;
              } catch (e) {
                  console.error("Order background sync error", e);
                  failCount++;
              }
          }));

          if (i + CHUNK_SIZE < rawData.length) await sleep(CHUNK_DELAY);
      }

      // 4. Cleanup old records
      log("Cleaning up stale orders...");
      try {
          const allOrders = await base44.entities.WorkOrder.list(undefined, 5000);
          const toDelete = allOrders.filter(o => {
              if (o.import_batch_id === currentBatchId) return false;
              if (o.notes && o.notes.startsWith('{')) {
                  try { if (JSON.parse(o.notes).import_batch_id === currentBatchId) return false; } catch { 0; }
              }
              return true;
          });

          for (let i = 0; i < toDelete.length; i += 5) {
              const delChunk = toDelete.slice(i, i + 5);
              await Promise.allSettled(delChunk.map(o => base44.entities.WorkOrder.delete(o.id)));
          }
          log(`Orders: ${successCount} synced, ${toDelete.length} cleaned up.`);
      } catch (e) { log(`Cleanup error: ${e.message}`); }

    } catch (error) {
      log(`Error syncing orders: ${error.message}`);
    }
  },

  initScheduler() {
    if (this._schedulerInterval) return;

    console.log("[SyncService] Scheduler started for 11:15, 15:15, 22:30");

    const checkSchedule = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const timeString = `${hours}:${minutes.toString().padStart(2, '0')}`;
      
      const targetTimes = ["11:15", "15:15", "22:30"];
      
      if (targetTimes.includes(timeString)) {
        const todayStr = now.toDateString();
        const slotKey = `${todayStr}-${timeString}`;
        
        if (this._lastRunSlot !== slotKey) {
          this._lastRunSlot = slotKey;
          console.log(`[SyncService] Triggering scheduled sync at ${timeString}`);
          this.syncAll(true);
        }
      }
    };

    checkSchedule();
    this._schedulerInterval = setInterval(checkSchedule, 20000);
  }
};
