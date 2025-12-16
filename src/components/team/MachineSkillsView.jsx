import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export default function MachineSkillsView() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTeam, setSelectedTeam] = useState("all");

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
                                                <Badge key={e.id} variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-normal justify-start">
                                                    {e.nombre}
                                                </Badge>
                                            ))}
                                            {responsables.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno configurado</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex flex-col gap-1">
                                            {segundas.map(e => (
                                                <Badge key={e.id} variant="outline" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-normal justify-start">
                                                    {e.nombre}
                                                </Badge>
                                            ))}
                                             {segundas.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno configurado</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex flex-wrap gap-1">
                                            {operarios.map(e => (
                                                <Badge key={e.id} variant="outline" className="bg-slate-50 text-slate-700 font-normal">
                                                    {e.nombre}
                                                </Badge>
                                            ))}
                                             {operarios.length === 0 && <span className="text-xs text-slate-400 italic">Ninguno configurado</span>}
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