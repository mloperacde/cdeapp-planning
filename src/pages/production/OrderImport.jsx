import React, { useState, useEffect } from 'react';
import { cdeApp } from '../../api/cdeAppClient';
import { base44 } from '../../api/base44Client';
import { toast } from 'sonner';

export default function OrderImport() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [machines, setMachines] = useState(new Map());

  // Cargar máquinas al inicio para validar
  useEffect(() => {
    const loadMachines = async () => {
      try {
        const res = await base44.entities.Machine.list();
        const map = new Map();
        res.items.forEach(m => {
          map.set(m.name.toLowerCase().trim(), m.id);
          if (m.code) map.set(m.code.toLowerCase().trim(), m.id);
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
      if (s.includes(' - ')) {
          const parts = s.split(' - ');
          const code = parts[0].trim();
          if (machines.has(code)) return machines.get(code);
          
          // 3. Intento split (buscar por Nombre "Nombre")
          if (parts.length > 1) {
              const namePart = parts.slice(1).join(' - ').trim();
              if (machines.has(namePart)) return machines.get(namePart);
          }
      }

      return null;
  }

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

  const saveOrders = async () => {
    if (orders.length === 0) return;
    
    // Filtramos solo las que tienen máquina válida para evitar errores
    const validOrders = orders.filter(order => {
       const machineName = order['Máquina'] || order['machine_id'] || order['machine_name'] || order['maquina'] || '';
       return getMachineId(machineName);
    });

    if (validOrders.length === 0) {
        toast.error("No hay órdenes válidas para importar (revise las máquinas).");
        return;
    }

    if (!confirm(`Se importarán ${validOrders.length} órdenes. ¿Continuar?`)) return;

    setLoading(true);
    const toastId = toast.loading(`Importando ${validOrders.length} órdenes...`);
    let created = 0;
    let errors = 0;

    // Primero borramos las existentes (opcional, depende de si quieres reemplazo total)
    try {
        await base44.entities.WorkOrder.deleteMany({}); 
    } catch (e) {
        console.error("Error borrando órdenes antiguas", e);
    }

    for (const row of validOrders) {
       const orderNumber = row['Orden'] || row['production_id'] || row['order_number'] || row['id'];
       const machineName = row['Máquina'] || row['machine_id'] || row['machine_name'] || row['maquina'] || '';
       const machineId = getMachineId(machineName);

       const payload = {
          order_number: String(orderNumber),
          machine_id: machineId,
          client_name: row['Cliente'] || row['client_name'],
          product_article_code: row['Artículo'] || row['product_article_code'],
          product_name: row['Nombre'] || row['Descripción'] || row['product_name'],
          quantity: parseInt(row['Cantidad'] || row['quantity']) || 0,
          priority: parseInt(row['Prioridad'] || row['priority']) || 3,
          status: 'Pendiente', // Forzamos pendiente al importar
          // Fechas - asumiendo formato compatible o string ISO
          start_date: row['Fecha Inicio Limite'] || row['start_date'],
          committed_delivery_date: row['Fecha Entrega'] || row['committed_delivery_date'],
          planned_end_date: row['Fecha Fin'] || row['planned_end_date'],
          production_cadence: parseFloat(row['Cadencia'] || row['production_cadence']) || 0,
          notes: row['Observación'] || row['notes'] || ''
      };

      try {
          await base44.entities.WorkOrder.create(payload);
          created++;
      } catch (e) {
          console.error(`Error importando orden ${orderNumber}`, e);
          errors++;
      }
      // Pequeña pausa para no saturar
      await new Promise(r => setTimeout(r, 200));
      
      // Actualizar progreso cada 5
      if (created % 5 === 0) {
           toast.loading(`Importando... ${created}/${validOrders.length}`, { id: toastId });
      }
    }

    setLoading(false);
    toast.success(`Importación finalizada. Creadas: ${created}, Errores: ${errors}`, { id: toastId });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
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
                onClick={saveOrders} 
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 transition-colors"
                >
                2. Guardar en Base de Datos
                </button>
            )}
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {/* Debug Info - Solo visible si hay datos pero fallan mappings */}
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
                {orders.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                            No hay datos cargados. Pulse "Obtener Datos" para comenzar.
                        </td>
                    </tr>
                ) : (
                    orders.map((order, i) => {
                    const machineName = order['Máquina'] || order['machine_id'] || order['machine_name'] || order['maquina'] || '';
                    const machineId = getMachineId(machineName);
                    
                    return (
                        <tr key={i} className={machineId ? 'hover:bg-gray-50' : 'bg-red-50 hover:bg-red-100'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {order['Orden'] || order['production_id'] || order['id']}
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
                                    No encontrada
                                </span>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order['Artículo'] || order['product_article_code']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order['Cantidad'] || order['quantity']}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                             {order['Fecha Entrega'] || order['committed_delivery_date']}
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
    </div>
  );
}
