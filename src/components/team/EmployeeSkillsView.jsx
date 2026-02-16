import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Button } from "@/components/ui/button";
import { getMachineAlias } from "@/utils/machineAlias";
import { Badge } from "@/components/ui/badge";
import { Search, Save, Edit3, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getEmployeeDefaultMachineExperience } from "@/lib/domain/planning";

const getEmployeeName = (emp) => {
  if (!emp) return "";
  return emp.nombre || emp.name || emp.Name || emp.full_name || emp.fullName || emp.display_name || "Sin Nombre";
};

export default function EmployeeSkillsView({ department = "all" }) {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({});
    const [editingState, setEditingState] = useState({});
    const [currentPage, setCurrentPage] = useState(1);
    const [editingPositionId, setEditingPositionId] = useState(null);
    const [applyOpen, setApplyOpen] = useState(false);
    const [sourceTeamKey, setSourceTeamKey] = useState("");
    const [targetTeamKey, setTargetTeamKey] = useState("");
    const pageSize = 20;

    // Fetch Data
    const { data: employees = [] } = useQuery({
        queryKey: ['employeesMaster'],
        queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
        staleTime: 0,
        gcTime: 0
    });

    const { data: machines = [] } = useQuery({
        queryKey: ['machines'],
        queryFn: async () => {
            const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
            return data.map(m => ({
            id: m.id,
            alias: getMachineAlias(m),
                codigo: m.codigo_maquina,
                ubicacion: m.ubicacion,
                orden: m.orden_visualizacion || 999
            })).sort((a, b) => a.orden - b.orden);
        },
        staleTime: 0,
        gcTime: 0
    });

    const { data: teams = [] } = useQuery({
        queryKey: ['teamConfigs'],
        queryFn: () => base44.entities.TeamConfig.list(),
    });

    const { data: machineAssignments = [] } = useQuery({
        queryKey: ['machineAssignments'],
        queryFn: () => base44.entities.MachineAssignment.list(),
    });

    const { data: employeeSkills = [] } = useQuery({
        queryKey: ['employeeSkills'],
        queryFn: () => base44.entities.EmployeeMachineSkill.list(undefined, 1000),
        staleTime: 0,
        gcTime: 0
    });

    const applyBothTeamsMutation = useMutation({
        mutationFn: async ({ fromKey, toKey }) => {
            if (!fromKey || !toKey || fromKey === toKey) throw new Error("Equipos inválidos");
            const fromRecords = machineAssignments.filter(ma => ma.team_key === fromKey);
            const toRecords = machineAssignments.filter(ma => ma.team_key === toKey);
            const toByMachine = new Map(toRecords.map(r => [String(r.machine_id), r]));
            const ops = [];
            const fixedIds = new Set(
              (employees || [])
                .filter(e => e?.tipo_turno === "Fijo Mañana" || e?.tipo_turno === "Fijo Tarde")
                .map(e => e.id)
            );
            for (const src of fromRecords) {
                const filterArray = (val) => {
                  if (Array.isArray(val)) return val.filter((id) => fixedIds.has(id));
                  if (val == null) return [];
                  return fixedIds.has(val) ? [val] : [];
                };
                const filterScalar = (val) => (val && fixedIds.has(val) ? val : null);
                const payload = {
                    team_key: toKey,
                    machine_id: src.machine_id,
                    responsable_linea: filterArray(src.responsable_linea),
                    segunda_linea: filterArray(src.segunda_linea),
                    operador_1: filterScalar(src.operador_1),
                    operador_2: filterScalar(src.operador_2),
                    operador_3: filterScalar(src.operador_3),
                    operador_4: filterScalar(src.operador_4),
                    operador_5: filterScalar(src.operador_5),
                    operador_6: filterScalar(src.operador_6),
                    operador_7: filterScalar(src.operador_7),
                    operador_8: filterScalar(src.operador_8),
                };
                const existing = toByMachine.get(String(src.machine_id));
                if (existing) {
                    ops.push(base44.entities.MachineAssignment.update(existing.id, payload));
                } else {
                    ops.push(base44.entities.MachineAssignment.create(payload));
                }
            }
            await Promise.all(ops);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
            toast.success("Asignación aplicada al equipo destino");
            setApplyOpen(false);
        },
        onError: (e) => {
            toast.error("No se pudo aplicar la asignación");
        }
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async ({ employeeId, data }) => {
            const employee = employees.find(e => e.id === employeeId);
            if (!employee) throw new Error("Empleado no encontrado");

            const currentSkills = employeeSkills.filter(s => s.employee_id === employeeId);
            const removedMachines = [];

            // Check which machines were removed in EmployeeMachineSkill
            for (let i = 1; i <= 10; i++) {
                const oldSkill = currentSkills.find(s => s.orden_preferencia === i);
                const newMachine = data[`maquina_${i}`];
                if (oldSkill && newMachine === null) {
                    removedMachines.push(oldSkill.machine_id);
                    // Delete the skill record
                    await base44.entities.EmployeeMachineSkill.delete(oldSkill.id);
                } else if (!oldSkill && newMachine) {
                    // Create new skill record
                    await base44.entities.EmployeeMachineSkill.create({
                        employee_id: employeeId,
                        machine_id: newMachine,
                        orden_preferencia: i,
                        nivel_competencia: 'Intermedio'
                    });
                } else if (oldSkill && newMachine && oldSkill.machine_id !== newMachine) {
                    // Update skill record
                    await base44.entities.EmployeeMachineSkill.update(oldSkill.id, {
                        machine_id: newMachine
                    });
                }
            }

            // Remove from MachineAssignments if machine was removed
            if (removedMachines.length > 0) {
                const assignmentsToUpdate = machineAssignments.filter(ma => 
                    removedMachines.includes(ma.machine_id) && (
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

            // Also update legacy fields for backwards compatibility
            return base44.entities.EmployeeMasterDatabase.update(employeeId, data);
        },
        onSuccess: () => {
            toast.success("Perfil actualizado. Cambios aplicados en todos los módulos.");
            queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
            queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
            queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
            queryClient.invalidateQueries({ queryKey: ['employeeMachineSkills'] });
            setEditingState({});
        },
        onError: () => toast.error("Error al actualizar")
    });

    // Filter Logic
    const filteredEmployees = useMemo(() => {
        const normalize = (str) => str ? str.toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
        const allowedRoles = [
            "tecnico de proceso",
            "técnico de proceso",
            "responsable de linea",
            "segunda de linea",
            "operaria de linea",
            "operario de linea"
        ].map(normalize);

        let result = employees.filter(e => {
            const matchesDepartment = department === "all" || e.departamento === department;
            if (!matchesDepartment || e.estado_empleado !== "Alta") return false;

            const deptNorm = normalize(e.departamento);
            if (deptNorm !== "produccion") return false;

            const puestoNorm = normalize(e.puesto);
            if (!allowedRoles.some(r => puestoNorm.includes(r))) return false;

            return true;
        });

        if (filters.searchTerm) {
            const lower = filters.searchTerm.toLowerCase();
            result = result.filter(e => {
                const name = getEmployeeName(e);
                return name.toLowerCase().includes(lower) || 
                       e.puesto?.toLowerCase().includes(lower);
            });
        }

        if (filters.equipo && filters.equipo !== "all") {
            result = result.filter(e => e.equipo === filters.equipo);
        }

        if (filters.puesto && filters.puesto !== "all") {
             result = result.filter(e => e.puesto === filters.puesto);
        }
        
        if (filters.tipo_turno && filters.tipo_turno !== "all") {
            const target = normalize(filters.tipo_turno);
            result = result.filter(e => normalize(e.tipo_turno) === target);
        }
        
        if (filters.maquina && filters.maquina !== "all") {
            result = result.filter(e => {
                const defaults = getEmployeeDefaultMachineExperience(e, employeeSkills);
                return defaults.includes(filters.maquina);
            });
        }

        // Sort by position rank
        const getRank = (puesto) => {
            const p = (puesto || "").toUpperCase();
            if (p.includes("RESPONSABLE")) return 1;
            if (p.includes("SEGUNDA") || p.includes("2ª")) return 2;
            if (p.includes("OPERARI")) return 3;
            return 4;
        };

        result.sort((a, b) => getRank(a.puesto) - getRank(b.puesto));

        return result;
    }, [employees, filters, department]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleMachineChange = (employeeId, slot, machineId) => {
        setEditingState(prev => ({
            ...prev,
            [employeeId]: {
                ...(prev[employeeId] || {}),
                [`maquina_${slot}`]: machineId
            }
        }));
    };

    const saveChanges = (employee) => {
        const changes = editingState[employee.id];
        if (!changes) return;
        updateMutation.mutate({ employeeId: employee.id, data: changes });
    };

    const saveAllChanges = () => {
        const promises = Object.keys(editingState).map(empId => {
            return updateMutation.mutateAsync({ employeeId: empId, data: editingState[empId] });
        });
        
        Promise.all(promises)
            .then(() => toast.success("Todos los cambios guardados"))
            .catch(() => toast.error("Error al guardar algunos cambios"));
    };

    const getUniquePositions = () => {
        const positions = new Set(
            employees
              .filter(e => {
                const d = (e.departamento || "").toString().trim().toUpperCase();
                return d === "PRODUCCIÓN" || d === "PRODUCCION";
              })
              .map(e => e.puesto)
              .filter(Boolean)
        );
        return Array.from(positions);
    };

    return (
        <div className="h-full flex flex-col md:flex-row gap-4">
            {/* Sidebar Filters */}
            <Card className="w-full md:w-64 shrink-0 bg-slate-50 h-fit">
                <CardContent className="p-4 flex flex-col gap-4">
                    <div className="font-semibold text-lg border-b pb-2 mb-2">Filtros</div>
                    
                    <div className="space-y-2">
                        <Label>Buscar Empleado</Label>
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Nombre..." 
                                className="pl-8 bg-white" 
                                value={filters.searchTerm || ""}
                                onChange={e => handleFilterChange("searchTerm", e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Equipo</Label>
                        <Select value={filters.equipo || "all"} onValueChange={(v) => handleFilterChange("equipo", v)}>
                            <SelectTrigger className="bg-white w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {teams.map(t => <SelectItem key={t.id} value={t.team_name}>{t.team_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Puesto</Label>
                        <Select value={filters.puesto || "all"} onValueChange={(v) => handleFilterChange("puesto", v)}>
                            <SelectTrigger className="bg-white w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {getUniquePositions().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tipo de Turno</Label>
                        <Select value={filters.tipo_turno || "all"} onValueChange={(v) => handleFilterChange("tipo_turno", v)}>
                            <SelectTrigger className="bg-white w-full"><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="Fijo Mañana">Fijo Mañana</SelectItem>
                                <SelectItem value="Fijo Tarde">Fijo Tarde</SelectItem>
                                <SelectItem value="Rotativo">Rotativo</SelectItem>
                                <SelectItem value="Turno Partido">Turno Partido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Máquina Configurada</Label>
                        <Select value={filters.maquina || "all"} onValueChange={(v) => handleFilterChange("maquina", v)}>
                            <SelectTrigger className="bg-white w-full"><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.alias || m.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={() => {
                            setFilters({});
                            setCurrentPage(1);
                        }}
                    >
                        Limpiar Filtros
                    </Button>

                    <div className="pt-2">
                      <Button 
                        size="sm" 
                        className="w-full"
                        onClick={() => {
                            if (teams.length >= 2) {
                                setSourceTeamKey(teams[0].team_key);
                                setTargetTeamKey(teams[1].team_key);
                            }
                            setApplyOpen(true);
                        }}
                      >
                        Aplicar asignación a ambos equipos
                      </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <div className="flex-1 overflow-auto border rounded-lg bg-white shadow-sm flex flex-col min-w-0">
                {Object.keys(editingState).length > 0 && (
                    <div className="p-2 bg-yellow-50 border-b flex justify-between items-center px-4">
                        <span className="text-sm text-yellow-800 font-medium">Hay cambios sin guardar</span>
                        <Button size="sm" onClick={saveAllChanges} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Todo ({Object.keys(editingState).length})
                        </Button>
                    </div>
                )}
                <div className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-[200px]">Empleado</TableHead>
                                <TableHead className="w-[150px]">Equipo</TableHead>
                                <TableHead className="w-[150px]">Puesto</TableHead>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                                    <TableHead key={i} className="min-w-[120px] text-center">Máquina {i}</TableHead>
                                ))}
                                <TableHead className="w-[80px] text-right sticky right-0 bg-slate-50">Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEmployees
                                .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                                .map(emp => {
                                const isEdited = !!editingState[emp.id];
                                return (
                                    <TableRow key={emp.id} className={cn("hover:bg-slate-50", emp.disponibilidad === "Ausente" ? "bg-red-50 hover:bg-red-100" : "")}>
                                        <TableCell className={cn("font-medium", emp.disponibilidad === "Ausente" ? "text-red-700" : "")}>
                                            {getEmployeeName(emp)}
                                            {emp.disponibilidad === "Ausente" && (
                                                <span className="ml-2 text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full">Ausente</span>
                                            )}
                                        </TableCell>
                                        <TableCell>{emp.equipo}</TableCell>
                                        <TableCell>
                                            {editingPositionId === emp.id ? (
                                                <div className="flex items-center gap-2">
                                                    <Select
                                                        value={editingState[emp.id]?.puesto ?? emp.puesto ?? "none"}
                                                        onValueChange={(v) => {
                                                            const value = v === "none" ? "" : v;
                                                            setEditingState(prev => ({
                                                                ...prev,
                                                                [emp.id]: {
                                                                    ...(prev[emp.id] || {}),
                                                                    puesto: value
                                                                }
                                                            }));
                                                        }}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs bg-white min-w-[150px]">
                                                            <SelectValue placeholder="Seleccionar puesto" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">- Sin puesto -</SelectItem>
                                                            {getUniquePositions().map(p => (
                                                                <SelectItem key={p} value={p}>{p}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-7 w-7"
                                                        onClick={() => setEditingPositionId(null)}
                                                    >
                                                        <History className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-normal text-[10px]">
                                                        {emp.puesto}
                                                    </Badge>
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                                        onClick={() => {
                                                            setEditingPositionId(emp.id);
                                                            setEditingState(prev => ({
                                                                ...prev,
                                                                [emp.id]: {
                                                                    ...(prev[emp.id] || {}),
                                                                    puesto: emp.puesto || ""
                                                                }
                                                            }));
                                                        }}
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
                                           // Get from EmployeeMachineSkill first, fallback to legacy
                                           const skill = employeeSkills.find(s => 
                                               s.employee_id === emp.id && s.orden_preferencia === i
                                           );
                                           const currentVal = editingState[emp.id]?.[`maquina_${i}`] 
                                               ?? skill?.machine_id 
                                               ?? emp[`maquina_${i}`];
                                           
                                           const selectedMachine = machines.find(m => m.id === currentVal);
                                           
                                           return (
                                               <TableCell key={i} className="p-1">
                                                   <Select 
                                                       value={currentVal || "none"} 
                                                       onValueChange={(v) => handleMachineChange(emp.id, i, v === "none" ? null : v)}
                                                   >
                                                       <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-slate-100 focus:ring-0">
                                                        <SelectValue>
                                                            {selectedMachine ? (
                                                                <span>
                                                                    {selectedMachine.alias}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">-</span>
                                                            )}
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">- Sin asignar -</SelectItem>
                                                        {machines.map(m => (
                                                            <SelectItem key={m.id} value={m.id}>
                                                                <div className="flex flex-col">
                                                                    <span>{m.alias}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                   </Select>
                                               </TableCell>
                                           );
                                        })}
                                        <TableCell className="text-right sticky right-0 bg-white group-hover:bg-slate-50">
                                            {isEdited && (
                                                <Button size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" onClick={() => saveChanges(emp)}>
                                                    <Save className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
                {/* Pagination Controls */}
                <div className="p-4 border-t flex items-center justify-between bg-slate-50">
                    <div className="text-sm text-slate-500">
                        Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, filteredEmployees.length)} de {filteredEmployees.length} empleados
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredEmployees.length / pageSize), p + 1))}
                            disabled={currentPage >= Math.ceil(filteredEmployees.length / pageSize)}
                        >
                            Siguiente
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aplicar asignación a ambos equipos</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Equipo Origen</Label>
                    <Select value={sourceTeamKey} onValueChange={setSourceTeamKey}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {teams.map(t => (
                          <SelectItem key={t.team_key} value={t.team_key}>{t.team_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Equipo Destino</Label>
                    <Select value={targetTeamKey} onValueChange={setTargetTeamKey}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {teams.map(t => (
                          <SelectItem key={t.team_key} value={t.team_key}>{t.team_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-slate-500">
                    Copia las asignaciones del equipo origen al destino, SOLO para empleados con turno fijo (mañana/tarde). Sobrescribe el destino.
                  </p>
                </div>
                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setApplyOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => applyBothTeamsMutation.mutate({ fromKey: sourceTeamKey, toKey: targetTeamKey })}
                    disabled={applyBothTeamsMutation.isPending || !sourceTeamKey || !targetTeamKey || sourceTeamKey === targetTeamKey}
                  >
                    {applyBothTeamsMutation.isPending ? "Aplicando..." : "Aplicar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
        </div>
    );
}
