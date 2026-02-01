import React, { useState, useMemo } from 'react';
import { cdeApp } from '../../api/cdeAppClient';
import { base44 } from '../../api/base44Client';
import { toast } from 'sonner';
import { Download, Table as TableIcon, Save, Search, Filter, Plus, X, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    { key: 'order_number', label: 'Orden', required: true, aliases: ['Orden', 'order_number', 'numero_orden', 'wo', 'ORDEN', 'Order', 'W.O.', 'OP', 'OrderNo', 'Order Number', 'Nº Orden'] },
    { key: 'machine_name', label: 'Máquina', required: true, aliases: ['Máquina', 'machine_name', 'maquina', 'machine', 'recurso', 'MÁQUINA', 'MAQUINA', 'Centro Trabajo', 'Work Center', 'Code', 'Resource', 'W.C.', 'C.T.'] },
    { key: 'machine_id_source', label: 'Machine ID (Origen)', aliases: ['machine_id', 'id_maquina', 'MACHINE_ID', 'MachineId', 'Machine ID', 'ID Maquina'] },
    { key: 'priority', label: 'Prioridad', aliases: ['Prioridad', 'priority', 'urgencia', 'PRIORIDAD', 'Priority', 'Rank', 'Ranking', 'Nivel', 'Level', 'Importancia', 'Sequence', 'Secuencia'] },
    { key: 'type', label: 'Tipo', aliases: ['Tipo', 'type', 'TIPO', 'Type', 'Clase', 'Class', 'Kind', 'Categoria'] },
    { key: 'status_source', label: 'Estado (Origen)', aliases: ['Estado', 'status', 'situacion', 'estatus', 'ESTADO', 'Status', 'State', 'Condition', 'Situación'] },
    { key: 'room', label: 'Sala', aliases: ['Sala', 'room', 'SALA', 'Room', 'Nave', 'Zona', 'Zone', 'Area', 'Seccion'] },
    { key: 'client_order_ref', label: 'Su Pedido', aliases: ['Su Pedido', 'client_order', 'SU PEDIDO', 'SU_PEDIDO', 'ClientOrder', 'PedidoCliente', 'Customer Order', 'Ref Cliente', 'Su No. Pedido'] },
    { key: 'internal_order_ref', label: 'Pedido', aliases: ['Pedido', 'internal_order', 'InternalOrder', 'PedidoInterno', 'Ref Interna', 'Pedido Interno'] },
    { key: 'product_article_code', label: 'Artículo', aliases: ['Artículo', 'product_article_code', 'article', 'referencia', 'part_number', 'codigo', 'cod_articulo', 'Item', 'Material', 'Part No', 'Part Number', 'Codigo Articulo', 'Referencia'] },
    { key: 'product_name', label: 'Nombre / Descripción', aliases: ['Nombre', 'Descripción', 'product_name', 'description', 'detalle', 'producto', 'desc_articulo', 'Description', 'Designation', 'Item Name', 'Descripcion', 'Nombre Articulo'] },
    { key: 'article_status', label: 'Edo. Art.', aliases: ['Edo. Art.', 'article_status', 'Estado Articulo', 'Status Articulo', 'Item Status'] },
    { key: 'client_name', label: 'Cliente', aliases: ['Cliente', 'client_name', 'client', 'customer', 'empresa', 'razon_social', 'Customer', 'Client', 'Nombre Cliente'] },
    { key: 'material', label: 'Material', aliases: ['Material', 'material', 'Raw Material', 'Materia Prima', 'Compuesto', 'Compound'] },
    { key: 'product_family', label: 'Producto (Familia)', aliases: ['Producto', 'product_family', 'Familia', 'Family', 'Product Family', 'Familia Producto'] },
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

export default function OrderImport() {
  const [rawOrders, setRawOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [columns, setColumns] = useState([]);
  
  // Filtering & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState([]);
  const [newFilter, setNewFilter] = useState({ column: "", operator: "contains", value: "" });
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const toastId = toast.loading("Obteniendo datos crudos de CDEApp...");
    try {
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

      if (data.length > 0) {
        const allKeys = new Set();
        data.forEach(item => {
            if (item && typeof item === 'object') {
                Object.keys(item).forEach(k => allKeys.add(k));
            }
        });
        setColumns(Array.from(allKeys));
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

  const saveOrders = async () => {
      if (filteredOrders.length === 0) {
          toast.warning("No hay órdenes visibles para guardar.");
          return;
      }

      if (!confirm(`Se van a guardar ${filteredOrders.length} registros visibles. ¿Continuar?`)) return;

      setSaving(true);
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

          // 2. Procesar y Guardar
          for (const row of filteredOrders) {
              const orderNumber = extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'order_number'));
              const machineName = extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'machine_name'));
              const machineIdSource = extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'machine_id_source'));

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
                  continue;
              }

              const payload = {
                  order_number: String(orderNumber),
                  machine_id: machineId,
                  status: 'Pendiente',
                  // Map other fields
                  production_id: extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'production_id')),
                  machine_id_source: machineIdSource,
                  priority: parseInt(extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'priority'))) || 0,
                  quantity: parseInt(extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'quantity'))) || 0,
                  notes: extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'notes')) || '',
                  client_name: extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'client_name')),
                  product_name: extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'product_name')),
                  product_article_code: extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'product_article_code')),
                  planned_end_date: extractValue(row, SYSTEM_FIELDS.find(f => f.key === 'planned_end_date')),
                  // Add more fields as needed based on schema
              };

              try {
                  // Check duplicate? For now, just create. 
                  // Ideally we should use an upsert or check existence.
                  // Simplest: Create. API might handle duplicates or create new.
                  await base44.entities.WorkOrder.create(payload);
                  successCount++;
              } catch (e) {
                  console.error("Error creating order:", payload, e);
                  failCount++;
              }
          }

          toast.success(`Guardado completado: ${successCount} creados, ${failCount} fallidos.`, { id: toastId });

      } catch (error) {
          console.error("Error saving orders:", error);
          toast.error("Error general al guardar órdenes.", { id: toastId });
      } finally {
          setSaving(false);
      }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importación de Órdenes</h1>
          <p className="text-muted-foreground">Vista de datos crudos con filtrado avanzado y guardado.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={fetchOrders} disabled={loading}>
            {loading ? "Cargando..." : (
                <>
                <Download className="mr-2 h-4 w-4" />
                Obtener Datos
                </>
            )}
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
                            {col}
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
