import { cdeApp } from '../api/cdeAppClient';
import { base44 } from '../api/base44Client';
import { localDataService } from '../components/process-configurator/services/localDataService';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

export const SyncService = {
  async syncAll(background = true) {
    const logs = [];
    const log = (msg) => {
      console.log(`[SyncService] ${msg}`);
      logs.push(msg);
    };

    if (!background) toast.info("Iniciando sincronización completa...");

    try {
      await this.syncMachines(log);
      await this.syncRooms(log);
      await this.syncArticles(log);
      await this.syncOrders(log);

      if (!background) toast.success("Sincronización completa finalizada.");
      return { success: true, logs };
    } catch (error) {
      console.error("Sync Error:", error);
      if (!background) toast.error("Error durante la sincronización.");
      return { success: false, logs, error };
    }
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
      const response = await cdeApp.syncArticles();
      let rows = [];
      if (response && response.headers && Array.isArray(response.headers)) {
          if (Array.isArray(response.data)) {
               rows = response.data.map(r => {
                   const obj = {};
                   response.headers.forEach((h, i) => obj[h] = r[i]);
                   return obj;
               });
          } else if (Array.isArray(response.rows)) {
               rows = response.rows;
          }
      } else if (Array.isArray(response)) {
          rows = response;
      } else if (response && Array.isArray(response.data)) {
          rows = response.data;
      }

      if (rows.length > 0) {
          await localDataService.saveArticles(rows);
          log(`Articles: ${rows.length} synced.`);
      } else {
          log("No articles found.");
      }
    } catch (error) {
      log(`Error syncing articles: ${error.message}`);
    }
  },

  async syncOrders(log) {
    log("Syncing Orders...");
    try {
      // 1. Fetch Orders
      const response = await cdeApp.syncProductions();
      let data = [];
      if (Array.isArray(response)) {
          data = response;
      } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data;
      } else if (response && response.data) {
          data = [response.data];
      } else if (response) {
           if (typeof response === 'object' && Object.keys(response).length > 0 && Object.keys(response).every(key => !isNaN(parseInt(key)))) {
               data = Object.values(response);
           } else {
               data = [response];
           }
      }

      if (data.length === 0) {
          log("No orders found.");
          return;
      }

      // 2. Fetch Machines for resolution
      let machinesMap = new Map();
      try {
          let res = await base44.entities.MachineMasterDatabase.list(undefined, 5000);
          if (Array.isArray(res)) {
              res.forEach(m => {
                  if (m.nombre) machinesMap.set(m.nombre.toLowerCase().trim(), m.id);
                  if (m.codigo_maquina) machinesMap.set(m.codigo_maquina.toLowerCase().trim(), m.id);
                  if (m.code) machinesMap.set(m.code.toLowerCase().trim(), m.id);
              });
          }
      } catch (e) {
          console.warn("Error fetching machines for order sync", e);
      }

      // 3. Process Orders (Upsert Logic)
      // Since we can't easily check all orders, we'll try to Create.
      // NOTE: This might duplicate if backend doesn't handle unique constraint on order_number.
      // Given user instruction "reescribiran", we ideally update.
      // But without efficient lookup, we'll proceed with creation/update if we can find it.
      
      let created = 0;
      let updated = 0;
      let failed = 0;
      
      // We limit to 50 items for background sync to avoid blocking/rate limits if list is huge?
      // Or we process all with delays. User said "reescribiran los datos", implies full sync.
      // We will use the chunked approach.
      
      const CHUNK_SIZE = 1; // Reduced to 1 to minimize burst rate
      const CHUNK_DELAY = 1500; // Increased delay to 1.5s

      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          
          await Promise.all(chunk.map(async (row) => {
              const orderNumber = row.order_number;
              const machineName = row.machine_name;
              
              let machineId = null;
              if (machineName) {
                  const s = String(machineName).toLowerCase().trim();
                  if (machinesMap.has(s)) machineId = machinesMap.get(s);
                  else if (s.includes(' - ')) {
                      const parts = s.split(' - ');
                      if (machinesMap.has(parts[0].trim())) machineId = machinesMap.get(parts[0].trim());
                  }
              }

              if (!orderNumber || !machineId) {
                  failed++;
                  return;
              }

              // Check if exists with retry
              let existing = [];
              try {
                  existing = await retryOp(() => base44.entities.WorkOrder.filter({ order_number: String(orderNumber) }));
              } catch (e) {
                  // ignore or log
              }

              const payload = {
                  order_number: String(orderNumber),
                  machine_id: machineId,
                  status: row.status || 'Pendiente',
                  production_id: row.production_id,
                  machine_id_source: row.machine_id_source,
                  priority: parseInt(row.priority) || 0,
                  quantity: parseInt(row.quantity) || 0,
                  notes: row.notes || '',
                  client_name: row.client_name,
                  product_name: row.product_name,
                  product_article_code: row.product_article_code,
                  planned_end_date: row.planned_end_date,
                  type: row.type,
                  room: row.room,
                  client_order_ref: row.client_order_ref,
                  internal_order_ref: row.internal_order_ref,
                  article_status: row.article_status,
                  material: row.material,
                  product_family: row.product_family,
                  shortages: row.shortages,
                  committed_delivery_date: row.committed_delivery_date,
                  new_delivery_date: row.new_delivery_date,
                  delivery_compliance: row.delivery_compliance,
                  multi_unit: parseInt(row.multi_unit) || 0,
                  multi_qty: parseFloat(row.multi_qty) || 0,
                  production_cadence: parseFloat(row.production_cadence) || 0,
                  delay_reason: row.delay_reason,
                  components_deadline: row.components_deadline,
                  start_date: row.start_date,
                  start_date_simple: row.start_date_simple,
                  modified_start_date: row.modified_start_date,
                  end_date_simple: row.end_date_simple
              };

              try {
                  if (existing && existing.length > 0) {
                      await retryOp(() => base44.entities.WorkOrder.update(existing[0].id, payload));
                      updated++;
                      
                      // Cleanup duplicates
                      if (existing.length > 1) {
                          for (let k = 1; k < existing.length; k++) {
                             try { await retryOp(() => base44.entities.WorkOrder.delete(existing[k].id)); } catch(e){}
                          }
                      }
                  } else {
                      await retryOp(() => base44.entities.WorkOrder.create(payload));
                      created++;
                  }
              } catch (e) {
                  console.error("Order save error", e);
                  failed++;
              }
          }));

          if (i + CHUNK_SIZE < data.length) {
              await new Promise(r => setTimeout(r, CHUNK_DELAY));
          }
      }
      log(`Orders: ${created} created, ${updated} updated, ${failed} failed.`);

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
