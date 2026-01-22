import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, User, Wrench } from "lucide-react";

export default function EmployeeHelperList({ employees, currentTeam, machines }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredEmployees = useMemo(() => {
        return employees.filter(e => {
            // Filter by department
            if (e.departamento !== "FABRICACION") return false;
            
            // Filter by team if selected (optional, user might want to see all)
            // The prompt implies a list to HELP assignment, probably filtering by current team is best initially
            // But maybe show others if needed? Let's stick to current Team + FABRICACION for the "Helper" 
            // as it matches the "Ideal" concept, but maybe allow searching all?
            // "Listado previo en el que colocaremos el nombre de cada empleado... según su puesto"
            // Let's filter by team first to keep it relevant.
            if (currentTeam) {
                 // Assuming 'equipo' field matches currentTeam name logic (usually need mapping but we'll try simple match)
                 // If team filtering is strict in the main view, this helper should probably reflect that scope 
                 // OR show everyone to help find replacements.
                 // Let's NOT filter by team strictly here, or maybe just sort them? 
                 // Let's filter by the textual search if provided.
            }
            
            if (searchTerm) {
                return e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       e.puesto?.toLowerCase().includes(searchTerm.toLowerCase());
            }

            return true;
        });
    }, [employees, currentTeam, searchTerm]);

    const grouped = useMemo(() => {
        const groups = {
            "Responsables": [],
            "Segundas": [],
            "Operarios": [],
            "Otros": []
        };

        filteredEmployees.forEach(e => {
            const puesto = (e.puesto || "").toUpperCase();
            if (puesto.includes("RESPONSABLE")) groups["Responsables"].push(e);
            else if (puesto.includes("SEGUNDA") || puesto.includes("2ª")) groups["Segundas"].push(e);
            else if (puesto.includes("OPERARI")) groups["Operarios"].push(e);
            else groups["Otros"].push(e);
        });

        return groups;
    }, [filteredEmployees]);

    const getMachineName = (id) => {
        return machines.find(m => m.id === id)?.nombre || id;
    };

    return (
        <Card className="h-full border-l-4 border-l-orange-500">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Disponible
                </CardTitle>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar empleado..." 
                        className="pl-8" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-300px)] px-4 pb-4">
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([group, emps]) => (
                            emps.length > 0 && (
                                <div key={group}>
                                    <h3 className="font-semibold text-sm text-slate-500 mb-2 uppercase tracking-wider sticky top-0 bg-white py-2 z-10">
                                        {group} ({emps.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {emps.map(emp => (
                                            <div key={emp.id} className={`text-sm border rounded-lg p-2 hover:bg-slate-50 transition-colors ${emp.disponibilidad === "Ausente" ? "bg-red-50 border-red-200" : ""}`}>
                                                <div className="font-medium flex justify-between items-start">
                                                    <span className={emp.disponibilidad === "Ausente" ? "text-red-700" : ""}>{emp.nombre}</span>
                                                    <div className="flex gap-1 flex-wrap justify-end">
                                                        {emp.disponibilidad === "Ausente" && <Badge variant="destructive" className="text-[10px] h-5 bg-red-600">Ausente</Badge>}
                                                        {emp.equipo && <Badge variant="outline" className="text-[10px] h-5">{emp.equipo}</Badge>}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                                                    <Wrench className="w-3 h-3 mt-0.5" />
                                                    <span className="font-medium mr-1">Maq:</span>
                                                    {[emp.maquina_1, emp.maquina_2, emp.maquina_3].filter(Boolean).map((mid, i) => (
                                                        <span key={i} className="bg-slate-100 px-1 rounded text-[10px]">
                                                            {getMachineName(mid)}
                                                        </span>
                                                    ))}
                                                    {!emp.maquina_1 && <span className="text-slate-400 italic">Sin config.</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}