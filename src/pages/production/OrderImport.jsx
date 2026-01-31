import React, { useState, useEffect } from 'react';
import { cdeApp } from '../../api/cdeAppClient';
import { base44 } from '../../api/base44Client';
import { toast } from 'sonner';
import { Settings, Save, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SYSTEM_FIELDS = [
    { key: 'production_id', label: 'Production ID', aliases: ['production_id', 'id', 'PRODUCTION_ID'] },
    { key: 'order_number', label: 'Orden', required: true, aliases: ['Orden', 'order_number', 'numero_orden', 'wo', 'ORDEN'] },
    { key: 'machine_name', label: 'Máquina', required: true, aliases: ['Máquina', 'machine_name', 'maquina', 'machine', 'recurso', 'MÁQUINA', 'MAQUINA'] },
    { key: 'machine_id_source', label: 'Machine ID (Origen)', aliases: ['machine_id', 'id_maquina', 'MACHINE_ID'] },
    { key: 'priority', label: 'Prioridad', aliases: ['Prioridad', 'priority', 'urgencia', 'PRIORIDAD'] },
    { key: 'type', label: 'Tipo', aliases: ['Tipo', 'type', 'TIPO'] },
    { key: 'status_source', label: 'Estado (Origen)', aliases: ['Estado', 'status', 'situacion', 'estatus', 'ESTADO'] },
    { key: 'room', label: 'Sala', aliases: ['Sala', 'room', 'SALA'] },
    { key: 'client_order_ref', label: 'Su Pedido', aliases: ['Su Pedido', 'client_order', 'SU PEDIDO', 'SU_PEDIDO'] },
    { key: 'internal_order_ref', label: 'Pedido', aliases: ['Pedido', 'internal_order'] },
    { key: 'product_article_code', label: 'Artículo', aliases: ['Artículo', 'product_article_code', 'article', 'referencia', 'part_number', 'codigo'] },
    { key: 'product_name', label: 'Nombre / Descripción', aliases: ['Nombre', 'Descripción', 'product_name', 'description', 'detalle', 'producto'] },
    { key: 'article_status', label: 'Edo. Art.', aliases: ['Edo. Art.', 'article_status'] },
    { key: 'client_name', label: 'Cliente', aliases: ['Cliente', 'client_name', 'client', 'customer', 'empresa'] },
    { key: 'material', label: 'Material', aliases: ['Material', 'material'] },
    { key: 'product_family', label: 'Producto (Familia)', aliases: ['Producto', 'product_family'] },
    { key: 'shortages', label: 'Faltas', aliases: ['Faltas', 'shortages'] },
    { key: 'quantity', label: 'Cantidad', aliases: ['Cantidad', 'quantity', 'qty', 'unidades', 'piezas'] },
    { key: 'committed_delivery_date', label: 'Fecha Entrega', aliases: ['Fecha Entrega', 'committed_delivery_date', 'entrega', 'delivery_date', 'fecha_fin'] },
    { key: 'new_delivery_date', label: 'Nueva Fecha Entrega', aliases: ['Nueva Fecha Entrega', 'new_delivery_date'] },
    { key: 'delivery_compliance', label: 'Cumplimiento entrega', aliases: ['Cumplimiento entrega', 'compliance'] },
    { key: 'multi_unit', label: 'MultUnid', aliases: ['MultUnid'] },
    { key: 'multi_qty', label: 'Mult x Cantidad', aliases: ['Mult x Cantidad'] },
    { key: 'production_cadence', label: 'Cadencia', aliases: ['Cadencia', 'production_cadence', 'cadence', 'ciclo'] },
    { key: 'delay_reason', label: 'Motivo Retraso', aliases: ['Motivo Retraso', 'delay_reason'] },
    { key: 'components_deadline', label: 'Fecha limite componentes', aliases: ['Fecha limite componentes'] },
    { key: 'start_date', label: 'Fecha Inicio Limite', aliases: ['Fecha Inicio Limite', 'start_date', 'inicio', 'fecha_inicio'] },
    { key: 'start_date_simple', label: 'Fecha Inicio Limite Simple', aliases: ['Fecha Inicio Limite Simple'] },
    { key: 'modified_start_date', label: 'Fecha Inicio Modificada', aliases: ['Fecha Inicio Modificada'] },
    { key: 'planned_end_date', label: 'Fecha Fin', aliases: ['Fecha Fin', 'planned_end_date', 'end_date', 'fin'] },
    { key: 'end_date_simple', label: 'Fecha Fin Simple', aliases: ['Fecha Fin Simple'] },
    { key: 'notes', label: 'Observación', aliases: ['Observación', 'notes', 'notas', 'comentarios'] }
];

export default function OrderImport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState(new Map());
  
  // Mapping State
  const [mapping, setMapping] = useState({});
  const [showMappingDialog, setShowMappingDialog] = useState(false);

  // Load mapping on mount
  useEffect(() => {
      try {
          const saved = localStorage.getItem('cdeapp_api_mapping');
          if (saved) setMapping(JSON.parse(saved));
      } catch (e) { console.error("Error loading mapping", e); }
  }, []);

  // Save mapping
  const handleSaveMapping = (newMapping) => {
      setMapping(newMapping);
      localStorage.setItem('cdeapp_api_mapping', JSON.stringify(newMapping));
      toast.success("Configuración de mapeo guardada");
      setShowMappingDialog(false);
  };

  // Cargar máquinas al inicio para validar
  useEffect(() => {
    const loadMachines = async () => {
      try {
        // Intentar cargar de MachineMasterDatabase primero (el maestro real)
        let res = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
        
        // Fallback a Machine si MachineMasterDatabase falla o está vacío (compatibilidad)
        if (!res || res.length === 0) {
            console.log("MachineMasterDatabase vacío, intentando Machine...");
            const resLegacy = await base44.entities.Machine.list(undefined, 1000);
            res = resLegacy.items || resLegacy;
        }

        if (!Array.isArray(res)) res = [];

        console.log(`[OrderImport] Loaded ${res.length} machines`);

        const map = new Map();
        res.forEach(m => {
          // Mapeamos por nombre, código y descripción para maximizar hits
          if (m.nombre) map.set(m.nombre.toLowerCase().trim(), m.id);
          if (m.codigo_maquina) map.set(m.codigo_maquina.toLowerCase().trim(), m.id);
          if (m.code) map.set(m.code.toLowerCase().trim(), m.id);
          if (m.descripcion) map.set(m.descripcion.toLowerCase().trim(), m.id);
        });
        setMachines(map);
      } catch (error) {
        console.error("Error cargando máquinas:", error);
        toast.error("No se pudieron cargar las máquinas.");
      }
    };
    loadMachines();
  }, []);

  const getMachineId = (nameOrCode) => {
      if (!nameOrCode) return null;
      const s = String(nameOrCode).toLowerCase().trim();
      
      // 1. Intento directo (Nombre exacto o Código exacto)
      if (machines.has(s)) return machines.get(s);
      
      // 2. Intento split "123 - Nombre" (buscar por Código "123")
      // Probamos con varios separadores: " - ", "-", " : "
      const separators = [' - ', ' : ', '-', ':'];
      
      for (const sep of separators) {
          if (s.includes(sep)) {
              const parts = s.split(sep);
              const code = parts[0].trim();
              if (machines.has(code)) return machines.get(code);
              
              // Intentar sin ceros a la izquierda (ej: "012" -> "12")
              const codeNoZeros = code.replace(/^0+/, '');
              if (codeNoZeros && machines.has(codeNoZeros)) return machines.get(codeNoZeros);

              // 3. Intento split (buscar por Nombre "Nombre")
              if (parts.length > 1) {
                  const namePart = parts.slice(1).join(sep).trim();
                  if (machines.has(namePart)) return machines.get(namePart);
              }
          }
      }

      return null;
  }

  const uniqueUnmappedMachines = React.useMemo(() => {
      if (orders.length === 0) return [];
      const missing = new Set();
      orders.forEach(order => {
          const machineName = order['Máquina'] || order['machine_id'] || order['machine_name'] || order['maquina'] || '';
          if (machineName && !getMachineId(machineName)) {
              missing.add(machineName);
          }
      });
      return Array.from(missing);
  }, [orders, machines]);

  const fetchOrders = async () => {
    setLoading(true);
    const toastId = toast.loading("Obteniendo órdenes...");
    try {
      const response = await cdeApp.syncProductions();
      let data = [];
      
      // Normalización de respuesta
      if (Array.isArray(response)) {
          data = response;
      } else if (response && response.data && Array.isArray(response.data)) {
          data = response.data;
      } else if (response && response.data) {
          data = [response.data];
      } else if (response) {
          // Intento de detectar si es un objeto con claves numéricas
           if (typeof response === 'object' && Object.keys(response).every(key => !isNaN(parseInt(key)))) {
               data = Object.values(response);
           } else {
               data = [response];
           }
      }
      
      setOrders(data);
      toast.success(`${data.length} órdenes obtenidas.`, { id: toastId });
    } catch (error) {
      console.error("Error obteniendo órdenes:", error);
      toast.error("Error al obtener órdenes de CDEApp.", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, active: false });

  // ... (getMachineId y fetchOrders sin cambios)

  // Database Preview State
  const [dbOrders, setDbOrders] = useState([]);
  const [showDbPreview, setShowDbPreview] = useState(false);

  const fetchDbOrders = async () => {
    try {
        const res = await base44.entities.WorkOrder.list(undefined, 100);
        setDbOrders(res.items || res);
        setShowDbPreview(true);
        toast.success("Datos de Base de Datos cargados");
    } catch (e) {
        console.error("Error cargando BD", e);
        toast.error("Error leyendo base de datos");
    }
  };

  // Helper para extraer valor basado en config o defaults
  const extractValue = (obj, fieldDef) => {
      if (!obj) return undefined;
      
      // 1. Usar mapeo personalizado si existe
      if (mapping[fieldDef.key] && mapping[fieldDef.key] !== 'auto') {
          const mappedKey = mapping[fieldDef.key];
          // Solo usamos el mapeo si la clave existe en el objeto.
          // Si el mapeo apunta a una columna que ya no existe (stale), hacemos fallback a Auto.
          if (obj[mappedKey] !== undefined) {
              return obj[mappedKey];
          }
      }

      // 2. Usar alias por defecto (lógica "auto")
      const keys = fieldDef.aliases || [];
      const objKeys = Object.keys(obj);
      // Normalizar claves del objeto para búsqueda rápida
      const normalizedObjKeys = {};
      objKeys.forEach(k => {
          normalizedObjKeys[k.toLowerCase().replace(/[^a-z0-9]/g, '')] = k;
      });

      for (const key of keys) {
          // Intento directo
          if (obj[key] !== undefined) return obj[key];
          // Intento normalizado
          const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
          const realKey = normalizedObjKeys[normalizedKey];
          if (realKey && obj[realKey] !== undefined) return obj[realKey];
      }
      return undefined;
  };

  const availableKeys = React.useMemo(() => {
      if (orders.length === 0) return [];
      return Object.keys(orders[0]);
  }, [orders]);

  const processedOrders = React.useMemo(() => {
      return orders.map(order => {
          const processed = { _original: order };
          SYSTEM_FIELDS.forEach(field => {
              processed[field.key] = extractValue(order, field);
          });
          // Resolver ID de máquina
          processed.machine_id_resolved = getMachineId(processed.machine_name);
          return processed;
      });
  }, [orders, mapping, machines]);

  const saveOrders = async () => {
    if (processedOrders.length === 0) return;
    
    // Filtramos solo las que tienen máquina válida
    const validOrders = processedOrders.filter(o => o.machine_id_resolved);

    const total = processedOrders.length;
    const valid = validOrders.length;
    const invalid = total - valid;

    if (valid === 0) {
        toast.error("No hay órdenes válidas para importar (revise las máquinas).");
        return;
    }

    if (!confirm(`Resumen de Importación:\n\n- Total registros: ${total}\n- Válidos (con máquina): ${valid}\n- Inválidos (sin máquina): ${invalid}\n\n¿Desea importar las ${valid} órdenes válidas?`)) return;

    setLoading(true);
    setImportProgress({ current: 0, total: valid, active: true });
    
    const toastId = toast.loading(`Iniciando importación de ${valid} órdenes...`);
    let created = 0;
    let errors = 0;

    // Primero borramos las existentes
    try {
        toast.loading("Borrando órdenes antiguas...", { id: toastId });
        
        // Usamos un timeout para evitar bloqueos infinitos en deleteMany
        const deletePromise = new Promise(async (resolve, reject) => {
             const timer = setTimeout(() => reject(new Error("Timeout borrando órdenes")), 10000);
             try {
                 if (base44.entities.WorkOrder.deleteMany) {
                    await base44.entities.WorkOrder.deleteMany({});
                 } else {
                    // Fallback
                    const old = await base44.entities.WorkOrder.list(undefined, 1000);
                    if (old && old.length) {
                        await Promise.all(old.map(o => base44.entities.WorkOrder.delete(o.id)));
                    }
                 }
                 clearTimeout(timer);
                 resolve();
             } catch(e) {
                 clearTimeout(timer);
                 reject(e);
             }
        });

        await deletePromise;
        console.log("Borrado completado o saltado");
        
    } catch (e) {
        console.error("Advertencia borrando órdenes antiguas (continuando...)", e);
        toast.warning("No se pudieron borrar todas las órdenes antiguas, continuando...", { id: toastId });
    }

    // Procesamiento secuencial con gestión de Rate Limit (429)
    const DELAY_MS = 250; 

    for (let i = 0; i < validOrders.length; i++) {
        setImportProgress({ current: i + 1, total: valid, active: true });
        
        const row = validOrders[i];
        const orderNumber = row.order_number;

        const payload = {
            order_number: String(orderNumber),
            machine_id: row.machine_id_resolved, // Internal Resolved ID
            
            // Extended fields
            production_id: row.production_id,
            machine_id_source: row.machine_id_source,
            priority: parseInt(row.priority) || 3,
            type: row.type,
            status_source: row.status_source,
            room: row.room,
            client_order_ref: row.client_order_ref,
            internal_order_ref: row.internal_order_ref,
            product_article_code: row.product_article_code,
            product_name: row.product_name,
            article_status: row.article_status,
            client_name: row.client_name,
            material: row.material,
            product_family: row.product_family,
            shortages: row.shortages,
            quantity: parseInt(String(row.quantity).replace(/,/g, '')) || 0,
            committed_delivery_date: row.committed_delivery_date,
            new_delivery_date: row.new_delivery_date,
            delivery_compliance: row.delivery_compliance,
            multi_unit: row.multi_unit,
            multi_qty: row.multi_qty,
            production_cadence: parseFloat(row.production_cadence) || 0,
            delay_reason: row.delay_reason,
            components_deadline: row.components_deadline,
            start_date: row.start_date,
            start_date_simple: row.start_date_simple,
            modified_start_date: row.modified_start_date,
            planned_end_date: row.planned_end_date,
            end_date_simple: row.end_date_simple,
            notes: row.notes || '',
            
            status: 'Pendiente', // Internal status
        };

        let retries = 0;
        let success = false;
        
        // Bucle de reintento para errores 429
        while (!success && retries < 3) {
            try {
                // Timeout de 5s por petición individual para no colgar
                const createPromise = new Promise(async (resolve, reject) => {
                    const t = setTimeout(() => reject(new Error("Timeout creando orden")), 8000);
                    try {
                        await base44.entities.WorkOrder.create(payload);
                        clearTimeout(t);
                        resolve();
                    } catch(e) {
                        clearTimeout(t);
                        reject(e);
                    }
                });
                
                await createPromise;
                created++;
                success = true;
            } catch (e) {
                const isRateLimit = e?.status === 429 || (e?.message && (e.message.includes('429') || e.message.includes('Rate limit')));
                
                if (isRateLimit) {
                    retries++;
                    const waitTime = 2000 * retries; 
                    console.warn(`Rate limit (429) en orden ${orderNumber}. Reintentando en ${waitTime}ms...`);
                    // Actualizar toast para que el usuario sepa que estamos esperando
                    toast.loading(`Esperando ${waitTime/1000}s por límite de velocidad...`, { id: toastId });
                    await new Promise(r => setTimeout(r, waitTime));
                    // Restaurar mensaje
                    toast.loading(`Importando... ${i + 1}/${validOrders.length}`, { id: toastId });
                } else {
                    console.error(`Error fatal importando orden ${orderNumber}`, e);
                    errors++;
                    break; 
                }
            }
        }
        
        // Pausa entre iteraciones
        if (success) {
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    setLoading(false);
    setImportProgress({ ...importProgress, active: false });
    
    // Mensaje final detallado
    if (errors > 0) {
        toast.error(`Importación finalizada con advertencias.\nCreadas: ${created}\nErrores: ${errors}\nOmitidas (sin máquina): ${invalid}`, { id: toastId, duration: 8000 });
    } else {
        toast.success(`Importación exitosa.\nCreadas: ${created}\nOmitidas (sin máquina): ${invalid}`, { id: toastId, duration: 5000 });
    }
  };

  // Preview Component
  const OrdersPreview = () => {
      if (!orders || orders.length === 0) return null;
      
      // Get headers from first order
      const headers = Object.keys(orders[0]).slice(0, 8); // Show first 8 columns

      return (
          <div className="mt-8 mb-4 border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b font-medium text-sm text-gray-700 flex justify-between items-center">
                  <span>Vista Previa de Datos Recuperados ({orders.length} registros)</span>
                  <span className="text-xs text-gray-500">Mostrando primeros 5 registros</span>
              </div>
              <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                          <tr>
                              {headers.map(h => (
                                  <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                          {orders.slice(0, 5).map((row, i) => (
                              <tr key={i}>
                                  {headers.map(h => (
                                      <td key={h} className="px-3 py-2 text-xs text-gray-900 whitespace-nowrap max-w-[200px] truncate">
                                          {typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h] || '')}
                                      </td>
                                  ))}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  };

    

    

  // Database Preview Component
  const DatabasePreview = () => {
      if (!showDbPreview) return null;

      const headers = SYSTEM_FIELDS.map(f => f.key);

      return (
          <div className="mt-12 border-t-4 border-blue-500 pt-6">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">3. Verificación de Base de Datos</h2>
                  <Button variant="outline" onClick={() => setShowDbPreview(false)} size="sm">Ocultar</Button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                  Estos son los datos que REALMENTE están guardados en la base de datos (Primeros 100 registros).
                  Útil para verificar que el mapeo ha funcionado correctamente.
              </p>

              <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-blue-50">
                              <tr>
                                  {headers.map(h => (
                                      <th key={h} className="px-3 py-2 text-left text-xs font-bold text-blue-800 uppercase tracking-wider whitespace-nowrap">
                                          {SYSTEM_FIELDS.find(f => f.key === h)?.label || h}
                                      </th>
                                  ))}
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {dbOrders.length === 0 ? (
                                  <tr><td colSpan={headers.length} className="p-4 text-center text-gray-500">Base de datos vacía</td></tr>
                              ) : (
                                  dbOrders.map((row, i) => (
                                      <tr key={i} className="hover:bg-gray-50">
                                          {headers.map(h => (
                                              <td key={h} className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap max-w-[150px] truncate border-r border-gray-100 last:border-0">
                                                  {typeof row[h] === 'object' ? JSON.stringify(row[h]) : String(row[h] !== undefined && row[h] !== null ? row[h] : '')}
                                              </td>
                                          ))}
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Modal de Progreso */}
      {importProgress.active && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                <h3 className="text-lg font-bold mb-4">Importando Órdenes...</h3>
                <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
                    <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                    <span>{importProgress.current} de {importProgress.total}</span>
                    <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center">Por favor no cierre esta ventana.</p>
            </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Importar Órdenes de CDEApp</h1>
        <div className="space-x-4">
            <button 
            onClick={fetchOrders} 
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
            >
            {loading ? 'Cargando...' : '1. Obtener Datos'}
            </button>

            {orders.length > 0 && (
                <button 
                onClick={() => setShowMappingDialog(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors flex items-center"
                >
                <Settings className="w-4 h-4 mr-2" />
                Configurar Mapeo
                </button>
            )}
            
            {orders.length > 0 && (
                <button 
                onClick={saveOrders} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
                >
                2. Guardar en Base de Datos
                </button>
            )}

            <button 
            onClick={fetchDbOrders} 
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
            >
            3. Verificar Datos Guardados
            </button>
        </div>
      </div>

      <p className="mb-4 text-gray-600">
        Esta herramienta conecta con la API de CDEApp para descargar las órdenes de producción pendientes y cargarlas en el planificador.
      </p>

      <OrdersPreview />
      <DatabasePreview />

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {/* Debug Info - Solo visible si hay datos pero fallan mappings */}
          {uniqueUnmappedMachines.length > 0 && (
              <div className="bg-red-50 p-4 border-b border-red-200">
                  <h3 className="text-red-800 font-bold mb-2">⚠️ Máquinas no encontradas en el sistema ({uniqueUnmappedMachines.length})</h3>
                  <p className="text-red-600 text-sm mb-2">Las siguientes máquinas del archivo no coinciden con ninguna máquina registrada. Por favor, verifique los nombres o cree las máquinas faltantes.</p>
                  <div className="flex flex-wrap gap-2">
                      {uniqueUnmappedMachines.map(m => (
                          <span key={m} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded border border-red-200 font-mono">
                              {m}
                          </span>
                      ))}
                  </div>
              </div>
          )}

          {orders.length > 0 && (
              <details className="p-4 bg-gray-100 text-xs font-mono mb-2">
                  <summary className="cursor-pointer font-bold text-gray-700">Ver Estructura de Datos (Debug)</summary>
                  <div className="mt-2 p-2 bg-gray-800 text-green-400 rounded overflow-auto max-h-40">
                      Keys encontradas en primera fila: {JSON.stringify(Object.keys(orders[0]))}
                      <br/>
                      Ejemplo fila 1: {JSON.stringify(orders[0], null, 2)}
                      <br/>
                      Máquinas cargadas (Total): {machines.size}
                      <br/>
                      Ejemplos máquinas: {Array.from(machines.entries()).slice(0, 5).map(([k, v]) => `${k} -> ${v}`).join(', ')}
                  </div>
              </details>
          )}

        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Máquina (Origen)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Mapeo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artículo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Entrega</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {processedOrders.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                            No hay datos cargados. Pulse "Obtener Datos" para comenzar.
                        </td>
                    </tr>
                ) : (
                    processedOrders.map((order, i) => {
                    const machineName = order.machine_name;
                    const machineId = order.machine_id_resolved;
                    const orderId = order.order_number;
                    const article = order.product_article_code;
                    const qty = order.quantity;
                    const delivery = order.committed_delivery_date;
                    
                    return (
                        <tr key={i} className={machineId ? 'hover:bg-gray-50' : 'bg-red-50 hover:bg-red-100'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {orderId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {machineName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {machineId ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    OK
                                </span>
                            ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    Máquina Desconocida
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {article}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {qty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {delivery}
                        </td>
                        </tr>
                    );
                    })
                )}
            </tbody>
            </table>
        </div>
      </div>
      <div className="mt-4 text-sm text-gray-500">
          Total registros: {orders.length}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mapping Dialog Component */}
          <MappingConfigDialog 
              open={showMappingDialog} 
              onOpenChange={setShowMappingDialog}
              currentMapping={mapping}
              availableKeys={availableKeys}
              onSave={handleSaveMapping}
          />
      </div>
    </div>
  );
}

function MappingConfigDialog({ open, onOpenChange, currentMapping, availableKeys, onSave }) {
    const [localMapping, setLocalMapping] = useState(currentMapping);

    useEffect(() => {
        if (open) setLocalMapping(currentMapping);
    }, [open, currentMapping]);

    const handleChange = (fieldKey, value) => {
        setLocalMapping(prev => ({
            ...prev,
            [fieldKey]: value
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configuración de Mapeo de Datos</DialogTitle>
                    <DialogDescription>
                        Asigna las columnas de la API (Origen) a los campos del sistema (Destino).
                        Selecciona "Auto (Detectar)" para usar la lógica automática.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {SYSTEM_FIELDS.map(field => (
                        <div key={field.key} className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor={field.key} className="text-right font-medium">
                                {field.label} {field.required && <span className="text-red-500">*</span>}
                            </Label>
                            <div className="col-span-3">
                                <Select 
                                    value={localMapping[field.key] || 'auto'} 
                                    onValueChange={(val) => handleChange(field.key, val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar columna origen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto"><span className="italic text-gray-500">Auto (Detectar automáticamente)</span></SelectItem>
                                        {availableKeys.map(key => (
                                            <SelectItem key={key} value={key}>{key}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {field.aliases && (
                                    <p className="text-[10px] text-gray-400 mt-1 truncate">
                                        Busca: {field.aliases.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button variant="ghost" onClick={() => setLocalMapping({})} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Resetear
                    </Button>
                    <Button onClick={() => onSave(localMapping)}>
                        <Save className="w-4 h-4 mr-2" />
                        Guardar Configuración
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
