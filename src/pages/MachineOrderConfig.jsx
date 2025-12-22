import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import MachineOrderConfig from "../components/machines/MachineOrderConfig";

export default function MachineOrderConfigPage() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <Link to={createPageUrl("Machines")}>
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Máquinas
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-purple-600" />
          Configurar Orden de Máquinas
        </h1>
        <p className="text-slate-600 mt-1">
          El orden configurado aquí se aplicará en todas las vistas de la aplicación
        </p>
      </div>

      <MachineOrderConfig />
    </div>
  );
}