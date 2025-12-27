// src/pages/TestServices.jsx
import React, { useEffect } from 'react';
import { useServicesContext } from '@/contexts/ServicesContext';

const TestServices = () => {
  const { services, loading, error, reload } = useServicesContext();

  useEffect(() => {
    console.log('🧪 TestServices montado');
    console.log('Servicios disponibles:', services);
    
    // Probar servicios si están disponibles
    if (services?.machineService) {
      services.machineService.getMachines()
        .then(result => {
          console.log('Resultado de getMachines:', result);
        })
        .catch(err => {
          console.error('Error probando getMachines:', err);
        });
    }
  }, [services]);

  if (loading) return <div>Cargando servicios...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">🧪 Prueba de Servicios</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Machine Service</h3>
          <p>{services?.machineService ? '✅ Disponible' : '❌ No disponible'}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Process Service</h3>
          <p>{services?.processService ? '✅ Disponible' : '❌ No disponible'}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-2">Utils</h3>
          <p>{services?.serviceUtils ? '✅ Disponible' : '❌ No disponible'}</p>
        </div>
      </div>
      
      <button
        onClick={reload}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Recargar Servicios
      </button>
    </div>
  );
};

export default TestServices;
