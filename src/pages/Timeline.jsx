import React from 'react';

export default function NombreDeLaPagina() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Título de la Página</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-green-600 font-semibold">✅ Página funcionando correctamente</p>
        <p className="mt-4">Los datos se cargarán desde Base44 cuando esté configurado.</p>
      </div>
    </div>
  );
}
