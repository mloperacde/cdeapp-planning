import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, Users, TrendingUp, Target, BookOpen, Settings, Briefcase } from "lucide-react";
import SkillManagement from "../components/skillmatrix/SkillManagement";
import EmployeeSkillsMatrix from "../components/skillmatrix/EmployeeSkillsMatrix";
import ProcessSkillRequirements from "../components/skillmatrix/ProcessSkillRequirements";
import SkillGapAnalysis from "../components/skillmatrix/SkillGapAnalysis";
import TrainingNeedsView from "../components/skillmatrix/TrainingNeedsView";
import DepartmentPositionSkillConfig from "../components/skillmatrix/DepartmentPositionSkillConfig";
import MachineExperienceManager from "../components/skillmatrix/MachineExperienceManager";

export default function SkillMatrixPage() {
  const [activeTab, setActiveTab] = useState('matrix');

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
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
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Award className="w-8 h-8 text-blue-600" />
            Matriz de Habilidades
          </h1>
          <p className="text-slate-600 mt-1">
            Gestión de competencias, análisis de brechas y necesidades de formación
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Habilidades Registradas</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalSkills}</p>
                </div>
                <Award className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Empleados con Habilidades</p>
                  <p className="text-2xl font-bold text-green-900">{stats.employeesWithSkills}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Habilidades Expertas</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.expertSkills}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Formación Pendiente</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.pendingTraining}</p>
                </div>
                <BookOpen className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="matrix">
              <Users className="w-4 h-4 mr-2" />
              Matriz
            </TabsTrigger>
            <TabsTrigger value="machines">
              <Settings className="w-4 h-4 mr-2" />
              Máquinas
            </TabsTrigger>
            <TabsTrigger value="dept-positions">
              <Briefcase className="w-4 h-4 mr-2" />
              Por Puesto
            </TabsTrigger>
            <TabsTrigger value="processes">
              <Target className="w-4 h-4 mr-2" />
              Procesos
            </TabsTrigger>
            <TabsTrigger value="gaps">
              <TrendingUp className="w-4 h-4 mr-2" />
              Brechas
            </TabsTrigger>
            <TabsTrigger value="training">
              <BookOpen className="w-4 h-4 mr-2" />
              Formación
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Habilidades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="matrix">
            <EmployeeSkillsMatrix />
          </TabsContent>

          <TabsContent value="machines">
            <MachineExperienceManager />
          </TabsContent>

          <TabsContent value="dept-positions">
            <DepartmentPositionSkillConfig />
          </TabsContent>

          <TabsContent value="processes">
            <ProcessSkillRequirements />
          </TabsContent>

          <TabsContent value="gaps">
            <SkillGapAnalysis />
          </TabsContent>

          <TabsContent value="training">
            <TrainingNeedsView />
          </TabsContent>

          <TabsContent value="config">
            <SkillManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}