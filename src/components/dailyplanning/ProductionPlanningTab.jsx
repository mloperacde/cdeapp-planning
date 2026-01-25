import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Factory, Eye, AlertTriangle, Users, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function ProductionPlanningTab({ selectedDate, selectedTeam, selectedShift }) {
  const queryClient = useQueryClient();

  const { data: plannings = [] } = useQuery({
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

  // Mutations
  const createPlanningMutation = useMutation({
    mutationFn: (data) => base44.entities.MachinePlanning.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['machinePlannings']);
      toast.success("Máquina añadida a la planificación");
    },
    onError: (err) => {
      toast.error("Error al añadir máquina: " + err.message);
    }
  });

  const updatePlanningMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MachinePlanning.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['machinePlannings']);
      toast.success("Planificación actualizada");
    },
    onError: (err) => {
      toast.error("Error al actualizar: " + err.message);
    }
  });

  const deletePlanningMutation = useMutation({
    mutationFn: (id) => base44.entities.MachinePlanning.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['machinePlannings']);
      toast.success("Máquina eliminada de la planificación");
    },
    onError: (err) => {
      toast.error("Error al eliminar: " + err.message);
    }
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

  // Handlers
  const handleToggleMachine = (machine, isChecked) => {
    if (isChecked) {
      // Create new planning
      createPlanningMutation.mutate({
        machine_id: machine.id,
        machine_nombre: machine.nombre,
        machine_codigo: machine.codigo,
        fecha_planificacion: selectedDate,
        team_key: selectedTeam,
        operadores_necesarios: 1, // Default to 1
        process_id: null, // Bypassing process selection as requested
        activa_planning: true,
        turno: selectedShift
      });
    } else {
      // Find and delete planning
      const planning = activeMachines.find(p => p.machine_id === machine.id);
      if (planning) {
        deletePlanningMutation.mutate(planning.id);
      }
    }
  };

  const handleOperatorsChange = (planningId, newValue) => {
    const val = parseInt(newValue);
    if (isNaN(val) || val < 1) return;

    updatePlanningMutation.mutate({
      id: planningId,
      data: { operadores_necesarios: val }
    });
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
            {/* Link removed temporarily as per user request to inline the config */}
            {/* <Link to={createPageUrl("MachinePlanning")}>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Eye className="w-4 h-4 mr-2" />
                Planificación de Máquinas
              </Button>
            </Link> */}
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
                      Ajusta la planificación abajo para equilibrar la carga.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nueva Tabla de Configuración de Máquinas */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Factory className="w-5 h-5 text-blue-600" />
              Configuración de Máquinas (Modo Temporal Manual)
            </h3>
            <div className="border rounded-lg overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-[100px] text-center">Planificar</TableHead>
                    <TableHead>Máquina</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="w-[200px]">Operadores Necesarios</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.map((machine) => {
                    const planning = activeMachines.find(p => p.machine_id === machine.id);
                    const isPlanned = !!planning;
                    
                    return (
                      <TableRow key={machine.id} className={isPlanned ? "bg-blue-50/50" : ""}>
                        <TableCell className="text-center">
                          <Switch
                            checked={isPlanned}
                            onCheckedChange={(checked) => handleToggleMachine(machine, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">
                          {machine.nombre}
                        </TableCell>
                        <TableCell className="text-slate-500 font-mono text-xs">
                          {machine.codigo}
                        </TableCell>
                        <TableCell>
                          {isPlanned ? (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <Input
                                type="number"
                                min="1"
                                className="w-24 h-8"
                                defaultValue={planning.operadores_necesarios || 1}
                                onBlur={(e) => handleOperatorsChange(planning.id, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleOperatorsChange(planning.id, e.currentTarget.value);
                                    e.currentTarget.blur();
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm italic">No planificada</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
