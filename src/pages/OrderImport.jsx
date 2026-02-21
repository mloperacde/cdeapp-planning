import React, { useState, useMemo, useEffect } from 'react';
import { cdeApp } from '../api/cdeAppClient';
import { base44 } from '../api/base44Client';
import { getMachineAlias } from "@/utils/machineAlias";
import { toast } from 'sonner';
import { Download, Table as TableIcon, Save, Search, X, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

const SYSTEM_FIELDS = [
    { key: 'production_id', label: 'Production ID', aliases: ['production_id', 'id', 'PRODUCTION_ID'] },
    { key: 'machine_id_source', label: 'machine_id', aliases: ['machine_id', 'id_maquina', 'MACHINE_ID'] },
    { key: 'priority', label: 'Prioridad', aliases: ['priority', 'Prioridad', 'urgencia'] },
    { key: 'type', label: 'Tipo', aliases: ['type', 'Tipo', 'TIPO'] },
    { key: 'status', label: 'Estado', aliases: ['status', 'Estado', 'situacion', 'estatus'] },
    { key: 'room', label: 'Sala', aliases: ['room', 'Sala', 'SALA', 'Nave', 'Zona'] },
    { key: 'machine_name', label: 'Máquina', required: true, aliases: ['machine_name', 'Máquina', 'maquina', 'machine', 'recurso', 'MÁQUINA', 'MAQUINA', 'Sala / Máquina'] },
    { key: 'client_order_ref', label: 'Su Pedido', aliases: ['client_order_ref', 'Su Pedido'] },
    { key: 'internal_order_ref', label: 'Pedido', aliases: ['internal_order_ref', 'Pedido'] },
    { key: 'order_number', label: 'Orden', required: true, aliases: ['order_number', 'Orden', 'numero_orden', 'wo'] },
    { key: 'product_article_code', label: 'Artículo', aliases: ['product_article_code', 'Artículo', 'article', 'referencia'] },
    { key: 'product_name', label: 'Nombre', aliases: ['product_name', 'Nombre', 'Descripción', 'description'] },
    { key: 'article_status', label: 'Edo. Art.', aliases: ['article_status', 'Edo. Art.'] },
    { key: 'client_name', label: 'Cliente', aliases: ['client_name', 'Cliente', 'client', 'customer'] },
    { key: 'material', label: 'Material', aliases: ['material', 'Material'] },
    { key: 'product_family', label: 'Producto', aliases: ['product_family', 'Producto', 'product'] },
    { key: 'shortages', label: 'Faltas', aliases: ['shortages', 'Faltas'] },
    { key: 'quantity', label: 'Cantidad', aliases: ['quantity', 'Cantidad', 'qty'] },
    { key: 'effective_delivery_date', label: 'Fecha Entrega (Vigente)', aliases: [] },
    { key: 'committed_delivery_date', label: 'Fecha Entrega', aliases: ['committed_delivery_date', 'Fecha Entrega'] },
    { key: 'new_delivery_date', label: 'Nueva Fecha Entrega', aliases: ['new_delivery_date', 'Nueva Fecha Entrega'] },
    { key: 'delivery_compliance', label: 'Cumplimiento', aliases: ['delivery_compliance', 'Cumplimiento entrega'] },
    { key: 'multi_unit', label: 'MultUnid', aliases: ['multi_unit', 'MultUnid'] },
    { key: 'multi_qty', label: 'Mult x Cantidad', aliases: ['multi_qty', 'Mult x Cantidad'] },
    { key: 'production_cadence', label: 'Cadencia', aliases: ['production_cadence', 'Cadencia'] },
    { key: 'delay_reason', label: 'Motivo Retraso', aliases: ['delay_reason', 'Motivo Retraso'] },
    { key: 'components_deadline', label: 'Fec. limite comp.', aliases: ['components_deadline', 'Fecha limite componentes'] },
    { key: 'effective_start_date', label: 'Inicio (Vigente)', aliases: [] },
    { key: 'start_date', label: 'Fecha Inicio Limite', aliases: ['start_date', 'Fecha Inicio Limite'] },
    { key: 'modified_start_date', label: 'Fecha Inicio Modif.', aliases: ['modified_start_date', 'Fecha Inicio Modificada'] },
    { key: 'planned_end_date', label: 'Fecha Fin', aliases: ['planned_end_date', 'Fecha Fin'] },
    { key: 'notes', label: 'Observación', aliases: ['notes', 'Observación', 'notas'] }
];

const COLUMN_DISPLAY_ORDER = SYSTEM_FIELDS.map(f => f.key);

const extractValue = (obj, fieldDef) => {
    if (!obj) return undefined;
    if (obj[fieldDef.key] !== undefined && obj[fieldDef.key] !== null) return obj[fieldDef.key];
    const normalizeKey = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedObjKeys = Object.keys(obj).reduce((acc, k) => { acc[normalizeKey(k)] = k; return acc; }, {});
    for (const key of (fieldDef.aliases || [])) {
        if (obj[key] !== undefined && obj[key] !== null) return obj[key];
        const normKey = normalizeKey(key);
        const realKey = normalizedObjKeys[normKey];
        if (realKey && obj[realKey] !== undefined && obj[realKey] !== null) return obj[realKey];
    }
    const searchTerms = [fieldDef.key, fieldDef.label].filter(Boolean).map(normalizeKey);
    for (const term of searchTerms) {
        if (term.length < 3) continue;
        const matchingKey = Object.keys(normalizedObjKeys).find(k => k.includes(term));
        if (matchingKey) {
            const realKey = normalizedObjKeys[matchingKey];
            if (obj[realKey] !== undefined && obj[realKey] !== null) return obj[realKey];
        }
    }
    return undefined;
};

// Normaliza string para comparación: minúsculas, sin tildes, sin paréntesis, solo alfanumérico y espacios
const normStr = (s) => String(s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/[()]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export default function OrderImport() {
  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValues, setFilterValues] = useState({ machine: "", material: "", order: "", client: "", deliveryDateStart: "", deliveryDateEnd: "", startDateStart: "", startDateEnd: "" });
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => { fetchLocalData(); }, []);

  const fetchLocalData = async () => {
    setLoading(true);
    try {
        const [ordersRes, machinesRes] = await Promise.all([
            base44.entities.WorkOrder.list(undefined, 2000),
            base44.entities.MachineMasterDatabase.list(undefined, 2000)
        ]);
        const orders = Array.isArray(ordersRes) ? ordersRes : [];
        const machines = Array.isArray(machinesRes) ? machinesRes : [];
        const machinesMap = new Map();
        machines.forEach(m => machinesMap.set(m.id, getMachineAlias(m)));

        if (orders.length > 0) {
            const uniqueOrders = new Map();
            orders.forEach(o => {
                if (!o.order_number) return;
                const existing = uniqueOrders.get(o.order_number);
                if (!existing) { uniqueOrders.set(o.order_number, o); }
                else {
                    const existingDate = new Date(existing.updated_at || existing.created_at || 0);
                    const currentDate = new Date(o.updated_at || o.created_at || 0);
                    if (currentDate > existingDate) uniqueOrders.set(o.order_number, o);
                }
            });
            const deduped = Array.from(uniqueOrders.values());
            const formatted = deduped.map(o => {
                let sourceData = { ...o };
                try {
                    if (o.notes && typeof o.notes === 'string' && o.notes.trim().startsWith('{')) {
                        const parsed = JSON.parse(o.notes);
                        sourceData = { ...parsed, ...o };
                        sourceData.notes = parsed.notes !== o.notes ? (parsed.notes || '') : '';
                    }
                } catch (e) { /* ignore */ }
                const newRow = { ...sourceData };
                SYSTEM_FIELDS.forEach(field => {
                    let val = sourceData[field.key];
                    if (val === undefined) val = extractValue(sourceData, field);
                    if (val !== undefined) newRow[field.key] = val;
                });
                newRow.id = o.id;
                newRow.effective_delivery_date = (newRow.new_delivery_date && !String(newRow.new_delivery_date).startsWith('0000')) ? newRow.new_delivery_date : newRow.committed_delivery_date;
                newRow.effective_start_date = (newRow.modified_start_date && !String(newRow.modified_start_date).startsWith('0000')) ? newRow.modified_start_date : newRow.start_date;
                if (o.machine_id && machinesMap.has(o.machine_id)) newRow.machine_name = machinesMap.get(o.machine_id);
                return newRow;
            });
            setRawOrders(formatted);
            const newest = deduped.reduce((prev, curr) => new Date(prev.updated_at || prev.created_at || 0) > new Date(curr.updated_at || curr.created_at || 0) ? prev : curr, deduped[0]);
            if (newest) { const d = newest.updated_at || newest.created_at; if (d) setLastSyncTime(new Date(d)); }
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
          if (machineList.length === 0) { if (!background) toast.info("No se encontraron máquinas.", { id: toastId }); return; }
          let existingMachines = [];
          try {
              const res = await base44.entities.MachineMasterDatabase.list(undefined, 5000);
              existingMachines = Array.isArray(res) ? res : [];
          } catch (e) { console.warn("Could not fetch existing machines", e); }
          const machineMap = new Map();
          existingMachines.forEach(m => { if (m.codigo_maquina) machineMap.set(String(m.codigo_maquina).trim(), m.id); });
          let updated = 0, created = 0;
          for (const m of machineList) {
              const code = String(m.code || m.id || "").trim();
              if (!code) continue;
              const name = m.name || m.description || `Máquina ${code}`;
              const location = m.room_name || m.sala || "";
              const payload = { codigo_maquina: code, nombre: name, descripcion: name, ubicacion: location };
              if (machineMap.has(code)) { await base44.entities.MachineMasterDatabase.update(machineMap.get(code), payload); updated++; }
              else { await base44.entities.MachineMasterDatabase.create(payload); created++; }
          }
          setLastSyncTime(new Date());
          if (!background) toast.success(`Catálogo: ${created} nuevas, ${updated} actualizadas.`, { id: toastId });
      } catch (error) {
          console.error("Error syncing machines:", error);
          if (!background) toast.error("Error sincronizando máquinas.", { id: toastId });
      }
  };

  const fetchOrders = async () => {
    setLoading(true);
    const toastId = toast.loading("Sincronizando datos con CDEApp...");
    try {
      const [response] = await Promise.all([cdeApp.syncProductions(), syncMachinesToLocalDB(true)]);
      let data = [];
      if (Array.isArray(response)) data = response;
      else if (response?.data && Array.isArray(response.data)) data = response.data;
      else if (response?.data) data = [response.data];
      
      const normalize = (row) => {
          const newRow = { ...row };
          SYSTEM_FIELDS.forEach(field => { const val = extractValue(row, field); if (val !== undefined) newRow[field.key] = val; });
          newRow.priority = parseInt(newRow.priority) || 0;
          newRow.quantity = parseInt(newRow.quantity) || 0;
          newRow.status = newRow.status || 'Pendiente';
          newRow.multi_unit = parseInt(newRow.multi_unit) || 0;
          newRow.multi_qty = parseFloat(newRow.multi_qty) || 0;
          newRow.production_cadence = parseFloat(newRow.production_cadence) || 0;
          newRow.effective_delivery_date = (newRow.new_delivery_date && !String(newRow.new_delivery_date).startsWith('0000')) ? newRow.new_delivery_date : newRow.committed_delivery_date;
          newRow.effective_start_date = (newRow.modified_start_date && !String(newRow.modified_start_date).startsWith('0000')) ? newRow.modified_start_date : newRow.start_date;
          return newRow;
      };
      if (data.length > 0) data = data.map(normalize);
      setRawOrders(data);
      toast.success(`${data.length} registros obtenidos.`, { id: toastId });
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
          if (searchQuery) {
              const query = searchQuery.toLowerCase();
              if (!Object.values(row).some(val => String(val).toLowerCase().includes(query))) return false;
          }
          const { machine, material, order, client, deliveryDateStart, deliveryDateEnd, startDateStart, startDateEnd } = filterValues;
          if (machine) { const mVal = machine.toLowerCase(); if (!String(row.machine_name || "").toLowerCase().includes(mVal) && !String(row.room || "").toLowerCase().includes(mVal)) return false; }
          if (material && !String(row.material || "").toLowerCase().includes(material.toLowerCase())) return false;
          if (order && !String(row.order_number || "").toLowerCase().includes(order.toLowerCase())) return false;
          if (client && !String(row.client_name || "").toLowerCase().includes(client.toLowerCase())) return false;
          const checkDateRange = (dateStr, start, end) => {
              if (!dateStr) return false;
              const d = new Date(dateStr); if (isNaN(d.getTime())) return false;
              if (start && d < new Date(start)) return false;
              if (end) { const e = new Date(end); e.setHours(23,59,59,999); if (d > e) return false; }
              return true;
          };
          if ((deliveryDateStart || deliveryDateEnd) && !checkDateRange(row.effective_delivery_date, deliveryDateStart, deliveryDateEnd)) return false;
          if ((startDateStart || startDateEnd) && !checkDateRange(row.effective_start_date, startDateStart, startDateEnd)) return false;
          return true;
      });
  }, [rawOrders, searchQuery, filterValues]);

  const createWithRetry = async (payload, retries = 5, delay = 2000) => {
      try { return await base44.entities.WorkOrder.create(payload); }
      catch (e) {
          const isRateLimit = e.status === 429 || (e.message && e.message.includes('429'));
          if (retries > 0 && isRateLimit) {
              const nextDelay = delay * 1.5 + Math.random() * 1000;
              await new Promise(r => setTimeout(r, nextDelay));
              return createWithRetry(payload, retries - 1, nextDelay);
          }
          throw e;
      }
  };

  // Construye mapa de maquinas y funcion de resolucion robusta
  const buildMachinesMap = async () => {
      let machinesRaw = [];
      const map = new Map();
      const cdeIdMap = new Map();
      try {
          machinesRaw = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
          if (!Array.isArray(machinesRaw)) machinesRaw = [];
          machinesRaw.forEach(m => {
              [m.nombre, m.codigo_maquina, m.codigo, m.descripcion, m.nombre_maquina].forEach(v => { if (v) map.set(normStr(v), m.id); });
              const alias = getMachineAlias(m);
              if (alias) map.set(normStr(alias), m.id);
              // Mapear por ID numérico externo (cde_machine_id)
              if (m.cde_machine_id) cdeIdMap.set(String(m.cde_machine_id).trim(), m.id);
              // También por orden_visualizacion si coincide con el ID numérico de CDE
              if (m.orden_visualizacion) cdeIdMap.set(String(Math.round(m.orden_visualizacion)), m.id);
          });
      } catch (e) { console.error("Error cargando maquinas:", e); }

      const resolve = (machineName, machineIdSource) => {
          const name = String(machineName || '');
          const s = normStr(name);

          // 1. Exacto
          if (s && map.has(s)) return map.get(s);

          // 2. Formato "SALA CODIGO - NOMBRE_MAQUINA"
          if (name.includes(' - ')) {
              const parts = name.split(' - ');
              const afterDash = normStr(parts.slice(1).join(' - '));
              const beforeTokens = parts[0].trim().split(' ');
              const codeToken = normStr(beforeTokens[beforeTokens.length - 1]);
              if (afterDash && map.has(afterDash)) return map.get(afterDash);
              if (codeToken && map.has(codeToken)) return map.get(codeToken);
              const beforeNorm = normStr(parts[0]);
              if (beforeNorm && map.has(beforeNorm)) return map.get(beforeNorm);
          }

          // 3. Fuzzy: clave contenida en nombre o viceversa
          if (s.length >= 3) {
              for (const [key, id] of map.entries()) {
                  if (key.length < 3) continue;
                  if (s.includes(key) || key.includes(s)) return id;
              }
          }

          // 4. Por machine_id_source numerico (cde_machine_id, codigo)
          if (machineIdSource) {
              const src = String(machineIdSource).trim();
              if (cdeIdMap.has(src)) return cdeIdMap.get(src);
              const found = machinesRaw.find(m =>
                  String(m.cde_machine_id || '').trim() === src ||
                  String(m.codigo_maquina || '').trim() === src ||
                  String(m.codigo || '').trim() === src
              );
              if (found) return found.id;
          }

          // 5. Último recurso: buscar directamente en BD por nombre exacto
          const exactMatch = machinesRaw.find(m => {
              const nombre = normStr(m.nombre || '');
              const desc = normStr(m.descripcion || '');
              const sClean = normStr(name.replace(/^[\d\w]+ - /, '')); // quitar prefijo sala
              return nombre === s || desc === s || nombre === sClean || desc === sClean;
          });
          if (exactMatch) return exactMatch.id;

          return null;
      };

      return { map, machinesRaw, resolve };
  };

  const saveOrders = async () => {
      if (filteredOrders.length === 0) { toast.warning("No hay órdenes visibles para guardar."); return; }
      if (!confirm(`Se van a guardar ${filteredOrders.length} registros visibles. ¿Continuar?`)) return;

      setSaving(true);
      setProgress(0);
      const toastId = toast.loading("Preparando datos...");

      try {
          const { resolve } = await buildMachinesMap();
          toast.loading(`Guardando ${filteredOrders.length} órdenes...`, { id: toastId });

          let successCount = 0, failCount = 0, processed = 0;
          const total = filteredOrders.length;
          const skippedItems = [];
          const CHUNK_SIZE = 2;
          const CHUNK_DELAY = 500;

          for (let i = 0; i < total; i += CHUNK_SIZE) {
              const chunk = filteredOrders.slice(i, i + CHUNK_SIZE);
              await Promise.all(chunk.map(async (row) => {
                  const orderNumber = row.order_number;
                  const machineName = row.machine_name;
                  const machineIdSource = row.machine_id_source;

                  const isDbId = (v) => v && /^[a-f0-9]{24}$/i.test(String(v).trim());

                  // Prioridad 1: row._db_machine_id es el machine_id preservado desde la BD local
                  let machineId = null;
                  if (isDbId(row._db_machine_id)) {
                      machineId = String(row._db_machine_id).trim();
                  } else if (isDbId(row.machine_id)) {
                      // machine_id puede venir del WorkOrder guardado en BD local (24 hex)
                      machineId = String(row.machine_id).trim();
                  } else {
                      // Para datos frescos de CDE: resolver por nombre o ID numérico CDE
                      machineId = resolve(machineName, machineIdSource);
                  }

                  if (!orderNumber || !machineId) {
                      const reason = !orderNumber ? 'Falta número de orden' : `Máquina no encontrada: "${machineName || machineIdSource || 'N/A'}"`;
                      console.warn(`Skipping order: ${reason}`, { order_number: orderNumber, machine_name: machineName, machine_id_source: machineIdSource });
                      skippedItems.push({ ...row, _skipReason: reason });
                      failCount++;
                      processed++;
                      setProgress(Math.round((processed / total) * 100));
                      return;
                  }

                  const serializedData = JSON.stringify(row);
                  const payload = {
                      ...row,
                      order_number: String(orderNumber),
                      machine_id: machineId,
                      status: row.status || 'Pendiente',
                      priority: parseInt(row.priority) || 0,
                      quantity: parseInt(row.quantity) || 0,
                      notes: serializedData,
                      multi_unit: parseInt(row.multi_unit) || 0,
                      multi_qty: parseFloat(row.multi_qty) || 0,
                      production_cadence: parseFloat(row.production_cadence) || 0,
                  };

                  try {
                      let existing = [];
                      try { existing = await base44.entities.WorkOrder.filter({ order_number: String(orderNumber) }); } catch (e) { /* ignore */ }
                      if (existing && existing.length > 0) {
                          await base44.entities.WorkOrder.update(existing[0].id, payload);
                          if (existing.length > 1) {
                              for (let k = 1; k < existing.length; k++) {
                                  try { await base44.entities.WorkOrder.delete(existing[k].id); } catch (delErr) { /* ignore */ }
                              }
                          }
                      } else {
                          await createWithRetry(payload);
                      }
                      successCount++;
                  } catch (e) {
                      console.error("Error saving order:", orderNumber, e);
                      failCount++;
                  } finally {
                      processed++;
                      setProgress(Math.round((processed / total) * 100));
                  }
              }));
              if (i + CHUNK_SIZE < total) await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
          }

          if (skippedItems.length > 0) {
              console.error("Registros omitidos:", skippedItems);
              // Mostrar cuales maquinas no se encontraron para ayudar al diagnóstico
              const missingMachines = [...new Set(skippedItems.map(r => r._skipReason).filter(Boolean))];
              toast.warning(`${skippedItems.length} órdenes omitidas. Máquinas no encontradas: ${missingMachines.slice(0,3).join(', ')}${missingMachines.length > 3 ? '...' : ''}`, { duration: 15000 });
          }

          toast.success(`Completado: ${successCount} guardadas, ${failCount} omitidas.`, { id: toastId });
          await fetchLocalData();
      } catch (error) {
          console.error("Error saving orders:", error);
          toast.error("Error general al guardar.", { id: toastId });
      } finally {
          setSaving(false);
          setProgress(0);
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-4">
      <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importación de Órdenes (CDEApp)</h1>
          <p className="text-muted-foreground">Sincronización de órdenes de producción desde CDEApp.</p>
          {lastSyncTime && (
             <p className="text-xs text-green-600 flex items-center mt-1">
               <RefreshCw className="h-3 w-3 mr-1" />
               Última carga: {lastSyncTime.toLocaleTimeString()}
             </p>
          )}
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={fetchOrders} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Importar desde CDEApp
            </Button>
            <Button onClick={saveOrders} disabled={saving || filteredOrders.length === 0}>
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</> : <><Save className="mr-2 h-4 w-4" />Guardar ({filteredOrders.length})</>}
            </Button>
        </div>
      </div>

      {saving && (
          <div className="flex-shrink-0 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Guardando órdenes...</span><span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 w-full" />
          </div>
      )}

      <Card className="flex-shrink-0 bg-slate-50 border-slate-200">
        <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Sala / Máquina</Label>
                      <Input placeholder="Buscar..." value={filterValues.machine} onChange={(e) => setFilterValues({...filterValues, machine: e.target.value})} className="h-8 bg-white" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Material</Label>
                      <Input placeholder="Buscar..." value={filterValues.material} onChange={(e) => setFilterValues({...filterValues, material: e.target.value})} className="h-8 bg-white" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Orden</Label>
                      <Input placeholder="Buscar..." value={filterValues.order} onChange={(e) => setFilterValues({...filterValues, order: e.target.value})} className="h-8 bg-white" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Cliente</Label>
                      <Input placeholder="Buscar..." value={filterValues.client} onChange={(e) => setFilterValues({...filterValues, client: e.target.value})} className="h-8 bg-white" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Fecha Entrega (Desde - Hasta)</Label>
                      <div className="flex gap-2">
                          <Input type="date" value={filterValues.deliveryDateStart} onChange={(e) => setFilterValues({...filterValues, deliveryDateStart: e.target.value})} className="h-8 bg-white" />
                          <Input type="date" value={filterValues.deliveryDateEnd} onChange={(e) => setFilterValues({...filterValues, deliveryDateEnd: e.target.value})} className="h-8 bg-white" />
                      </div>
                  </div>
                  <div className="space-y-2">
                      <Label className="text-xs font-medium text-slate-500">Inicio Límite (Desde - Hasta)</Label>
                      <div className="flex gap-2">
                          <Input type="date" value={filterValues.startDateStart} onChange={(e) => setFilterValues({...filterValues, startDateStart: e.target.value})} className="h-8 bg-white" />
                          <Input type="date" value={filterValues.startDateEnd} onChange={(e) => setFilterValues({...filterValues, startDateEnd: e.target.value})} className="h-8 bg-white" />
                      </div>
                  </div>
                  <div className="space-y-2 lg:col-span-2">
                      <Label className="text-xs font-medium text-slate-500">Búsqueda Global</Label>
                      <div className="flex gap-2">
                          <div className="relative flex-1">
                              <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                              <Input placeholder="Buscar en todo..." className="pl-8 h-8 bg-white" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                          </div>
                          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(""); setFilterValues({ machine: "", material: "", order: "", client: "", deliveryDateStart: "", deliveryDateEnd: "", startDateStart: "", startDateEnd: "" }); }} className="h-8">
                              <X className="mr-2 h-3 w-3" />Limpiar
                          </Button>
                      </div>
                  </div>
              </div>
        </CardContent>
      </Card>

      {rawOrders.length > 0 ? (
      <Card className="flex-1 flex flex-col min-h-0 shadow-sm border-0 overflow-hidden">
      <CardHeader className="flex-shrink-0 py-3 px-4 bg-white border-b">
        <div className="flex justify-between items-center">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-slate-500" />
                Vista de Datos ({filteredOrders.length} registros)
            </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 p-0 relative">
        <div className="absolute inset-0 overflow-auto">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
              <TableRow>
                <TableHead className="w-[50px] bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-b">#</TableHead>
                {COLUMN_DISPLAY_ORDER.map(key => {
                    const field = SYSTEM_FIELDS.find(f => f.key === key);
                    return (
                        <TableHead key={key} className="whitespace-nowrap px-3 py-2 bg-slate-50 font-bold text-xs uppercase tracking-wider text-slate-500 border-b min-w-[120px]">
                            {field?.label || key}{field?.required && <span className="text-red-500 ml-1">*</span>}
                        </TableHead>
                    );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
                {filteredOrders.map((row, i) => (
                    <TableRow key={i} className="hover:bg-muted/50">
                    <TableCell className="text-xs py-1 px-2 border-r text-muted-foreground">{i + 1}</TableCell>
                    {COLUMN_DISPLAY_ORDER.map(col => (
                        <TableCell key={`${i}-${col}`} className="whitespace-nowrap text-xs py-1 px-2 border-r last:border-r-0" title={String(row[col] ?? '')}>
                        {row[col] !== undefined && row[col] !== null
                            ? (typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col]))
                            : <span className="text-gray-300">-</span>}
                        </TableCell>
                    ))}
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>
        </CardContent>
        </Card>
    ) : (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground min-h-[200px]">
            <TableIcon className="h-10 w-10 mb-2 opacity-20" />
            <p>No hay datos cargados.</p>
            <p className="text-sm">Pulse "Importar desde CDEApp" para comenzar.</p>
        </div>
    )}
    </div>
  );
}