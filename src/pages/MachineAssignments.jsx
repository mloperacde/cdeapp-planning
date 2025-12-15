import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCog, Save, UserCheck, User, Users, Factory, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import EmployeeSelect from "../components/common/EmployeeSelect";

const EMPTY_ARRAY = [];

export default function MachineAssignmentsPage() {
  const [currentTeam, setCurrentTeam] = useState("");
  const [assignments, setAssignments] = useState({});
  const queryClient = useQueryClient();

  // Data Queries
  const { data: machines = EMPTY_ARRAY, isLoading: loadingMachines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
  });

  const { data: employees = EMPTY_ARRAY, isLoading: loadingEmployees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: machineAssignments = EMPTY_ARRAY } = useQuery({
    queryKey: ['machineAssignments'],
    queryFn: () => base44.entities.MachineAssignment.list(),
  });

  const { data: teams = EMPTY_ARRAY } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Initial Team Selection based on logged user
  useEffect(() => {
    if (teams.length > 0 && !currentTeam) {
        if (currentUser && employees.length > 0) {
            const currentEmp = employees.find(e => e.email === currentUser.email);
            if (currentEmp?.equipo) {
                const team = teams.find(t => t.team_name === currentEmp.equipo);
                if (team) {
                    setCurrentTeam(team.team_key);
                    return;
                }
            }
        }
        // Fallback to first team
        if (teams[0]) setCurrentTeam(teams[0].team_key);
    }
  }, [teams, currentUser, employees, currentTeam]);

  // Initialize assignments from DB when team or machineAssignments change
  useEffect(() => {
    if (machines.length === 0 || !currentTeam) return;

    const loadedAssignments = {};
    machines.forEach(machine => {
      const existing = machineAssignments.find(
        a => a.machine_id === machine.id && a.team_key === currentTeam
      );

      if (existing) {
        loadedAssignments[machine.id] = {
          responsable_linea: existing.responsable_linea?.[0] || null,
          segunda_linea: existing.segunda_linea?.[0] || null,
          operador_1: existing.operador_1 || null,
          operador_2: existing.operador_2 || null,
          operador_3: existing.operador_3 || null,
          operador_4: existing.operador_4 || null,
          operador_5: existing.operador_5 || null,
        };
      } else {
        loadedAssignments[machine.id] = {
          responsable_linea: null,
          segunda_linea: null,
          operador_1: null,
          operador_2: null,
          operador_3: null,
          operador_4: null,
          operador_5: null,
        };
      }
    });

    setAssignments(loadedAssignments);
  }, [machines, machineAssignments, currentTeam]);

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async ({ machineId, data }) => {
      // Prepare data for saving
      const payload = {
          machine_id: machineId,
          team_key: currentTeam,
          responsable_linea: data.responsable_linea ? [data.responsable_linea] : [],
          segunda_linea: data.segunda_linea ? [data.segunda_linea] : [],
          operador_1: data.operador_1,
          operador_2: data.operador_2,
          operador_3: data.operador_3,
          operador_4: data.operador_4,
          operador_5: data.operador_5,
      };

      const existing = machineAssignments.find(
        a => a.machine_id === machineId && a.team_key === currentTeam
      );

      if (existing) {
        return base44.entities.MachineAssignment.update(existing.id, payload);
      } else {
        return base44.entities.MachineAssignment.create(payload);
      }
    },
    onSuccess: () => {
      toast.success("Asignaciones guardadas exitosamente");
      queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
    },
    onError: () => {
      toast.error("Error al guardar asignaciones");
    }
  });

  // Helper Functions for Experience
  const checkMachineMastery = (employee, machineId) => {
    return employee.maquina_1 === machineId;
  };

  const checkMachineExperience = (employee, machineId) => {
    for (let i = 1; i <= 10; i++) {
        if (employee[`maquina_${i}`] === machineId) return true;
    }
    return false;
  };

  // Filter Logic
  const getAvailableEmployees = (machineId, role, currentAssignment) => {
    if (!currentTeam) return [];
    
    const teamName = teams.find(t => t.team_key === currentTeam)?.team_name;
    
    return employees.filter(emp => {
        // Basic conditions
        if (emp.departamento !== "FABRICACION") return false;
        if (emp.disponibilidad !== "Disponible") return false;
        
        // Team condition
        if (emp.equipo !== teamName) return false;

        // Role condition
        const puesto = (emp.puesto || '').toUpperCase();
        if (role === 'RESPONSABLE') {
            if (puesto !== 'RESPONSABLE DE LÍNEA') return false;
            if (!checkMachineMastery(emp, machineId)) return false;
        } else if (role === 'SEGUNDA') {
            if (puesto !== '2ª DE LÍNEA') return false;
            if (!checkMachineExperience(emp, machineId)) return false;
        } else if (role === 'OPERARIO') {
            if (puesto !== 'OPERARIO DE LINEA' && puesto !== 'OPERARIA DE LINEA') return false;
            if (!checkMachineExperience(emp, machineId)) return false;
        }

        // Exclusion logic (prevent duplicate assignment in same machine)
        if (currentAssignment) {
            const assignedIds = [
                currentAssignment.responsable_linea,
                currentAssignment.segunda_linea,
                currentAssignment.operador_1,
                currentAssignment.operador_2,
                currentAssignment.operador_3,
                currentAssignment.operador_4,
                currentAssignment.operador_5
            ].filter(Boolean);

            // Exclude if assigned elsewhere in this machine (unless it's the current slot being edited, handled by Select component usually, but here we provide list)
            // Ideally we filter out those assigned to OTHER slots
            // But for dropdown list, we just filter out those assigned to *other* roles. 
            // The currently selected value for *this* role should effectively be in the list? 
            // EmployeeSelect handles "value" so even if not in list it might show if we implemented it that way, but better include it.
            
            // Actually, we should filter out anyone assigned to a DIFFERENT slot.
            // But we don't know "which slot" calls this function easily without passing it.
            // Let's pass the "currentSlot" ID/Name if needed.
            // Simpler: Just filter out everyone assigned to ANY slot in this machine, EXCEPT the current user if they are assigned to THIS slot?
            // No, complex. Let's just return all candidates, and let the user handle conflicts? 
            // The prompt says: "Exclusión: El empleado seleccionado como Responsable... NO debe aparecer en este desplegable."
            
            // To do this strict exclusion:
            if (role === 'SEGUNDA') {
                if (emp.id === currentAssignment.responsable_linea) return false;
            }
            if (role === 'OPERARIO') {
                if (emp.id === currentAssignment.responsable_linea) return false;
                if (emp.id === currentAssignment.segunda_linea) return false;
                // Also exclude other operators? 
                // "Exclusión: Los empleados ya seleccionados... en cualquier otro slot de Operario... NO deben aparecer"
                const opIds = [
                    currentAssignment.operador_1, 
                    currentAssignment.operador_2, 
                    currentAssignment.operador_3, 
                    currentAssignment.operador_4, 
                    currentAssignment.operador_5
                ];
                if (opIds.includes(emp.id)) return false; 
                // Note: This logic prevents "swapping" easily without unselecting first. That's acceptable.
            }
        }

        return true;
    });
  };

  // Handlers
  const handleAssignmentChange = (machineId, field, value) => {
    setAssignments(prev => ({
      ...prev,
      [machineId]: {
        ...prev[machineId],
        [field]: value
      }
    }));
  };

  const handleSaveMachine = (machineId) => {
    saveMutation.mutate({ machineId, data: assignments[machineId] });
  };

  if (loadingMachines || loadingEmployees) {
    return <div className="p-8 text-center text-slate-500">Cargando datos...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserCog className="w-8 h-8 text-blue-600" />
              Asignación de Equipos Ideales
            </h1>
            <p className="text-slate-500">Configura el personal óptimo para cada máquina por turno.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border">
            <Label className="whitespace-nowrap font-medium px-2">Equipo de Trabajo:</Label>
            <Select value={currentTeam} onValueChange={setCurrentTeam}>
                <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Seleccionar equipo" />
                </SelectTrigger>
                <SelectContent>
                    {teams.map(t => (
                        <SelectItem key={t.team_key} value={t.team_key}>{t.team_name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid gap-6">
        {machines.map(machine => {
            const assignment = assignments[machine.id] || {};
            
            // Get candidates
            const responsables = getAvailableEmployees(machine.id, 'RESPONSABLE', assignment);
            const segundas = getAvailableEmployees(machine.id, 'SEGUNDA', assignment);
            // For operators, we need to handle the "self-exclusion" logic carefully.
            // If I am editing Operator 1, I shouldn't be excluded because I am in Operator 1 slot.
            // My helper function filters out ALL operators.
            // So I need a specific filter for each slot? 
            // Let's rely on the Select component to show the "current value" even if filtered out?
            // EmployeeSelect shows "selectedEmployee" if found in full list.
            // But the dropdown list will filter them out.
            // To fix "swapping" issue: The filter above excludes ALL operators. 
            // If I am assigned to Op 1, I won't appear in Op 2 list. Correct.
            // If I am assigned to Op 1, do I appear in Op 1 list?
            // The helper `getAvailableEmployees` excludes `currentAssignment.operador_1`.
            // So if I am Op 1, I am excluded. 
            // So I won't see myself in the dropdown for Op 1.
            // This is annoying. 
            // Fix: Pass the current slot being edited to `getAvailableEmployees` to NOT exclude it.
            
            const getOps = (excludeSlot) => {
                 const teamName = teams.find(t => t.team_key === currentTeam)?.team_name;
                 return employees.filter(emp => {
                    if (emp.departamento !== "FABRICACION") return false;
                    if (emp.disponibilidad !== "Disponible") return false;
                    if (emp.equipo !== teamName) return false;
                    const puesto = (emp.puesto || '').toUpperCase();
                    if (puesto !== 'OPERARIO DE LINEA' && puesto !== 'OPERARIA DE LINEA') return false;
                    if (!checkMachineExperience(emp, machine.id)) return false;

                    // Exclusions
                    if (emp.id === assignment.responsable_linea) return false;
                    if (emp.id === assignment.segunda_linea) return false;
                    
                    const opSlots = ['operador_1', 'operador_2', 'operador_3', 'operador_4', 'operador_5'];
                    for (const slot of opSlots) {
                        if (slot !== excludeSlot && emp.id === assignment[slot]) return false;
                    }
                    return true;
                 });
            };

            return (
                <Card key={machine.id} className="overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-slate-50 border-b pb-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl">{machine.nombre}</CardTitle>
                                <p className="text-sm text-slate-500 font-mono">{machine.codigo}</p>
                            </div>
                            <Button 
                                onClick={() => handleSaveMachine(machine.id)} 
                                size="sm" 
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Save className="w-4 h-4 mr-2" />
                                Guardar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Responsable */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-blue-700">
                                <UserCheck className="w-4 h-4" /> Responsable de Línea
                            </Label>
                            <EmployeeSelect
                                employees={responsables}
                                value={assignment.responsable_linea || ""}
                                onValueChange={(val) => handleAssignmentChange(machine.id, 'responsable_linea', val)}
                                placeholder="Seleccionar responsable"
                            />
                            {assignment.responsable_linea && !responsables.find(e => e.id === assignment.responsable_linea) && (
                                <p className="text-xs text-amber-600 flex items-center mt-1">
                                    <AlertCircle className="w-3 h-3 mr-1" /> 
                                    El actual no cumple criterios
                                </p>
                            )}
                        </div>

                        {/* Segunda */}
                        <div className="space-y-3">
                            <Label className="flex items-center gap-2 text-indigo-700">
                                <User className="w-4 h-4" /> Segunda de Línea
                            </Label>
                            <EmployeeSelect
                                employees={segundas}
                                value={assignment.segunda_linea || ""}
                                onValueChange={(val) => handleAssignmentChange(machine.id, 'segunda_linea', val)}
                                placeholder="Seleccionar segunda"
                            />
                        </div>

                        {/* Operarios */}
                        <div className="space-y-3 lg:col-span-1 md:col-span-2">
                            <Label className="flex items-center gap-2 text-slate-700">
                                <Users className="w-4 h-4" /> Operarios de Línea
                            </Label>
                            <div className="space-y-2">
                                {[1, 2, 3, 4, 5].map(num => (
                                    <div key={num} className="flex gap-2 items-center">
                                        <Badge variant="outline" className="w-8 h-8 flex items-center justify-center shrink-0 bg-slate-100">
                                            {num}
                                        </Badge>
                                        <div className="flex-1">
                                            <EmployeeSelect
                                                employees={getOps(`operador_${num}`)}
                                                value={assignment[`operador_${num}`] || ""}
                                                onValueChange={(val) => handleAssignmentChange(machine.id, `operador_${num}`, val)}
                                                placeholder={`Operario ${num}`}
                                                showDepartment={false}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            );
        })}
      </div>
    </div>
  );
}