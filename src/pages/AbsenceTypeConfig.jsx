import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";

export default function AbsenceTypeConfigPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Configuración de Tipos de Ausencias
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona los tipos de ausencias y permisos disponibles en el sistema
          </p>
        </div>

        <AbsenceTypeManager />
      </div>
    </div>
  );
}