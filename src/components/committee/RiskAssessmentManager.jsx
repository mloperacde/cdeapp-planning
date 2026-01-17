import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function RiskAssessmentManager() {
  const { data: assessments } = useQuery({
    queryKey: ['riskAssessments'],
    queryFn: () => base44.entities.RiskAssessment.list('-fecha_evaluacion'),
    initialData: [],
  });

  const pendingRisks = assessments.reduce((sum, ra) => 
    sum + (ra.riesgos_identificados?.filter(r => r.estado === "Pendiente").length || 0), 0
  );

  const inProgressRisks = assessments.reduce((sum, ra) => 
    sum + (ra.riesgos_identificados?.filter(r => r.estado === "En Proceso").length || 0), 0
  );

  const completedRisks = assessments.reduce((sum, ra) => 
    sum + (ra.riesgos_identificados?.filter(r => r.estado === "Completada").length || 0), 0
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 dark:from-red-950/40 dark:to-red-900/40 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 dark:text-red-300 font-medium">Riesgos Pendientes</p>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{pendingRisks}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 dark:from-amber-950/40 dark:to-amber-900/40 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">En Proceso</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{inProgressRisks}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-950/40 dark:to-green-900/40 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">Completadas</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{completedRisks}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm dark:bg-slate-800/80 dark:border dark:border-slate-700">
        <CardHeader className="border-b border-slate-100 dark:border-slate-700">
          <CardTitle className="flex items-center gap-2 dark:text-slate-100">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Evaluaciones de Riesgos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {assessments.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No hay evaluaciones de riesgos registradas
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">{assessment.titulo}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {assessment.departamento} {assessment.puesto && `- ${assessment.puesto}`}
                      </p>
                    </div>
                    <Badge className={
                      assessment.estado_general === "Completada" ? "bg-green-600 dark:bg-green-700" :
                      assessment.estado_general === "En Proceso" ? "bg-blue-600 dark:bg-blue-700" :
                      "bg-amber-600 dark:bg-amber-700"
                    }>
                      {assessment.estado_general}
                    </Badge>
                  </div>

                  {assessment.riesgos_identificados && assessment.riesgos_identificados.length > 0 && (
                    <div className="space-y-2">
                      {assessment.riesgos_identificados.slice(0, 3).map((riesgo, idx) => (
                        <div key={idx} className="text-sm p-2 bg-slate-50 dark:bg-slate-900/50 rounded">
                          <div className="flex items-center justify-between">
                            <span className="font-medium dark:text-slate-200">{riesgo.descripcion}</span>
                            <Badge variant="outline" className={
                              riesgo.nivel_riesgo === "Intolerable" || riesgo.nivel_riesgo === "Importante" ? "border-red-600 text-red-600 dark:border-red-400 dark:text-red-400" :
                              riesgo.nivel_riesgo === "Moderado" ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400" :
                              "border-green-600 text-green-600 dark:border-green-400 dark:text-green-400"
                            }>
                              {riesgo.nivel_riesgo}
                            </Badge>
                          </div>
                          {riesgo.medidas_correctoras_propuestas && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                              {riesgo.medidas_correctoras_propuestas}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}