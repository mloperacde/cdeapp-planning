import React, { useState, useMemo, useEffect } from 'react';
import { cdeApp } from '../../api/cdeAppClient';
import { base44 } from '../../api/base44Client';
import { toast } from 'sonner';
import { Download, Table as TableIcon, Save, Search, Filter, Plus, X, Trash2, RefreshCw, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

// Column Mapping Configuration
const SYSTEM_FIELDS = [
    { key: 'production_id', label: 'Production ID', aliases: ['production_id', 'id', 'PRODUCTION_ID', 'IdProduccion', 'ID Produccion', 'Prod ID', 'id_produccion', 'ID', 'Id. Produccion'] },
    { key: 'machine_id_source', label: 'machine_id', aliases: ['machine_id', 'id_maquina', 'MACHINE_ID', 'MachineId', 'Machine ID', 'ID Maquina', 'Machine_Id'] },
    { key: 'priority', label: 'Prioridad', aliases: ['priority', 'Prioridad', 'urgencia', 'PRIORIDAD', 'Priority', 'Rank', 'Ranking', 'Nivel', 'Level', 'Importancia', 'Sequence', 'Secuencia', 'Prioridad Produccion'] },
    { key: 'type', label: 'Tipo', aliases: ['type', 'Tipo', 'TIPO', 'Type', 'Clase', 'Class', 'Kind', 'Categoria', 'Tipo Orden', 'Order Type'] },
    { key: 'status', label: 'Estado', aliases: ['status', 'Estado', 'situacion', 'estatus', 'ESTADO', 'Status', 'State', 'Condition', 'Situación', 'status_source', 'Status Orden'] },
    { key: 'room', label: 'Sala', aliases: ['room', 'Sala', 'SALA', 'Room', 'Nave', 'Zona', 'Zone', 'Area', 'Seccion', 'Ubicacion', 'Location', 'Sala Produccion'] },
    { key: 'machine_name', label: 'Máquina', required: true, aliases: ['machine_name', 'Máquina', 'maquina', 'machine', 'recurso', 'MÁQUINA', 'MAQUINA', 'Centro Trabajo', 'Work Center', 'Code', 'Resource', 'W.C.', 'C.T.', 'Nombre Maquina'] },
    { key: 'client_order_ref', label: 'Su Pedido', aliases: ['client_order_ref', 'Su Pedido', 'client_order', 'SU PEDIDO', 'SU_PEDIDO', 'ClientOrder', 'PedidoCliente', 'Customer Order', 'Ref Cliente', 'Su No. Pedido', 'Pedido Cliente', 'Customer PO', 'Client PO'] },
    { key: 'internal_order_ref', label: 'Pedido', aliases: ['internal_order_ref', 'Pedido', 'internal_order', 'InternalOrder', 'PedidoInterno', 'Ref Interna', 'Pedido Interno', 'Internal Ref', 'WO', 'Work Order'] },
    { key: 'order_number', label: 'Orden', required: true, aliases: ['order_number', 'Orden', 'numero_orden', 'wo', 'ORDEN', 'Order', 'W.O.', 'OP', 'OrderNo', 'Order Number', 'Nº Orden', 'Num Orden'] },
    { key: 'product_article_code', label: 'Artículo', aliases: ['product_article_code', 'Artículo', 'article', 'referencia', 'part_number', 'codigo', 'cod_articulo', 'Item', 'Material', 'Part No', 'Part Number', 'Codigo Articulo', 'Referencia', 'Code'] },
    { key: 'product_name', label: 'Nombre', aliases: ['product_name', 'Nombre', 'Descripción', 'description', 'detalle', 'producto', 'desc_articulo', 'Description', 'Designation', 'Item Name', 'Descripcion', 'Nombre Articulo', 'Product Name'] },
    { key: 'article_status', label: 'Edo. Art.', aliases: ['article_status', 'Edo. Art.', 'part_status', 'Estado Articulo', 'Status Articulo', 'Item Status', 'Part Status', 'Estado Parte'] },
    { key: 'client_name', label: 'Cliente', aliases: ['client_name', 'Cliente', 'client', 'customer', 'empresa', 'razon_social', 'Customer', 'Client', 'Nombre Cliente'] },
    { key: 'material', label: 'Material', aliases: ['material', 'Material', 'Raw Material', 'Materia Prima', 'Compuesto', 'Compound', 'Componente'] },
    { key: 'product_family', label: 'Producto', aliases: ['product_family', 'Producto', 'product', 'Familia', 'Family', 'Product Family', 'Familia Producto'] },
    { key: 'shortages', label: 'Faltas', aliases: ['shortages', 'Faltas', 'Missing', 'Faltantes', 'Shortage', 'Components Missing'] },
    { key: 'quantity', label: 'Cantidad', aliases: ['quantity', 'Cantidad', 'qty', 'unidades', 'piezas', 'cantidad_pendiente', 'saldo', 'Quantity', 'Amount', 'Cant', 'Unidades', 'Pcs'] },
    { key: 'committed_delivery_date', label: 'Fecha Entrega', aliases: ['committed_delivery_date', 'Fecha Entrega', 'entrega', 'delivery_date', 'fecha_fin', 'Due Date', 'FechaFin', 'Fecha Entrega Comprometida', 'Delivery Date', 'Fecha Limite'] },
    { key: 'new_delivery_date', label: 'Nueva Fecha Entrega', aliases: ['new_delivery_date', 'Nueva Fecha Entrega', 'New Due Date', 'Fecha Reprogramada', 'New Delivery Date', 'Fecha Entrega Nueva'] },
    { key: 'delivery_compliance', label: 'Cumplimiento entrega', aliases: ['delivery_compliance', 'Cumplimiento entrega', 'compliance', 'Cumplimiento', 'Delivery Compliance'] },
    { key: 'multi_unit', label: 'MultUnid', aliases: ['multi_unit', 'MultUnid', 'Multi Unit', 'Unidades Multiples'] },
    { key: 'multi_qty', label: 'Mult x Cantidad', aliases: ['multi_qty', 'Mult x Cantidad', 'Multi Qty', 'Cantidad Multiple'] },
    { key: 'production_cadence', label: 'Cadencia', aliases: ['production_cadence', 'Cadencia', 'cadence', 'ciclo', 'Cycle Time', 'Velocidad', 'Speed', 'Rate'] },
    { key: 'delay_reason', label: 'Motivo Retraso', aliases: ['delay_reason', 'Motivo Retraso', 'Delay Cause', 'Reason', 'Causa Retraso', 'Delay Reason'] },
    { key: 'components_deadline', label: 'Fecha limite componentes', aliases: ['components_deadline', 'Fecha limite componentes', 'Components Deadline', 'Limite Componentes'] },
    { key: 'start_date', label: 'Fecha Inicio Limite', aliases: ['start_date', 'Fecha Inicio Limite', 'inicio', 'fecha_inicio', 'Start Date', 'Fecha Comienzo', 'Start'] },
    { key: 'start_date_simple', label: 'Fecha Inicio Limite Simple', aliases: ['start_date_simple', 'Fecha Inicio Limite Simple', 'Start Date Simple', 'Inicio Simple'] },
    { key: 'modified_start_date', label: 'Fecha Inicio Modificada', aliases: ['modified_start_date', 'Fecha Inicio Modificada', 'Modified Start Date', 'Inicio Modificado'] },
    { key: 'planned_end_date', label: 'Fecha Fin', aliases: ['planned_end_date', 'Fecha Fin', 'end_date', 'fin', 'End Date', 'Fecha Finalizacion', 'End'] },
    { key: 'end_date_simple', label: 'Fecha Fin Simple', aliases: ['end_date_simple', 'Fecha Fin Simple', 'End Date Simple', 'Fin Simple'] },
    { key: 'notes', label: 'Observación', aliases: ['notes', 'Observación', 'notas', 'comentarios', 'Remarks', 'Comments', 'Observaciones', 'Nota', 'Notes'] }
];

const COLUMN_DISPLAY_ORDER = [
    'production_id',
    'machine_id_source',
    'priority',
    'type',
    'status',
    'room',
    'machine_name',
    'client_order_ref',
    'internal_order_ref',
    'order_number',
    'product_article_code',
    'product_name',
    'article_status',
    'client_name',
    'material',
    'product_family',
    'shortages',
    'quantity',
    'committed_delivery_date',
    'new_delivery_date',
    'delivery_compliance',
    'multi_unit',
    'multi_qty',
    'production_cadence',
    'delay_reason',
    'components_deadline',
    'start_date',
    'start_date_simple',
    'modified_start_date',
    'planned_end_date',
    'end_date_simple',
    'notes'
];

// Helper to extract value from row checking multiple aliases and case/normalization
const extractValue = (obj, fieldDef) => {
    if (!obj) return undefined;
    const keys = fieldDef.aliases || [];
    
    // 1. Check exact key matches first (fastest)
    if (obj[fieldDef.key] !== undefined && obj[fieldDef.key] !== null) return obj[fieldDef.key];

    // Normalize helper
    const normalizeKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Create map of normalized keys from the object
    const normalizedObjKeys = Object.keys(obj).reduce((acc, k) => {
        acc[normalizeKey(k)] = k;
        return acc;
    }, {});
    
    // 2. Check aliases against normalized keys
    for (const key of keys) {
        // Check exact alias
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        
        // Check normalized alias
        const normKey = normalizeKey(key);
        const realKey = normalizedObjKeys[normKey];
        if (realKey && obj[realKey] !== undefined && obj[realKey] !== null) return obj[realKey];
    }

    // 3. Fuzzy Match Fallback (Last Resort)
    // Look for keys that contain the field key or label (e.g. "sala" in "id_sala_origen")
    const searchTerms = [fieldDef.key, fieldDef.label].filter(Boolean).map(normalizeKey);
    for (const term of searchTerms) {
        if (term.length < 3) continue; // Skip too short terms to avoid false positives
        const matchingKey = Object.keys(normalizedObjKeys).find(k => k.includes(term));
        if (matchingKey) {
            const realKey = normalizedObjKeys[matchingKey];
            if (obj[realKey] !== undefined && obj[realKey] !== null) return obj[realKey];
        }
    }
    
    return undefined;
};

export default function OrderImport() {
  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [debugData, setDebugData] = useState(null); // Debug state
  const [progress, setProgress] = useState(0);
  // Columns are fixed based on user requirement
  const columns = COLUMN_DISPLAY_ORDER;
  
  // Filtering & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState([]);
  const [newFilter, setNewFilter] = useState({ column: "", operator: "contains", value: "" });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    fetchLocalData();
  }, []);

  const fetchLocalData = async () => {
    setLoading(true);
    try {
        // Fetch saved orders and machines to hydrate names
        const [ordersRes, machinesRes] = await Promise.all([
            base44.entities.WorkOrder.list(undefined, 2000), 
            base44.entities.MachineMasterDatabase.list(undefined, 2000)
        ]);
        
        const orders = Array.isArray(ordersRes) ? ordersRes : (ordersRes.items || []);
        const machines = Array.isArray(machinesRes) ? machinesRes : (machinesRes.items || []);
        
        const machinesMap = new Map();
        machines.forEach(m => machinesMap.set(m.id, m.nombre || m.codigo_maquina));

        if (orders.length > 0) {
            // Deduplicate orders by order_number (keep most recent)
            const uniqueOrders = new Map();
            orders.forEach(o => {
                if (!o.order_number) return;
                const existing = uniqueOrders.get(o.order_number);
                if (!existing) {
                    uniqueOrders.set(o.order_number, o);
                } else {
                    const existingDate = new Date(existing.updated_at || existing.created_at || 0);
                    const currentDate = new Date(o.updated_at || o.created_at || 0);
                    if (currentDate > existingDate) {
                        uniqueOrders.set(o.order_number, o);
                    }
                }
            });

            const deduplicatedOrders = Array.from(uniqueOrders.values());

            // Normalize data using SYSTEM_FIELDS aliases to recover data even if DB column names differ
            const formattedOrders = deduplicatedOrders.map(o => {
                const newRow = { ...o };
                SYSTEM_FIELDS.forEach(field => {
                    // Try to get value from exact key first, then extractValue
                    let val = o[field.key];
                    if (val === undefined) {
                         val = extractValue(o, field);
                    }
                    if (val !== undefined) newRow[field.key] = val;
                });
                
                // Specific overrides
                newRow.id = o.id; // Preserve system ID
                
                // Hydrate machine name if we have a machine_id
                if (o.machine_id && machinesMap.has(o.machine_id)) {
                    newRow.machine_name = machinesMap.get(o.machine_id);
                } else if (!newRow.machine_name && o.machine_id_source) {
                    // Fallback to source machine name if ID resolution failed previously
                     newRow.machine_name = o.machine_id_source;
                }
                
                return newRow;
            });
            
            setRawOrders(formattedOrders);
            
            // Set lastSyncTime from newest updated_at or created_at
            const newest = deduplicatedOrders.reduce((prev, curr) => {
                const prevDate = new Date(prev.updated_at || prev.created_at || 0);
                const currDate = new Date(curr.updated_at || curr.created_at || 0);
                return prevDate > currDate ? prev : curr;
            }, deduplicatedOrders[0]);
            
            if (newest) {
                const dateVal = newest.updated_at || newest.created_at;
                if (dateVal) setLastSyncTime(new Date(dateVal));
            }
        }
    } catch (e) {
        console.error("Error loading local data", e);
        toast.error("Error cargando datos guardados.");
    } finally {
        setLoading(false);
    }
  };

  const syncMachinesToLocalDB = async (background = false) => {
      const toastId = background ? null : toast.loading("Sincronizando catálogo de máquinas...");
      try {
          const machines = await cdeApp.syncMachines();
          const machineList = Array.isArray(machines) ? machines : (machines.data || []);
          
          if (machineList.length === 0) {
              if (!background) toast.info("No se encontraron máquinas en CDEApp.", { id: toastId });
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

          const msg = `Catálogo sincronizado: ${created} nuevas, ${updated} actualizadas.`;
          setLastSyncTime(new Date());
          if (!background) toast.success(msg, { id: toastId });
          else console.log(msg);
      } catch (error) {
          console.error("Error syncing machines:", error);
          if (!background) toast.error("Error sincronizando máquinas.", { id: toastId });
      }
  };

  const fetchOrders = async () => {
    setLoading(true);
    const toastId = toast.loading("Sincronizando datos con CDEApp...");
    
    try {
      // Execute in parallel: Fetch Productions and Sync Machines
      const [response] = await Promise.all([
          cdeApp.syncProductions(),
          syncMachinesToLocalDB(true)
      ]);

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

      // Normalize keys immediately to standard DB keys (handling Spanish/English mix)
      const normalize = (row) => {
          const newRow = { ...row };
          SYSTEM_FIELDS.forEach(field => {
              const val = extractValue(row, field);
              if (val !== undefined) newRow[field.key] = val;
          });
          
          // Specific overrides / Type conversions
          newRow.priority = parseInt(newRow.priority) || 0;
          newRow.quantity = parseInt(newRow.quantity) || 0;
          newRow.status = newRow.status || 'Pendiente';
          newRow.notes = newRow.notes || '';
          newRow.multi_unit = parseInt(newRow.multi_unit) || 0;
          newRow.multi_qty = parseFloat(newRow.multi_qty) || 0;
          newRow.production_cadence = parseFloat(newRow.production_cadence) || 0;
          
          return newRow;
      };

      if (data.length > 0) {
        // Normalize all data immediately
        data = data.map(normalize);

        console.log("First row raw data:", data[0]);
        setDebugData(data[0]);
      }

      setRawOrders(data);
      toast.success(`${data.length} registros obtenidos sin procesar.`, { id: toastId });
    } catch (error) {
      console.error("Error obteniendo datos:", error);
      toast.error("Error al conectar con CDEApp.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
      if (!rawOrders) return [];
      
      return rawOrders.filter(row => {
          // 1. Global Search
          if (searchQuery) {
              const query = searchQuery.toLowerCase();
              const match = Object.values(row).some(val => 
                  String(val).toLowerCase().includes(query)
              );
              if (!match) return false;
          }

          // 2. Advanced Filters
          if (filters.length > 0) {
              const allFiltersMatch = filters.every(f => {
                  const val = row[f.column];
                  const strVal = String(val !== undefined && val !== null ? val : "").toLowerCase();
                  const filterVal = f.value.toLowerCase();

                  switch (f.operator) {
                      case 'contains': return strVal.includes(filterVal);
                      case 'equals': return strVal === filterVal;
                      case 'startsWith': return strVal.startsWith(filterVal);
                      case 'endsWith': return strVal.endsWith(filterVal);
                      case 'notContains': return !strVal.includes(filterVal);
                      default: return true;
                  }
              });
              if (!allFiltersMatch) return false;
          }

          return true;
      });
  }, [rawOrders, searchQuery, filters]);

  const addFilter = () => {
      if (newFilter.column && newFilter.value) {
          setFilters([...filters, { ...newFilter, id: Date.now() }]);
          setNewFilter({ column: "", operator: "contains", value: "" });
          setIsFilterOpen(false);
      }
  };

  const removeFilter = (id) => {
      setFilters(filters.filter(f => f.id !== id));
  };

  const handleDeleteAll = async () => {
      if (!confirm("¿Estás seguro de que quieres eliminar TODOS los datos de WorkOrder? Esta acción no se puede deshacer.")) return;
      
      try {
          setLoading(true);
          const allOrders = await base44.entities.WorkOrder.list(null, 10000); // Fetch all
          
          let deletedCount = 0;
          for (const order of allOrders) {
              await base44.entities.WorkOrder.delete(order.id);
              deletedCount++;
          }
          
          toast.success(`Eliminados ${deletedCount} registros correctamente.`);
          setRawOrders([]); // Clear UI
          fetchLocalData(); // Refresh (should be empty)
      } catch (error) {
          console.error("Error deleting all:", error);
          toast.error("Error al eliminar datos.");
      } finally {
          setLoading(false);
      }
  };

  // --- SAVE LOGIC ---
  // Helper to extract value from row checking multiple aliases and case/normalization
  const extractValue = (obj, fieldDef) => {
      if (!obj) return undefined;
      const keys = fieldDef.aliases || [];
      
      // 1. Check exact key matches first (fastest)
      if (obj[fieldDef.key] !== undefined && obj[fieldDef.key] !== null) return obj[fieldDef.key];

      // Normalize helper
      const normalizeKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Create map of normalized keys from the object
      const normalizedObjKeys = Object.keys(obj).reduce((acc, k) => {
          acc[normalizeKey(k)] = k;
          return acc;
      }, {});
      
      // 2. Check aliases against normalized keys
      for (const key of keys) {
          // Check exact alias
          if (obj[key] !== undefined && obj[key] !== null) return obj[key];
          
          // Check normalized alias
          const normKey = normalizeKey(key);
          const realKey = normalizedObjKeys[normKey];
          if (realKey && obj[realKey] !== undefined && obj[realKey] !== null) return obj[realKey];
      }

      // 3. Fuzzy Match Fallback (Last Resort)
      // Look for keys that contain the field key or label (e.g. "sala" in "id_sala_origen")
      const searchTerms = [fieldDef.key, fieldDef.label].filter(Boolean).map(normalizeKey);
      for (const term of searchTerms) {
          if (term.length < 3) continue; // Skip too short terms to avoid false positives
          const matchingKey = Object.keys(normalizedObjKeys).find(k => k.includes(term));
          if (matchingKey) {
              const realKey = normalizedObjKeys[matchingKey];
              if (obj[realKey] !== undefined && obj[realKey] !== null) return obj[realKey];
          }
      }
      
      return undefined;
  };

  const getMachineId = async (machineName) => {
     if (!machineName) return null;
     // Simple cache logic could be added here, but for now we fetch list if needed or rely on backend to handle text matching?
     // Actually, we need a machine ID to create a WorkOrder.
     // Let's try to fetch all machines once if not loaded.
     // For this implementation, we will fetch machines on save start.
     return null; // Placeholder, logic inside saveOrders
  };

  const createWithRetry = async (payload, retries = 5, delay = 2000) => {
      try {
          return await base44.entities.WorkOrder.create(payload);
      } catch (e) {
          // Check for Rate Limit (429) or other transient errors
          const isRateLimit = e.status === 429 || (e.message && e.message.includes('Rate limit')) || (e.message && e.message.includes('429'));
          
          if (retries > 0 && isRateLimit) {
              // Exponential backoff with jitter
              const jitter = Math.random() * 1000;
              const nextDelay = delay * 1.5 + jitter;
              console.log(`Rate limit hit. Retrying in ${Math.round(nextDelay)}ms... (${retries} left)`);
              await new Promise(r => setTimeout(r, nextDelay));
              return createWithRetry(payload, retries - 1, nextDelay);
          }
          throw e;
      }
  };

  const deleteAllOrders = async () => {
      if (!confirm("⚠️ ¡PELIGRO! ⚠️\n\n¿Estás seguro de que quieres BORRAR TODA LA BASE DE DATOS de órdenes?\n\nEsta acción eliminará todos los registros de WorkOrder y no se puede deshacer.")) return;
      
      setSaving(true);
      const toastId = toast.loading("Borrando base de datos...");
      try {
          // Fetch all records
          let allItems = [];
          let page = 0;
          let hasMore = true;
          while(hasMore) {
             const res = await base44.entities.WorkOrder.list(undefined, 2000, page * 2000);
             const items = Array.isArray(res) ? res : (res.items || []);
             if (items.length > 0) {
                 allItems = [...allItems, ...items];
                 page++;
             } else {
                 hasMore = false;
             }
             if (items.length < 2000) hasMore = false;
          }
          
          if (allItems.length === 0) {
             toast.info("La base de datos ya está vacía.", { id: toastId });
             setSaving(false);
             return;
          }

          // Delete strictly sequentially (1 by 1) to avoid 429
          const deleteWithRetry = async (id, retries = 5, delay = 2000) => {
             try {
                 await base44.entities.WorkOrder.delete(id);
             } catch (e) {
                 // 429 or network error
                 if (retries > 0) {
                     console.log(`Rate limit/Error deleting ${id}. Retrying in ${delay}ms...`);
                     await new Promise(r => setTimeout(r, delay));
                     return deleteWithRetry(id, retries - 1, delay * 2);
                 }
                 console.error(`Failed to delete ${id} after retries.`);
             }
          };

          for (let i = 0; i < allItems.length; i++) {
             await deleteWithRetry(allItems[i].id);
             
             // Update progress every 5 items to avoid too many renders
             if (i % 5 === 0) {
                setProgress(Math.round(((i + 1) / allItems.length) * 100));
             }
             
             // Small breathing room between requests
             await new Promise(r => setTimeout(r, 100));
          }
          
          setRawOrders([]); // Clear local view
          setLastSyncTime(null);
          toast.success(`Base de datos eliminada (${allItems.length} registros).`, { id: toastId });
      } catch (e) {
          console.error(e);
          toast.error("Error borrando base de datos.", { id: toastId });
      } finally {
          setSaving(false);
          setProgress(0);
      }
  };

  const saveOrders = async () => {
      if (filteredOrders.length === 0) {
          toast.warning("No hay órdenes visibles para guardar.");
          return;
      }

      if (!confirm(`Se van a guardar ${filteredOrders.length} registros visibles. ¿Continuar?`)) return;

      setSaving(true);
      setProgress(0);
      const toastId = toast.loading("Preparando datos para guardar...");

      try {
          // 1. Cargar máquinas para resolución
          let machinesMap = new Map();
          try {
              let res = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
              if (!res || res.length === 0) {
                  const resLegacy = await base44.entities.Machine.list(undefined, 1000);
                  res = resLegacy.items || resLegacy;
              }
              if (Array.isArray(res)) {
                  res.forEach(m => {
                      if (m.nombre) machinesMap.set(m.nombre.toLowerCase().trim(), m.id);
                      if (m.codigo_maquina) machinesMap.set(m.codigo_maquina.toLowerCase().trim(), m.id);
                      if (m.code) machinesMap.set(m.code.toLowerCase().trim(), m.id);
                      if (m.descripcion) machinesMap.set(m.descripcion.toLowerCase().trim(), m.id);
                  });
              }
          } catch (e) {
              console.error("Error cargando máquinas:", e);
              toast.error("Error cargando catálogo de máquinas. La resolución de IDs puede fallar.");
          }

          let successCount = 0;
          let failCount = 0;
          let processed = 0;
          const total = filteredOrders.length;
          const skippedItems = [];
          
          // Batch configuration
          const CHUNK_SIZE = 2; // Process 2 at a time (safer for rate limits)
          const CHUNK_DELAY = 500; // 500ms delay between chunks

          // 2. Procesar y Guardar por lotes
          for (let i = 0; i < total; i += CHUNK_SIZE) {
              const chunk = filteredOrders.slice(i, i + CHUNK_SIZE);
              
              await Promise.all(chunk.map(async (row) => {
                  const orderNumber = row.order_number;
                  const machineName = row.machine_name;
                  const machineIdSource = row.machine_id_source;

                  // Intentar resolver ID de máquina
                  let machineId = null;
                  if (machineName) {
                      const s = String(machineName).toLowerCase().trim();
                      if (machinesMap.has(s)) machineId = machinesMap.get(s);
                      // Intento split simple "Code - Name"
                      else if (s.includes(' - ')) {
                          const parts = s.split(' - ');
                          if (machinesMap.has(parts[0].trim())) machineId = machinesMap.get(parts[0].trim());
                      }
                  }

                  if (!orderNumber || !machineId) {
                      const reason = !orderNumber ? 'Falta número de orden' : `Máquina no encontrada: ${machineName || machineIdSource || 'N/A'}`;
                      console.warn(`Skipping order: ${reason}`, row);
                      skippedItems.push({ ...row, reason });
                      failCount++;
                      processed++;
                      setProgress(Math.round((processed / total) * 100));
                      return;
                  }

                  const payload = {
                      ...row,
                      order_number: String(orderNumber),
                      machine_id: machineId,
                      status: 'Pendiente',
                      // Map other fields
                      production_id: row.production_id,
                      machine_id_source: machineIdSource,
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
                      end_date_simple: row.end_date_simple,

                      // Explicit Backend Mappings (Aliases) for compatibility
                      client: row.client_name,
                      part_number: row.product_article_code,
                      description: row.product_name,
                      part_status: row.article_status,
                      cadence: parseFloat(row.production_cadence) || 0,
                      product: row.product_family,
                      end_date: row.planned_end_date
                  };

                  try {
                      // Check for existing order by order_number
                      let existing = [];
                      try {
                        existing = await base44.entities.WorkOrder.filter({ order_number: String(orderNumber) });
                      } catch (e) { /* ignore */ }

                      if (existing && existing.length > 0) {
                          // Update the first one
                          await base44.entities.WorkOrder.update(existing[0].id, payload);
                          successCount++; // Count as success (updated)
                          
                          // Delete duplicates if any (Cleanup)
                          if (existing.length > 1) {
                              for (let k = 1; k < existing.length; k++) {
                                  try {
                                      await base44.entities.WorkOrder.delete(existing[k].id);
                                  } catch (delErr) {
                                      console.warn("Error deleting duplicate:", existing[k].id, delErr);
                                  }
                              }
                          }
                      } else {
                          // Create new
                          await createWithRetry(payload);
                          successCount++;
                      }
                  } catch (e) {
                      console.error("Error saving order:", payload, e);
                      failCount++;
                  } finally {
                      processed++;
                      setProgress(Math.round((processed / total) * 100));
                  }
              }));

              // Small delay between chunks to allow UI update and prevent rate limiting
              if (i + CHUNK_SIZE < total) {
                  await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
              }
          }
          
          if (skippedItems.length > 0) {
              console.error("Registros omitidos:", skippedItems);
              toast.warning(`${skippedItems.length} registros omitidos por falta de máquina o número de orden. Revise la consola.`, { duration: 10000 });
          }

          toast.success(`Guardado completado: ${successCount} creados, ${failCount} fallidos.`, { id: toastId });

      } catch (error) {
          console.error("Error saving orders:", error);
          toast.error("Error general al guardar órdenes.", { id: toastId });
      } finally {
          setSaving(false);
          setProgress(0);
      }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importación de Órdenes (CDEApp)</h1>
          <p className="text-muted-foreground">Vista de datos crudos con filtrado avanzado y guardado.</p>
          {lastSyncTime && (
             <p className="text-xs text-green-600 flex items-center mt-1">
               <RefreshCw className="h-3 w-3 mr-1" />
               Catálogo de máquinas actualizado: {lastSyncTime.toLocaleTimeString()}
             </p>
          )}
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLocalData} disabled={loading}>
                Recargar BD Local
            </Button>
            <Button variant="outline" onClick={() => syncMachinesToLocalDB(false)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar Máquinas
            </Button>
            <Button onClick={fetchOrders} disabled={loading}>
              {loading ? <Download className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Obtener Datos Crudos
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={saving}>
                <Trash2 className="mr-2 h-4 w-4" />
                BORRAR BD
            </Button>
            <Button onClick={saveOrders} disabled={saving || filteredOrders.length === 0}>
            {saving ? "Guardando..." : (
                <>
                <Save className="mr-2 h-4 w-4" />
                Guardar ({filteredOrders.length})
                </>
            )}
            </Button>
        </div>
      </div>

      {debugData && (
        <div className="bg-slate-100 p-2 rounded text-xs font-mono overflow-auto max-h-40 border border-slate-300">
            <strong>DEBUG - First Row Keys & Values:</strong>
            <pre>{JSON.stringify(debugData, null, 2)}</pre>
        </div>
      )}

      <div className="flex flex-col gap-4">
          {/* Progress Bar */}
          {saving && (
              <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Guardando órdenes...</span>
                      <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 w-full" />
              </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 items-center bg-muted/20 p-4 rounded-lg border">
              <div className="relative w-full md:w-1/3">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                      placeholder="Búsqueda global..." 
                      className="pl-8" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
              
              <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
                  <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full md:w-auto">
                          <Filter className="mr-2 h-4 w-4" />
                          Agregar Filtro
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="start">
                      <div className="space-y-4">
                          <div className="space-y-2">
                              <Label>Columna</Label>
                              <Select 
                                  value={newFilter.column} 
                                  onValueChange={(val) => setNewFilter({...newFilter, column: val})}
                              >
                                  <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar columna" />
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[200px]">
                                      {columns.map(col => (
                                          <SelectItem key={col} value={col}>{col}</SelectItem>
                                      ))}
                                  </SelectContent>
                              </Select>
                          </div>
                          
                          <div className="space-y-2">
                              <Label>Operador</Label>
                              <Select 
                                  value={newFilter.operator} 
                                  onValueChange={(val) => setNewFilter({...newFilter, operator: val})}
                              >
                                  <SelectTrigger>
                                      <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="contains">Contiene</SelectItem>
                                      <SelectItem value="equals">Igual a</SelectItem>
                                      <SelectItem value="startsWith">Empieza por</SelectItem>
                                      <SelectItem value="endsWith">Termina en</SelectItem>
                                      <SelectItem value="notContains">No contiene</SelectItem>
                                  </SelectContent>
                              </Select>
                          </div>

                          <div className="space-y-2">
                              <Label>Valor</Label>
                              <Input 
                                  value={newFilter.value}
                                  onChange={(e) => setNewFilter({...newFilter, value: e.target.value})}
                                  placeholder="Valor a filtrar..."
                              />
                          </div>

                          <Button className="w-full" onClick={addFilter} disabled={!newFilter.column || !newFilter.value}>
                              <Plus className="mr-2 h-4 w-4" />
                              Aplicar Filtro
                          </Button>
                      </div>
                  </PopoverContent>
              </Popover>

              <div className="flex-1 flex flex-wrap gap-2">
                  {filters.map(f => (
                      <Badge key={f.id} variant="secondary" className="px-3 py-1 text-sm flex items-center gap-2">
                          <span>{f.column}</span>
                          <span className="text-muted-foreground font-normal">
                              {f.operator === 'contains' && 'contiene'}
                              {f.operator === 'equals' && '='}
                              {f.operator === 'startsWith' && 'empieza por'}
                              {f.operator === 'endsWith' && 'termina en'}
                              {f.operator === 'notContains' && 'no contiene'}
                          </span>
                          <span className="font-bold">"{f.value}"</span>
                          <button onClick={() => removeFilter(f.id)} className="ml-1 hover:text-destructive">
                              <X className="h-3 w-3" />
                          </button>
                      </Badge>
                  ))}
                  {filters.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setFilters([])} className="text-muted-foreground h-7">
                          <Trash2 className="mr-2 h-3 w-3" />
                          Limpiar
                      </Button>
                  )}
              </div>
          </div>

          {/* Table */}
          {rawOrders.length > 0 ? (
            <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TableIcon className="h-5 w-5" />
                    Tabla de Datos ({filteredOrders.length} registros visibles)
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="rounded-md border overflow-x-auto h-[70vh]">
                <Table className="relative w-full">
                    <TableHeader className="sticky top-0 z-10 bg-secondary">
                    <TableRow>
                        <TableHead className="w-[50px] bg-secondary font-bold text-xs h-8 text-secondary-foreground">#</TableHead>
                        {columns.map(col => (
                        <TableHead key={col} className="whitespace-nowrap font-bold text-xs h-8 px-2 bg-secondary text-secondary-foreground border-r border-secondary-foreground/10">
                            {SYSTEM_FIELDS.find(f => f.key === col)?.label || col}
                        </TableHead>
                        ))}
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredOrders.length > 0 ? filteredOrders.map((row, i) => (
                        <TableRow key={i} className="hover:bg-muted/50">
                        <TableCell className="text-xs py-1 px-2 border-r text-muted-foreground">{i + 1}</TableCell>
                        {columns.map(col => (
                            <TableCell key={`${i}-${col}`} className="whitespace-nowrap text-xs py-1 px-2 border-r last:border-r-0" title={String(row[col])}>
                            {row[col] !== undefined && row[col] !== null 
                                ? (typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])) 
                                : <span className="text-gray-300">-</span>}
                            </TableCell>
                        ))}
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                                No hay resultados que coincidan con los filtros.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>
            </Card>
        ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
                <TableIcon className="h-10 w-10 mb-2 opacity-20" />
                <p>No hay datos cargados.</p>
                <p className="text-sm">Pulse "Obtener Datos" para comenzar.</p>
            </div>
        )}
      </div>
    </div>
  );
}
