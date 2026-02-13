import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, FileText, TrendingUp, Award, Settings, CheckSquare, History, Upload, Building2, Zap } from "lucide-react";
import SalaryComponentsManager from "@/components/salary/SalaryComponentsManager";
import CompensationPolicyManager from "@/components/salary/CompensationPolicyManager";
import SalaryCategoryManager from "@/components/salary/SalaryCategoryManager";
import EmployeeSalaryManager from "@/components/salary/EmployeeSalaryManager";
import PayrollProcessing from "@/components/salary/PayrollProcessing";
import SalaryApprovalFlow from "@/components/salary/SalaryApprovalFlow";
import SalaryAuditHistory from "@/components/salary/SalaryAuditHistory";
import SeniorityBandManager from "@/components/salary/SeniorityBandManager";
import AutomaticSalaryRules from "@/components/salary/AutomaticSalaryRules";
import DepartmentSalarySummary from "@/components/salary/DepartmentSalarySummary";
import InitialSalarySetup from "@/components/salary/InitialSalarySetup";

export default function SalaryManagement() {
  const [activeTab, setActiveTab] = useState("employees");

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Gestión de Salarios y Nóminas
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gestión completa de política retributiva, componentes salariales y procesamiento de nóminas
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-border px-4">
            <TabsList className="w-full justify-start h-12 overflow-x-auto">
              <TabsTrigger value="setup" className="gap-2">
                <Upload className="w-4 h-4" />
                Configuración Inicial
              </TabsTrigger>
              <TabsTrigger value="employees" className="gap-2">
                <DollarSign className="w-4 h-4" />
                Salarios Empleados
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-2">
                <Building2 className="w-4 h-4" />
                Resumen Departamentos
              </TabsTrigger>
              <TabsTrigger value="components" className="gap-2">
                <Settings className="w-4 h-4" />
                Componentes Salariales
              </TabsTrigger>
              <TabsTrigger value="categories" className="gap-2">
                <Award className="w-4 h-4" />
                Categorías Profesionales
              </TabsTrigger>
              <TabsTrigger value="seniority" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Bandas de Antigüedad
              </TabsTrigger>
              <TabsTrigger value="policies" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Políticas Retributivas
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-2">
                <Zap className="w-4 h-4" />
                Reglas Automáticas
              </TabsTrigger>
              <TabsTrigger value="payroll" className="gap-2">
                <FileText className="w-4 h-4" />
                Procesamiento Nóminas
              </TabsTrigger>
              <TabsTrigger value="approvals" className="gap-2">
                <CheckSquare className="w-4 h-4" />
                Aprobaciones
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2">
                <History className="w-4 h-4" />
                Auditoría
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-4">
            <TabsContent value="setup" className="mt-0 h-full">
              <InitialSalarySetup />
            </TabsContent>

            <TabsContent value="employees" className="mt-0 h-full">
              <EmployeeSalaryManager />
            </TabsContent>

            <TabsContent value="summary" className="mt-0 h-full">
              <DepartmentSalarySummary />
            </TabsContent>

            <TabsContent value="components" className="mt-0 h-full">
              <SalaryComponentsManager />
            </TabsContent>

            <TabsContent value="categories" className="mt-0 h-full">
              <SalaryCategoryManager />
            </TabsContent>

            <TabsContent value="seniority" className="mt-0 h-full">
              <SeniorityBandManager />
            </TabsContent>

            <TabsContent value="policies" className="mt-0 h-full">
              <CompensationPolicyManager />
            </TabsContent>

            <TabsContent value="rules" className="mt-0 h-full">
              <AutomaticSalaryRules />
            </TabsContent>

            <TabsContent value="payroll" className="mt-0 h-full">
              <PayrollProcessing />
            </TabsContent>

            <TabsContent value="approvals" className="mt-0 h-full">
              <SalaryApprovalFlow />
            </TabsContent>

            <TabsContent value="audit" className="mt-0 h-full">
              <SalaryAuditHistory />
            </TabsContent>

            <TabsContent value="setup" className="mt-0 h-full">
              <InitialSalarySetup />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}