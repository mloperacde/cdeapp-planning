 
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

    const isProductionAvailable = (emp) => {
        const dept = (emp.departamento || "").toString().trim().toUpperCase();
        if (dept !== "PRODUCCION" && dept !== "PRODUCCIÓN") return false;
        const estado = emp.estado_empleado || "Alta";
        if (estado !== "Alta") return false;
        const disponibilidad = emp.disponibilidad || "Disponible";
        if (disponibilidad !== "Disponible") return false;
        return true;
    };

    const getExperienceSlot = (emp, machineId) => {
        const skill = employeeSkills.find(
            (s) => s.employee_id === emp.id && s.machine_id === machineId
        );
        if (skill?.orden_preferencia) return skill.orden_preferencia;
        const machine = machines.find((m) => String(m.id) === String(machineId));
        const identifiers = machine
            ? [String(machine.id), machine.codigo ? String(machine.codigo) : null].filter(
                  Boolean
              )
            : [String(machineId)];
        for (let i = 1; i <= 10; i++) {
            const val = emp[`maquina_${i}`];
            if (val && identifiers.includes(String(val))) return i;
        }
        return 999;
    };

    const getSortValue = (emp, machineId) => {
        const slot = getExperienceSlot(emp, machineId);
        const category = parseInt(emp.categoria) || 99;
        return { slot, category, name: emp.nombre };
    };

    const getRoleCandidatesForTeam = (machineId, roleType, teamKey) => {
        const teamConfig = teams.find((t) => t.team_key === teamKey);
        const teamName = teamConfig ? teamConfig.team_name : "";
        return employees
            .filter((emp) => {
                if (!isProductionAvailable(emp)) return false;
                const isTeamMember = emp.equipo === teamName || emp.equipo === teamKey;
                const isFixedShift =
                    emp.tipo_turno === "Fijo Mañana" || emp.tipo_turno === "Fijo Tarde";
                if (!isTeamMember && !isFixedShift) return false;
                const slot = getExperienceSlot(emp, machineId);
                if (slot === 999) return false;
                const puesto = (emp.puesto || "").toUpperCase();
                const isTecnicoProceso =
                    puesto.includes("TECNICO DE PROCESO") ||
                    puesto.includes("TÉCNICO DE PROCESO");
                if (isTecnicoProceso) return true;
                if (roleType === "RESPONSABLE" && puesto.includes("RESPONSABLE"))
                    return true;
                if (
                    roleType === "SEGUNDA" &&
                    (puesto.includes("SEGUNDA") || puesto.includes("2ª"))
                )
                    return true;
                if (
                    roleType === "OPERARIO" &&
                    (puesto.includes("OPERARI") ||
                        puesto.includes("OPERARIO") ||
                        puesto.includes("OPERARIA"))
                )
                    return true;
                return false;
            })
            .sort((a, b) => {
                const sortA = getSortValue(a, machineId);
                const sortB = getSortValue(b, machineId);
                if (sortA.slot !== sortB.slot) return sortA.slot - sortB.slot;
                if (sortA.category !== sortB.category) return sortA.category - sortB.category;
                return (sortA.name || "").localeCompare(sortB.name || "");
            });
    };

    const calculateDefaultAssignmentForTeam = (machineId, teamKey) => {
        const result = {
            responsable_linea: null,
            segunda_linea: null,
            operador_1: null,
            operador_2: null,
            operador_3: null,
            operador_4: null,
            operador_5: null,
            operador_6: null,
            operador_7: null,
            operador_8: null,
        };
        const assignedIds = new Set();
        const responsables = getRoleCandidatesForTeam(machineId, "RESPONSABLE", teamKey);
        const segundas = getRoleCandidatesForTeam(machineId, "SEGUNDA", teamKey);
        const operarios = getRoleCandidatesForTeam(machineId, "OPERARIO", teamKey);
        const pickFirstAvailable = (list) =>
            list.find((emp) => !assignedIds.has(emp.id) && isProductionAvailable(emp));
        let responsable = pickFirstAvailable(responsables);
        if (!responsable) {
            const segundaComoResp = pickFirstAvailable(segundas);
            if (segundaComoResp) {
                responsable = segundaComoResp;
            } else {
                const restantesResp = responsables.slice(1);
                responsable = pickFirstAvailable(restantesResp);
            }
        }
        if (responsable) {
            result.responsable_linea = responsable.id;
            assignedIds.add(responsable.id);
        }
        const segunda = pickFirstAvailable(segundas);
        if (segunda) {
            result.segunda_linea = segunda.id;
            assignedIds.add(segunda.id);
        }
        for (let i = 1; i <= 8; i++) {
            const op = pickFirstAvailable(operarios);
            if (!op) break;
            result[`operador_${i}`] = op.id;
            assignedIds.add(op.id);
        }
        return result;
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

                            const machinesSheet = [];

                            const mapIdToName = (id) => {
                                if (!id) return "";
                                const emp = employeeById.get(String(id));
                                return getEmployeeName(emp);
                            };

                            teams.forEach((team) => {
                                machines.forEach((machine) => {
                                    const existing = machineAssignments.find(
                                        (a) =>
                                            String(a.machine_id) === String(machine.id) &&
                                            a.team_key === team.team_key
                                    );

                                    let data;
                                    if (existing) {
                                        data = {
                                            responsable_linea:
                                                existing.responsable_linea?.[0] || null,
                                            segunda_linea:
                                                existing.segunda_linea?.[0] || null,
                                            operador_1: existing.operador_1 || null,
                                            operador_2: existing.operador_2 || null,
                                            operador_3: existing.operador_3 || null,
                                            operador_4: existing.operador_4 || null,
                                            operador_5: existing.operador_5 || null,
                                            operador_6: existing.operador_6 || null,
                                            operador_7: existing.operador_7 || null,
                                            operador_8: existing.operador_8 || null,
                                        };
                                    } else {
                                        data = calculateDefaultAssignmentForTeam(
                                            machine.id,
                                            team.team_key
                                        );
                                    }

                                    machinesSheet.push({
                                        Equipo: team.team_name || team.team_key || "",
                                        "Team key": team.team_key || "",
                                        Máquina:
                                            machine.alias ||
                                            machine.descripcion ||
                                            machine.codigo ||
                                            machine.id,
                                        "Responsable línea": mapIdToName(
                                            data.responsable_linea
                                        ),
                                        "Segunda línea": mapIdToName(
                                            data.segunda_linea
                                        ),
                                        "Operador 1": mapIdToName(data.operador_1),
                                        "Operador 2": mapIdToName(data.operador_2),
                                        "Operador 3": mapIdToName(data.operador_3),
                                        "Operador 4": mapIdToName(data.operador_4),
                                        "Operador 5": mapIdToName(data.operador_5),
                                        "Operador 6": mapIdToName(data.operador_6),
                                        "Operador 7": mapIdToName(data.operador_7),
                                        "Operador 8": mapIdToName(data.operador_8),
                                    });
                                });
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
