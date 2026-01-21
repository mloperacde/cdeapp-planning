import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Shield, Activity, ArrowLeft, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminOnly from "@/components/security/AdminOnly";
import EmployeeDataAudit from "../components/audit/EmployeeDataAudit";
import MachineProcessDataAudit from "../components/audit/MachineProcessDataAudit";
import AbsenceSyncAudit from "../components/absences/AbsenceSyncAudit";

export default function SystemAudits() {
  // Get tab from URL if provided
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "data-integrity");

  return (
    <AdminOnly message="Solo administradores pueden acceder a las herramientas de auditoría">
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              Auditoría y Salud del Sistema
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Herramientas de diagnóstico, integridad de datos y estado de sincronización
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-slate-100/50 p-2 dark:bg-slate-800/50">
              <TabsTrigger value="data-integrity" className="flex-1 min-w-[120px]">
                <Database className="w-4 h-4 mr-2" />
                Datos de Empleados
              </TabsTrigger>
              <TabsTrigger value="machines" className="flex-1 min-w-[120px]">
                <Wrench className="w-4 h-4 mr-2" />
                Máquinas y Procesos
              </TabsTrigger>
              <TabsTrigger value="sync-health" className="flex-1 min-w-[120px]">
                <Activity className="w-4 h-4 mr-2" />
                Sincronización
              </TabsTrigger>
            </TabsList>

            <TabsContent value="data-integrity">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-indigo-600" />
                    Auditoría de Datos de Empleados
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Analiza la calidad e integridad de los datos de empleados, detecta duplicados y campos faltantes.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <EmployeeDataAudit />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="machines">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-purple-600" />
                    Auditoría de Máquinas y Procesos
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Verifica la integridad de datos de máquinas, procesos y sus relaciones.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <MachineProcessDataAudit />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sync-health">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Salud del Sistema y Sincronización
                  </CardTitle>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Monitoreo de sincronización de ausencias, fichajes y estado de la base de datos.
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <AbsenceSyncAudit />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminOnly>
  );
}
