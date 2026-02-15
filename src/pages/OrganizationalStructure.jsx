import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import MachineRoomAssignment from "../components/config/MachineRoomAssignment";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function OrganizationalStructure() {
  const [activeTab, setActiveTab] = useState("departments");

  // Datos base para Vacantes
  const { data: departments = [] } = useQuery({
    queryKey: ['departments_vacancies_page'],
    queryFn: () => base44.entities.Department.list(),
  });
  const { data: positions = [] } = useQuery({
    queryKey: ['positions_vacancies_page'],
    queryFn: () => base44.entities.Position.list(),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ['employees_vacancies_page'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list('nombre');
      const isActive = (s) => {
        const v = (s || "").toString().trim().toUpperCase();
        return v === "ALTA" || v === "ACTIVO";
      };
      return all.filter(emp => isActive(emp.estado_empleado));
    },
  });

  const normalizeTxt = (s) =>
    (s || "")
      .toString()
      .trim()
      .replace(/\s+/g, " ")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase();

  const canonicalPosName = (s) => {
    let n = normalizeTxt(s);
    n = n.replace(/L[IÍ]NEA/g, "LINEA");
    if (/\bOPERARI([OA])\b/.test(n) || n.includes("OPERARIO/A")) {
      n = n.replace(/\bOPERARIA\b/g, "OPERARIO/A")
           .replace(/\bOPERARIO\b/g, "OPERARIO/A");
    }
    n = n.replace(/\s+/g, " ").trim();
    return n;
  };

  const vacanciesByDept = React.useMemo(() => {
    const result = [];
    departments.forEach(dept => {
      const deptPositions = positions.filter(p => p.department_id === dept.id);
      const normalizedDeptName = (dept.name || "").trim().toUpperCase();
      let deptEmps = [];
      if (normalizedDeptName === "PRODUCCIÓN T1" || normalizedDeptName === "PRODUCCIÓN T1.1") {
        deptEmps = employees.filter(e => {
          const empDept = (e.departamento || "").trim().toUpperCase();
          return empDept === "PRODUCCIÓN" && e.team_key === "team_1";
        });
      } else if (normalizedDeptName === "PRODUCCIÓN T2" || normalizedDeptName === "PRODUCCIÓN T2.2") {
        deptEmps = employees.filter(e => {
          const empDept = (e.departamento || "").trim().toUpperCase();
          return empDept === "PRODUCCIÓN" && e.team_key === "team_2";
        });
      } else {
        deptEmps = employees.filter(e => (e.departamento || "").trim().toUpperCase() === normalizedDeptName);
      }
      const vacancies = [];
      deptPositions.forEach(pos => {
        const assignedCount = deptEmps.filter(e => {
          const empPuesto = canonicalPosName(e.puesto || "");
          const posName = canonicalPosName(pos.name || "");
          return empPuesto === posName;
        }).length;
        const headcount = Number.isFinite(pos.max_headcount) ? (pos.max_headcount || 0) : (pos.max_headcount ? Number(pos.max_headcount) : 0);
        if (headcount <= 0) return;
        const vacantSlots = headcount - assignedCount;
        if (vacantSlots > 0) {
          vacancies.push({
            position: pos.name,
            vacantSlots,
            maxHeadcount: pos.max_headcount || 1,
            assignedCount
          });
        }
      });
      if (vacancies.length > 0) {
        result.push({
          department: dept.name,
          departmentId: dept.id,
          color: dept.color,
          vacancies
        });
      }
    });
    return result;
  }, [departments, positions, employees]);

  const totalVacancies = React.useMemo(
    () => vacanciesByDept.reduce((sum, d) => sum + d.vacancies.length, 0),
    [vacanciesByDept]
  );

  return (
    <AdminOnly message="Solo administradores pueden configurar la estructura organizativa">
      <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        {/* Header Section Compact */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Estructura Organizativa
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Gestiona departamentos, equipos, puestos y la configuración de fabricación
              </p>
            </div>
          </div>
          
          <div>
            <Link to={createPageUrl("Configuration")}>
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-2">
                <ArrowLeft className="w-3 h-3" />
                Volver a Configuración
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
            <TabsList className="flex w-full flex-nowrap overflow-x-auto mb-2 shrink-0 h-auto bg-white dark:bg-slate-800/50 p-1 border border-slate-200 dark:border-slate-800 rounded-lg">
              <TabsTrigger value="departments" className="flex-1 text-xs py-1.5">
                <Building2 className="w-3 h-3 mr-2" />
                Departamentos
              </TabsTrigger>
              <TabsTrigger value="vacancies" className="flex-1 text-xs py-1.5">
                <Briefcase className="w-3 h-3 mr-2" />
                Vacantes
              </TabsTrigger>
              <TabsTrigger value="teams" className="flex-1 text-xs py-1.5">
                <Users className="w-3 h-3 mr-2" />
                Equipos
              </TabsTrigger>
              <TabsTrigger value="manufacturing" className="flex-1 text-xs py-1.5">
                <Factory className="w-3 h-3 mr-2" />
                Fabricación
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-2">
              <TabsContent value="departments" className="m-0 h-full">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4 shrink-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Departamentos y Puestos
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Define la jerarquía organizativa, departamentos y puestos de trabajo
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 flex-1 overflow-hidden">
                    <DepartmentPositionManager />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vacancies" className="m-0 h-full">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4 shrink-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Briefcase className="w-4 h-4 text-amber-600" />
                      Puestos Vacantes en Toda la Estructura
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Resumen de puestos con cupo disponible por departamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                        {totalVacancies} vacantes
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {vacanciesByDept.map(dept => (
                        <div key={dept.departmentId} className="border rounded-lg overflow-hidden bg-slate-50">
                          <div className="px-3 py-2 bg-white border-b flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: dept.color }}></div>
                            <span className="font-semibold text-xs text-slate-900 truncate flex-1">{dept.department}</span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {dept.vacancies.length}
                            </Badge>
                          </div>
                          <div className="p-2 space-y-1">
                            {dept.vacancies.map((vac, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[10px] bg-white p-1.5 rounded border">
                                <span className="font-medium text-slate-700 truncate max-w-[140px]" title={vac.position}>{vac.position}</span>
                                <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-[9px] px-1 h-4">
                                  {vac.vacantSlots}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="teams" className="m-0 h-full">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4 shrink-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="w-4 h-4 text-green-600" />
                      Gestión de Equipos
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configura turnos rotativos, composición de equipos y calendarios
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 overflow-y-auto">
                    <TeamManagementConfig />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="schedules" className="m-0 h-full">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4 shrink-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="w-4 h-4 text-green-600" />
                      Configuración de Horarios y Jornadas
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Gestiona horarios predefinidos y tipos de jornada
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 overflow-y-auto">
                    <WorkScheduleConfig />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="manufacturing" className="m-0 h-full">
                <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-full flex flex-col">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-3 px-4 shrink-0">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Factory className="w-4 h-4 text-blue-600" />
                      Configuración de Fabricación
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Áreas, Salas, Asignaciones de Jefes de Turno y Tareas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 overflow-y-auto">
                    <ManufacturingConfigWrapper />
                  </CardContent>
                </Card>
              </TabsContent>

            </div>
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

  // Fetch employees for assignment selection
  const { data: employees = [] } = useQuery({
    queryKey: ['employees_manufacturing_config'],
    queryFn: async () => {
      const all = await base44.entities.EmployeeMasterDatabase.list('nombre');
      // Return all to ensure we can select any employee
            return all;
          },
        });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs_manufacturing'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const [config, setConfig] = useState({
    areas: [], // { id, name, rooms: [] }
    assignments: {
      shift1: { leaders: [], areas: {}, leaderMap: {} }, // leaderMap: { "Responsable T1-A": employeeId }
      shift2: { leaders: [], areas: {}, leaderMap: {} }
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
        <TabsList className="grid w-full grid-cols-4 lg:w-[800px]">
          <TabsTrigger value="structure" className="flex items-center gap-2">
            <Factory className="w-4 h-4" />
            Áreas/Salas
          </TabsTrigger>
          <TabsTrigger value="machines" className="flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Máquinas
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Jefes Turno
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Escaleta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure">
          <StructureConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="machines">
          <MachineRoomAssignment config={config} />
        </TabsContent>

        <TabsContent value="assignments">
          <AssignmentsConfig config={config} setConfig={setConfig} employees={employees} teams={teams} />
        </TabsContent>

        <TabsContent value="tasks">
          <TasksConfig config={config} setConfig={setConfig} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
