import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, AlertTriangle, RefreshCw, Wrench, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TeamVerificationPanel() {
  const queryClient = useQueryClient();
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const verifyMutation = useMutation({
    mutationFn: async () => {
      setVerifying(true);
      const response = await base44.functions.invoke('verifyTeamAssignments', {});
      return response.data;
    },
    onSuccess: (data) => {
      setVerificationResult(data);
      if (data.summary.issues_found === 0) {
        toast.success('No se encontraron problemas de asignación de equipos');
      } else {
        toast.warning(`Se encontraron ${data.summary.issues_found} empleados con problemas`);
      }
      setVerifying(false);
    },
    onError: (error) => {
      toast.error('Error al verificar: ' + error.message);
      setVerifying(false);
    }
  });

  const applyFixesMutation = useMutation({
    mutationFn: async (fixes) => {
      const response = await base44.functions.invoke('applyTeamFixes', { fixes });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(data.message);
      // Re-verify after applying fixes
      verifyMutation.mutate();
    },
    onError: (error) => {
      toast.error('Error al aplicar correcciones: ' + error.message);
    }
  });

  const getIssueIcon = (type) => {
    const icons = {
      'mismatch_equipo_team_key': AlertCircle,
      'missing_equipo': AlertTriangle,
      'missing_team_key': AlertTriangle,
      'rotativo_sin_equipo': AlertCircle,
      'fixed_with_team': AlertCircle
    };
    return icons[type] || AlertCircle;
  };

  const getIssueColor = (type) => {
    const colors = {
      'mismatch_equipo_team_key': 'text-red-600',
      'missing_equipo': 'text-amber-600',
      'missing_team_key': 'text-amber-600',
      'rotativo_sin_equipo': 'text-orange-600',
      'fixed_with_team': 'text-blue-600'
    };
    return colors[type] || 'text-slate-600';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header & Verify Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Verificación de Equipos
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Valida la consistencia de asignaciones de equipos en toda la aplicación
          </p>
        </div>
        <Button 
          onClick={() => verifyMutation.mutate()}
          disabled={verifying}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
          {verifying ? 'Verificando...' : 'Verificar Equipos'}
        </Button>
      </div>

      {verificationResult && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Total Empleados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {verificationResult.summary.total_employees}
                </div>
              </CardContent>
            </Card>

            <Card className={verificationResult.summary.issues_found > 0 ? 'border-red-200 bg-red-50/50' : 'border-green-200 bg-green-50/50'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Problemas Encontrados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold flex items-center gap-2 ${verificationResult.summary.issues_found > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {verificationResult.summary.issues_found > 0 ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {verificationResult.summary.issues_found}
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Correcciones Auto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  {verificationResult.summary.auto_fixable}
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-500">Sin Equipo Asignado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {verificationResult.summary.employees_without_team}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Results */}
          <Tabs defaultValue="issues" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="issues">
                Problemas Detectados ({verificationResult.issues.length})
              </TabsTrigger>
              <TabsTrigger value="without_team">
                Sin Equipo ({verificationResult.employees_without_team.length})
              </TabsTrigger>
              <TabsTrigger value="fixes">
                Correcciones Auto ({verificationResult.auto_fixes_available.length})
              </TabsTrigger>
            </TabsList>

            {/* Issues Tab */}
            <TabsContent value="issues">
              <Card>
                <CardHeader>
                  <CardTitle>Empleados con Problemas</CardTitle>
                  <CardDescription>
                    Empleados con inconsistencias en la asignación de equipos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {verificationResult.issues.length === 0 ? (
                    <div className="text-center py-10 text-green-600">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                      <p className="font-semibold">¡Todo correcto!</p>
                      <p className="text-sm text-slate-500 mt-1">No se encontraron problemas de asignación</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {verificationResult.issues.map((issue, idx) => (
                          <div key={idx} className="border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                  {issue.employee_name}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  Código: {issue.employee_code || 'N/A'}
                                </p>
                              </div>
                              <div className="flex gap-2 text-xs">
                                <Badge variant="outline">
                                  Equipo: {issue.current_equipo || 'null'}
                                </Badge>
                                <Badge variant="outline">
                                  Team Key: {issue.current_team_key || 'null'}
                                </Badge>
                                {issue.team_fixed && (
                                  <Badge className="bg-purple-100 text-purple-700">
                                    Equipo Fijo
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {issue.issues.map((prob, probIdx) => {
                                const Icon = getIssueIcon(prob.type);
                                return (
                                  <div key={probIdx} className="flex items-start gap-2">
                                    <Icon className={`w-4 h-4 mt-0.5 ${getIssueColor(prob.type)}`} />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">
                                      {prob.message}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            {issue.suggested_updates && (
                              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-xs font-semibold text-blue-600 mb-1">
                                  Correcciones sugeridas:
                                </p>
                                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                  {Object.entries(issue.suggested_updates).map(([key, value]) => (
                                    <div key={key}>
                                      • {key}: <span className="font-mono bg-white dark:bg-slate-800 px-1 rounded">{value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Without Team Tab */}
            <TabsContent value="without_team">
              <Card>
                <CardHeader>
                  <CardTitle>Empleados Sin Equipo Asignado</CardTitle>
                  <CardDescription>
                    Empleados activos sin team_key ni marcados como equipo fijo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {verificationResult.employees_without_team.length === 0 ? (
                    <div className="text-center py-10 text-green-600">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3" />
                      <p className="font-semibold">Todos asignados</p>
                      <p className="text-sm text-slate-500 mt-1">Todos los empleados tienen equipo asignado o están marcados como fijos</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {verificationResult.employees_without_team.map((emp, idx) => (
                          <div key={idx} className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-100">{emp.name}</p>
                              <p className="text-xs text-slate-500">
                                Turno: {emp.tipo_turno || 'N/A'} | Dept: {emp.departamento || 'N/A'}
                              </p>
                            </div>
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Auto Fixes Tab */}
            <TabsContent value="fixes">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Correcciones Automáticas Disponibles</CardTitle>
                      <CardDescription>
                        Problemas que pueden ser corregidos automáticamente
                      </CardDescription>
                    </div>
                    {verificationResult.auto_fixes_available.length > 0 && (
                      <Button 
                        onClick={() => applyFixesMutation.mutate(verificationResult.auto_fixes_available)}
                        disabled={applyFixesMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        Aplicar Todas
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {verificationResult.auto_fixes_available.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-semibold">No hay correcciones automáticas disponibles</p>
                      <p className="text-sm mt-1">Los problemas detectados requieren revisión manual</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {verificationResult.auto_fixes_available.map((fix, idx) => (
                          <div key={idx} className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-900/20">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {fix.employee_name}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => applyFixesMutation.mutate([fix])}
                                disabled={applyFixesMutation.isPending}
                                className="h-7 text-xs"
                              >
                                <Wrench className="w-3 h-3 mr-1" />
                                Aplicar
                              </Button>
                            </div>
                            <div className="space-y-1 text-xs">
                              {Object.entries(fix.updates).map(([key, value]) => (
                                <div key={key} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  <span className="font-medium">{key}:</span>
                                  <span className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                    {value === null ? 'null' : value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Initial State */}
      {!verificationResult && !verifying && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-16 h-16 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              Verificación de Equipos
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
              Ejecuta una verificación completa de las asignaciones de equipos para detectar inconsistencias 
              entre los campos equipo, team_id, team_key y team_fixed en todos los empleados.
            </p>
            <Button 
              onClick={() => verifyMutation.mutate()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Iniciar Verificación
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}