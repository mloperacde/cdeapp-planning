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
      <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        <div className="w-full flex flex-col gap-6">
          {/* Header Estándar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Configuración de Tipos de Ausencia
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Gestiona la base de datos maestra de tipos de ausencia
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={createPageUrl("Configuration")}>
                <Button variant="ghost" size="sm" className="h-8 gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Volver</span>
                </Button>
              </Link>
            </div>
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
