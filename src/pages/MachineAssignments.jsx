 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCog, Users, Wrench, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import EmployeeSkillsView from "../components/team/EmployeeSkillsView";
import MachineSkillsView from "../components/team/MachineSkillsView";
import IdealAssignmentView from "../components/team/IdealAssignmentView";
import { getMachineAlias } from "@/utils/machineAlias";
import { getEmployeeDefaultMachineExperience } from "@/lib/domain/planning";

export default function MachineAssignmentsPage() {
    const [isExporting, setIsExporting] = useState(false);

    const { data: employees = [] } = useQuery({
        queryKey: ["employeesMaster"],
        queryFn: () => base44.entities.EmployeeMasterDatabase.list("nombre", 1000),
    });

    const { data: machines = [] } = useQuery({
        queryKey: ["machines"],
        queryFn: async () => {
            const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
            return data
                .map((m) => ({
                    id: m.id,
                    alias: getMachineAlias(m),
                    codigo: m.codigo_maquina,
                    descripcion: m.descripcion,
                    orden: m.orden_visualizacion || 999,
                }))
                .sort((a, b) => a.orden - b.orden);
        },
    });

    const { data: teams = [] } = useQuery({
        queryKey: ["teamConfigs"],
        queryFn: () => base44.entities.TeamConfig.list(),
    });

    const { data: machineAssignments = [] } = useQuery({
        queryKey: ["machineAssignments"],
        queryFn: () => base44.entities.MachineAssignment.list(undefined, 2000),
    });

    const { data: employeeSkills = [] } = useQuery({
        queryKey: ["employeeSkills"],
        queryFn: () => base44.entities.EmployeeMachineSkill.list(undefined, 1000),
    });

    const getEmployeeName = (emp) => {
        if (!emp) return "";
        return (
            emp.nombre ||
            emp.name ||
            emp.Name ||
            emp.full_name ||
            emp.fullName ||
            emp.display_name ||
            "Sin Nombre"
        );
    };
    
    return (
        <div className="p-6 h-full flex flex-col">
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
                            const employeeById = new Map(employees.map((e) => [String(e.id), e]));
                            const machineById = new Map(machines.map((m) => [String(m.id), m]));
                            const teamByKey = new Map(teams.map((t) => [t.team_key, t]));

                            const employeesSheet = employees.map((emp) => {
                                const defaults = getEmployeeDefaultMachineExperience(emp, employeeSkills);
                                const slots = {};
                                for (let i = 1; i <= 10; i++) {
                                    const skill = employeeSkills.find(
                                        (s) =>
                                            s.employee_id === emp.id &&
                                            s.orden_preferencia === i
                                    );
                                    const rawVal =
                                        skill?.machine_id || emp[`maquina_${i}`] || defaults[i - 1];
                                    const machine =
                                        rawVal != null
                                            ? machineById.get(String(rawVal))
                                            : null;
                                    slots[`Máquina ${i}`] = machine
                                        ? machine.alias || machine.descripcion || machine.codigo
                                        : "";
                                }
                                return {
                                    Empleado: getEmployeeName(emp),
                                    Departamento: emp.departamento || "",
                                    Equipo: emp.equipo || "",
                                    Puesto: emp.puesto || "",
                                    "Tipo turno": emp.tipo_turno || "",
                                    "Fecha alta": emp.fecha_alta || "",
                                    ...slots,
                                };
                            });

                            const machinesSheet = machineAssignments.map((ma) => {
                                const machine = machineById.get(String(ma.machine_id));
                                const team = teamByKey.get(ma.team_key);
                                const getSingleName = (val) => {
                                    if (!val) return "";
                                    if (Array.isArray(val) && val.length > 0) {
                                        const emp = employeeById.get(String(val[0]));
                                        return getEmployeeName(emp);
                                    }
                                    const emp = employeeById.get(String(val));
                                    return getEmployeeName(emp);
                                };
                                const getOpName = (field) => {
                                    const id = ma[field];
                                    if (!id) return "";
                                    const emp = employeeById.get(String(id));
                                    return getEmployeeName(emp);
                                };
                                return {
                                    Equipo: team?.team_name || ma.team_key || "",
                                    "Team key": ma.team_key || "",
                                    Máquina:
                                        machine?.alias ||
                                        machine?.descripcion ||
                                        machine?.codigo ||
                                        ma.machine_id ||
                                        "",
                                    "Responsable línea": getSingleName(
                                        ma.responsable_linea
                                    ),
                                    "Segunda línea": getSingleName(ma.segunda_linea),
                                    "Operador 1": getOpName("operador_1"),
                                    "Operador 2": getOpName("operador_2"),
                                    "Operador 3": getOpName("operador_3"),
                                    "Operador 4": getOpName("operador_4"),
                                    "Operador 5": getOpName("operador_5"),
                                    "Operador 6": getOpName("operador_6"),
                                    "Operador 7": getOpName("operador_7"),
                                    "Operador 8": getOpName("operador_8"),
                                };
                            });

                            const idealSheet = machinesSheet;

                            const wb = XLSX.utils.book_new();
                            const wsEmployees = XLSX.utils.json_to_sheet(employeesSheet);
                            const wsMachines = XLSX.utils.json_to_sheet(machinesSheet);
                            const wsIdeal = XLSX.utils.json_to_sheet(idealSheet);

                            XLSX.utils.book_append_sheet(
                                wb,
                                wsEmployees,
                                "PorEmpleados"
                            );
                            XLSX.utils.book_append_sheet(
                                wb,
                                wsMachines,
                                "PorMaquinas"
                            );
                            XLSX.utils.book_append_sheet(
                                wb,
                                wsIdeal,
                                "AsignacionIdeal"
                            );

                            const fileName = `Asignaciones_Equipos_${format(
                                new Date(),
                                "yyyyMMdd_HHmmss"
                            )}.xlsx`;
                            XLSX.writeFile(wb, fileName);
                            toast.success("Exportación completada", {
                                description: fileName,
                            });
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
