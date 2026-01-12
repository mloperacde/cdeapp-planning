import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EmployeeSelect from "@/components/common/EmployeeSelect";
import { toast } from "sonner";

export default function MachineSkillsView() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("all");

    // Fetch Data
    const { data: employees = [] } = useQuery({
        queryKey: ['employeesMaster'],
        queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    });

    const { data: machines = [] } = useQuery({
        queryKey: ['machines'],
        queryFn: async () => {
            const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
            return data.map(m => ({
                id: m.id,
                nombre: m.nombre,
                codigo: m.codigo_maquina,
                orden: m.orden_visualizacion || 999
            })).sort((a, b) => a.orden - b.orden);
        },
    });

    const { data: teams = [] } = useQuery({
        queryKey: ['teamConfigs'],
        queryFn: () => base44.entities.TeamConfig.list(),
    });

    // Helper to get employees for a machine grouped by role and ordered by preference
    const getMachineStaff = (machineId, roleType) => {
        const candidates = employees.filter(e => {
            if (e.departamento !== "FABRICACION") return false;
            
            // Filter by Team
            if (selectedTeam !== "all" && e.equipo !== selectedTeam) return false;

            const hasMachine = [1,2,3,4,5,6,7,8,9,10].some(i => e[`maquina_${i}`] === machineId);
            if (!hasMachine) return false;

            const puesto = (e.puesto || "").toUpperCase();
            if (roleType === "RESPONSABLE" && puesto.includes("RESPONSABLE")) return true;
            if (roleType === "SEGUNDA" && (puesto.includes("SEGUNDA") || puesto.includes("2ª"))) return true;
            if (roleType === "OPERARIO" && puesto.includes("OPERARI")) return true;
            return false;
        });

        // Sort by preference (which slot is the machine in)
        candidates.sort((a, b) => {
            const getSlot = (emp) => {
                for(let i=1; i<=10; i++) if(emp[`maquina_${i}`] === machineId) return i;
                return 99;
            };
            return getSlot(a) - getSlot(b);
        });

        return candidates;
    };

    // Helper to get potential candidates (who match role but don't have machine)
    const getPotentialCandidates = (machineId, roleType) => {
         return employees.filter(e => {
            if (e.departamento !== "FABRICACION") return false;
            if ((e.estado_empleado || "Alta") !== "Alta") return false;

            // Filter by Team
            if (selectedTeam !== "all" && e.equipo !== selectedTeam) return false;

            // Check if they ALREADY have the machine (we want those who DON'T)
            const hasMachine = [1,2,3,4,5,6,7,8,9,10].some(i => e[`maquina_${i}`] === machineId);
            if (hasMachine) return false;

            return true;
        }).map(e => {
            let group = "Otros";
            const puesto = (e.puesto || "").toUpperCase();
            let isSuggested = false;

            if (roleType === "RESPONSABLE" && puesto.includes("RESPONSABLE")) isSuggested = true;
            else if (roleType === "SEGUNDA" && (puesto.includes("SEGUNDA") || puesto.includes("2ª"))) isSuggested = true;
            else if (roleType === "OPERARIO" && puesto.includes("OPERARI")) isSuggested = true;

            if (isSuggested) group = "Sugeridos";

            return { ...e, _group: group };
        });
    };

    const { data: machineAssignments = [] } = useQuery({
        queryKey: ['machineAssignments'],
        queryFn: () => base44.entities.MachineAssignment.list(),
    });

    const updateEmployeeMachineMutation = useMutation({
        mutationFn: async ({ employeeId, machineId, action }) => {
            const employee = employees.find(e => e.id === employeeId);
            if (!employee) throw new Error("Empleado no encontrado");

            const payload = {};
            
            if (action === 'add') {
                // Find first empty slot
                let slot = -1;
                for(let i=1; i<=10; i++) {
                    if (!employee[`maquina_${i}`]) {
                        slot = i;
                        break;
                    }
                }
                if (slot === -1) throw new Error("El empleado ya tiene 10 máquinas asignadas");
                payload[`maquina_${slot}`] = machineId;
            } 
            else if (action === 'remove') {
                // Find slot with machine and remove from MachineAssignments too
                for(let i=1; i<=10; i++) {
                    if (employee[`maquina_${i}`] === machineId) {
                        payload[`maquina_${i}`] = null;
                    }
                }

                // Remove from all team assignments
                const assignmentsToUpdate = machineAssignments.filter(ma => 
                    ma.machine_id === machineId && (
                        ma.responsable_linea?.includes(employeeId) ||
                        ma.segunda_linea?.includes(employeeId) ||
                        [1,2,3,4,5,6,7,8].some(i => ma[`operador_${i}`] === employeeId)
                    )
                );

                for (const assignment of assignmentsToUpdate) {
                    const updateData = {};
                    if (assignment.responsable_linea?.includes(employeeId)) {
                        updateData.responsable_linea = assignment.responsable_linea.filter(id => id !== employeeId);
                    }
                    if (assignment.segunda_linea?.includes(employeeId)) {
                        updateData.segunda_linea = assignment.segunda_linea.filter(id => id !== employeeId);
                    }
                    for (let i = 1; i <= 8; i++) {
                        if (assignment[`operador_${i}`] === employeeId) {
                            updateData[`operador_${i}`] = null;
                        }
                    }
                    await base44.entities.MachineAssignment.update(assignment.id, updateData);
                }
            }

            return base44.entities.EmployeeMasterDatabase.update(employeeId, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
            queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
            toast.success("Habilidad actualizada correctamente");
        },
        onError: (err) => {
            toast.error(err.message || "Error al actualizar");
        }
    });

    // Removed nested Popover AddEmployeeButton definition to fix selection issue
    // Using EmployeeSelect directly in render with custom trigger

    const RemoveEmployeeButton = ({ employeeId, machineId }) => {
        return (
            <button 
                type="button"
                onClick={() => updateEmployeeMachineMutation.mutate({ employeeId, machineId, action: 'remove' })}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:text-red-500"
            >
                <X className="w-3 h-3" />
            </button>
        );
    };

    const filteredMachines = useMemo(() => {
        if (!searchTerm) return machines;
        const lower = searchTerm.toLowerCase();
        return machines.filter(m => m.nombre.toLowerCase().includes(lower) || m.codigo?.toLowerCase().includes(lower));
    }, [machines, searchTerm]);

    return (
        <div className="space-y-4 h-full flex flex-col">
            <Card className="bg-slate-50 shrink-0">
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full md:max-w-md">
                        <Label>Buscar Máquina</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Nombre o código..." 
                                className="pl-8 bg-white" 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="w-full md:w-[200px]">
                        <Label>Filtrar por Equipo</Label>
                        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Todos los equipos" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los equipos</SelectItem>
                                {teams.map(t => (
                                    <SelectItem key={t.id} value={t.team_name}>{t.team_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="flex-1 overflow-auto border rounded-lg bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[200px]">Máquina</TableHead>
                            <TableHead className="w-[30%]">Responsables de Línea</TableHead>
                            <TableHead className="w-[30%]">Segundas de Línea</TableHead>
                            <TableHead className="w-[30%]">Operarios</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMachines.map(machine => {
                            const responsables = getMachineStaff(machine.id, "RESPONSABLE");
                            const segundas = getMachineStaff(machine.id, "SEGUNDA");
                            const operarios = getMachineStaff(machine.id, "OPERARIO");

                            return (
                                <TableRow key={machine.id} className="hover:bg-slate-50">
                                    <TableCell>
                                        <div className="font-medium">{machine.nombre}</div>
                                        <div className="text-xs text-slate-500 font-mono">{machine.codigo}</div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex flex-col gap-1">
                                            {responsables.map(e => (
                                                <Badge 
                                                    key={e.id} 
                                                    variant="outline" 
                                                    className={cn(
                                                        "font-normal justify-start group pr-1",
                                                        e.disponibilidad === "Ausente" 
                                                            ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" 
                                                            : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                                                    )}
                                                >
                                                    {e.nombre}
                                                    {e.disponibilidad === "Ausente" && <AlertTriangle className="w-3 h-3 ml-1" />}
                                                    <RemoveEmployeeButton employeeId={e.id} machineId={machine.id} />
                                                </Badge>
                                            ))}
                                            <div className="flex items-center gap-2 mt-1">
                                                {responsables.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno</span>}
                                                <EmployeeSelect 
                                                    employees={getPotentialCandidates(machine.id, "RESPONSABLE")}
                                                    onValueChange={(empId) => updateEmployeeMachineMutation.mutate({ employeeId: empId, machineId: machine.id, action: 'add' })}
                                                    trigger={
                                                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-slate-100">
                                                            <Plus className="w-4 h-4 text-slate-400" />
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex flex-col gap-1">
                                            {segundas.map(e => (
                                                <Badge 
                                                    key={e.id} 
                                                    variant="outline" 
                                                    className={cn(
                                                        "font-normal justify-start group pr-1",
                                                        e.disponibilidad === "Ausente" 
                                                            ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" 
                                                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                                    )}
                                                >
                                                    {e.nombre}
                                                    {e.disponibilidad === "Ausente" && <AlertTriangle className="w-3 h-3 ml-1" />}
                                                    <RemoveEmployeeButton employeeId={e.id} machineId={machine.id} />
                                                </Badge>
                                            ))}
                                            <div className="flex items-center gap-2 mt-1">
                                                {segundas.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno</span>}
                                                <EmployeeSelect 
                                                    employees={getPotentialCandidates(machine.id, "SEGUNDA")}
                                                    onValueChange={(empId) => updateEmployeeMachineMutation.mutate({ employeeId: empId, machineId: machine.id, action: 'add' })}
                                                    trigger={
                                                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-slate-100">
                                                            <Plus className="w-4 h-4 text-slate-400" />
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {operarios.map(e => (
                                                <Badge 
                                                    key={e.id} 
                                                    variant="outline" 
                                                    className={cn(
                                                        "font-normal justify-start group pr-1",
                                                        e.disponibilidad === "Ausente" 
                                                            ? "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" 
                                                            : "bg-slate-50 text-slate-700"
                                                    )}
                                                >
                                                    {e.nombre}
                                                    {e.disponibilidad === "Ausente" && <AlertTriangle className="w-3 h-3 ml-1" />}
                                                    <RemoveEmployeeButton employeeId={e.id} machineId={machine.id} />
                                                </Badge>
                                            ))}
                                            <div className="flex items-center gap-2 mt-1">
                                                {operarios.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno</span>}
                                                <EmployeeSelect 
                                                    employees={getPotentialCandidates(machine.id, "OPERARIO")}
                                                    onValueChange={(empId) => updateEmployeeMachineMutation.mutate({ employeeId: empId, machineId: machine.id, action: 'add' })}
                                                    trigger={
                                                        <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full hover:bg-slate-100">
                                                            <Plus className="w-4 h-4 text-slate-400" />
                                                        </Button>
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}