import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UsersRound, Filter } from "lucide-react";
import { toast } from "sonner";

export default function TeamCompositionConfig() {
  const [selectedDept, setSelectedDept] = useState("all");
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
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

  // Deduplicate puestos if showing all
  const uniquePuestosToShow = selectedDept === "all" 
    ? [...new Set(puestosToShow)].sort()
    : puestosToShow;

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ employeeId, equipo }) => {
      return base44.entities.EmployeeMasterDatabase.update(employeeId, { equipo });
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

    // If all are in teamName, remove them. Otherwise add them.
    // Logic from TeamPositionConfig seems to be toggle individual, but here we batch.
    // Let's refine: if we click a team button for a position, we probably want to assign all unassigned to that team, 
    // or toggle them?
    // The original logic was:
    // const newEquipo = currentEquipo === teamName ? "" : teamName;
    // This toggles. If mixed, it might behave weirdly (some join, some leave).
    // Better logic: If any are NOT in teamName, move them to teamName. If ALL are in teamName, remove them.
    
    const allInTeam = employeesInPuesto.every(e => e.equipo === teamName);
    const targetTeam = allInTeam ? "" : teamName;

    const promises = employeesInPuesto.map(emp => {
      // Only update if different
      if (emp.equipo !== targetTeam) {
        return updateEmployeeMutation.mutateAsync({ employeeId: emp.id, equipo: targetTeam });
      }
      return Promise.resolve();
    });

    Promise.all(promises).then(() => {
      toast.success(`Actualizado: ${employeesInPuesto.length} empleados a ${targetTeam || "Sin equipo"}`);
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
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Asignación de Equipos por Puesto</CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {uniquePuestosToShow.map(puesto => {
            const status = getPuestoTeamStatus(puesto);
            
            return (
              <Card key={puesto} className="bg-slate-50/50">
                <CardHeader className="pb-3 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <CardTitle className="text-sm font-medium">{puesto}</CardTitle>
                    <Badge variant="secondary">{status.total}</Badge>
                  </div>
                  <div className="text-xs text-slate-500">
                     {status.sinEquipo > 0 ? (
                       <span className="text-orange-600 font-medium">{status.sinEquipo} sin asignar</span>
                     ) : (
                       <span className="text-green-600">Todos asignados</span>
                     )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex flex-col gap-2">
                    {teams.map(team => {
                      const count = status.teamCounts[team.team_key] || 0;
                      const isFull = count === status.total && status.total > 0;
                      const hasSome = count > 0;
                      
                      return (
                        <Button
                          key={team.team_key}
                          variant={hasSome ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleTeam(puesto, team.team_key)}
                          className={`justify-between w-full ${
                             hasSome ? "" : "hover:border-slate-400"
                          } ${
                             hasSome && !isFull ? "opacity-90" : "" 
                          }`}
                          style={hasSome ? { backgroundColor: team.color, borderColor: team.color } : {}}
                        >
                          <div className="flex items-center">
                            <UsersRound className="w-3 h-3 mr-2" />
                            {team.team_name}
                          </div>
                          {count > 0 && (
                            <Badge variant="secondary" className="ml-2 bg-white/20 text-white hover:bg-white/30 border-0">
                              {count}
                            </Badge>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {uniquePuestosToShow.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No hay puestos para mostrar con el filtro seleccionado
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
