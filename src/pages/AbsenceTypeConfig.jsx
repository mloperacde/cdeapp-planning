import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Settings, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminOnly from "@/components/security/AdminOnly";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";
import VacationAccumulationConfig from "../components/absences/VacationAccumulationConfig";

export default function AbsenceTypeConfig() {
  const [activeTab, setActiveTab] = useState("types");

  return (
    <AdminOnly message="Solo administradores pueden configurar los tipos de ausencia">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
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
              <Calendar className="w-8 h-8 text-blue-600" />
              Configuración de Tipos de Ausencia
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona la base de datos maestra de tipos de ausencia
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="types">
                Tipos de Ausencia
              </TabsTrigger>
              <TabsTrigger value="vacation-rules">
                Reglas de Vacaciones
              </TabsTrigger>
            </TabsList>

            <TabsContent value="types" className="mt-6">
              <AbsenceTypeManager />
            </TabsContent>

            <TabsContent value="vacation-rules" className="mt-6 space-y-4">
              <div className="border rounded-lg p-4 bg-slate-50 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-600" />
                <p className="text-sm text-slate-700">
                  Configura cómo afectan las ausencias a las vacaciones y la acumulación de días pendientes.
                </p>
              </div>
              <VacationAccumulationConfig />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminOnly>
  );
}
