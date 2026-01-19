import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Building2, Briefcase, Clock, RefreshCw, FileSpreadsheet, ArrowLeft, Gavel, FileCode, Users } from "lucide-react";
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
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8">
            <TabsTrigger value="departments">
              <Building2 className="w-4 h-4 mr-2" />
              Departamentos
            </TabsTrigger>
            <TabsTrigger value="teams">
              <Users className="w-4 h-4 mr-2" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="schedules">
              <Clock className="w-4 h-4 mr-2" />
              Horarios
            </TabsTrigger>
            <TabsTrigger value="sync">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sincronización
            </TabsTrigger>
            <TabsTrigger value="csv">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Mapeo CSV
            </TabsTrigger>
            <TabsTrigger value="rules">
              <Gavel className="w-4 h-4 mr-2" />
              Reglas
            </TabsTrigger>
            <TabsTrigger value="templates">
              <FileCode className="w-4 h-4 mr-2" />
              Plantillas
            </TabsTrigger>
            <TabsTrigger value="branding">
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

          <TabsContent value="teams">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-600" />
                  Configuración de Equipos y Rotación
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Gestiona nombres de equipos, rotación de turnos y composición por departamento
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <TeamManagementConfig />
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
                  Define los tipos de jornada y horarios por defecto
                </p>
              </CardHeader>
              <CardContent className="p-6">
                <WorkScheduleConfig />
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

          <TabsContent value="branding">
            <BrandingConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
