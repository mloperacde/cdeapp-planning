import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Users, TrendingUp, Target, BookOpen, Settings, Briefcase, ArrowLeft } from "lucide-react";
import { useNavigationHistory } from "../utils/useNavigationHistory";
import SkillManagement from "./SkillManagement";
import EmployeeSkillsMatrix from "./EmployeeSkillsMatrix";
import ProcessSkillRequirements from "./ProcessSkillRequirements";
import SkillGapAnalysis from "./SkillGapAnalysis";
import TrainingNeedsView from "./TrainingNeedsView";
import DepartmentPositionSkillConfig from "./DepartmentPositionSkillConfig";
import EmployeeSkillsView from "../team/EmployeeSkillsView";

const normalizeString = (str) => {
  if (!str) return "";
  return str.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
};

export default function DepartmentSkillMatrix({ 
  department, 
  title, 
  fixedDepartment = true,
  onlyManagers = false
}) {
  const [activeTab, setActiveTab] = useState('matrix');
  const { goBack } = useNavigationHistory();

  const { data: employees } = useQuery({
    queryKey: ['employeesMaster'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list(),
    initialData: [],
    staleTime: 10 * 60 * 1000,
  });

  const { data: employeeSkills } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { data: trainingNeeds } = useQuery({
    queryKey: ['trainingNeeds'],
    queryFn: () => base44.entities.TrainingNeed.list(),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  // Filtered Data for Stats
  const deptEmployees = useMemo(() => {
    return employees.filter(e => {
        const matchesDept = department === "all" || (e.departamento && normalizeString(e.departamento) === normalizeString(department));
        const matchesManager = !onlyManagers || (e.puesto && e.puesto.toLowerCase().includes('jefe'));
        return matchesDept && matchesManager;
    });
  }, [employees, department, onlyManagers]);

  const deptEmployeeIds = useMemo(() => deptEmployees.map(e => e.id), [deptEmployees]);

  const deptEmployeeSkills = useMemo(() => {
    return employeeSkills.filter(es => deptEmployeeIds.includes(es.employee_id));
  }, [employeeSkills, deptEmployeeIds]);

  const deptTrainingNeeds = useMemo(() => {
    return trainingNeeds.filter(tn => deptEmployeeIds.includes(tn.employee_id));
  }, [trainingNeeds, deptEmployeeIds]);

  // Estadísticas rápidas
  const stats = {
    totalSkills: skills.length, // Global skills
    employeesWithSkills: [...new Set(deptEmployeeSkills.map(es => es.employee_id))].length,
    pendingTraining: deptTrainingNeeds.filter(tn => tn.estado === "Pendiente").length,
    expertSkills: deptEmployeeSkills.filter(es => es.nivel_competencia === "Experto").length,
  };

  return (
    <div className="h-full flex flex-col p-2 gap-2 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Section Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {title || `Habilidades ${department}`}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestión de competencias y formación del departamento {onlyManagers ? '(Solo Jefes)' : ''}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={goBack} className="h-8">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 shrink-0">
        <Card className="p-3 flex items-center justify-between bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div>
                <p className="text-xs text-blue-700 dark:text-blue-200 font-medium">Habilidades</p>
                <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{stats.totalSkills}</p>
            </div>
            <Award className="w-6 h-6 text-blue-600" />
        </Card>

        <Card className="p-3 flex items-center justify-between bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div>
                <p className="text-xs text-green-700 dark:text-green-200 font-medium">Empleados</p>
                <p className="text-xl font-bold text-green-900 dark:text-green-100">{stats.employeesWithSkills}</p>
            </div>
            <Users className="w-6 h-6 text-green-600" />
        </Card>

        <Card className="p-3 flex items-center justify-between bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div>
                <p className="text-xs text-purple-700 dark:text-purple-200 font-medium">Expertos</p>
                <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{stats.expertSkills}</p>
            </div>
            <TrendingUp className="w-6 h-6 text-purple-600" />
        </Card>

        <Card className="p-3 flex items-center justify-between bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div>
                <p className="text-xs text-orange-700 dark:text-orange-200 font-medium">Formación</p>
                <p className="text-xl font-bold text-orange-900 dark:text-orange-100">{stats.pendingTraining}</p>
            </div>
            <BookOpen className="w-6 h-6 text-orange-600" />
        </Card>
      </div>

      {/* Main Content Area */}
      <Card className="flex-1 flex flex-col min-h-0 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
          <div className="px-4 pt-2 border-b border-slate-100 dark:border-slate-800">
            <TabsList className="grid w-full grid-cols-7 h-9">
              <TabsTrigger value="matrix" className="text-xs">
                <Users className="w-3.5 h-3.5 mr-2" />
                Matriz
              </TabsTrigger>
              <TabsTrigger value="machines" className="text-xs">
                <Settings className="w-3.5 h-3.5 mr-2" />
                Máquinas
              </TabsTrigger>
              <TabsTrigger value="dept-positions" className="text-xs">
                <Briefcase className="w-3.5 h-3.5 mr-2" />
                Por Puesto
              </TabsTrigger>
              <TabsTrigger value="processes" className="text-xs">
                <Target className="w-3.5 h-3.5 mr-2" />
                Procesos
              </TabsTrigger>
              <TabsTrigger value="gaps" className="text-xs">
                <TrendingUp className="w-3.5 h-3.5 mr-2" />
                Brechas
              </TabsTrigger>
              <TabsTrigger value="training" className="text-xs">
                <BookOpen className="w-3.5 h-3.5 mr-2" />
                Formación
              </TabsTrigger>
              <TabsTrigger value="config" className="text-xs">
                <Settings className="w-3.5 h-3.5 mr-2" />
                Habilidades
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
            <TabsContent value="matrix" className="mt-0 h-full">
              <EmployeeSkillsMatrix 
                  defaultDepartment={department} 
                  fixedDepartment={fixedDepartment}
                  onlyManagers={onlyManagers}
              />
            </TabsContent>

            <TabsContent value="machines" className="mt-0 h-full">
              <EmployeeSkillsView department={department} />
            </TabsContent>

            <TabsContent value="dept-positions" className="mt-0 h-full">
              <DepartmentPositionSkillConfig 
                  defaultDepartment={department} 
                  fixedDepartment={fixedDepartment} 
              />
            </TabsContent>

            <TabsContent value="processes" className="mt-0 h-full">
              {/* Assuming ProcessSkillRequirements doesn't filter by department yet, but it's config */}
              <ProcessSkillRequirements />
            </TabsContent>

            <TabsContent value="gaps" className="mt-0 h-full">
              <SkillGapAnalysis department={department} />
            </TabsContent>

            <TabsContent value="training" className="mt-0 h-full">
              <TrainingNeedsView department={department} />
            </TabsContent>

            <TabsContent value="config" className="mt-0 h-full">
              <SkillManagement />
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
