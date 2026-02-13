import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import SeniorityBandManager from "@/components/salary/SeniorityBandManager";

export default function SenioritySettings() {
  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-background overflow-hidden">
      <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-border p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Configuración de Antigüedad
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gestiona bandas de antigüedad y beneficios asociados
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <SeniorityBandManager />
      </div>
    </div>
  );
}