import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Factory, Eye, AlertTriangle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProductionPlanningTab({ selectedDate, selectedTeam, selectedShift }) {
  const queryClient = useQueryClient();

  const { data: plannings } = useQuery({
    queryKey: ['machinePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.MachinePlanning.list(),
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 500);
      return data.map(m => ({
        id: m.id,
        nombre: m.nombre,
        codigo: m.codigo_maquina,
        orden: m.orden_visualizacion || 999
      })).sort((a, b) => a.orden - b.orden);
    },
    staleTime: 15 * 60 * 1000,
  });

  const { data: processes = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('codigo', 200),
    staleTime: 15 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: 15 * 60 * 1000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 500),
    staleTime: 15 * 60 * 1000,
  });

  const activeMachines = useMemo(() => {
    return plannings.filter(
      p => p.activa_planning && 
      p.team_key === selectedTeam && 
      p.fecha_planificacion === selectedDate
    );
  }, [plannings, selectedTeam, selectedDate]);

  const totalOperators = useMemo(() => {
    return activeMachines.reduce((sum, p) => sum + (p.operadores_necesarios || 0), 0);
  }, [activeMachines]);

  const availableOperators = useMemo(() => {
    const teamName = teams.find(t => t.team_key === selectedTeam)?.team_name;
    if (!teamName) return 0;

    return employees.filter(emp => 
      emp.equipo === teamName && 
      emp.disponibilidad === "Disponible" &&
      emp.incluir_en_planning !== false
    ).length;
  }, [employees, selectedTeam, teams]);

  const operatorsDeficit = totalOperators - availableOperators;

  const getProcessName = (processId) => {
    const process = processes.find(p => p.id === processId);
    return process?.nombre || "Sin proceso";
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader className="border-b border-blue-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Factory className="w-6 h-6" />
              Planificación de Producción - {selectedShift || 'Sin turno'}
            </CardTitle>
            <Link to={createPageUrl("MachinePlanning")}>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Eye className="w-4 h-4 mr-2" />
                Planificación de Máquinas
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Resumen de Operadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Máquinas Activas</p>
                    <p className="text-2xl font-bold text-blue-900">{activeMachines.length}</p>
                  </div>
                  <Factory className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-orange-700 font-medium">Operadores Necesarios</p>
                    <p className="text-2xl font-bold text-orange-900">{totalOperators}</p>
                  </div>
                  <Users className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-gradient-to-br ${
              operatorsDeficit > 0 
                ? 'from-red-50 to-red-100 border-red-300' 
                : 'from-green-50 to-green-100 border-green-200'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${
                      operatorsDeficit > 0 ? 'text-red-700' : 'text-green-700'
                    }`}>
                      Operadores Disponibles
                    </p>
                    <p className={`text-2xl font-bold ${
                      operatorsDeficit > 0 ? 'text-red-900' : 'text-green-900'
                    }`}>
                      {availableOperators}
                    </p>
                  </div>
                  {operatorsDeficit > 0 ? (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  ) : (
                    <Users className="w-8 h-8 text-green-600" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerta de déficit */}
          {operatorsDeficit > 0 && (
            <Card className="mb-6 bg-red-50 border-2 border-red-300">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900 mb-1">
                      ⚠️ Déficit de Operadores: Faltan {operatorsDeficit} operador{operatorsDeficit !== 1 ? 'es' : ''}
                    </p>
                    <p className="text-sm text-red-800">
                      Ve a "Planificación de Máquinas" para ajustar las máquinas activas.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Máquinas Activas */}
          {activeMachines.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Factory className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No hay máquinas planificadas para esta fecha</p>
              <p className="text-sm mt-2">Haz clic en "Planificación de Máquinas" para configurar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeMachines.map((planning) => {
                const machine = machines.find(m => m.id === planning.machine_id);
                return (
                  <Card key={planning.id} className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{machine?.nombre}</h3>
                          <p className="text-xs text-slate-600 mt-1">{machine?.codigo}</p>
                          <div className="mt-3 space-y-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              {getProcessName(planning.process_id)}
                            </Badge>
                            <div className="flex items-center gap-1 mt-2">
                              <Users className="w-3 h-3 text-purple-600" />
                              <span className="text-sm font-semibold text-purple-900">
                                {planning.operadores_necesarios} operadores
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}