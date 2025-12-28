import React from 'react';

export default function AdvancedHRDashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard RRHH Avanzado</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-green-600 font-semibold">
          ✅ Dashboard RRHH cargado correctamente
        </p>
        <p className="mt-4">
          Esta página consumirá datos del Dashboard de Base44 cuando esté configurado.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold">Empleados</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold">Ausencias</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold">Turnos</h3>
            <p className="text-2xl font-bold">0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
