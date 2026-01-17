import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Briefcase, Sparkles, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import EmployeeSelect from "../components/common/EmployeeSelect";
import Breadcrumbs from "../components/common/Breadcrumbs";

export default function DailyShiftPlanningPage() {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [shift, setShift] = useState("Mañana");
    const [currentTeam, setCurrentTeam] = useState("");
    const [planning, setPlanning] = useState({});
    const [aiSummary, setAiSummary] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    
    const queryClient = useQueryClient();

    // Data Queries
    const { data: machines = [] } = useQuery({
      queryKey: ['machines'],
      queryFn: async () => {
        const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
        const list = Array.isArray(data) ? data : [];
        return list.map(m => ({
          id: m.id,
          nombre: m.nombre,
          codigo: m.codigo_maquina || m.codigo,
          estado: m.estado_operativo,
          orden: m.orden_visualizacion || 999,
          tipo: m.tipo,
          ubicacion: m.ubicacion
        })).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
      },
      staleTime: 5 * 60 * 1000,
    });

    const { data: employees = [] } = useQuery({
        queryKey: ['employees'],
        queryFn: async () => {
            // Sync availability before loading
            try {
                await base44.functions.invoke('sync_employee_availability_bulk');
            } catch (e) {
                console.error("Sync failed", e);
            }
            return base44.entities.EmployeeMasterDatabase.list('nombre');
        },
    });

    const { data: workOrders = [] } = useQuery({
        queryKey: ['workOrders'],
        queryFn: () => base44.entities.WorkOrder.filter({ 
            status: { $in: ['Pendiente', 'En Progreso'] },
            start_date: date // Solo órdenes programadas para la fecha seleccionada
        }),
    });

    const { data: processes = [] } = useQuery({
        queryKey: ['processes'],
        queryFn: () => base44.entities.Process.filter({ activo: true }),
    });

    const { data: teams = [] } = useQuery({
        queryKey: ['teamConfigs'],
        queryFn: () => base44.entities.TeamConfig.list(),
    });

    const { data: existingPlanning = [] } = useQuery({
        queryKey: ['dailyPlanning', date, shift],
        queryFn: () => base44.entities.DailyMachineStaffing.filter({ date, shift }),
    });

    // Initialize with existing planning if available
    useEffect(() => {
        if (existingPlanning.length > 0) {
            const map = {};
            existingPlanning.forEach(p => {
                map[p.machine_id] = p;
            });
            setPlanning(map);
        } else {
            setPlanning({});
        }
    }, [existingPlanning]);

    // AI Generation
    const handleGenerateAI = async () => {
        if (!currentTeam) {
            toast.error("Selecciona un equipo primero");
            return;
        }
        setIsGenerating(true);
        try {
            const response = await base44.functions.invoke('suggest_daily_staffing', {
                date,
                shift,
                team_key: currentTeam
            });

            if (response.data && response.data.staffing) {
                setPlanning(response.data.staffing);
                setAiSummary(response.data.summary);
                toast.success("Propuesta generada con éxito");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al generar propuesta");
        } finally {
            setIsGenerating(false);
        }
    };

    // Save/Confirm
    const saveMutation = useMutation({
        mutationFn: async () => {
            const promises = Object.entries(planning).map(async ([machineId, data]) => {
                const payload = {
                    date,
                    shift,
                    machine_id: machineId,
                    ...data,
                    status: 'Confirmado'
                };
                
                // Check if exists to update or create
                // Since we fetched 'existingPlanning', we can check IDs there if we kept them. 
                // But simplified: Delete all for this day/shift/machine and recreate is safer? 
                // Or try to match. Let's try to match with existingPlanning.
                const existing = existingPlanning.find(e => e.machine_id === machineId);
                if (existing) {
                    return base44.entities.DailyMachineStaffing.update(existing.id, payload);
                } else {
                    return base44.entities.DailyMachineStaffing.create(payload);
                }
            });
            await Promise.all(promises);
        },
        onSuccess: () => {
            toast.success("Planificación guardada y confirmada");
            queryClient.invalidateQueries({ queryKey: ['dailyPlanning'] });
        },
        onError: () => toast.error("Error al guardar")
    });

    const handleStaffChange = (machineId, field, value) => {
        setPlanning(prev => ({
            ...prev,
            [machineId]: {
                ...prev[machineId],
                [field]: value
            }
        }));
    };

    const getMachineOrders = (machineId) => {
        return workOrders.filter(wo => wo.machine_id === machineId);
    };

    const getProcessName = (processId) => {
        return processes.find(p => p.id === processId)?.nombre || 'N/A';
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6">
            <Breadcrumbs />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <Briefcase className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
                        Planificación Diaria de Turno
                    </h1>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">Resumen de máquinas con órdenes asignadas y gestión de personal. La asignación de personas la realiza el agente IA.</p>
                </div>
                <div className="flex items-center gap-4">
                     <Button onClick={() => saveMutation.mutate()} className="bg-green-600 hover:bg-green-700 text-white">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirmar Planificación
                    </Button>
                </div>
            </div>

            {/* Controls */}
            <Card className="bg-slate-50 dark:bg-slate-800/50 border-blue-100 dark:border-blue-800">
                <CardContent className="p-4 flex flex-col md:flex-row flex-wrap gap-3 md:gap-4 items-stretch md:items-end">
                    <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-white" />
                    </div>
                    <div className="space-y-2">
                        <Label>Turno</Label>
                        <Select value={shift} onValueChange={setShift}>
                            <SelectTrigger className="w-[180px] bg-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Mañana">Mañana</SelectItem>
                                <SelectItem value="Tarde">Tarde</SelectItem>
                                <SelectItem value="Noche">Noche</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Equipo Base (para IA)</Label>
                        <Select value={currentTeam} onValueChange={setCurrentTeam}>
                            <SelectTrigger className="w-[200px] bg-white">
                                <SelectValue placeholder="Seleccionar..." />
                            </SelectTrigger>
                            <SelectContent>
                                {teams.map(t => (
                                    <SelectItem key={t.team_key} value={t.team_key}>{t.team_name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button 
                        onClick={handleGenerateAI} 
                        disabled={isGenerating} 
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Sugerir Asignación IA
                    </Button>
                </CardContent>
            </Card>

            {aiSummary && (
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg flex gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-purple-800">Resumen de Sugerencias IA</h3>
                        <p className="text-sm text-purple-700">{aiSummary}</p>
                    </div>
                </div>
            )}

            {/* Machines Grid */}
            <div className="grid gap-4 md:gap-6">
                {machines.map(machine => {
                    const currentStaff = planning[machine.id] || {};
                    const orders = getMachineOrders(machine.id);
                    const hasHighPriority = orders.some(o => o.priority >= 4);

                    return (
                        <Card key={machine.id} className={`overflow-hidden border-l-4 ${hasHighPriority ? 'border-l-red-500 dark:border-l-red-600' : 'border-l-blue-500 dark:border-l-blue-600'} dark:bg-slate-900/50`}>
                            <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700 pb-3 pt-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {machine.nombre}
                                            {hasHighPriority && <Badge variant="destructive" className="text-xs">Prioridad Alta</Badge>}
                                        </CardTitle>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {orders.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    {orders.map(o => (
                                                        <div key={o.id} className="flex flex-col gap-0.5 p-1.5 bg-blue-50 rounded border border-blue-100">
                                                            <div className="flex items-center gap-1 font-medium text-slate-700">
                                                                <ArrowRight className="w-3 h-3 text-blue-600" /> 
                                                                {o.order_number} - P{o.priority}
                                                            </div>
                                                            <div className="text-[10px] text-slate-600 ml-4">
                                                                {o.product_name || o.product_article_code || 'Sin nombre'}
                                                            </div>
                                                            <div className="text-[10px] text-slate-500 ml-4">
                                                                Proceso: {getProcessName(o.process_id)} | Cant: {o.quantity || 0}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="italic text-slate-400">Sin órdenes programadas para esta fecha</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                         {/* Status Badge could go here */}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs text-blue-700">Responsable</Label>
                                    <EmployeeSelect 
                                        employees={employees} 
                                        value={currentStaff.responsable_linea} 
                                        onValueChange={(v) => handleStaffChange(machine.id, 'responsable_linea', v)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-indigo-700">Segunda</Label>
                                    <EmployeeSelect 
                                        employees={employees} 
                                        value={currentStaff.segunda_linea} 
                                        onValueChange={(v) => handleStaffChange(machine.id, 'segunda_linea', v)}
                                    />
                                </div>
                                <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[1,2,3,4,5,6,7,8].map(i => (
                                        <div key={i} className="space-y-1">
                                            <Label className="text-[10px] text-slate-500">Op {i}</Label>
                                            <EmployeeSelect 
                                                employees={employees} 
                                                value={currentStaff[`operador_${i}`]} 
                                                onValueChange={(v) => handleStaffChange(machine.id, `operador_${i}`, v)}
                                                showDepartment={false}
                                                className="h-8 text-xs"
                                                placeholder="-"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
