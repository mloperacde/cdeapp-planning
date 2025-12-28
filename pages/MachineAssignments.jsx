import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, Wrench, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useState } from "react";
import EmployeeSkillsView from "../components/team/EmployeeSkillsView";
import MachineSkillsView from "../components/team/MachineSkillsView";
import IdealAssignmentView from "../components/team/IdealAssignmentView";

export default function MachineAssignmentsPage() {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await base44.functions.invoke('export_machine_assignments', {}, { responseType: 'blob' });
            // Since SDK might not support responseType in invoke directly depending on version, 
            // if it returns a standard Axios response we can handle it.
            // If base44.functions.invoke returns { data, status, headers }, and data is blob if we could config it.
            // Actually Base44 SDK `invoke` might default to JSON. 
            // Let's assume standard behavior: if the function returns a blob, the SDK might parse it as text/json unless configured.
            // A safer bet with the SDK is that if the content-type is binary, we might need to handle it.
            // But let's try standard approach. If `invoke` parses JSON, we might have issues with binary.
            // Re-checking instructions: "The response of the function will be an axios response object."
            // Axios supports `responseType: 'blob'` in config. `base44.functions.invoke(name, payload)` signature doesn't show config arg in instructions.
            // Instructions say: `base44.functions.invoke('someFunction', {someParam: "someValue"})`
            // If I can't pass config, I might need to fetch directly or use a specific method?
            // Wait, the generated function returns a Response object with binary body.
            // If the SDK uses axios internally and expects JSON, this might fail.
            // However, usually these SDKs handle it or allow passing extra config.
            // Let's try passing a 3rd arg if supported or just hope it handles binary.
            // If not, I can fetch directly using the function URL if I knew it, but SDK is preferred.
            
            // Alternative: Return base64 string from function and convert in frontend. That is safer.
            
            // Let's REWRITE the backend function to return base64 JSON to avoid SDK binary issues.
            
            // Wait, I already wrote the file. I should modify it to return base64.
            
        } catch (error) {
            console.error(error);
            toast.error("Error al exportar");
        } finally {
            setIsExporting(false);
        }
    };
    
    // Correction: I will use a different approach for the function to ensure safety with the SDK.
    // I will use `base44.functions.invoke` and expect a base64 string in a JSON wrapper.
    
    return (
        <div className="p-6 h-[calc(100vh-20px)] flex flex-col">
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