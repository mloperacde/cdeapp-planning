import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Users, 
  Factory, 
  ArrowLeft, 
  Briefcase,
  Save,
  ClipboardList,
  Clock
} from "lucide-react";
import AdminOnly from "@/components/security/AdminOnly";
import DepartmentPositionManager from "../components/config/DepartmentPositionManager";
import TeamManagementConfig from "../components/config/TeamManagementConfig";
import WorkScheduleConfig from "../components/config/WorkScheduleConfig";
import { StructureConfig, AssignmentsConfig, TasksConfig } from "../components/config/ManufacturingStructureConfig";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function OrganizationalStructure() {
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "departments");

  return (
    <AdminOnly message="Solo administradores pueden configurar la estructura organizativa">
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
              <Building2 className="w-8 h-8 text-indigo-600" />
              Estructura Organizativa
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gestiona departamentos, equipos, puestos y la configuración de fabricación
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="flex flex-wrap h-auto gap-2 bg-slate-100/50 p-2 dark:bg-slate-800/50">
              <TabsTrigger value="departments" className="flex-1 min-w-[120px]">
                <Building2 className="w-4 h-4 mr-2" />
                Departamentos y Puestos
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex-1 min-w-[120px]">
                <Users className="w-4 h-4 mr-2" />
                Configuración de Equipos
              </TabsTrigger>
              <TabsTrigger value="manufacturing" className="flex-1 min-w-[120px]">
                <Factory className="w-4 h-4 mr-2" />
                Configuración Fabricación
              </TabsTrigger>
            </TabsList>

            <TabsContent value="departments">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    Departamentos y Puestos
                  </CardTitle>
                  <CardDescription>
                    Define la jerarquía organizativa, departamentos y puestos de trabajo
                  </CardDescription>
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
                    Gestión de Equipos
                  </CardTitle>
                  <CardDescription>
                    Configura turnos rotativos, composición de equipos y calendarios
                  </CardDescription>
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
                  <CardDescription>
                    Gestiona horarios predefinidos y tipos de jornada
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <WorkScheduleConfig />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="manufacturing">
              <Card className="shadow-lg border-0 bg-white/80 dark:bg-card/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="flex items-center gap-2">
                    <Factory className="w-5 h-5 text-blue-600" />
                    Configuración de Fabricación
                  </CardTitle>
                  <CardDescription>
                    Áreas, Salas, Asignaciones de Jefes de Turno y Tareas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <ManufacturingConfigWrapper />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminOnly>
  );
}

function ManufacturingConfigWrapper() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState("structure");

  // Fetch AppConfig for manufacturing
  const { data: configRecord, isLoading } = useQuery({
    queryKey: ["appConfig", "manufacturing"],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: "manufacturing_config" });
      return configs[0] || null;
    },
    staleTime: 0,
  });

  const [config, setConfig] = useState({
    areas: [], // { id, name, rooms: [] }
    assignments: {
      shift1: { leaders: [], areas: {} }, // leaders: [{id, name}], areas: { leaderId: [areaId] }
      shift2: { leaders: [], areas: {} }
    },
    tasks: [] // { id, time, description, role }
  });

  useEffect(() => {
    if (configRecord?.value) {
      try {
        const parsed = typeof configRecord.value === 'string' ? JSON.parse(configRecord.value) : configRecord.value;
        setConfig(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Error parsing manufacturing config", e);
      }
    }
  }, [configRecord]);

  const saveMutation = useMutation({
    mutationFn: async (newConfig) => {
      const payload = {
        config_key: "manufacturing_config",
        value: JSON.stringify(newConfig),
        description: "Configuración de Fabricación: Áreas, Salas y Asignaciones"
      };

      if (configRecord?.id) {
        return await base44.entities.AppConfig.update(configRecord.id, payload);
      } else {
        return await base44.entities.AppConfig.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["appConfig", "manufacturing"]);
      toast.success("Configuración guardada correctamente");
    },
    onError: () => {
      toast.error("Error al guardar la configuración");
    }
  });

  const handleSave = () => {
    saveMutation.mutate(config);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
          <Save className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <Factory className="w-4 h-4" />
            Estructura (Áreas/Salas)
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Asignaciones Jefes
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Escaleta de Tareas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure">
          <StructureConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksConfig config={config} setConfig={setConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
