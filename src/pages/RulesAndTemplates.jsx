import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gavel, FileCode, Bell, Zap, ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AdminOnly from "@/components/security/AdminOnly";
import BusinessRulesConfig from "../components/config/BusinessRulesConfig";
import CustomFieldTemplates from "../components/config/CustomFieldTemplates";

export default function RulesAndTemplates() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "rules");

  return (
    <AdminOnly message="Solo administradores pueden configurar reglas y plantillas">
      <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        <div className="w-full flex flex-col gap-6">
          {/* Header Estándar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Gavel className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                  Reglas y Plantillas
                </h1>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  Configura reglas de negocio, plantillas de datos y automatizaciones del sistema
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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-slate-100/50 p-2 dark:bg-slate-800/50">
              <TabsTrigger value="rules" className="flex-1 min-w-[120px]">
                <Gavel className="w-4 h-4 mr-2" />
                Reglas de Negocio
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex-1 min-w-[120px]">
                <FileCode className="w-4 h-4 mr-2" />
                Plantillas de Datos
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex-1 min-w-[120px]">
                <Bell className="w-4 h-4 mr-2" />
                Reglas de Notificación
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex-1 min-w-[120px]">
                <Zap className="w-4 h-4 mr-2" />
                Acciones Automáticas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rules">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Gavel className="w-5 h-5 text-indigo-600" />
                    Reglas de Negocio Globales
                  </CardTitle>
                  <CardDescription>
                    Define reglas automáticas para validaciones, asignaciones y restricciones en toda la aplicación
                  </CardDescription>
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
                  <CardDescription>
                    Crea y gestiona plantillas con campos personalizados para diferentes tipos de empleados o entidades
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <CustomFieldTemplates />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-amber-600" />
                    Reglas de Notificación
                  </CardTitle>
                  <CardDescription>
                    Configura disparadores para enviar notificaciones automáticas basadas en eventos
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Bell className="w-16 h-16 mb-4 text-slate-200" />
                    <h3 className="text-lg font-medium text-slate-900">Configuración de Notificaciones</h3>
                    <p className="max-w-md text-center mt-2">
                      Este módulo permitirá definir reglas como "Enviar email al supervisor cuando una ausencia sea &gt; 3 días".
                    </p>
                    <Button className="mt-6" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Nueva Regla de Notificación
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    Acciones Automáticas
                  </CardTitle>
                  <CardDescription>
                    Define flujos de trabajo y acciones que se ejecutan automáticamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                    <Zap className="w-16 h-16 mb-4 text-slate-200" />
                    <h3 className="text-lg font-medium text-slate-900">Automatización de Acciones</h3>
                    <p className="max-w-md text-center mt-2">
                      Este módulo permitirá configurar acciones como "Desactivar usuario si no hay actividad en 30 días" o "Asignar turno por defecto al crear empleado".
                    </p>
                    <Button className="mt-6" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Nueva Acción
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminOnly>
  );
}
