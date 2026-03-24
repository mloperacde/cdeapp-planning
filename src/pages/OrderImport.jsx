import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '../api/base44Client';
import { buildMachinesMap } from "@/utils/machineResolution";
import { toast } from 'sonner';
import { Table as TableIcon, RefreshCw, Loader2, Search, X, Trash2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
    { key: 'machine_id_source', label: 'ID Máquina', aliases: ['machine_id', 'id_maquina', 'MACHINE_ID'] },
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

export default function OrderImport() {
  const [orders, setOrders] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState({ machine: '', material: '', order: '', client: '', deliveryDateStart: '', deliveryDateEnd: '', startDateStart: '', startDateEnd: '' });
  const [lastSyncStats, setLastSyncStats] = useState(null); // { time, created, updated, deleted, skipped }

  useEffect(() => { loadLocalOrders(); }, []);

  const loadLocalOrders = async () => {
    setSyncing(true);
    try {
      const res = await base44.entities.WorkOrder.list(undefined, 3000);
      const list = Array.isArray(res) ? res : [];
      const transformed = list.map(o => {
        let extra = {};
        try { extra = JSON.parse(o.notes || '{}'); } catch { /* ignore */ }
        return { ...o, ...extra, _db_machine_id: o.machine_id };
      });
      setOrders(transformed);
    } catch (e) {
      toast.error('Error cargando órdenes locales: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // Helper: call backend function
  // Response shape: res.data = { success, data: <cdeapp response> }
  // CDE productions response: { success, headers, data: [...] }
  // CDE machines response: { success, data: [...] }
  const cdeSync = async (action, params = {}) => {
    const res = await base44.functions.invoke('cdeAppSync', { action, params });
    if (res.data?.error) throw new Error(res.data.error);
    const inner = res.data?.data; // CDEApp raw response
    // Productions: { success, headers, data: [...] } → return the array
    if (inner && Array.isArray(inner.data)) return inner.data;
    // Machines: { success, data: [...] } same
    if (inner && inner.success !== undefined && Array.isArray(inner.data)) return inner.data;
    // Already an array
    if (Array.isArray(inner)) return inner;
    return inner;
  };

  // ─── SYNC MACHINES ───────────────────────────────────────────────────────────
  const syncMachines = async () => {
    const machines = await cdeSync('sync-machines');
    const machineList = Array.isArray(machines) ? machines : [];
    if (!machineList.length) return;

    const existing = await base44.entities.MachineMasterDatabase.list(undefined, 5000);
    const byCode = new Map((Array.isArray(existing) ? existing : []).map(m => [String(m.codigo_maquina || '').trim(), m.id]));

    for (const m of machineList) {
      // CDEApp fields: external_id, codigo, nombre, sala
      const code = String(m.codigo || m.code || m.id || '').trim();
      if (!code) continue;
      const name = m.nombre || m.name || m.description || `Máquina ${code}`;
      const extId = m.external_id || m.id || code;
      const payload = {
        codigo_maquina: code,
        nombre: name,
        descripcion: `${name} [CDE:${extId}]`,
        ubicacion: m.sala || m.room_name || '',
        cde_machine_id: String(extId)
      };
      if (byCode.has(code)) await base44.entities.MachineMasterDatabase.update(byCode.get(code), payload);
      else await base44.entities.MachineMasterDatabase.create(payload);
    }
  };

  // ─── MAIN SYNC ────────────────────────────────────────────────────────────────
  // Strategy:
  //   1. Fetch all productions from CDEApp
  //   2. Get all current WorkOrders from DB  → build map by order_number
  //   3. Upsert: update existing, create new
  //   4. Delete: records in DB whose order_number is NOT in CDEApp response
  const syncAll = async () => {
    setSyncing(true);
    setProgress(0);
    setProgressLabel('Sincronizando catálogo de máquinas...');

    try {
      // Step 1 – Sync machines
      await syncMachines();

      // Step 2 – Fetch productions from CDEApp
      setProgressLabel('Obteniendo órdenes de CDEApp...');
      const response = await cdeSync('sync-productions');
      let data = Array.isArray(response) ? response : (response?.data && Array.isArray(response.data) ? response.data : []);

      // Step 3 – Normalize CDE data
      const normalized = data.map(row => {
        const newRow = {};
        SYSTEM_FIELDS.forEach(field => {
          const val = extractValue(row, field);
          if (val !== undefined) newRow[field.key] = val;
        });
        newRow.priority = parseInt(newRow.priority) || 0;
        newRow.quantity = parseInt(newRow.quantity) || 0;
        newRow.status = newRow.status || 'Pendiente';
        newRow.effective_delivery_date = (newRow.new_delivery_date && !String(newRow.new_delivery_date).startsWith('0000'))
          ? newRow.new_delivery_date : newRow.committed_delivery_date;
        newRow.effective_start_date = (newRow.modified_start_date && !String(newRow.modified_start_date).startsWith('0000'))
          ? newRow.modified_start_date : newRow.start_date;
        if (row.machine_id) newRow.machine_id_source = String(row.machine_id);
        if (row.machine_code) newRow.machine_code_source = String(row.machine_code);
        return newRow;
      });

      const cdeOrderNumbers = new Set(normalized.map(r => String(r.order_number)).filter(Boolean));

      // Step 4 – Load existing DB records
      setProgressLabel('Cargando registros actuales...');
      const dbOrders = await base44.entities.WorkOrder.list(undefined, 5000);
      const dbList = Array.isArray(dbOrders) ? dbOrders : [];

      // Map: order_number → existing DB record
      const dbByOrderNumber = new Map();
      dbList.forEach(o => {
        if (o.order_number) dbByOrderNumber.set(String(o.order_number), o);
      });

      // Step 5 – Load machines for resolution
      const machinesRaw = await base44.entities.MachineMasterDatabase.list(undefined, 2000);
      const { resolveMachine } = buildMachinesMap(Array.isArray(machinesRaw) ? machinesRaw : []);

      // Ensure fallback "Sin Asignar" machine
      let unassignedMachine = (Array.isArray(machinesRaw) ? machinesRaw : []).find(m =>
        m.codigo_maquina === 'ZZ-UNASSIGNED' || m.nombre === '⚠️ SIN ASIGNAR'
      );
      if (!unassignedMachine) {
        try {
          unassignedMachine = await base44.entities.MachineMasterDatabase.create({
            codigo_maquina: 'ZZ-UNASSIGNED', nombre: '⚠️ SIN ASIGNAR',
            descripcion: 'Órdenes con máquina no identificada', ubicacion: 'GENERAL', orden_visualizacion: 9999
          });
        } catch { /* may already exist */ }
      }

      // Step 6 – Upsert loop
      const total = normalized.length;
      let created = 0, updated = 0, skipped = 0;
      const CHUNK = 5;

      for (let i = 0; i < total; i += CHUNK) {
        const chunk = normalized.slice(i, i + CHUNK);
        await Promise.all(chunk.map(async (row) => {
          const orderNumber = row.order_number;
          if (!orderNumber) { skipped++; return; }

          // Resolve machine
          const isDbId = (v) => v && /^[a-f0-9]{24}$/i.test(String(v).trim());
          let machineId = null;
          if (isDbId(row.machine_id_source)) machineId = row.machine_id_source;
          if (!machineId && row.machine_id_source) machineId = resolveMachine(null, row.machine_id_source);
          if (!machineId && row.machine_code_source) machineId = resolveMachine(row.machine_code_source, null);
          if (!machineId) machineId = resolveMachine(row.machine_name, null);
          if (!machineId && unassignedMachine) machineId = unassignedMachine.id;
          if (!machineId) { skipped++; return; }

          const payload = {
            ...row,
            order_number: String(orderNumber),
            machine_id: machineId,
            status: row.status || 'Pendiente',
            priority: parseInt(row.priority) || 0,
            quantity: parseInt(row.quantity) || 0,
            notes: JSON.stringify(row),
            multi_unit: parseInt(row.multi_unit) || 0,
            multi_qty: parseFloat(row.multi_qty) || 0,
            production_cadence: parseFloat(row.production_cadence) || 0,
          };

          const existing = dbByOrderNumber.get(String(orderNumber));
          if (existing) {
            await base44.entities.WorkOrder.update(existing.id, payload);
            updated++;
          } else {
            await base44.entities.WorkOrder.create(payload);
            created++;
          }
        }));

        setProgress(Math.round(((i + CHUNK) / total) * 80));
        setProgressLabel(`Procesando órdenes... (${Math.min(i + CHUNK, total)}/${total})`);
        await new Promise(r => setTimeout(r, 80));
      }

      // Step 7 – Delete stale records (in DB but not in CDEApp)
      setProgressLabel('Eliminando registros obsoletos...');
      const staleRecords = dbList.filter(o => o.order_number && !cdeOrderNumbers.has(String(o.order_number)));
      let deleted = 0;

      if (staleRecords.length > 0) {
        const DEL_CHUNK = 10;
        for (let i = 0; i < staleRecords.length; i += DEL_CHUNK) {
          const chunk = staleRecords.slice(i, i + DEL_CHUNK);
          await Promise.allSettled(chunk.map(o => base44.entities.WorkOrder.delete(o.id)));
          deleted += chunk.length;
          setProgress(80 + Math.round(((i + DEL_CHUNK) / staleRecords.length) * 20));
        }
      }

      setProgress(100);
      const stats = { time: new Date(), created, updated, deleted, skipped };
      setLastSyncStats(stats);
      toast.success(`Sincronización completa: ${created} nuevas, ${updated} actualizadas, ${deleted} eliminadas.`);

      // Reload local display
      await loadLocalOrders();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Error en la sincronización: ' + error.message);
    } finally {
      setSyncing(false);
      setProgress(0);
      setProgressLabel('');
    }
  };

  const clearAllOrders = async () => {
    if (!confirm('⚠️ Esta acción eliminará TODAS las órdenes de trabajo de la base de datos.\n\n¿Estás seguro?')) return;
    setSyncing(true);
    try {
      let remaining = 1;
      let total = 0;
      while (remaining > 0) {
        const all = await base44.entities.WorkOrder.list(undefined, 2000);
        remaining = all.length;
        if (!remaining) break;
        const CHUNK = 50;
        for (let i = 0; i < remaining; i += CHUNK) {
          await Promise.all(all.slice(i, i + CHUNK).map(o => base44.entities.WorkOrder.delete(o.id).catch(() => {})));
          total += Math.min(CHUNK, remaining - i);
        }
      }
      toast.success(`${total} registros eliminados.`);
      setOrders([]);
      setLastSyncStats(null);
    } catch (e) {
      toast.error('Error al vaciar: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // ─── FILTER ───────────────────────────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders.filter(row => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!Object.values(row).some(v => String(v).toLowerCase().includes(q))) return false;
      }
      const { machine, material, order, client, deliveryDateStart, deliveryDateEnd, startDateStart, startDateEnd } = filterValues;
      if (machine && !String(row.machine_name || '').toLowerCase().includes(machine.toLowerCase()) && !String(row.room || '').toLowerCase().includes(machine.toLowerCase())) return false;
      if (material && !String(row.material || '').toLowerCase().includes(material.toLowerCase())) return false;
      if (order && !String(row.order_number || '').toLowerCase().includes(order.toLowerCase())) return false;
      if (client && !String(row.client_name || '').toLowerCase().includes(client.toLowerCase())) return false;
      const checkDate = (dateStr, start, end) => {
        if (!dateStr) return false;
        const d = new Date(dateStr); if (isNaN(d.getTime())) return false;
        if (start && d < new Date(start)) return false;
        if (end) { const e = new Date(end); e.setHours(23, 59, 59, 999); if (d > e) return false; }
        return true;
      };
      if ((deliveryDateStart || deliveryDateEnd) && !checkDate(row.effective_delivery_date, deliveryDateStart, deliveryDateEnd)) return false;
      if ((startDateStart || startDateEnd) && !checkDate(row.effective_start_date, startDateStart, startDateEnd)) return false;
      return true;
    });
  }, [orders, searchQuery, filterValues]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-6 gap-4">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sincronización de Órdenes (CDEApp)</h1>
          <p className="text-muted-foreground text-sm">Upsert incremental: añade nuevas, actualiza existentes y elimina obsoletas automáticamente.</p>
          {lastSyncStats && (
            <div className="flex items-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" />{lastSyncStats.created} nuevas</span>
              <span className="flex items-center gap-1 text-blue-600"><RefreshCw className="h-3 w-3" />{lastSyncStats.updated} actualizadas</span>
              <span className="flex items-center gap-1 text-red-500"><Trash2 className="h-3 w-3" />{lastSyncStats.deleted} eliminadas</span>
              {lastSyncStats.skipped > 0 && <span className="flex items-center gap-1 text-amber-500"><AlertTriangle className="h-3 w-3" />{lastSyncStats.skipped} omitidas</span>}
              <span className="text-muted-foreground">· {lastSyncStats.time.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={syncAll} disabled={syncing} className="bg-blue-600 hover:bg-blue-700 gap-2">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Sincronizando...' : 'Sincronizar con CDEApp'}
          </Button>
          <Button variant="outline" onClick={clearAllOrders} disabled={syncing} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Vaciar BD
          </Button>
        </div>
      </div>

      {/* Progress */}
      {syncing && (
        <div className="flex-shrink-0 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressLabel}</span><span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 w-full" />
        </div>
      )}

      {/* Info box */}
      {!lastSyncStats && !syncing && orders.length === 0 && (
        <div className="flex-shrink-0 flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Sincronización inteligente</p>
            <p className="text-xs mt-1 text-blue-700">Al pulsar "Sincronizar", el sistema comparará automáticamente los datos de CDEApp con la base de datos local: creará las órdenes nuevas, actualizará las modificadas y eliminará las que ya no existen en CDEApp.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="flex-shrink-0 bg-slate-50 border-slate-200">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Sala / Máquina</Label>
              <Input placeholder="Buscar..." value={filterValues.machine} onChange={e => setFilterValues({ ...filterValues, machine: e.target.value })} className="h-8 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Material</Label>
              <Input placeholder="Buscar..." value={filterValues.material} onChange={e => setFilterValues({ ...filterValues, material: e.target.value })} className="h-8 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Orden</Label>
              <Input placeholder="Buscar..." value={filterValues.order} onChange={e => setFilterValues({ ...filterValues, order: e.target.value })} className="h-8 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Cliente</Label>
              <Input placeholder="Buscar..." value={filterValues.client} onChange={e => setFilterValues({ ...filterValues, client: e.target.value })} className="h-8 bg-white" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Fecha Entrega (Desde – Hasta)</Label>
              <div className="flex gap-2">
                <Input type="date" value={filterValues.deliveryDateStart} onChange={e => setFilterValues({ ...filterValues, deliveryDateStart: e.target.value })} className="h-8 bg-white" />
                <Input type="date" value={filterValues.deliveryDateEnd} onChange={e => setFilterValues({ ...filterValues, deliveryDateEnd: e.target.value })} className="h-8 bg-white" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Inicio Límite (Desde – Hasta)</Label>
              <div className="flex gap-2">
                <Input type="date" value={filterValues.startDateStart} onChange={e => setFilterValues({ ...filterValues, startDateStart: e.target.value })} className="h-8 bg-white" />
                <Input type="date" value={filterValues.startDateEnd} onChange={e => setFilterValues({ ...filterValues, startDateEnd: e.target.value })} className="h-8 bg-white" />
              </div>
            </div>
            <div className="space-y-1 lg:col-span-2">
              <Label className="text-xs text-slate-500">Búsqueda Global</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar en todo..." className="pl-8 h-8 bg-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setFilterValues({ machine: '', material: '', order: '', client: '', deliveryDateStart: '', deliveryDateEnd: '', startDateStart: '', startDateEnd: '' }); }} className="h-8">
                  <X className="mr-1 h-3 w-3" />Limpiar
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {orders.length > 0 ? (
        <Card className="flex-1 flex flex-col min-h-0 shadow-sm border-0 overflow-hidden">
          <CardHeader className="flex-shrink-0 py-3 px-4 bg-white border-b">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-slate-500" />
                Órdenes en Base de Datos
              </CardTitle>
              <Badge variant="secondary">{filteredOrders.length} de {orders.length} registros</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 relative">
            <div className="absolute inset-0 overflow-auto">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-20 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[40px] bg-slate-50 font-bold text-xs uppercase text-slate-500 border-b">#</TableHead>
                    {COLUMN_DISPLAY_ORDER.map(key => {
                      const field = SYSTEM_FIELDS.find(f => f.key === key);
                      return (
                        <TableHead key={key} className="whitespace-nowrap px-3 py-2 bg-slate-50 font-bold text-xs uppercase text-slate-500 border-b min-w-[110px]">
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
          <p className="font-medium">No hay órdenes en la base de datos</p>
          <p className="text-sm">Pulse "Sincronizar con CDEApp" para importar.</p>
        </div>
      )}
    </div>
  );
}