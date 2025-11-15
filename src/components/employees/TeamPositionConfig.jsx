import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Settings, Save, UsersRound } from "lucide-react";
import { toast } from "sonner";

export default function TeamPositionConfig({ onClose }) {
  const [selectedDept, setSelectedDept] = useState("all");
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const puestosByDept = useMemo(() => {
    const byDept = {};
    employees.forEach(emp => {
      const dept = emp.departamento || "Sin Departamento";
      if (!byDept[dept]) {
        byDept[dept] = new Set();
      }
      if (emp.puesto) byDept[dept].add(emp.puesto);
    });
    
    const result = {};
    Object.keys(byDept).forEach(dept => {
      result[dept] = Array.from(byDept[dept]).sort();
    });
    return result;
  }, [employees]);

  const puestosToShow = selectedDept === "all" 
    ? Object.values(puestosByDept).flat()
    : puestosByDept[selectedDept] || [];

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ employeeId, equipo }) => {
      return base44.entities.Employee.update(employeeId, { equipo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    }
  });

  const handleToggleTeam = (puesto, teamName) => {
    const employeesInPuesto = employees.filter(e => 
      e.puesto === puesto && 
      (selectedDept === "all" || e.departamento === selectedDept)
    );

    const promises = employeesInPuesto.map(emp => {
      const currentEquipo = emp.equipo;
      const newEquipo = currentEquipo === teamName ? "" : teamName;
      return updateEmployeeMutation.mutateAsync({ employeeId: emp.id, equipo: newEquipo });
    });

    Promise.all(promises).then(() => {
      toast.success(`Actualizado para ${employeesInPuesto.length} empleado(s)`);
    });
  };

  const getPuestoTeamStatus = (puesto) => {
    const employeesInPuesto = employees.filter(e => 
      e.puesto === puesto &&
      (selectedDept === "all" || e.departamento === selectedDept)
    );

    const teamCounts = {};
    teams.forEach(team => {
      teamCounts[team.team_name] = employeesInPuesto.filter(e => e.equipo === team.team_name).length;
    });
    const sinEquipo = employeesInPuesto.filter(e => !e.equipo).length;

    return { total: employeesInPuesto.length, teamCounts, sinEquipo };
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Configuración de Puestos por Equipo
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-900">
                <strong>ℹ️ Información:</strong> Asigna qué puestos de trabajo pertenecen a cada equipo de turno rotativo. 
                Los empleados en puestos sin equipo no aparecerán en las rotaciones automáticas.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label>Filtrar por Departamento</Label>
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Departamentos</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {puestosToShow.map(puesto => {
              const status = getPuestoTeamStatus(puesto);
              
              return (
                <Card key={puesto}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{puesto}</CardTitle>
                      <Badge variant="outline">{status.total} empleados</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {teams.map(team => (
                        <Button
                          key={team.team_key}
                          variant={status.teamCounts[team.team_name] > 0 ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleTeam(puesto, team.team_name)}
                          className={status.teamCounts[team.team_name] > 0 ? "" : ""}
                        >
                          <UsersRound className="w-4 h-4 mr-2" />
                          {team.team_name}
                          {status.teamCounts[team.team_name] > 0 && (
                            <Badge className="ml-2 bg-white text-slate-900">
                              {status.teamCounts[team.team_name]}
                            </Badge>
                          )}
                        </Button>
                      ))}
                      {status.sinEquipo > 0 && (
                        <Badge variant="outline" className="flex items-center justify-center">
                          Sin equipo: {status.sinEquipo}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}