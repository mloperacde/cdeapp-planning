import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EmployeeBulkImporter from "../components/employees/EmployeeBulkImporter";

export default function EmployeeBulkImportPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Upload className="w-8 h-8 text-blue-600" />
            Importación Masiva de Empleados
          </h1>
          <p className="text-slate-600 mt-1">
            Carga masiva de empleados desde archivo Excel o CSV
          </p>
        </div>

        <EmployeeBulkImporter />
      </div>
    </div>
  );
}