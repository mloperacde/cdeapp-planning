import React, { useState, useMemo, useEffect } from 'react';
import { cdeApp } from '../../api/cdeAppClient';
import { base44 } from '../../api/base44Client';
import { toast } from 'sonner';
import { Download, Table as TableIcon, Save, Search, Filter, Plus, X, Trash2, RefreshCw } from 'lucide-react';
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

const SYSTEM_FIELDS = [
    { key: 'production_id', label: 'Production ID', aliases: ['production_id', 'id', 'PRODUCTION_ID', 'IdProduccion', 'ID Produccion', 'Prod ID', 'id_produccion', 'ID'] },
    { key: 'machine_id_source', label: 'machine_id', aliases: ['machine_id', 'id_maquina', 'MACHINE_ID', 'MachineId', 'Machine ID', 'ID Maquina'] },
    { key: 'priority', label: 'Prioridad', aliases: ['Prioridad', 'priority', 'urgencia', 'PRIORIDAD', 'Priority', 'Rank', 'Ranking', 'Nivel', 'Level', 'Importancia', 'Sequence', 'Secuencia'] },
    { key: 'type', label: 'Tipo', aliases: ['Tipo', 'type', 'TIPO', 'Type', 'Clase', 'Class', 'Kind', 'Categoria'] },
    { key: 'status', label: 'Estado', aliases: ['Estado', 'status', 'situacion', 'estatus', 'ESTADO', 'Status', 'State', 'Condition', 'Situación', 'status_source'] },
    { key: 'room', label: 'Sala', aliases: ['Sala', 'room', 'SALA', 'Room', 'Nave', 'Zona', 'Zone', 'Area', 'Seccion'] },
    { key: 'machine_name', label: 'Máquina', required: true, aliases: ['Máquina', 'machine_name', 'maquina', 'machine', 'recurso', 'MÁQUINA', 'MAQUINA', 'Centro Trabajo', 'Work Center', 'Code', 'Resource', 'W.C.', 'C.T.'] },
    { key: 'client_order_ref', label: 'Su Pedido', aliases: ['Su Pedido', 'client_order', 'SU PEDIDO', 'SU_PEDIDO', 'ClientOrder', 'PedidoCliente', 'Customer Order', 'Ref Cliente', 'Su No. Pedido'] },
    { key: 'internal_order_ref', label: 'Pedido', aliases: ['Pedido', 'internal_order', 'InternalOrder', 'PedidoInterno', 'Ref Interna', 'Pedido Interno'] },
    { key: 'order_number', label: 'Orden', required: true, aliases: ['Orden', 'order_number', 'numero_orden', 'wo', 'ORDEN', 'Order', 'W.O.', 'OP', 'OrderNo', 'Order Number', 'Nº Orden'] },
    { key: 'product_article_code', label: 'Artículo', aliases: ['Artículo', 'product_article_code', 'article', 'referencia', 'part_number', 'codigo', 'cod_articulo', 'Item', 'Material', 'Part No', 'Part Number', 'Codigo Articulo', 'Referencia'] },
    { key: 'product_name', label: 'Nombre', aliases: ['Nombre', 'Descripción', 'product_name', 'description', 'detalle', 'producto', 'desc_articulo', 'Description', 'Designation', 'Item Name', 'Descripcion', 'Nombre Articulo'] },
    { key: 'article_status', label: 'Edo. Art.', aliases: ['Edo. Art.', 'article_status', 'Estado Articulo', 'Status Articulo', 'Item Status'] },
    { key: 'client_name', label: 'Cliente', aliases: ['Cliente', 'client_name', 'client', 'customer', 'empresa', 'razon_social', 'Customer', 'Client', 'Nombre Cliente'] },
    { key: 'material', label: 'Material', aliases: ['Material', 'material', 'Raw Material', 'Materia Prima', 'Compuesto', 'Compound'] },
    { key: 'product_family', label: 'Producto', aliases: ['Producto', 'product_family', 'Familia', 'Family', 'Product Family', 'Familia Producto'] },
    { key: 'shortages', label: 'Faltas', aliases: ['Faltas', 'shortages', 'Missing', 'Faltantes', 'Shortage'] },
    { key: 'quantity', label: 'Cantidad', aliases: ['Cantidad', 'quantity', 'qty', 'unidades', 'piezas', 'cantidad_pendiente', 'saldo', 'Quantity', 'Amount', 'Cant', 'Unidades', 'Pcs'] },
    { key: 'committed_delivery_date', label: 'Fecha Entrega', aliases: ['Fecha Entrega', 'committed_delivery_date', 'entrega', 'delivery_date', 'fecha_fin', 'Due Date', 'FechaFin', 'Fecha Entrega Comprometida', 'Delivery Date'] },
    { key: 'new_delivery_date', label: 'Nueva Fecha Entrega', aliases: ['Nueva Fecha Entrega', 'new_delivery_date', 'New Due Date', 'Fecha Reprogramada'] },
    { key: 'delivery_compliance', label: 'Cumplimiento entrega', aliases: ['Cumplimiento entrega', 'compliance', 'Cumplimiento'] },
    { key: 'multi_unit', label: 'MultUnid', aliases: ['MultUnid'] },
    { key: 'multi_qty', label: 'Mult x Cantidad', aliases: ['Mult x Cantidad'] },
    { key: 'production_cadence', label: 'Cadencia', aliases: ['Cadencia', 'production_cadence', 'cadence', 'ciclo', 'Cycle Time', 'Velocidad', 'Speed', 'Rate'] },
    { key: 'delay_reason', label: 'Motivo Retraso', aliases: ['Motivo Retraso', 'delay_reason', 'Delay Cause', 'Reason', 'Causa Retraso'] },
    { key: 'components_deadline', label: 'Fecha limite componentes', aliases: ['Fecha limite componentes', 'Components Deadline'] },
    { key: 'start_date', label: 'Fecha Inicio Limite', aliases: ['Fecha Inicio Limite', 'start_date', 'inicio', 'fecha_inicio', 'Start Date', 'Fecha Comienzo'] },
    { key: 'start_date_simple', label: 'Fecha Inicio Limite Simple', aliases: ['Fecha Inicio Limite Simple'] },
    { key: 'modified_start_date', label: 'Fecha Inicio Modificada', aliases: ['Fecha Inicio Modificada'] },
    { key: 'planned_end_date', label: 'Fecha Fin', aliases: ['Fecha Fin', 'planned_end_date', 'end_date', 'fin', 'End Date', 'Fecha Finalizacion'] },
    { key: 'end_date_simple', label: 'Fecha Fin Simple', aliases: ['Fecha Fin Simple'] },
    { key: 'notes', label: 'Observación', aliases: ['Observación', 'notes', 'notas', 'comentarios', 'Remarks', 'Comments', 'Observaciones', 'Nota'] }
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

const extractValue = (obj, fieldDef) => {
    if (!obj) return undefined;
    const keys = fieldDef.aliases || [];
    const objKeys = Object.keys(obj);
    const normalizedObjKeys = {};
    objKeys.forEach(k => {
        normalizedObjKeys[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = k;
    });

    for (const key of keys) {
        if (obj[key] !== undefined) return obj[key];
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const realKey = normalizedObjKeys[normalizedKey];
        if (realKey && obj[realKey] !== undefined) return obj[realKey];
    }
    return undefined;
};

export default function OrderImport() {
  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [columns, setColumns] = useState([]);
  
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

            const formattedOrders = deduplicatedOrders.map(o => ({
                ...o,
                machine_name: machinesMap.get(o.machine_id) || o.machine_id_source || 'Unknown',
            }));
            
            setRawOrders(formattedOrders);
            
            // Force column order based on user specification
            setColumns(COLUMN_DISPLAY_ORDER);
            
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

      if (data.length > 0) {
        // Normalize all data immediately
        data = data.map(normalize);
        
        // Force column order based on user specification
        setColumns(COLUMN_DISPLAY_ORDER);
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

  // --- SAVE LOGIC ---
  const extractValue = (obj, fieldDef) => {
      if (!obj) return undefined;
      const keys = fieldDef.aliases || [];
      const objKeys = Object.keys(obj);
      const normalizedObjKeys = {};
      objKeys.forEach(k => {
          normalizedObjKeys[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = k;
      });

      for (const key of keys) {
          if (obj[key] !== undefined) return obj[key];
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const realKey = normalizedObjKeys[normalizedKey];
          if (realKey && obj[realKey] !== undefined) return obj[realKey];
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
                      console.warn("Skipping invalid order:", row);
                      failCount++;
                      processed++;
                      setProgress(Math.round((processed / total) * 100));
                      return;
                  }

                  const payload = {
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
                      end_date_simple: row.end_date_simple
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
          <h1 className="text-2xl font-bold tracking-tight">Importación de Órdenes</h1>
          <p className="text-muted-foreground">Vista de datos crudos con filtrado avanzado y guardado.</p>
          {lastSyncTime && (
             <p className="text-xs text-green-600 flex items-center mt-1">
               <RefreshCw className="h-3 w-3 mr-1" />
               Catálogo de máquinas actualizado: {lastSyncTime.toLocaleTimeString()}
             </p>
          )}
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => syncMachinesToLocalDB(false)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Sincronizar Máquinas
            </Button>
            <Button onClick={fetchOrders} disabled={loading}>
              {loading ? <Download className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Obtener Datos Crudos
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
