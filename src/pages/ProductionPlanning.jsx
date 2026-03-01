import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Factory, Plus, RefreshCw, DownloadCloud, AlertCircle } from "lucide-react";
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
import { buildMachinesMap } from "@/utils/machineResolution";
import { normalizeOrder } from "@/utils/orderNormalization";

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
  const [showOnlyWithPriority, setShowOnlyWithPriority] = useState(false);
  const [ganttZoom, setGanttZoom] = useState(() => {
    if (typeof window === "undefined") return "compact";
    const stored = window.localStorage.getItem("productionPlanning.ganttZoom");
    if (stored === "compact" || stored === "normal" || stored === "detailed") return stored;
    return "compact";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("productionPlanning.ganttZoom", ganttZoom);
  }, [ganttZoom]);

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
      const raw = await base44.entities.WorkOrder.list(undefined, 2000);
      // Los datos reales están en el campo `notes` como JSON serializado
      // Extraemos y fusionamos con los campos directos del entity
      return raw.map(order => {
        let extra = {};
        if (order.notes && typeof order.notes === 'string') {
          try {
            const parsed = JSON.parse(order.notes);
            if (parsed && typeof parsed === 'object') {
                extra = parsed;
                // Hoist batch ID if it only exists inside the JSON
                if (!order.import_batch_id && parsed.import_batch_id) {
                    order.import_batch_id = parsed.import_batch_id;
                }
            }
          } catch (_) { /* no JSON */ }
        }
        // Normalizar fechas: "DD/MM/YYYY HH:mm" -> ISO completo "YYYY-MM-DDTHH:mm:00"
        // IMPORTANTE: preservamos la hora para calcular posición fraccionaria en el Gantt
        const normDate = (val) => {
          if (!val) return null;
          if (typeof val !== 'string') return val;
          // Ya es ISO (contiene guiones y empieza por dígito de año)
          if (/^\d{4}-/.test(val)) return val; // dejar tal cual (con o sin hora)
          // DD/MM/YYYY o DD/MM/YYYY HH:mm
          if (val.includes('/')) {
            const [datePart, timePart] = val.split(' ');
            const parts = datePart.split('/');
            if (parts.length === 3) {
              const [d, m, y] = parts;
              if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                const dateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
                return timePart ? `${dateStr}T${timePart}:00` : dateStr;
              }
            }
          }
          return val;
        };

        // IMPORTANTE: el JSON en `notes` (extra) tiene los datos completos con horas.
        // Los campos directos del entity pueden tener versiones truncadas (sin hora).
        // Prioridad: extra (JSON interno) > order (campos directos del entity)
        const merged = { ...order, ...extra };
        return {
          ...merged,
          // Inicio vigente CON HORA: Fecha Inicio Limite tiene hora real (ej: "23/02/2026 19:37")
          // modified_start_date (Fecha Inicio Modificada) tiene prioridad si existe
          effective_start_date: (() => {
            const modStart = normDate(extra['Fecha Inicio Modificada'] || extra.modified_start_date || '');
            const startLimit = normDate(extra['Fecha Inicio Limite'] || extra.start_date || order.start_date || '');
            const result = (modStart && !String(modStart).startsWith('0000') && modStart.length > 0) ? modStart : startLimit;
            return result || null;
          })(),
          // Fecha fin CON HORA: SIEMPRE usar "Fecha Fin" del JSON interno (ej: "24/02/2026 11:49")
          // NUNCA usar effective_delivery_date del entity/JSON porque contiene la fecha de entrega, no la fin real
          effective_delivery_date: normDate(
            extra['Fecha Fin'] || extra['end_date_simple'] || extra.planned_end_date || order.planned_end_date || ''
          ),
          // Fechas normalizadas sin hora (para otros usos)
          start_date: normDate(extra['Fecha Inicio Limite'] || extra.start_date || order.start_date || ''),
          committed_delivery_date: normDate(extra['Fecha Entrega'] || extra.committed_delivery_date || order.committed_delivery_date || ''),
          new_delivery_date: normDate(extra['Nueva Fecha Entrega'] || extra.new_delivery_date || ''),
          planned_end_date: normDate(extra['Fecha Fin'] || extra.planned_end_date || order.planned_end_date || ''),
          // Campos clave del JSON
          product_article_code: extra.product_article_code || extra['Artículo'] || order.product_article_code,
          product_name: extra.product_name || extra['Nombre'] || order.product_name,
          client_name: extra.client_name || extra['Cliente'] || order.client_name,
          material_type: extra.material_type || extra['material'] || extra['Material'] || order.material_type,
          multi_qty: (() => {
            const raw = extra['Mult x Cantidad'] || extra.multi_qty || order.multi_qty;
            if (!raw) return '';
            const clean = String(raw).replace(/\./g, '').replace(/,/g, '.');
            const n = parseFloat(clean);
            return isNaN(n) ? raw : (Number.isInteger(n) ? n : n);
          })(),
          quantity: extra.quantity || extra['Cantidad'] || order.quantity,
          status: order.status || extra.status || extra['Estado'] || 'Pendiente',
          priority: order.priority ?? extra.priority ?? extra['Prioridad'] ?? 3,
          article_status: extra.article_status || extra['Edo. Art.'],
        };
      });
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
    // REVERT: Clean Slate logic removed. Showing ALL orders.
    // If you need filtering, re-enable standard filters below.

    // Las fechas effective_start_date y effective_delivery_date ya vienen calculadas
    // correctamente desde el query de workOrders (con horas precisas). NO sobreescribir.
    const filtered = workOrders.filter(order => {
      // Filter by Machine
      if (selectedMachine !== "all" && String(order.machine_id) !== String(selectedMachine)) return false;
      
      // Filter by Status
      if (selectedStatus !== "all" && order.status !== selectedStatus) return false;
      
      // Filter by Date Range - include orders that overlap with the range
      if (order.effective_start_date) {
        const orderStart = new Date(order.effective_start_date);
        // Usar effective_delivery_date (Fecha Fin con hora) para el fin real del bloque
        const orderEnd = order.effective_delivery_date ? new Date(order.effective_delivery_date) : orderStart;
        const rangeStart = new Date(dateRange.start);
        const rangeEnd = new Date(dateRange.end);
        
        // Adjust range end to end of day
        rangeEnd.setHours(23, 59, 59, 999);

        if (isNaN(orderStart.getTime())) return false;
        
        // Overlap logic: Start <= RangeEnd AND End >= RangeStart
        return orderStart <= rangeEnd && orderEnd >= rangeStart;
      }
      
      // Backlog (sin fecha inicio): siempre incluir para que aparezca en "Sin Programar"
      return true;
    })
    .filter(order => {
      // Filtro de prioridad: si showOnlyWithPriority, excluir órdenes con priority === 0 o null/undefined
      if (showOnlyWithPriority) {
        const p = order.priority;
        return p !== null && p !== undefined && p !== 0 && p !== '';
      }
      return true;
    });

    // Sort by Priority (Ascending: 1 is higher than 10)
    return filtered.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  }, [workOrders, selectedMachine, selectedStatus, dateRange, showOnlyWithPriority]);

  const visibleMachines = useMemo(() => {
    if (selectedMachine === "all") return machines;
    return machines.filter((m) => m.id === selectedMachine);
  }, [machines, selectedMachine]);

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
      let rawRows = [];
      if (response.data && Array.isArray(response.data)) {
        if (response.data.length > 0 && typeof response.data[0] === 'object' && !Array.isArray(response.data[0])) {
            rawRows = response.data;
        } else if (response.headers && Array.isArray(response.headers)) {
             rawRows = response.data.map(r => {
                 const obj = {};
                 response.headers.forEach((h, i) => { if (r[i] !== undefined) obj[h] = r[i]; });
                 return obj;
             });
        } else { rawRows = response.data; }
      } else if (Array.isArray(response)) { rawRows = response; }
      else if (response?.data) { rawRows = Array.isArray(response.data) ? response.data : [response.data]; }

      if (rawRows.length === 0) {
        toast.warning("CDEApp devolvió 0 órdenes.");
        setIsSyncing(false);
        return;
      }

      // 3. Preparar mapeo de máquinas y normalización de órdenes
      const freshMachines = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      const { resolveMachine } = buildMachinesMap(freshMachines);
      const rows = rawRows.map(normalizeOrder);

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
      
      const currentBatchId = `batch_${Date.now()}`;
      if (toastId) { toast.loading(`Importando ${totalToCreate} órdenes...`, { id: toastId }); }
      else { toastId = toast.loading(`Importando ${totalToCreate} órdenes...`); }
      
      for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (i % 5 === 0) {
              const percent = Math.round((i / totalToCreate) * 100);
              toast.loading(`Importando: ${percent}% (${i}/${totalToCreate})`, { id: toastId });
          }

          const orderNumber = row.order_number;
          if (!orderNumber) continue;

          const machineId = resolveMachine(row.machine_name, row.machine_id_source, true); // Fallback to 'Sin Asignar'

          const payload = {
              ...row,
              order_number: String(orderNumber),
              machine_id: machineId,
              import_batch_id: currentBatchId,
              notes: JSON.stringify({ ...row, import_batch_id: currentBatchId })
          };

          try {
              await base44.entities.WorkOrder.create(payload);
              created++;
          } catch (e) { console.error(`Error creating order ${orderNumber}:`, e); }
          
          // Delay to be gentle with API (200ms)
          await new Promise(resolve => setTimeout(resolve, 200));
      }

      toast.success(`Sincronización completada. Creadas: ${created}, Saltadas: ${skipped}`, { id: toastId });
      console.log(`[Sync] Finalizado. Creadas: ${created}, Saltadas: ${skipped}`);
      
      await queryClient.invalidateQueries({ queryKey: ['workOrders'] });
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

          <div className="space-y-2 min-w-[180px]">
            <Label>Visualización</Label>
            <Select value={showOnlyWithPriority ? "priority" : "all"} onValueChange={v => setShowOnlyWithPriority(v === "priority")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mostrar todas</SelectItem>
                <SelectItem value="priority">Solo con prioridad</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 min-w-[150px]">
            <Label>Zoom Gantt</Label>
            <Select value={ganttZoom} onValueChange={setGanttZoom}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compacto</SelectItem>
                <SelectItem value="normal">Medio</SelectItem>
                <SelectItem value="detailed">Detallado</SelectItem>
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
                  employees={employees}
                  selectedTeam={selectedTeam}
                  dateRange={dateRange}
                />
             </TabsContent>
             
             <TabsContent value="machines">
                <MachineLoadGraph 
                   orders={filteredOrders}
                   machines={visibleMachines}
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
                machines={visibleMachines}
                processes={processes}
                dateRange={dateRange}
                onEditOrder={handleEditOrder}
                onOrderDrop={handleOrderDrop}
                holidays={holidays}
                zoomLevel={ganttZoom}
              />
            </TabsContent>

            <TabsContent value="list" className="flex-1 mt-2">
              <MachineOrdersList 
                machines={visibleMachines}
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