import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Settings, BarChart3, Upload } from "lucide-react";
import IncentivePlanConfiguration from "../components/incentives/IncentivePlanConfiguration";
import DepartmentObjectiveConfig from "../components/incentives/DepartmentObjectiveConfig";
import EmployeeResultsManager from "../components/incentives/EmployeeResultsManager";
import IncentiveEvaluation from "../components/incentives/IncentiveEvaluation";

export default function IncentiveManagementPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
            Gestión de Incentivos
          </h1>
          <p className="text-slate-600 mt-1">
            Sistema completo de gestión de incentivos y evaluación de objetivos
          </p>
        </div>

        <Tabs defaultValue="plans" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plans">
              <Settings className="w-4 h-4 mr-2" />
              Planes
            </TabsTrigger>
            <TabsTrigger value="config">
              <Settings className="w-4 h-4 mr-2" />
              Configuración
            </TabsTrigger>
            <TabsTrigger value="results">
              <Upload className="w-4 h-4 mr-2" />
              Resultados
            </TabsTrigger>
            <TabsTrigger value="evaluation">
              <BarChart3 className="w-4 h-4 mr-2" />
              Evaluación
            </TabsTrigger>
          </TabsList>

          <TabsContent value="plans">
            <IncentivePlanConfiguration />
          </TabsContent>

          <TabsContent value="config">
            <DepartmentObjectiveConfig />
          </TabsContent>

          <TabsContent value="results">
            <EmployeeResultsManager />
          </TabsContent>

          <TabsContent value="evaluation">
            <IncentiveEvaluation />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}