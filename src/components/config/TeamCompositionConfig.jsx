import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, User, Settings } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  // Structure: { deptName: { teamName: { puesto: [employees] } } }
  const deptData = useMemo(() => {
    const data = {}; 
    
    // Initialize structure
    departments.forEach(dept => {
        data[dept] = { "Sin Equipo": {} };
        teams.forEach(t => {
            data[dept][t.team_name] = {};
        });
    });

    employees.forEach(emp => {
        const dept = emp.departamento || "Sin Departamento";
        const team = emp.equipo || "Sin Equipo";
        const puesto = emp.puesto || "Sin Puesto";

        // Handle case where dept might not be in initial list (e.g. "Sin Departamento")
        if (!data[dept]) {
             data[dept] = { "Sin Equipo": {} };
             teams.forEach(t => data[dept][t.team_name] = {});
        }
        
        // Handle case where team name might not be in teams list
        if (!data[dept][team]) data[dept][team] = {}; 
        
        if (!data[dept][team][puesto]) data[dept][team][puesto] = [];
        data[dept][team][puesto].push(emp);
    });

    return data;
  }, [employees, teams, departments]);

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ employeeId, equipo }) => {
      return base44.entities.EmployeeMasterDatabase.update(employeeId, { equipo });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Equipo actualizado correctamente");
    },
    onError: (err) => {
        toast.error("Error al actualizar equipo: " + err.message);
    }
  });

  const handleTeamChange = (employeeId, newTeam) => {
    const teamValue = newTeam === "Sin Equipo" ? "" : newTeam;
    updateEmployeeMutation.mutate({ employeeId, equipo: teamValue });
  };

  const filteredDepartments = selectedDept === "all" ? departments : [selectedDept];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Composición de Equipos por Departamento</CardTitle>
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
      <CardContent className="space-y-8">
        {filteredDepartments.map(dept => {
            const teamGroups = deptData[dept];
            if (!teamGroups) return null;

            return (
                <div key={dept} className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">{dept}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Render Team Columns */}
                        {teams.map(team => (
                            <TeamColumn 
                                key={team.id}
                                teamName={team.team_name}
                                color={team.color}
                                groups={teamGroups[team.team_name] || {}}
                                allTeams={teams}
                                onMove={handleTeamChange}
                            />
                        ))}
                        {/* Render Unassigned Column */}
                        <TeamColumn 
                            teamName="Sin Equipo"
                            color="slate"
                            groups={teamGroups["Sin Equipo"] || {}}
                            allTeams={teams}
                            onMove={handleTeamChange}
                            isUnassigned
                        />
                    </div>
                </div>
            );
        })}
      </CardContent>
    </Card>
  );
}

function TeamColumn({ teamName, color, groups, allTeams, onMove, isUnassigned }) {
    const totalEmployees = Object.values(groups).reduce((acc, curr) => acc + curr.length, 0);
    const borderColor = isUnassigned ? "border-slate-200" : `border-${color}-200`;
    const bgColor = isUnassigned ? "bg-slate-50" : `bg-${color}-50`;
    const headerColor = isUnassigned ? "text-slate-700" : `text-${color}-800`;

    return (
        <div className={`rounded-lg border ${borderColor} flex flex-col h-full`}>
            <div className={`p-3 ${bgColor} border-b ${borderColor} flex justify-between items-center`}>
                <h4 className={`font-semibold ${headerColor}`}>{teamName}</h4>
                <Badge variant={isUnassigned ? "secondary" : "default"} className={isUnassigned ? "" : `bg-${color}-600`}>
                    {totalEmployees}
                </Badge>
            </div>
            <ScrollArea className="flex-1 p-3 h-[400px]">
                {Object.entries(groups).length === 0 ? (
                    <p className="text-sm text-slate-400 text-center italic py-4">Sin miembros</p>
                ) : (
                    <div className="space-y-4">
                        {Object.entries(groups).sort().map(([puesto, employees]) => (
                            <div key={puesto}>
                                <p className="text-xs font-medium text-slate-500 mb-1 uppercase tracking-wider">{puesto}</p>
                                <div className="space-y-1">
                                    {employees.sort((a,b) => a.nombre.localeCompare(b.nombre)).map(emp => (
                                        <div key={emp.id} className="flex items-center justify-between bg-white p-2 rounded shadow-sm border border-slate-100 group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                <span className="text-sm truncate" title={emp.nombre}>{emp.nombre}</span>
                                            </div>
                                            
                                            <Select 
                                                value={isUnassigned ? "Sin Equipo" : teamName} 
                                                onValueChange={(val) => onMove(emp.id, val)}
                                            >
                                                <SelectTrigger className="w-[24px] h-[24px] p-0 border-0 shadow-none opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {/* Hidden trigger, just clickable area or icon? 
                                                        Better: small icon button that opens dropdown
                                                    */}
                                                    <Settings className="w-3 h-3 text-slate-400" /> 
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Sin Equipo">Sin Equipo</SelectItem>
                                                    {allTeams.map(t => (
                                                        <SelectItem key={t.id} value={t.team_name}>{t.team_name}</SelectItem>
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
            </ScrollArea>
        </div>
    );
}
