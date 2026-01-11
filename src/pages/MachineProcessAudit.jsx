import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MachineProcessDataAudit from "../components/audit/MachineProcessDataAudit";

export default function MachineProcessAuditPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Navegación */}
        <Link
          to="/Configuration"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Configuración
        </Link>

        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Auditoría de Máquinas y Procesos
          </h1>
          <p className="text-slate-600">
            Análisis de integridad de datos y relaciones entre máquinas, procesos y entidades relacionadas
          </p>
        </div>

        {/* Componente de Auditoría */}
        <MachineProcessDataAudit />
      </div>
    </div>
  );
}