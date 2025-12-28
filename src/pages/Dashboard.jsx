import React from 'react';

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Principal</h1>
        <p className="text-gray-600">Bienvenido al sistema de planificación CDE App</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Tarjetas de resumen */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-lg mb-2">Empleados</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
          <p className="text-sm text-gray-500">Total registrados</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-lg mb-2">Máquinas</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
          <p className="text-sm text-gray-500">En operación</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="font-semibold text-lg mb-2">Procesos</h3>
          <p className="text-3xl font-bold text-purple-600">0</p>
          <p className="text-sm text-gray-500">Activos</p>
        </div>
      </div>
    </div>
  );
}
