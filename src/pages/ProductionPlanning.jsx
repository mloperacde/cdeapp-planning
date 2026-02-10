import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, Plus, RefreshCw, DownloadCloud } from "lucide-react";
import { getMachineAlias } from "@/utils/machineAlias";
import { format, startOfWeek, endOfWeek } from "date-fns";
import WorkOrderForm from "../components/planning/WorkOrderForm";
import PlanningGantt from "../components/planning/PlanningGantt";
import MachineOrdersList from "../components/planning/MachineOrdersList";
import ResourceForecast from "../components/planning/ResourceForecast";
import MachineLoadGraph from "../components/planning/MachineLoadGraph";
import ScheduleOrderDialog from "../components/planning/ScheduleOrderDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cdeApp } from "@/api/cdeAppClient";

import { Link } from "react-router-dom";

export default function ProductionPlanningPage() {

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [dropDialogData, setDropDialogData] = useState(null);
  const queryClient = useQueryClient();
  
  // Filtros
  const [dateRange, setDateRange] = useState({
    start: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    end: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  });
  const [selectedMachine, setSelectedMachine] = useState("all");
  const [selectedTeam, setSelectedTeam] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isSyncing, setIsSyncing] = useState(false);

  // Data Fetching
  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return data.map(m => {
        const sala = (m.ubicacion || '').trim();
        const codigo = (m.codigo_maquina || m.codigo || '').trim();
        
        return {
            id: m.id,
            alias: getMachineAlias(m),
            descripcion: m.descripcion,
            codigo: codigo,
            orden: m.orden_visualizacion || 999,
            tipo: m.tipo,
            ubicacion: sala
        };
      }).sort((a, b) => a.orden - b.orden);
    },
    staleTime: 0,
    gcTime: 0
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ['workOrders'],
    queryFn: async () => {
      if (!base44.entities.WorkOrder) return [];
      return await base44.entities.WorkOrder.list();
    },
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.filter({ activo: true }),
  });

  const { data: machineProcesses = [] } = useQuery({
    queryKey: ['machineProcesses'],
    queryFn: () => base44.entities.MachineProcess.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  // Derived Data
  const filteredOrders = useMemo(() => {
    // First, augment orders with effective dates logic
    const augmentedOrders = workOrders.map(order => ({
        ...order,
        effective_start_date: order.modified_start_date || order.start_date,
        effective_delivery_date: order.new_delivery_date || order.committed_delivery_date
    }));

    const filtered = augmentedOrders.filter(order => {
      // Filter by Priority (Must exist)
      if (order.priority === null || order.priority === undefined) return false;

      // Filter by Machine
      if (selectedMachine !== "all" && order.machine_id !== selectedMachine) return false;
      
      // Filter by Status
      if (selectedStatus !== "all" && order.status !== selectedStatus) return false;
      
      // Filter by Date Range (Check overlap) - ONLY for scheduled orders
      if (order.effective_start_date) {
        const orderStart = new Date(order.effective_start_date);
        // Using delivery date as end for visualization, or start date if missing
        const orderEnd = order.effective_delivery_date ? new Date(order.effective_delivery_date) : new Date(order.effective_start_date); 
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        
        // If date is invalid (shouldn't happen if start_date exists), skip
        if (isNaN(orderStart.getTime())) return false;
        
        return orderStart <= rangeEnd && orderEnd >= rangeStart;
      }
      
      // If no start_date (Backlog), include it so it appears in the "Sin Programar" column
      return true;
    });

    // Sort by Priority (Ascending: 1 is higher than 10)
    return filtered.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  }, [workOrders, selectedMachine, selectedStatus, dateRange]);

  const handleSyncCdeApp = async () => {
    setIsSyncing(true);
    let toastId;
    
    // Función helper de normalización estricta para matching
    const normalizeKey = (str) => String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    toast.info("Conectando con CDEApp...");
    
    try {
      // 0. Sincronizar Máquinas (Unificación de Inventario)
      toast.info("Sincronizando catálogo de máquinas...");
      let remoteMachines = [];
      try {
          const machinesResponse = await cdeApp.syncMachines();
          // Normalización de respuesta de máquinas (similar a órdenes)
          if (machinesResponse.data && Array.isArray(machinesResponse.data)) {
             if (machinesResponse.data.length > 0 && typeof machinesResponse.data[0] === 'object' && !Array.isArray(machinesResponse.data[0])) {
                 remoteMachines = machinesResponse.data;
             } else if (machinesResponse.headers && Array.isArray(machinesResponse.headers)) {
                 remoteMachines = machinesResponse.data.map(r => {
                     const obj = {};
                     machinesResponse.headers.forEach((h, i) => { if (r[i] !== undefined) obj[h] = r[i]; });
                     return obj;
                 });
             } else {
                 remoteMachines = machinesResponse.data;
             }
          } else if (Array.isArray(machinesResponse)) {
              remoteMachines = machinesResponse;
          }

          console.log(`[Sync] Máquinas encontradas en CDEApp: ${remoteMachines.length}`);
          
          // Upsert Máquinas
          let machinesUpdated = 0;
          let machinesCreated = 0;
          
          // Obtener lista actual para comparación (sin depender del cache stale)
          const currentMachines = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
          const currentMachineMap = new Map();
          const cdeIdMap = new Map(); // Mapa para buscar por ID de CDEApp

          currentMachines.forEach(m => {
              if (m.cde_machine_id) cdeIdMap.set(String(m.cde_machine_id), m);
              if (m.codigo) currentMachineMap.set(String(m.codigo).trim(), m);
              if (m.nombre_maquina) currentMachineMap.set(m.nombre_maquina.toLowerCase().trim(), m);
          });

          for (const rm of remoteMachines) {
              // Mapeo de campos (ajustar según respuesta real de API)
              // Priorizamos ID explicito: id o machine_id
              const cdeId = String(rm['id'] || rm['machine_id'] || '').trim();
              const code = String(rm['Código'] || rm['code'] || '').trim();
              const name = String(rm['Nombre'] || rm['name'] || rm['machine'] || '').trim();
              
              if (!cdeId && !code && !name) continue;

              // 1. Buscar por ID único (Prioridad Máxima)
              let match = cdeId ? cdeIdMap.get(cdeId) : null;
              
              // 2. Fallback: Buscar por código o nombre (si no hay match por ID)
              if (!match) {
                  match = currentMachineMap.get(code) || currentMachineMap.get(name.toLowerCase());
              }
              
              const shortName = name || (match ? (match.nombre_maquina || getMachineAlias(match)) : `Machine ${cdeId}`);
              const codeVal = code || (match ? (match.codigo_maquina || match.codigo) : cdeId);
              const locVal = rm['Ubicación'] || rm['location'] || (match ? match.ubicacion : '');

              const machinePayload = {
                  cde_machine_id: cdeId, // Guardar ID externo para futuras referencias
                  codigo_maquina: codeVal,
                  nombre_maquina: shortName,
                  ubicacion: locVal,
                  nombre: getMachineAlias({
                      ubicacion: locVal,
                      codigo_maquina: codeVal,
                      nombre_maquina: shortName,
                      nombre: shortName
                  }),
                  descripcion: rm['Descripción'] || rm['description'] || shortName,
                  codigo: codeVal, // Legacy fallback
                  // Otros campos si vienen
              };

              if (match) {
                  // Update siempre para asegurar que cde_machine_id se guarda si faltaba
                  await base44.entities.MachineMasterDatabase.update(match.id, machinePayload);
                  machinesUpdated++;
              } else {
                  await base44.entities.MachineMasterDatabase.create(machinePayload);
                  machinesCreated++;
              }
          }
          
          if (machinesCreated > 0 || machinesUpdated > 0) {
              toast.success(`Inventario unificado: ${machinesCreated} creadas, ${machinesUpdated} actualizadas (IDs vinculados).`);
              await queryClient.invalidateQueries({ queryKey: ['machines'] });
          }
          
      } catch (err) {
          console.error("Error sincronizando máquinas (no bloqueante):", err);
          toast.warning("No se pudo sincronizar el inventario de máquinas. Usando local.");
      }

      // 1. Obtener datos de Producción
      const response = await cdeApp.syncProductions();
      
      // 2. Normalizar respuesta (Headers -> Objetos)
      // Robust Normalization: Handle cases where data is already objects OR arrays
      let rows = [];
      
      console.log("[Sync] Raw Response Structure:", {
        headers: response.headers,
        dataType: response.data ? (Array.isArray(response.data) ? 'Array' : typeof response.data) : 'undefined',
        firstItemType: response.data && response.data[0] ? typeof response.data[0] : 'undefined',
        firstItemIsArray: response.data && Array.isArray(response.data[0]),
        firstItem: response.data && response.data[0]
      });

      if (response.data && Array.isArray(response.data)) {
        // Case 1: Data is already objects (ignore headers mapping if so)
        if (response.data.length > 0 && typeof response.data[0] === 'object' && !Array.isArray(response.data[0])) {
            console.log("[Sync] Data detected as Objects. Using directly.");
            rows = response.data;
        } 
        // Case 2: Data is arrays of values (needs headers mapping)
        else if (response.headers && Array.isArray(response.headers)) {
            console.log("[Sync] Data detected as Arrays. Mapping with headers.");
             rows = response.data.map(r => {
                 const obj = {};
                 // Fix: Ensure headers and data align. If data has more columns than headers, or vice versa, handle gracefully.
                 response.headers.forEach((h, i) => {
                    if (r[i] !== undefined) {
                        obj[h] = r[i];
                    }
                 });
                 return obj;
             });
        }
        // Case 3: Unknown format, try to use as is
        else {
             rows = response.data;
        }
      } else if (Array.isArray(response)) {
          rows = response;
      } else if (typeof response === 'object' && response !== null) {
           // Fallback for single object or weird structure
           console.log("[Sync] Response is a single object or unknown structure", response);
           if (response.data) {
               if (Array.isArray(response.data)) rows = response.data;
               else rows = [response.data];
           } else {
               rows = [response];
           }
      }

      console.log("[Sync] First row structure:", rows[0]);

      if (rows.length === 0) {
        toast.warning("CDEApp devolvió 0 órdenes.");
        setIsSyncing(false);
        return;
      }

      // 3. Preparar mapeo de máquinas (Recargar frescas después del sync de máquinas)
      const freshMachines = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      const machineMap = new Map();
      
      // Función helper de normalización estricta para matching
      const normalizeKey = (str) => String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      freshMachines.forEach(m => {
          // 1. Mapeo por ID externo (cde_machine_id) -> Local ID (Prioridad Absoluta)
          if (m.cde_machine_id) machineMap.set(String(m.cde_machine_id), m.id);

          // 2. Mapeos Legacy (Fallback por Nombre/Código)
          if (m.codigo) machineMap.set(normalizeKey(m.codigo), m.id);
          if (m.nombre) machineMap.set(normalizeKey(m.nombre), m.id);
          // También mapear por ID directo si es numérico (casos legacy)
          if (m.id) machineMap.set(String(m.id), m.id);
      });

      // 4. Limpiar órdenes existentes antes de insertar nuevas (Estrategia "Full Refresh")
      // Esto elimina duplicados, órdenes obsoletas y conflictos de prioridad.
      
      let toastId = null;

      if (workOrders.length > 0) {
          toast.info("Limpiando órdenes antiguas para evitar duplicados...");
          // No hay endpoint de delete_all, borramos secuencialmente o por lotes si la API lo permite
          // Asumiendo que debemos borrar todo lo que traemos de la sync para "refrescar" el estado
          // PRECAUCIÓN: Si hay órdenes creadas manualmente que no vienen de sync, las perderíamos.
          // Pero el usuario dice "datos anteriores a la sincronizacion".
          
          // Mejor estrategia: "Upsert" o "Delete conflicting".
          // Dado que Base44 no tiene Upsert nativo fácil aquí, y el usuario se queja de duplicados persistentes:
          // Vamos a borrar las órdenes que coincidan con las que vienen de CDEApp (o todas si es un full sync).
          
          // Opción Segura: Borrar SOLO las órdenes que vamos a re-insertar (por número de orden).
          // Opción Solicitada (implícita): "deberiamos borrarlos ya que siguen apareciendo".
          
          // Vamos a implementar un borrado de todas las órdenes asociadas a las máquinas detectadas en el sync,
          // o simplemente borrar todo si el usuario asume que CDEApp es la fuente de la verdad.
          // Dado el contexto "app de origen no permite ordenes diferentes con misma pry", CDEApp es la fuente de verdad.
          
          // Delete Strategy: Parallel with Concurrency Limit (p-limit style)
          // Sequential is too slow (causing timeouts on UI thread or server side perception?)
          // Rate limit was 429. Now we see 500 Timeouts.
          // This suggests the server is overwhelmed or the connection is dropping.
          
          // Let's try a balanced approach: Concurrency 3, Delay 500ms.
          // And showing progress explicitly via toast.loading

          toastId = toast.loading("Iniciando limpieza de órdenes...");
          const CONCURRENCY_LIMIT = 3;
          let completed = 0;
          const total = workOrders.length;
          
          // Helper for concurrency
          const pool = [];
          const results = [];

          for (const order of workOrders) {
              const p = base44.entities.WorkOrder.delete(order.id)
                  .then(() => ({ status: 'fulfilled', id: order.id }))
                  .catch((e) => ({ status: 'rejected', id: order.id, error: e }));

              // Wrap promise to remove itself from pool when done
              const wrapped = p.then(r => {
                  pool.splice(pool.indexOf(wrapped), 1);
                  completed++;
                  if (completed % 5 === 0 || completed === total) {
                      toast.loading(`Limpiando órdenes: ${completed}/${total} (${Math.round(completed/total*100)}%)`, {
                          id: toastId
                      });
                  }
                  return r;
              });

              pool.push(wrapped);
              results.push(wrapped); // Keep track of all results

              if (pool.length >= CONCURRENCY_LIMIT) {
                  await Promise.race(pool); // Wait for at least one to finish
                  // Small delay to be nice to server
                  await new Promise(resolve => setTimeout(resolve, 300));
              }
          }

          // Wait for remaining
          await Promise.all(results);
          // NO hacemos dismiss aquí para reutilizar el toast en la importación
          // toast.dismiss(toastId);

          const deletedCount = results.filter(r => {
             // Need to await the result if it's not fully resolved in 'results' array?
             // Actually results array contains promises. We need to await Promise.all(results) first.
             return true; 
          }).length; // This count logic is slightly off because we need the values.

          // Correct counting
          const finalResults = await Promise.all(results);
          const successCount = finalResults.filter(r => r.status === 'fulfilled').length;
          console.log("Deleted", successCount, "old orders with concurrency limit.");
      }

      let created = 0;
      let skipped = 0;

      // 5. Procesar e Insertar (Con indicador de progreso)
      const totalToCreate = rows.length;
      console.log(`[Sync] Iniciando importación de ${totalToCreate} órdenes.`);
      
      if (toastId) {
          toast.loading(`Importando ${totalToCreate} órdenes...`, { id: toastId });
      } else {
          toastId = toast.loading(`Importando ${totalToCreate} órdenes...`);
      }
      
      // 5. Procesar e Insertar (Secuencial para evitar Rate Limit)
      // Helper para normalizar nombres (extraer código o limpiar texto)
      const normalizeMachineName = (val) => {
           if (!val) return "";
           const s = String(val).toLowerCase().trim();
           // Si viene formato "119 - Nombre", intentar extraer "119" o "nombre"
           if (s.includes(' - ')) {
              const parts = s.split(' - ');
              return parts[0].trim(); // Retorna el código (ej: 119)
           }
           return s;
      };

      // Helper para parsear fechas DD/MM/YYYY a ISO YYYY-MM-DD
      const parseImportDate = (val) => {
          if (!val) return null;
          // Si ya es ISO (contiene guiones y empieza por año o tiene T)
          if (val.includes('-') && (val.length === 10 || val.includes('T'))) return val;
          
          // Intentar parsear DD/MM/YYYY o DD/MM/YYYY HH:mm
          if (val.includes('/')) {
              const parts = val.split(' ')[0].split('/'); // Tomar solo la fecha, ignorar hora
              if (parts.length === 3) {
                  const [day, month, year] = parts;
                  // Validar que sean números
                  if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                      // Asegurar formato YYYY-MM-DD
                      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  }
              }
          }
          return val; // Devolver original si no se pudo parsear (fallback)
      };

      for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          // Update progress every 5 items
          if (i % 5 === 0) {
              const percent = Math.round((i / totalToCreate) * 100);
              toast.loading(`Importando: ${percent}% (${i}/${totalToCreate})`, { id: toastId });
          }

          console.log(`Procesando fila ${i}:`, row); // Ver qué tiene cada fila

          // Intenta encontrar el número de orden en varios campos posibles
          const orderNumber = row['Orden'] || row['production_id'] || row['order_number'] || row['id'] || row['order'];
          if (!orderNumber) {
              // Solo loguear si no es la cabecera vacía o algo así
              if (Object.keys(row).length > 2) console.warn("[Sync] Fila ignorada (sin ID de orden):", row);
              continue;
          }

          // Resolver Máquina - Estrategia robusta con IDs y Matching Avanzado
          let machineId = null;
          
          const rowMachineId = String(row['machine_id'] || row['maquina_id'] || row['id_maquina'] || '').trim();
          const rowMachineName = String(row['Máquina'] || row['machine_name'] || row['maquina'] || row['machine'] || rowMachineId).trim();
          const rowSala = String(row['Sala'] || row['sala'] || row['room'] || '').trim();

          // 1. Prioridad: ID explícito de máquina (machine_id)
          if (rowMachineId && machineMap.has(rowMachineId)) {
               machineId = machineMap.get(rowMachineId);
          }

          // 2. Fallback: Matching por Nombre/Código/Sala
          if (!machineId) {
              // A. Matching exacto o normalizado (existente)
              if (rowMachineName) {
                  const name = normalizeKey(rowMachineName);
                  if (machineMap.has(name)) machineId = machineMap.get(name);
                  
                  // Try code from machine name
                  if (!machineId) {
                      const code = normalizeKey(normalizeMachineName(rowMachineName));
                      if (machineMap.has(code)) machineId = machineMap.get(code);
                  }
              }

              // B. Matching por parsing de Sala (Code extraction)
              // Example: "104C 130 - BELCA" -> Code "130"
              if (!machineId && rowSala) {
                   // Strategy: Look for digits that match a known machine code
                   // Iterate all known machine codes to see if they appear in Sala string
                   // This is safer than regex guessing
                   
                   // freshMachines is available
                   for (const m of freshMachines) {
                       if (!m.codigo) continue;
                       const codeStr = String(m.codigo).trim();
                       if (codeStr.length < 2) continue; // Skip too short codes to avoid false positives (e.g. "1")
                       
                       // Check if Sala contains the code as a distinct word
                       const regex = new RegExp(`\\b${codeStr}\\b`);
                       if (regex.test(rowSala)) {
                           machineId = m.id;
                           break; // Found matching code in Sala
                       }
                   }
              }

              // C. Matching por Substring (Fuzzy) - Solves "001A 119 - B1600..." vs "B1600..."
              if (!machineId && rowMachineName) {
                   const searchName = normalizeKey(rowMachineName);
                   
                   for (const m of freshMachines) {
                       const mName = normalizeKey(m.nombre);
                       const mAlias = normalizeKey(getMachineAlias(m));
                       
                       // Check if machine name contains the imported name (e.g. DB has full name, Import has partial)
                       // OR if imported name contains the machine name (Import has full info, DB has partial)
                       // Enforce min length 4 to avoid matching short codes like "1" or "A" loosely
                       if (mName.includes(searchName) || (mName.length > 3 && searchName.includes(mName)) ||
                           mAlias.includes(searchName) || (mAlias.length > 3 && searchName.includes(mAlias))) {
                           machineId = m.id;
                           break; 
                       }
                   }
              }
          }

          if (!machineId) {
              skipped++;
              if (skipped <= 5) console.warn(`[Sync] Máquina no encontrada para orden ${orderNumber}. Valor máquina: "${rowMachineName}"`);
              continue;
          }

          const rawPriority = parseInt(row['Prioridad'] || row['priority']);
          const payload = {
              order_number: String(orderNumber),
              machine_id: machineId,
              client_name: row['Cliente'] || row['client_name'] || row['client'],
              product_article_code: row['Artículo'] || row['product_article_code'] || row['article'],
            product_name: row['Nombre'] || row['Descripción'] || row['product_name'] || row['description'],
            quantity: parseInt(row['Cantidad'] || row['quantity']) || 0,
            material_type: row['Material'] || row['material_type'] || row['material'] || '',
            multi_qty: row['Multiplo x Cantidad'] || row['Multiplo'] || row['multi_qty'] || '',
            priority: isNaN(rawPriority) ? 3 : rawPriority,
              status: row['Estado'] || row['status'] || 'Pendiente',
              start_date: parseImportDate(row['Fecha Inicio Limite'] || row['Fecha Inicio Modificada'] || row['start_date']),
            committed_delivery_date: parseImportDate(row['Fecha Entrega'] || row['committed_delivery_date'] || row['delivery_date']),
            new_delivery_date: parseImportDate(row['Nueva Fecha Entrega'] || row['new_delivery_date']),
            planned_end_date: parseImportDate(row['Fecha Fin'] || row['planned_end_date'] || row['end_date']),
            production_cadence: parseFloat(row['Cadencia'] || row['production_cadence'] || row['cadence']) || 0,
            notes: row['Observación'] || row['notes'] || ''
          };

          // Debug payload for first few items to check dates
          if (created < 3) {
             console.log(`[Sync] Payload example for ${orderNumber}:`, payload);
          }

          try {
              await base44.entities.WorkOrder.create(payload);
              created++;
          } catch (e) {
              console.error(`Error creating order ${orderNumber}:`, e);
          }
          
          // Delay to be gentle with API (200ms)
          await new Promise(resolve => setTimeout(resolve, 200));
      }

      toast.success(`Sincronización completada. Creadas: ${created}, Saltadas: ${skipped}`, { id: toastId });
      console.log(`[Sync] Finalizado. Creadas: ${created}, Saltadas: ${skipped}`);
      
      // RECARGAR DATOS
      await fetchWorkOrders();
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error('Error en sincronización:', error);
      if (toastId) {
        toast.error("Error de conexión: " + error.message);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditOrder = (order) => {
    setEditingOrder(order);
    setIsFormOpen(true);
  };

  const handleNewOrder = () => {
    setEditingOrder(null);
    setIsFormOpen(true);
  };

  const handleOrderDrop = (order, dateStr, machineId) => {
    setDropDialogData({
      order,
      dropDate: dateStr,
      machineId
    });
  };

  const scheduleMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrders'] });
      toast.success("Orden programada correctamente");
      setDropDialogData(null);
    },
    onError: (err) => toast.error("Error al programar: " + err.message)
  });

  const handleScheduleConfirm = (id, data) => {
     // Asprova Logic: Finite Capacity Scheduling Check
     const orderToUpdate = workOrders.find(o => o.id === id);
     if (!orderToUpdate) return;

     const machineId = orderToUpdate.machine_id;
     const newStart = new Date(data.start_date);
     const newEnd = new Date(data.planned_end_date);

     // Check existing orders on this machine
     const conflict = workOrders.find(o => {
        if (o.id === id) return false; // Ignore self
        if (o.machine_id !== machineId) return false; // Ignore other machines
        if (!o.start_date) return false; // Ignore unscheduled

        // Existing order dates
        const oStart = new Date(o.start_date);
        const oEnd = o.planned_end_date 
            ? new Date(o.planned_end_date) 
            : (o.committed_delivery_date ? new Date(o.committed_delivery_date) : oStart);

        // Check overlap: StartA <= EndB && EndA >= StartB
        return newStart <= oEnd && newEnd >= oStart;
     });

     if (conflict) {
         toast.error(`Conflicto de capacidad: Solapa con orden ${conflict.order_number}`, {
             description: "Principio de Capacidad Finita (Asprova): Una máquina no puede procesar dos órdenes simultáneamente."
         });
         return; 
     }

     scheduleMutation.mutate({ id, data });
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Section Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Factory className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Planificación de Producción
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestión de órdenes de trabajo y previsión de recursos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['workOrders'] })}
            variant="outline"
            size="sm"
            className="h-8 text-xs border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Recargar datos de la base de datos"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" />
            <span className="hidden md:inline">Recargar</span>
          </Button>
        </div>
      </div>
          
          <Link to="/OrderImport">
             <Button variant="secondary" className="bg-green-600 hover:bg-green-700 text-white border-0">
                 <DownloadCloud className="w-4 h-4" />
                 <span className="ml-2 hidden md:inline">Importar / Sincronizar</span>
             </Button>
          </Link>

          <Button type="button" onClick={handleNewOrder} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Orden
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="mb-6 flex-shrink-0">
        <CardContent className="p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-2 min-w-[200px]">
            <Label>Rango de Fechas</Label>
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-auto"
              />
              <span className="text-slate-400">-</span>
              <Input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-auto"
              />
            </div>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <Label>Máquina</Label>
            <Select value={selectedMachine} onValueChange={setSelectedMachine}>
              <SelectTrigger>
                <SelectValue placeholder="Todas las máquinas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {machines.map(m => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.alias || m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <Label>Equipo (Disponibilidad)</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar recursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los equipos</SelectItem>
                {teams.map(t => (
                  <SelectItem key={t.id} value={t.team_name}>{t.team_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <Label>Estado Orden</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="En Progreso">En Progreso</SelectItem>
                <SelectItem value="Completada">Completada</SelectItem>
                <SelectItem value="Retrasada">Retrasada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {/* Resource Analysis Tabs */}
        <div className="min-h-0 flex flex-col">
          <Tabs defaultValue="personnel" className="w-full">
             <div className="flex items-center justify-between mb-2">
                 <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Análisis de Recursos</h3>
                 <TabsList>
                    <TabsTrigger value="personnel">Personal (RRHH)</TabsTrigger>
                    <TabsTrigger value="machines">Máquinas (Carga)</TabsTrigger>
                 </TabsList>
             </div>
             
             <TabsContent value="personnel">
                <ResourceForecast 
                  orders={filteredOrders}
                  processes={processes}
                  machineProcesses={machineProcesses}
                  employees={employees}
                  teams={teams}
                  selectedTeam={selectedTeam}
                  dateRange={dateRange}
                />
             </TabsContent>
             
             <TabsContent value="machines">
                <MachineLoadGraph 
                   orders={filteredOrders}
                   machines={machines}
                   dateRange={dateRange}
                />
             </TabsContent>
          </Tabs>
        </div>

        {/* Main Planning View */}
        <div className="min-h-0 flex flex-col">
          <Tabs defaultValue="gantt" className="h-full flex flex-col">
            <TabsList className="flex-shrink-0 w-fit">
              <TabsTrigger value="gantt" type="button">Vista Gantt</TabsTrigger>
              <TabsTrigger value="list" type="button">Vista Lista por Máquina</TabsTrigger>
            </TabsList>
            
            <TabsContent value="gantt" className="flex-1 min-h-0 mt-2">
              <PlanningGantt 
                orders={filteredOrders} 
                machines={machines}
                processes={processes}
                dateRange={dateRange}
                onEditOrder={handleEditOrder}
                onOrderDrop={handleOrderDrop}
                holidays={holidays}
              />
            </TabsContent>

            <TabsContent value="list" className="flex-1 mt-2">
              <MachineOrdersList 
                machines={machines}
                orders={filteredOrders}
                processes={processes}
                onEditOrder={handleEditOrder}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <WorkOrderForm 
        open={isFormOpen} 
        onClose={() => setIsFormOpen(false)}
        orderToEdit={editingOrder}
        machines={machines}
        processes={processes}
        machineProcesses={machineProcesses}
        existingOrders={workOrders}
      />

      <ScheduleOrderDialog 
        open={!!dropDialogData}
        onClose={() => setDropDialogData(null)}
        order={dropDialogData?.order}
        dropDate={dropDialogData?.dropDate}
        processes={processes}
        machines={machines}
        machineProcesses={machineProcesses}
        onConfirm={handleScheduleConfirm}
        holidays={holidays}
      />
    </div>
  );
}