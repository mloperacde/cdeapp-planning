import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Settings, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminOnly from "@/components/security/AdminOnly";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";

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
              <TabsTrigger value="advanced">
                Opciones Avanzadas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="types" className="mt-6">
              <AbsenceTypeManager />
            </TabsContent>

            <TabsContent value="advanced" className="mt-6">
              <div className="border rounded-lg p-6 bg-slate-50">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-900">
                    Opciones avanzadas
                  </h2>
                </div>
                <p className="text-sm text-slate-600">
                  Este apartado se reservará para reglas avanzadas de configuración
                  de ausencias e integración con otros módulos.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminOnly>
  );
}

