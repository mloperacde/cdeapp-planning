import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Users, TrendingUp, Target, BookOpen, Settings, Briefcase, ArrowLeft } from "lucide-react";
import SkillManagement from "../components/skillmatrix/SkillManagement";
import EmployeeSkillsMatrix from "../components/skillmatrix/EmployeeSkillsMatrix";
import ProcessSkillRequirements from "../components/skillmatrix/ProcessSkillRequirements";
import SkillGapAnalysis from "../components/skillmatrix/SkillGapAnalysis";
import TrainingNeedsView from "../components/skillmatrix/TrainingNeedsView";
import DepartmentPositionSkillConfig from "../components/skillmatrix/DepartmentPositionSkillConfig";
import EmployeeSkillsView from "../components/team/EmployeeSkillsView";

export default function SkillMatrixPage() {
  const [activeTab, setActiveTab] = useState('matrix');

  const { data: _employees } = useQuery({
    queryKey: ['employeesMaster'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    initialData: [],
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list(),
    initialData: [],
    staleTime: 10 * 60 * 1000, // Cache por 10 minutos
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

  // Estadísticas rápidas
  const stats = {
    totalSkills: skills.length,
    employeesWithSkills: [...new Set(employeeSkills.map(es => es.employee_id))].length,
    pendingTraining: trainingNeeds.filter(tn => tn.estado === "Pendiente").length,
    expertSkills: employeeSkills.filter(es => es.nivel_competencia === "Experto").length,
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
              Matriz de Habilidades
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestión de competencias, análisis de brechas y formación
            </p>
          </div>
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
              <EmployeeSkillsMatrix />
            </TabsContent>

            <TabsContent value="machines" className="mt-0 h-full">
              <EmployeeSkillsView />
            </TabsContent>

            <TabsContent value="dept-positions" className="mt-0 h-full">
              <DepartmentPositionSkillConfig />
            </TabsContent>

            <TabsContent value="processes" className="mt-0 h-full">
              <ProcessSkillRequirements />
            </TabsContent>

            <TabsContent value="gaps" className="mt-0 h-full">
              <SkillGapAnalysis />
            </TabsContent>

            <TabsContent value="training" className="mt-0 h-full">
              <TrainingNeedsView />
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
