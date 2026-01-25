import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Factory, Eye, AlertTriangle, Users, Save, CheckCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProductionPlanningTab({ selectedDate, selectedTeam, selectedShift }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: plannings = [] } = useQuery({
    queryKey: ['machinePlannings', selectedDate, selectedTeam],
    queryFn: () => base44.entities.MachinePlanning.filter({ 
      fecha_planificacion: selectedDate, 
      team_key: selectedTeam 
    }),
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 2000);
      
      // Deduplicate machines by ID immediately after fetching
      const uniqueMachines = new Map();
      
      data.forEach(m => {
        if (!uniqueMachines.has(m.id)) {
          uniqueMachines.set(m.id, {
            id: m.id,
            nombre: m.nombre,
            codigo: m.codigo_maquina,
            descripcion: m.descripcion,
            orden: m.orden_visualizacion || 999
          });
        }
      });

      return Array.from(uniqueMachines.values()).sort((a, b) => a.orden - b.orden);
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 500),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  const [showSummary, setShowSummary] = useState(false);

  // Mutations
  const createPlanningMutation = useMutation({
    mutationFn: (data) => base44.entities.MachinePlanning.create(data),
    onSuccess: (newPlanning) => {
      // Optimistic update: Add to cache without refetching
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (oldData = []) => {
        return [...oldData, newPlanning];
      });
      // Invalidate specific query only to ensure consistency without aggressive refetching
      queryClient.invalidateQueries({ queryKey: ['machinePlannings', selectedDate, selectedTeam] });
      // Removed toast to prevent UI clutter
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: "Error al añadir máquina: " + err.message,
        variant: "destructive"
      });
    }
  });

  const updatePlanningMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MachinePlanning.update(id, data),
    onSuccess: (updatedPlanning) => {
      // Optimistic update: Update item in cache without refetching
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (oldData = []) => {
        return oldData.map(p => p.id === updatedPlanning.id ? updatedPlanning : p);
      });
      // Invalidate specific query only
      queryClient.invalidateQueries({ queryKey: ['machinePlannings', selectedDate, selectedTeam] });
      // Removed toast to prevent UI clutter
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: "Error al actualizar: " + err.message,
        variant: "destructive"
      });
    }
  });

  const deletePlanningMutation = useMutation({
    mutationFn: (id) => base44.entities.MachinePlanning.delete(id),
    onSuccess: (deletedId, variables) => {
      // Optimistic update: Remove from cache without refetching
      const idToDelete = typeof deletedId === 'object' ? deletedId?.id : variables;
      
      queryClient.setQueryData(['machinePlannings', selectedDate, selectedTeam], (oldData = []) => {
        return oldData.filter(p => p.id !== idToDelete && p.id !== variables);
      });
      // Invalidate specific query only
      queryClient.invalidateQueries({ queryKey: ['machinePlannings', selectedDate, selectedTeam] });
      // Removed toast to prevent UI clutter
    },
    onError: (err) => {
      toast({
        title: "Error",
        description: "Error al eliminar: " + err.message,
        variant: "destructive"
      });
    }
  });

  const activeMachines = useMemo(() => {
    // Deduplicate plannings by machine_id to fix multiple selection issue
    const uniquePlannings = [];
    const seenMachineIds = new Set();
    
    // Sort by id descending to keep the latest one if duplicates exist
    const sortedPlannings = [...plannings]
      .filter(p => p.activa_planning && p.team_key === selectedTeam && p.fecha_planificacion === selectedDate)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    for (const p of sortedPlannings) {
      if (!seenMachineIds.has(p.machine_id)) {
        seenMachineIds.add(p.machine_id);
        uniquePlannings.push(p);
      }
    }
    
    return uniquePlannings;
  }, [plannings, selectedTeam, selectedDate]);

  const totalOperators = useMemo(() => {
    return activeMachines.reduce((sum, p) => sum + (Number(p.operadores_necesarios) || 0), 0);
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
      // Find ALL plannings for this machine to clean up potential duplicates in DB
      const planningsToDelete = plannings.filter(
        p => p.machine_id === machine.id && 
             p.team_key === selectedTeam && 
             p.fecha_planificacion === selectedDate
      );
      
      if (planningsToDelete.length > 0) {
        planningsToDelete.forEach(p => {
          deletePlanningMutation.mutate(p.id);
        });
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
                          <div className="flex flex-col">
                            <span>{machine.nombre}</span>
                            {machine.descripcion && machine.descripcion !== machine.nombre && (
                              <span className="text-xs text-slate-500">{machine.descripcion}</span>
                            )}
                          </div>
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

          {/* Botón de Guardar / Validación */}
          <div className="mt-8 flex justify-end border-t pt-6">
            {activeMachines.length > 0 && operatorsDeficit <= 0 ? (
              <Button 
                onClick={() => setShowSummary(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-6 px-8 text-lg rounded-xl shadow-lg transition-all flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4"
              >
                <Save className="w-6 h-6" />
                Guardar Planificación Daily
              </Button>
            ) : (
              <div className="flex flex-col items-end gap-2">
                 {operatorsDeficit > 0 && (
                  <div className="flex items-center text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200 animate-pulse">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Corrige el déficit de {operatorsDeficit} operadores para poder guardar</span>
                  </div>
                 )}
                 <Button disabled className="opacity-50 cursor-not-allowed py-6 px-8 text-lg">
                    <Save className="w-6 h-6 mr-2" />
                    Guardar Planificación Daily
                 </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-green-700">
              <CheckCircle className="w-6 h-6" />
              Resumen de Planificación
            </DialogTitle>
            <DialogDescription>
              Revisa el resumen de la planificación antes de confirmar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500">Fecha</p>
                <p className="font-bold">{selectedDate}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500">Turno</p>
                <p className="font-bold">{selectedShift || 'Sin turno'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500">Total Máquinas</p>
                <p className="font-bold">{activeMachines.length}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-sm text-slate-500">Total Operadores</p>
                <p className="font-bold">{totalOperators}</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-4 py-2 font-semibold text-sm text-slate-700">
                Detalle por Máquina
              </div>
              <div className="divide-y max-h-60 overflow-y-auto">
                {activeMachines.map(planning => (
                  <div key={planning.id} className="flex justify-between items-center px-4 py-2 text-sm">
                    <span className="font-medium">{planning.machine_nombre}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                      {planning.operadores_necesarios} op.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setShowSummary(false)}>
              <X className="w-4 h-4 mr-2" />
              Seguir Editando
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                setShowSummary(false);
                toast({
                  title: "Planificación Confirmada",
                  description: "La planificación ha sido guardada exitosamente.",
                  className: "bg-green-600 text-white border-none"
                });
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
