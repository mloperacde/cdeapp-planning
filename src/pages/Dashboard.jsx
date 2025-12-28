import React from 'react';

export default function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard Principal</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-green-600 font-semibold">
          ✅ Aplicación funcionando correctamente
        </p>
        <p className="mt-4">Ahora puedes agregar funcionalidades gradualmente.</p>
      </div>
    </div>
  );
}
