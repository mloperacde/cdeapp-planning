import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, GitBranch, Database } from "lucide-react";
import DataModelDiagram from "@/components/audit/DataModelDiagram";
import DepartmentMigrationPanel from "@/components/audit/DepartmentMigrationPanel";

export default function DataModelView() {
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
            <GitBranch className="w-4 h-4 text-teal-600" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Modelo de Datos — Relaciones entre Entidades
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Plan de Mejora Arquitectural · Fases 1-3
            </p>
          </div>
        </div>
        <Link to="/Configuration">
          <Button variant="ghost" size="sm" className="h-8 gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Configuración</span>
          </Button>
        </Link>
      </div>

      <div className="flex-1 p-4">
        <Tabs defaultValue="diagram">
          <TabsList className="mb-4">
            <TabsTrigger value="diagram" className="gap-2">
              <GitBranch className="w-4 h-4" />
              Diagrama (Fase 1)
            </TabsTrigger>
            <TabsTrigger value="migration" className="gap-2">
              <Database className="w-4 h-4" />
              Migración Departamentos (Fase 3)
            </TabsTrigger>
          </TabsList>
          <TabsContent value="diagram">
            <DataModelDiagram />
          </TabsContent>
          <TabsContent value="migration">
            <DepartmentMigrationPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}