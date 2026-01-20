import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Building2, Clock, RefreshCw, FileSpreadsheet, ArrowLeft, Gavel, FileCode, Users, Shield, Activity, MessageSquare, Database, CalendarDays, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import DepartmentPositionManager from "../components/config/DepartmentPositionManager";
import WorkScheduleConfig from "../components/config/WorkScheduleConfig";
import SyncParametersConfig from "../components/config/SyncParametersConfig";
import CSVFieldMapper from "../components/config/CSVFieldMapper";
import BusinessRulesConfig from "../components/config/BusinessRulesConfig";
import CustomFieldTemplates from "../components/config/CustomFieldTemplates";
import BrandingConfig from "../components/config/BrandingConfig";
import TeamManagementConfig from "../components/config/TeamManagementConfig";
import EmployeeDataAudit from "../components/audit/EmployeeDataAudit";
import MachineProcessDataAudit from "../components/audit/MachineProcessDataAudit";
import AbsenceSyncAudit from "../components/absences/AbsenceSyncAudit";
import NotificationTemplateManager from "../components/notifications/NotificationTemplateManager";
import AbsenceTypeManager from "../components/absences/AbsenceTypeManager";

export default function AdvancedConfigurationPage() {
  // Get tab from URL if provided
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "departments");

  return (
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
            <Settings className="w-8 h-8 text-purple-600" />
            Configuración Avanzada
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Personaliza todos los aspectos del sistema de empleados
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-slate-100/50 p-2 dark:bg-slate-800/50">
            <TabsTrigger value="departments" className="flex-1 min-w-[120px]">
              <Building2 className="w-4 h-4 mr-2" />
              Departamentos
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex-1 min-w-[120px]">
              <Clock className="w-4 h-4 mr-2" />
              Horarios
            </TabsTrigger>
            <TabsTrigger value="absences" className="flex-1 min-w-[120px]">
              <Users className="w-4 h-4 mr-2" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="schedules" className="flex-1 min-w-[120px]">
              <Clock className="w-4 h-4 mr-2" />
              Horarios
            </TabsTrigger>
            <TabsTrigger value="absences" className="flex-1 min-w-[120px]">
              <CalendarDays className="w-4 h-4 mr-2" />
              Ausencias
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex-1 min-w-[120px]">
              <Database className="w-4 h-4 mr-2" />
              Auditoría Datos
            </TabsTrigger>
            <TabsTrigger value="machine-audit" className="flex-1 min-w-[120px]">
              <Wrench className="w-4 h-4 mr-2" />
              Audit. Máquinas
            </TabsTrigger>
            <TabsTrigger value="system-audit" className="flex-1 min-w-[120px]">
              <Shield className="w-4 h-4 mr-2" />
              Audit. Sistema
            </TabsTrigger>
            <TabsTrigger value="health" className="flex-1 min-w-[120px]">
              <Activity className="w-4 h-4 mr-2" />
              Salud Sistema
            </TabsTrigger>
            <TabsTrigger value="messaging" className="flex-1 min-w-[120px]">
              <MessageSquare className="w-4 h-4 mr-2" />
              Mensajería
            </TabsTrigger>
            <TabsTrigger value="sync" className="flex-1 min-w-[120px]">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronización
            </TabsTrigger>
            <TabsTrigger value="csv" className="flex-1 min-w-[120px]">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Mapeo CSV
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex-1 min-w-[120px]">
              <Gavel className="w-4 h-4 mr-2" />
              Reglas
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-1 min-w-[120px]">
              <FileCode className="w-4 h-4 mr-2" />
              Plantillas
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex-1 min-w-[120px]">
              Marca
            </TabsTrigger>
          </TabsList>

          <TabsContent value="departments">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Gestión de Departamentos y Puestos
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Configura la estructura organizativa de tu empresa
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <DepartmentPositionManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  Configuración de Horarios y Jornadas
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Gestiona horarios predefinidos y tipos de jornada
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <ScheduleConfig />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sync">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-purple-600" />
                  Parámetros de Sincronización
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Configura cómo se sincronizan los datos entre BD Maestra y sistema operativo
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <SyncParametersConfig />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="csv">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-orange-600" />
                  Personalización de Campos CSV
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Define plantillas de mapeo personalizadas para tus archivos CSV
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <CSVFieldMapper />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rules">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-indigo-600" />
                  Reglas de Negocio
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Define reglas automáticas para validaciones y asignaciones
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <BusinessRulesConfig />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-pink-600" />
                  Plantillas de Campos Personalizados
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Crea plantillas con campos personalizados para diferentes tipos de empleados
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <CustomFieldTemplates />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="absences">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                  Configuración de Ausencias
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Gestiona tipos de ausencia y reglas de acumulación
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <AbsenceTypeManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  Auditoría de Datos de Empleados
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Analiza la calidad e integridad de los datos de empleados
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <EmployeeDataAudit />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="machine-audit">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-purple-600" />
                  Auditoría de Máquinas y Procesos
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Verifica la integridad de datos de máquinas y procesos
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <MachineProcessDataAudit />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system-audit">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-red-600" />
                  Auditoría del Sistema
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Análisis de entidades y seguridad del sistema
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <EmployeeDataAudit />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Salud del Sistema y Sincronización
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Monitoreo de sincronización de ausencias y fichajes
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <AbsenceSyncAudit />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="messaging">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600" />
                  Configuración de Mensajería
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Gestiona plantillas y tipos de mensajes
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <NotificationTemplateManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding">
            <BrandingConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
