import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
    ClipboardList, 
    ArrowLeft, 
    CheckCircle2, 
    XCircle, 
    Clock, 
    Calendar as CalendarIcon,
    User,
    Save,
    RotateCcw,
    AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function ShiftTaskChecklist() {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [selectedDate, setSelectedDate] = useState(today);
    const [selectedShift, setSelectedShift] = useState("Mañana");
    const [jefeTurno, setJefeTurno] = useState("");
    
    // Estado local para los valores del checklist
    // Estructura: { [taskId]: { status: 'ok' | 'fail' | null, value: string, observations: string } }
    const [checklistData, setChecklistData] = useState({});

    // Cargar configuración de fabricación para obtener las tareas
    const { data: manufacturingConfig, isLoading: loadingConfig } = useQuery({
        queryKey: ["appConfig", "manufacturing"],
        queryFn: async () => {
            const configs = await base44.entities.AppConfig.filter({ config_key: "manufacturing_config" });
            const record = configs[0] || null;
            if (!record) return null;
            try {
                const raw = record.value || record.description || record.app_subtitle || null;
                if (!raw) return null;
                return typeof raw === "string" ? JSON.parse(raw) : raw;
            } catch (e) {
                return null;
            }
        },
    });

    const tasks = useMemo(() => manufacturingConfig?.tasks || [], [manufacturingConfig]);

    // Cargar datos guardados de localStorage al iniciar o cambiar fecha/turno
    useEffect(() => {
        const key = `checklist_${selectedDate}_${selectedShift}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setChecklistData(parsed.data || {});
                setJefeTurno(parsed.jefeTurno || "");
            } catch (e) {
                console.error("Error loading checklist from localStorage", e);
            }
        } else {
            setChecklistData({});
            setJefeTurno("");
        }
    }, [selectedDate, selectedShift]);

    const handleSave = () => {
        const key = `checklist_${selectedDate}_${selectedShift}`;
        const payload = {
            date: selectedDate,
            shift: selectedShift,
            jefeTurno,
            data: checklistData,
            updatedAt: new Date().toISOString()
        };
        localStorage.setItem(key, JSON.stringify(payload));
        toast.success("Progreso guardado localmente.");
    };

    const updateTaskStatus = (taskId, status) => {
        setChecklistData(prev => ({
            ...prev,
            [taskId]: {
                ...(prev[taskId] || {}),
                status: prev[taskId]?.status === status ? null : status
            }
        }));
    };

    const updateTaskValue = (taskId, value) => {
        setChecklistData(prev => ({
            ...prev,
            [taskId]: {
                ...(prev[taskId] || {}),
                value
            }
        }));
    };

    const updateTaskObservations = (taskId, observations) => {
        setChecklistData(prev => ({
            ...prev,
            [taskId]: {
                ...(prev[taskId] || {}),
                observations
            }
        }));
    };

    if (loadingConfig) {
        return <div className="p-8 text-center">Cargando configuración...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 pb-20">
            {/* Header */}
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Escaleta de Supervisión Diaria</h1>
                            <p className="text-xs text-slate-500">Documento de control para Jefes de Turno</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to={createPageUrl("ShiftManagers")}>
                            <Button variant="ghost" size="sm" className="gap-2">
                                <ArrowLeft className="w-4 h-4" />
                                Volver
                            </Button>
                        </Link>
                        <Button onClick={handleSave} size="sm" className="bg-blue-600 hover:bg-blue-700 gap-2">
                            <Save className="w-4 h-4" />
                            Guardar
                        </Button>
                    </div>
                </div>

                {/* Filtros y Datos Generales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <CalendarIcon className="w-4 h-4 text-slate-400" />
                            <div className="flex-1">
                                <Label className="text-[10px] uppercase text-slate-500 font-bold">Fecha</Label>
                                <Input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="h-8 border-0 p-0 focus-visible:ring-0 text-sm font-semibold"
                                />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <div className="flex-1">
                                <Label className="text-[10px] uppercase text-slate-500 font-bold">Turno</Label>
                                <select 
                                    value={selectedShift} 
                                    onChange={(e) => setSelectedShift(e.target.value)}
                                    className="w-full h-8 bg-transparent border-0 p-0 focus:ring-0 text-sm font-semibold outline-none"
                                >
                                    <option value="Mañana">Mañana</option>
                                    <option value="Tarde">Tarde</option>
                                    <option value="Noche">Noche</option>
                                </select>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 flex items-center gap-3">
                            <User className="w-4 h-4 text-slate-400" />
                            <div className="flex-1">
                                <Label className="text-[10px] uppercase text-slate-500 font-bold">Jefe de Turno</Label>
                                <Input 
                                    placeholder="Nombre..." 
                                    value={jefeTurno}
                                    onChange={(e) => setJefeTurno(e.target.value)}
                                    className="h-8 border-0 p-0 focus-visible:ring-0 text-sm font-semibold"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Checklist */}
                <div className="space-y-4">
                    {tasks.length === 0 ? (
                        <Card className="p-12 text-center text-slate-500 border-dashed">
                            <p>No hay tareas configuradas en la escaleta. Ve a Estructura Organizativa {'>'} Fabricación {'>'} Escaleta para definirlas.</p>
                        </Card>
                    ) : (
                        tasks.reduce((acc, task, idx) => {
                            // Agrupar por hora y actividad
                            const prevTask = idx > 0 ? tasks[idx-1] : null;
                            const isNewGroup = !prevTask || prevTask.time !== task.time || prevTask.activity !== task.activity;
                            
                            if (isNewGroup) {
                                acc.push({
                                    time: task.time,
                                    activity: task.activity,
                                    items: [task]
                                });
                            } else {
                                acc[acc.length - 1].items.push(task);
                            }
                            return acc;
                        }, []).map((group, gIdx) => (
                            <Card key={`${group.time}-${group.activity}-${gIdx}`} className="overflow-hidden border-slate-200 shadow-sm">
                                <CardHeader className="bg-slate-50/80 border-b py-3 px-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="bg-white font-mono text-blue-600 border-blue-200">
                                                {group.time}
                                            </Badge>
                                            <h3 className="font-bold text-slate-800">{group.activity}</h3>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-slate-100">
                                        {group.items.map((item) => {
                                            const data = checklistData[item.id] || {};
                                            return (
                                                <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                                                        <div className="md:col-span-4">
                                                            <p className="text-sm font-medium text-slate-700">{item.description}</p>
                                                            {item.subdepartment && (
                                                                <Badge variant="outline" className="text-[9px] mt-1 bg-slate-100">
                                                                    {item.subdepartment}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        
                                                        <div className="md:col-span-2 flex items-center justify-center gap-2">
                                                            <button 
                                                                onClick={() => updateTaskStatus(item.id, 'ok')}
                                                                className={`p-2 rounded-lg transition-all ${data.status === 'ok' ? 'bg-green-100 text-green-700 ring-2 ring-green-500' : 'bg-slate-100 text-slate-400 hover:bg-green-50'}`}
                                                            >
                                                                <CheckCircle2 className="w-5 h-5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => updateTaskStatus(item.id, 'fail')}
                                                                className={`p-2 rounded-lg transition-all ${data.status === 'fail' ? 'bg-red-100 text-red-700 ring-2 ring-red-500' : 'bg-slate-100 text-slate-400 hover:bg-red-50'}`}
                                                            >
                                                                <XCircle className="w-5 h-5" />
                                                            </button>
                                                        </div>

                                                        <div className="md:col-span-3">
                                                            {item.type === 'text' && (
                                                                <Input 
                                                                    placeholder="Valor..." 
                                                                    value={data.value || ""}
                                                                    onChange={(e) => updateTaskValue(item.id, e.target.value)}
                                                                    className="h-8 text-sm"
                                                                />
                                                            )}
                                                            {item.type === 'boolean' && (
                                                                <div className="flex gap-4">
                                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                                        <Checkbox 
                                                                            checked={data.value === 'SÍ'} 
                                                                            onCheckedChange={(val) => updateTaskValue(item.id, val ? 'SÍ' : null)}
                                                                        />
                                                                        <span className="text-xs">SÍ</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                                        <Checkbox 
                                                                            checked={data.value === 'NO'} 
                                                                            onCheckedChange={(val) => updateTaskValue(item.id, val ? 'NO' : null)}
                                                                        />
                                                                        <span className="text-xs">NO</span>
                                                                    </label>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="md:col-span-3">
                                                            <div className="relative group">
                                                                <Input 
                                                                    placeholder="Observaciones..." 
                                                                    value={data.observations || ""}
                                                                    onChange={(e) => updateTaskObservations(item.id, e.target.value)}
                                                                    className="h-8 text-sm pr-8"
                                                                />
                                                                {data.status === 'fail' && !data.observations && (
                                                                    <AlertTriangle className="w-4 h-4 text-amber-500 absolute right-2 top-2 animate-pulse" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>

                {/* Acciones Finales */}
                <div className="flex justify-center pt-8 gap-4">
                    <Button variant="outline" className="gap-2" onClick={() => {
                        if(confirm("¿Estás seguro de que quieres limpiar todos los campos?")) setChecklistData({});
                    }}>
                        <RotateCcw className="w-4 h-4" />
                        Reiniciar Formulario
                    </Button>
                    <Link to={createPageUrl("ShiftIncidentManagement")}>
                        <Button variant="outline" className="gap-2 border-red-200 text-red-600 hover:bg-red-50">
                            <AlertTriangle className="w-4 h-4" />
                            Reportar Incidencias
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
