import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, User, Settings, ArrowRightLeft, Building2, Briefcase, ChevronDown, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function TeamCompositionConfig() {
  const [selectedDept, setSelectedDept] = useState("all");
  const [selectedTeamKey, setSelectedTeamKey] = useState("team_1");
  const [expandedDepts, setExpandedDepts] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => base44.entities.Department.list(),
  });

  const { data: positions = [] } = useQuery({
    queryKey: ['positions'],
    queryFn: () => base44.entities.Position.list(),
  });

  const selectedTeam = teams.find(t => t.team_key === selectedTeamKey);
  
  const teamEmployees = useMemo(() => 
    employees.filter(e => e.team_key === selectedTeamKey && e.estado_empleado === 'Alta'),
  [employees, selectedTeamKey]);

  // Agrupar empleados del equipo por departamento y puesto
  const employeesByStructure = useMemo(() => {
    const result = {};
    
    teamEmployees.forEach(emp => {
      const deptName = (emp.departamento || "SIN DEPARTAMENTO").trim().toUpperCase();
      const posName = (emp.puesto || "SIN PUESTO").trim().toUpperCase();
      
      if (!result[deptName]) {
        result[deptName] = {};
      }
      if (!result[deptName][posName]) {
        result[deptName][posName] = [];
      }
      result[deptName][posName].push(emp);
    });
    
    return result;
  }, [teamEmployees]);

  // Calcular vacantes
  const vacanciesByDept = useMemo(() => {
    const result = [];
    
    departments.forEach(dept => {
      const deptPositions = positions.filter(p => p.department_id === dept.id);
      const normalizedDeptName = (dept.name || "").trim().toUpperCase();
      
      const deptEmps = teamEmployees.filter(e => 
        (e.departamento || "").trim().toUpperCase() === normalizedDeptName
      );
      
      const vacancies = [];
      
      deptPositions.forEach(pos => {
        const assignedCount = deptEmps.filter(e => {
          const empPuesto = (e.puesto || "").trim().toUpperCase();
          const posName = (pos.name || "").trim().toUpperCase();
          return empPuesto === posName;
        }).length;
        
        const vacantSlots = (pos.max_headcount || 1) - assignedCount;
        
        if (vacantSlots > 0) {
          vacancies.push({
            position: pos.name,
            vacantSlots,
            maxHeadcount: pos.max_headcount || 1,
            assignedCount,
            orden: pos.orden || 0
          });
        }
      });
      
      if (vacancies.length > 0) {
        result.push({
          department: dept.name,
          departmentId: dept.id,
          color: dept.color,
          orden: dept.orden || 0,
          vacancies: vacancies.sort((a, b) => a.orden - b.orden)
        });
      }
    });
    
    return result.sort((a, b) => a.orden - b.orden);
  }, [departments, positions, teamEmployees]);

  const toggleDept = (deptName) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(deptName)) {
      newSet.delete(deptName);
    } else {
      newSet.add(deptName);
    }
    setExpandedDepts(newSet);
  };

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ employeeId, equipo, team_id, team_key }) => {
      return base44.entities.EmployeeMasterDatabase.update(employeeId, { 
        equipo,
        team_id: team_id || null,
        team_key: team_key || null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Equipo actualizado correctamente");
    },
    onError: (err) => {
        toast.error("Error al actualizar equipo: " + err.message);
    }
  });

  const handleTeamChange = (employeeId, newTeamName) => {
    const teamValue = newTeamName === "Sin Equipo" ? "" : newTeamName;
    const teamObj = teams.find(t => t.team_name === teamValue);
    
    updateEmployeeMutation.mutate({ 
      employeeId, 
      equipo: teamValue,
      team_id: teamObj ? teamObj.id : null,
      team_key: teamObj ? teamObj.team_key : null
    });
  };

  const toggleDept = (deptName) => {
    const newSet = new Set(expandedDepts);
    if (newSet.has(deptName)) {
      newSet.delete(deptName);
    } else {
      newSet.add(deptName);
    }
    setExpandedDepts(newSet);
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Composición de Equipo</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <Select value={selectedTeamKey} onValueChange={setSelectedTeamKey}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.team_key}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }}></div>
                          {team.team_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary" className="font-semibold">
                {teamEmployees.length} empleados
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {Object.keys(employeesByStructure).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(employeesByStructure)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([deptName, positions]) => {
                    const isExpanded = expandedDepts.has(deptName);
                    const deptEmployees = Object.values(positions).flat();
                    const dept = departments.find(d => 
                      (d.name || "").trim().toUpperCase() === deptName
                    );
                    
                    return (
                      <div key={deptName} className="border rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => toggleDept(deptName)}
                          className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            {dept?.color && (
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: dept.color }}></div>
                            )}
                            <Building2 className="w-5 h-5 text-slate-500" />
                            <span className="font-semibold text-slate-900">{deptName}</span>
                            <Badge variant="secondary" className="ml-2">
                              {deptEmployees.length}
                            </Badge>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        
                        {isExpanded && (
                          <div className="border-t">
                            {Object.entries(positions)
                              .sort(([a], [b]) => a.localeCompare(b))
                              .map(([posName, emps]) => (
                                <div key={posName} className="bg-slate-50">
                                  <div className="px-4 py-2 bg-slate-100 flex items-center gap-2 border-b">
                                    <Briefcase className="w-4 h-4 text-slate-400" />
                                    <span className="text-sm font-medium text-slate-700">{posName}</span>
                                    <Badge variant="outline" className="ml-auto text-xs">
                                      {emps.length}
                                    </Badge>
                                  </div>
                                  <div className="divide-y">
                                    {emps.map(emp => (
                                      <div
                                        key={emp.id}
                                        className="p-3 flex items-center justify-between hover:bg-white transition-colors group"
                                      >
                                        <div className="flex items-center gap-3 flex-1">
                                          <div className="p-2 rounded-full" style={{ backgroundColor: `${selectedTeam?.color}20` }}>
                                            <User className="w-4 h-4" style={{ color: selectedTeam?.color }} />
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                              <span className="font-medium text-sm text-slate-900">{emp.nombre}</span>
                                              <Badge variant="outline" className="text-xs">{emp.codigo_empleado}</Badge>
                                            </div>
                                            {emp.tipo_turno && (
                                              <div className="text-xs text-slate-500 mt-0.5">
                                                {emp.tipo_turno}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <Select 
                                          value={selectedTeamKey} 
                                          onValueChange={(val) => handleTeamChange(emp.id, teams.find(t => t.team_key === val)?.team_name || "Sin Equipo")}
                                        >
                                          <SelectTrigger className="w-[24px] h-[24px] p-0 border-0 shadow-none opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRightLeft className="w-4 h-4 text-slate-400 hover:text-slate-600" /> 
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="Sin Equipo">Sin Equipo</SelectItem>
                                            {teams.map(t => (
                                              <SelectItem key={t.id} value={t.team_key}>{t.team_name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay empleados asignados a este equipo</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Puestos Vacantes */}
      {vacanciesByDept.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-lg">Puestos Vacantes en {selectedTeam?.team_name}</CardTitle>
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                {vacanciesByDept.reduce((sum, d) => sum + d.vacancies.length, 0)} vacantes
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {vacanciesByDept.map(dept => (
                  <div key={dept.departmentId} className="border rounded-lg overflow-hidden bg-slate-50">
                    <div className="px-3 py-2 bg-white border-b flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: dept.color }}></div>
                      <span className="font-semibold text-sm text-slate-900">{dept.department}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {dept.vacancies.length} vacantes
                      </Badge>
                    </div>
                    <div className="p-2 space-y-1">
                      {dept.vacancies.map((vac, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-white p-2 rounded border">
                          <span className="font-medium text-slate-700">{vac.position}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">
                              {vac.assignedCount}/{vac.maxHeadcount}
                            </span>
                            <Badge variant="destructive" className="bg-amber-500 hover:bg-amber-600 text-xs">
                              {vac.vacantSlots} vacante{vac.vacantSlots > 1 ? 's' : ''}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}