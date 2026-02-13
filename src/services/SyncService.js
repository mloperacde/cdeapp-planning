import { cdeApp } from '../api/cdeAppClient';
import { base44 } from '../api/base44Client';
import { localDataService } from '../components/process-configurator/services/localDataService';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

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
    await this.syncArticles(log); // Added Article Sync
    
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
      
      // Helper to normalize keys from Spanish/English mix to standard DB keys
      const normalize = (row) => {
          return {
              order_number: String(row.order_number || row.Orden || row.numero_orden || row.wo || row.ORDEN || ''),
              machine_name: row.machine_name || row.Máquina || row.maquina || row.machine || row.recurso,
              machine_id_source: row.machine_id || row.id_maquina || row.MACHINE_ID, // source ID
              status: row.status || row.Estado || row.situacion || 'Pendiente',
              production_id: row.production_id || row.id || row.ID,
              priority: parseInt(row.priority || row.Prioridad || row.urgencia) || 0,
              quantity: parseInt(row.quantity || row.Cantidad || row.qty) || 0,
              notes: row.notes || row.Observación || row.notas || row.comentarios || '',
              client_name: row.client_name || row.Cliente,
              product_name: row.product_name || row.Nombre || row.Descripción,
              product_article_code: row.product_article_code || row.Artículo,
              planned_end_date: row.planned_end_date || row['Fecha Fin'],
              type: row.type || row.Tipo,
              room: row.room || row.Sala,
              client_order_ref: row.client_order_ref || row['Su Pedido'],
              internal_order_ref: row.internal_order_ref || row.Pedido,
              article_status: row.article_status || row['Edo. Art.'],
              material: row.material || row.Material,
              product_family: row.product_family || row.Producto,
              shortages: row.shortages || row.Faltas,
              committed_delivery_date: row.committed_delivery_date || row['Fecha Entrega'],
              new_delivery_date: row.new_delivery_date || row['Nueva Fecha Entrega'],
              delivery_compliance: row.delivery_compliance || row['Cumplimiento entrega'],
              multi_unit: parseInt(row.multi_unit || row.MultUnid) || 0,
              multi_qty: parseFloat(row.multi_qty || row['Mult x Cantidad']) || 0,
              production_cadence: parseFloat(row.production_cadence || row.Cadencia) || 0,
              delay_reason: row.delay_reason || row['Motivo Retraso'],
              components_deadline: row.components_deadline || row['Fecha limite componentes'],
              start_date: row.start_date || row['Fecha Inicio Limite'],
              start_date_simple: row.start_date_simple || row['Fecha Inicio Limite Simple'],
              modified_start_date: row.modified_start_date || row['Fecha Inicio Modificada'],
              end_date_simple: row.end_date_simple || row['Fecha Fin Simple']
          };
      };

      const CHUNK_SIZE = 1; // Reduced to 1 to minimize burst rate
      const CHUNK_DELAY = 1500; // Increased delay to 1.5s

      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          
          await Promise.all(chunk.map(async (rawRow) => {
              const row = normalize(rawRow);
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
                  status: row.status,
                  production_id: row.production_id,
                  machine_id_source: row.machine_id_source,
                  priority: row.priority,
                  quantity: row.quantity,
                  notes: row.notes,
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
                  multi_unit: row.multi_unit,
                  multi_qty: row.multi_qty,
                  production_cadence: row.production_cadence,
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
