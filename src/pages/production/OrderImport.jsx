import React, { useState, useEffect } from 'react';
import { cdeAppClient, base44 } from '../../api/client';
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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await cdeAppClient.syncProductions();
      let data = [];
      if (Array.isArray(response)) data = response;
      else if (response.data && Array.isArray(response.data)) data = response.data;
      else if (response.data) data = [response.data];
      
      setOrders(data);
      toast.success(`${data.length} órdenes obtenidas.`);
    } catch (error) {
      console.error("Error obteniendo órdenes:", error);
      toast.error("Error al obtener órdenes de CDEApp.");
    } finally {
      setLoading(false);
    }
  };

  const saveOrders = async () => {
    // Lógica de guardado (similar a la que arreglamos, pero controlada por el usuario)
    setLoading(true);
    let created = 0;
    let errors = 0;

    for (const order of orders) {
       // ... lógica de mapeo y guardado ...
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Importar Órdenes de CDEApp</h1>
      
      <div className="mb-4">
        <button 
          onClick={fetchOrders} 
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Cargando...' : 'Obtener Órdenes'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Orden</th>
              <th className="py-2 px-4 border-b">Máquina (CDEApp)</th>
              <th className="py-2 px-4 border-b">Estado Máquina</th>
              <th className="py-2 px-4 border-b">Artículo</th>
              <th className="py-2 px-4 border-b">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => {
               const machineName = order['Máquina'] || order['machine_id'] || '';
               const normalized = String(machineName).toLowerCase().trim();
               const machineExists = machines.has(normalized) || 
                                     (machineName.includes(' - ') && machines.has(machineName.split(' - ')[0].trim().toLowerCase()));
               
               return (
                 <tr key={i} className={machineExists ? '' : 'bg-red-100'}>
                   <td className="py-2 px-4 border-b">{order['Orden'] || order['production_id']}</td>
                   <td className="py-2 px-4 border-b">{machineName}</td>
                   <td className="py-2 px-4 border-b">
                     {machineExists ? <span className="text-green-600">OK</span> : <span className="text-red-600">No encontrada</span>}
                   </td>
                   <td className="py-2 px-4 border-b">{order['Artículo']}</td>
                   <td className="py-2 px-4 border-b">{order['Cantidad']}</td>
                 </tr>
               );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}