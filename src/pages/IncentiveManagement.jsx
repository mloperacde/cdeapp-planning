 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Settings, BarChart3, Upload } from "lucide-react";
import IncentivePlanConfiguration from "../components/incentives/IncentivePlanConfiguration";
import DepartmentObjectiveConfig from "../components/incentives/DepartmentObjectiveConfig";
import EmployeeResultsManager from "../components/incentives/EmployeeResultsManager";
import IncentiveEvaluation from "../components/incentives/IncentiveEvaluation";
 
export default function IncentiveManagementPage() {
  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header Estándar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Gestión de Incentivos
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Sistema completo de gestión de incentivos y evaluación de objetivos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Actions can be added here if needed */}
        </div>
      </div>

      <div className="w-full">
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
