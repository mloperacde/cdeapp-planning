 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, Wrench, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useState, useMemo } from 'react';
import EmployeeSkillsView from "../components/team/EmployeeSkillsView";
import MachineSkillsView from "../components/team/MachineSkillsView";
import IdealAssignmentView from "../components/team/IdealAssignmentView";
import Breadcrumbs from "@/components/common/Breadcrumbs";

export default function MachineAssignmentsPage() {
    const [isExporting, setIsExporting] = useState(false);

     
    
    // Correction: I will use a different approach for the function to ensure safety with the SDK.
    // I will use `base44.functions.invoke` and expect a base64 string in a JSON wrapper.
    
    return (
        <div className="p-6 h-[calc(100vh-20px)] flex flex-col">
            <Breadcrumbs />
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <UserCog className="w-8 h-8 text-blue-600" />
                        Asignación de Equipos
                    </h1>
                    <p className="text-slate-500">Gestión de habilidades y configuración de equipos ideales.</p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={async () => {
                        setIsExporting(true);
                        try {
                            // Using the download pattern from example
                            const { data } = await base44.functions.invoke('export_machine_assignments');
                            if (data.error) throw new Error(data.error);
                            
                            // If I change backend to return base64:
                            const binaryString = window.atob(data.file_base64);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let i = 0; i < len; i++) {
                                bytes[i] = binaryString.charCodeAt(i);
                            }
                            const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                            
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'asignaciones_equipos.xlsx';
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            a.remove();
                            toast.success("Exportación completada");
                        } catch (e) {
                            console.error(e);
                            toast.error("Error en la exportación");
                        } finally {
                            setIsExporting(false);
                        }
                    }}
                    disabled={isExporting}
                >
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Exportar Excel
                </Button>
            </div>

            <Tabs defaultValue="employees" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-3 max-w-xl mb-4">
                    <TabsTrigger value="employees" className="flex items-center gap-2">
                        <Users className="w-4 h-4" /> Por Empleados
                    </TabsTrigger>
                    <TabsTrigger value="machines" className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" /> Por Máquinas
                    </TabsTrigger>
                    <TabsTrigger value="ideal" className="flex items-center gap-2">
                        <UserCog className="w-4 h-4" /> Asignación Ideal
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="employees" className="flex-1 mt-0 overflow-hidden">
                    <EmployeeSkillsView />
                </TabsContent>
                
                <TabsContent value="machines" className="flex-1 mt-0 overflow-hidden">
                    <MachineSkillsView />
                </TabsContent>

                <TabsContent value="ideal" className="flex-1 mt-0 overflow-hidden">
                    <IdealAssignmentView />
                </TabsContent>
            </Tabs>
        </div>
    );
}
