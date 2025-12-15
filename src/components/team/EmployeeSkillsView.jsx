import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Save, Check } from "lucide-react";
import { toast } from "sonner";
import AdvancedSearch from "../common/AdvancedSearch";

export default function EmployeeSkillsView() {
    const queryClient = useQueryClient();
    const [filters, setFilters] = useState({});
    const [editingState, setEditingState] = useState({});

    // Fetch Data
    const { data: employees = [] } = useQuery({
        queryKey: ['employeesMaster'],
        queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre', 1000),
    });

    const { data: machines = [] } = useQuery({
        queryKey: ['machines'],
        queryFn: () => base44.entities.Machine.list('orden', 1000),
    });

    const { data: teams = [] } = useQuery({
        queryKey: ['teamConfigs'],
        queryFn: () => base44.entities.TeamConfig.list(),
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: async ({ employeeId, data }) => {
            return base44.entities.EmployeeMasterDatabase.update(employeeId, data);
        },
        onSuccess: () => {
            toast.success("Perfil actualizado");
            queryClient.invalidateQueries({ queryKey: ['employeesMaster'] });
            setEditingState({});
        },
        onError: () => toast.error("Error al actualizar")
    });

    // Filter Logic
    const filteredEmployees = useMemo(() => {
        let result = employees.filter(e => e.departamento === "FABRICACION");

        if (filters.searchTerm) {
            const lower = filters.searchTerm.toLowerCase();
            result = result.filter(e => 
                e.nombre.toLowerCase().includes(lower) || 
                e.puesto?.toLowerCase().includes(lower)
            );
        }

        if (filters.equipo && filters.equipo !== "all") {
            result = result.filter(e => e.equipo === filters.equipo);
        }

        if (filters.puesto && filters.puesto !== "all") {
             result = result.filter(e => e.puesto === filters.puesto);
        }
        
        if (filters.maquina && filters.maquina !== "all") {
            result = result.filter(e => {
                for(let i=1; i<=10; i++) {
                    if (e[`maquina_${i}`] === filters.maquina) return true;
                }
                return false;
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
    }, [employees, filters]);

    // Handlers
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
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

    const getUniquePositions = () => {
        const positions = new Set(employees.filter(e => e.departamento === "FABRICACION").map(e => e.puesto).filter(Boolean));
        return Array.from(positions);
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Filters */}
            <Card className="bg-slate-50">
                <CardContent className="p-4 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[200px]">
                        <Label>Buscar</Label>
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
                    <div className="min-w-[150px]">
                        <Label>Equipo</Label>
                        <Select value={filters.equipo || "all"} onValueChange={(v) => handleFilterChange("equipo", v)}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {teams.map(t => <SelectItem key={t.id} value={t.team_name}>{t.team_name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[150px]">
                        <Label>Puesto</Label>
                        <Select value={filters.puesto || "all"} onValueChange={(v) => handleFilterChange("puesto", v)}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Todos" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {getUniquePositions().map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="min-w-[150px]">
                        <Label>Máquina Configurada</Label>
                        <Select value={filters.maquina || "all"} onValueChange={(v) => handleFilterChange("maquina", v)}>
                            <SelectTrigger className="bg-white"><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <div className="flex-1 overflow-auto border rounded-lg bg-white shadow-sm">
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
                        {filteredEmployees.map(emp => {
                            const isEdited = !!editingState[emp.id];
                            return (
                                <TableRow key={emp.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium">{emp.nombre}</TableCell>
                                    <TableCell>{emp.equipo}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-normal text-[10px]">{emp.puesto}</Badge>
                                    </TableCell>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => {
                                        const currentVal = editingState[emp.id]?.[`maquina_${i}`] ?? emp[`maquina_${i}`];
                                        return (
                                            <TableCell key={i} className="p-1">
                                                <Select 
                                                    value={currentVal || "none"} 
                                                    onValueChange={(v) => handleMachineChange(emp.id, i, v === "none" ? null : v)}
                                                >
                                                    <SelectTrigger className="h-7 text-xs border-0 bg-transparent hover:bg-slate-100 focus:ring-0">
                                                        <SelectValue placeholder="-" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">- Sin asignar -</SelectItem>
                                                        {machines.map(m => (
                                                            <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
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
        </div>
    );
}