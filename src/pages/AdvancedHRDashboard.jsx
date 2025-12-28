import React from 'react';

export default function AdvancedHRDashboard() {
  // Datos de ejemplo - en el futuro vendrán de Base44
  const stats = [
    { label: 'Empleados Totales', value: '0', color: 'bg-purple-500' },
    { label: 'Ausencias Hoy', value: '0', color: 'bg-blue-500' },
    { label: 'Turnos Activos', value: '0', color: 'bg-green-500' },
    { label: 'Procesos Activos', value: '0', color: 'bg-orange-500' },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard RRHH Avanzado</h1>
        <p className="text-gray-600">Gestión integral de recursos humanos</p>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                <span className="text-white font-bold">📊</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje informativo */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-2">✅ Dashboard funcionando</h2>
        <p className="text-blue-700">
          Esta página está lista para conectar con Base44. Los datos se cargarán automáticamente desde el Dashboard de Base44.
        </p>
        <div className="mt-4 p-4 bg-white rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Próximo paso:</strong> Configurar las entidades en el Dashboard de Base44 para que los datos se sincronicen automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}
