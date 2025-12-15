import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, Wrench } from "lucide-react";
import EmployeeSkillsView from "../components/team/EmployeeSkillsView";
import MachineSkillsView from "../components/team/MachineSkillsView";
import IdealAssignmentView from "../components/team/IdealAssignmentView";

export default function MachineAssignmentsPage() {
    return (
        <div className="p-6 h-[calc(100vh-20px)] flex flex-col">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                    <UserCog className="w-8 h-8 text-blue-600" />
                    Asignación de Equipos
                </h1>
                <p className="text-slate-500">Gestión de habilidades y configuración de equipos ideales.</p>
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