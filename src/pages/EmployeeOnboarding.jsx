import { useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePersistentAppConfig } from "@/hooks/usePersistentAppConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Icons
import {
  UserPlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Plus,
  BarChart3,
  Calendar,
  BookOpen,
  Bot,
  Briefcase,
  Upload,
  Trash2,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useAppData } from "../components/data/DataProvider";
import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import OnboardingDashboard from "../components/onboarding/OnboardingDashboard";
import OnboardingAIAssistant from "../components/onboarding/OnboardingAIAssistant";
import PositionProfileManager from "../components/onboarding/PositionProfileManager";

export default function EmployeeOnboardingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [newDoc, setNewDoc] = useState({ title: "", description: "", url: "" });
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      toast.info("Subiendo archivo...");
      // Check if integrations.Core.UploadFile exists
      if (base44.integrations?.Core?.UploadFile) {
        const result = await base44.integrations.Core.UploadFile({ file });
        if (result && result.file_url) {
          setNewDoc(prev => ({
            ...prev,
            url: result.file_url,
            title: prev.title || file.name // Auto-fill title if empty
          }));
          toast.success("Archivo subido correctamente");
        } else {
           throw new Error("No file URL returned");
        }
      } else {
        // Fallback for demo if not implemented in real client yet
        console.warn("UploadFile integration not found");
        toast.error("La subida de archivos no está configurada en este entorno");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error al subir el archivo");
    }
  };
  const [newTraining, setNewTraining] = useState({
    title: "",
    colectivo: "",
    fecha: "",
    estado: "Pendiente",
  });
  const queryClient = useQueryClient();
  const { masterEmployees: employees } = useAppData();

  const { data: onboardings, isLoading } = useQuery({
    queryKey: ['employeeOnboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list('-created_date'),
    initialData: [],
  });

  const { 
    data: trainingResources, 
    save: saveTrainingResources 
  } = usePersistentAppConfig(
    'onboarding_training_resources',
    [],
    'onboardingTrainingResources',
    true
  );

  const deleteOnboardingMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeOnboarding.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
    },
  });

  // Adapter for existing code
  const createTrainingResourceMutation = {
    mutate: saveTrainingResources
  };

  const getEmployeeName = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    return emp?.nombre || "Empleado desconocido";
  };

  const getEmployeeData = (employeeId) => {
    return employees.find(e => e.id === employeeId);
  };

  const getDaysInProcess = (onboarding) => {
    try {
      if (!onboarding.fecha_inicio) return 0;
      const start = new Date(onboarding.fecha_inicio);
      if (isNaN(start.getTime())) return 0;
      const end = onboarding.fecha_completado ? new Date(onboarding.fecha_completado) : new Date();
      if (isNaN(end.getTime())) return 0;
      return differenceInDays(end, start);
    } catch {
      return 0;
    }
  };

  const filteredOnboardings = useMemo(() => {
    return onboardings.filter(ob => {
      const employeeName = getEmployeeName(ob.employee_id).toLowerCase();
      const matchesSearch = employeeName.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || ob.estado === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [onboardings, searchTerm, statusFilter, employees]);

  const stats = useMemo(() => {
    const total = onboardings.length;
    const enProceso = onboardings.filter(o => o.estado === "En Proceso").length;
    const completados = onboardings.filter(o => o.estado === "Completado").length;
    const pendientes = onboardings.filter(o => o.estado === "Pendiente").length;
    const avgProgress = onboardings.length > 0 
      ? Math.round(onboardings.reduce((sum, o) => sum + (o.porcentaje_completado || 0), 0) / onboardings.length)
      : 0;
    
    return { total, enProceso, completados, pendientes, avgProgress };
  }, [onboardings]);

  const upcomingStarts = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    return onboardings.filter(ob => {
      if (ob.estado === "Completado") return false;
      try {
        if (!ob.fecha_inicio) return false;
        const startDate = new Date(ob.fecha_inicio);
        if (isNaN(startDate.getTime())) return false;
        return startDate >= today && startDate <= nextWeek;
      } catch {
        return false;
      }
    }).sort((a, b) => {
      try {
        return new Date(a.fecha_inicio) - new Date(b.fecha_inicio);
      } catch {
        return 0;
      }
    });
  }, [onboardings]);

  const trainingDocs = useMemo(
    () => (trainingResources || []).filter(r => r.type === "document"),
    [trainingResources]
  );

  const trainings = useMemo(
    () => (trainingResources || []).filter(r => r.type === "training"),
    [trainingResources]
  );

  const handleAddDoc = () => {
    if (!newDoc.title || !newDoc.url) return;
    
    const doc = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      type: "document",
      ...newDoc
    };

    const updatedResources = [...trainingResources, doc];
    setNewDoc({ title: "", description: "", url: "" });
    createTrainingResourceMutation.mutate(updatedResources);
  };

  const handleDeleteDoc = (docId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este recurso de formación?")) {
      const updatedResources = trainingResources.filter(r => r.id !== docId);
      createTrainingResourceMutation.mutate(updatedResources);
    }
  };

  const handleAddTraining = () => {
    if (!newTraining.title || !newTraining.fecha) return;
    
    const training = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      type: "training",
      ...newTraining
    };

    const updatedResources = [...trainingResources, training];
    setNewTraining({
      title: "",
      colectivo: "",
      fecha: "",
      estado: "Pendiente",
    });
    createTrainingResourceMutation.mutate(updatedResources);
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (value === "ai" && !selectedEmployee) {
      const firstOnboarding = onboardings[0];
      if (firstOnboarding) {
        const emp = getEmployeeData(firstOnboarding.employee_id);
        if (emp) {
          setSelectedEmployee(emp);
        }
      }
    }
  };

  const handleEdit = (onboarding) => {
    setSelectedOnboarding(onboarding);
    setActiveTab("wizard"); // Navigate to wizard tab
  };

  const handleDelete = (onboarding) => {
    if (window.confirm(`¿Eliminar el proceso de onboarding de ${getEmployeeName(onboarding.employee_id)}?`)) {
      deleteOnboardingMutation.mutate(onboarding.id);
    }
  };

  const handleCloseWizard = () => {
    setSelectedOnboarding(null);
    setActiveTab("active"); // Navigate back to the active list tab
  };

  const getStatusBadge = (estado) => {
    const config = {
      "En Proceso": { color: "bg-blue-100 text-blue-800", icon: Clock },
      "Completado": { color: "bg-green-100 text-green-800", icon: CheckCircle2 },
      "Pendiente": { color: "bg-amber-100 text-amber-800", icon: AlertCircle }
    };
    
    const { color, icon: Icon } = config[estado] || config["Pendiente"];
    return (
      <Badge className={color}>
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-blue-600" />
              Onboarding
              <Badge variant="outline" className="text-xs font-normal ml-2 bg-blue-50">
                 Recursos: {trainingResources.length}
              </Badge>
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona incorporaciones y planes de acogida
            </p>
          </div>
          <Button
            onClick={() => { setSelectedOnboarding(null); setActiveTab("wizard"); }} // Navigate to wizard tab for new onboarding
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Onboarding
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="profiles">
              <Briefcase className="w-4 h-4 mr-2" />
              Perfiles y Puestos
            </TabsTrigger>
            <TabsTrigger value="active">
              <Users className="w-4 h-4 mr-2" />
              Activos
            </TabsTrigger>
            <TabsTrigger value="training">
              <BookOpen className="w-4 h-4 mr-2" />
              Formaciones
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Bot className="w-4 h-4 mr-2" />
              Asistente IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Total Activos</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-700 font-medium">En Proceso</p>
                      <p className="text-2xl font-bold text-amber-900">{stats.enProceso}</p>
                    </div>
                    <Clock className="w-8 h-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700 font-medium">Completados</p>
                      <p className="text-2xl font-bold text-green-900">{stats.completados}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-700 font-medium">Pendientes</p>
                      <p className="text-2xl font-bold text-purple-900">{stats.pendientes}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-indigo-700 font-medium">Progreso Promedio</p>
                      <p className="text-2xl font-bold text-indigo-900">{stats.avgProgress}%</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-indigo-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Próximas Incorporaciones */}
            {upcomingStarts.length > 0 && (
              <Card className="bg-blue-50 border-2 border-blue-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Calendar className="w-5 h-5" />
                    Próximas Incorporaciones (Próximos 7 días)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {upcomingStarts.map(ob => (
                      <div key={ob.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                        <div>
                          <span className="font-semibold text-slate-900">
                            {getEmployeeName(ob.employee_id)}
                          </span>
                          <span className="text-sm text-slate-600 ml-2">
                            - {getEmployeeData(ob.employee_id)?.departamento || "Sin departamento"}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-blue-700">
                            {(() => {
                              try {
                                if (!ob.fecha_inicio) return 'Sin fecha';
                                const date = new Date(ob.fecha_inicio);
                                if (isNaN(date.getTime())) return 'Fecha inválida';
                                return format(date, "EEEE, d 'de' MMMM", { locale: es });
                              } catch {
                                return 'Fecha inválida';
                              }
                            })()}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(ob)}
                          >
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filtros */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por nombre de empleado..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={statusFilter === "all" ? "default" : "outline"}
                      onClick={() => setStatusFilter("all")}
                      size="sm"
                    >
                      Todos
                    </Button>
                    <Button
                      variant={statusFilter === "Pendiente" ? "default" : "outline"}
                      onClick={() => setStatusFilter("Pendiente")}
                      size="sm"
                    >
                      Pendientes
                    </Button>
                    <Button
                      variant={statusFilter === "En Proceso" ? "default" : "outline"}
                      onClick={() => setStatusFilter("En Proceso")}
                      size="sm"
                    >
                      En Proceso
                    </Button>
                    <Button
                      variant={statusFilter === "Completado" ? "default" : "outline"}
                      onClick={() => setStatusFilter("Completado")}
                      size="sm"
                    >
                      Completados
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-500">Cargando procesos de onboarding...</div>
                ) : filteredOnboardings.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    No hay procesos de onboarding
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredOnboardings.map((onboarding) => {
                      const employee = getEmployeeData(onboarding.employee_id);
                      const daysInProcess = getDaysInProcess(onboarding);
                      
                      return (
                        <div key={onboarding.id} className="p-6 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-semibold text-slate-900">
                                  {getEmployeeName(onboarding.employee_id)}
                                </h3>
                                {getStatusBadge(onboarding.estado)}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
                                <div>
                                  <p className="text-xs text-slate-500">Departamento</p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {employee?.departamento || "No asignado"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Puesto</p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {employee?.puesto || "No asignado"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Fecha Inicio</p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {(() => {
                                      try {
                                        if (!onboarding.fecha_inicio) return 'Sin fecha';
                                        const date = new Date(onboarding.fecha_inicio);
                                        if (isNaN(date.getTime())) return 'Fecha inválida';
                                        return format(date, "dd/MM/yyyy", { locale: es });
                                      } catch {
                                        return 'Fecha inválida';
                                      }
                                    })()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-slate-500">Días en proceso</p>
                                  <p className="text-sm font-medium text-slate-900">
                                    {daysInProcess} días
                                  </p>
                                </div>
                              </div>

                              {/* Barra de Progreso */}
                              <div className="mt-4">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs text-slate-600">Progreso del Onboarding</span>
                                  <span className="text-xs font-semibold text-blue-600">
                                    {onboarding.porcentaje_completado || 0}%
                                  </span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${onboarding.porcentaje_completado || 0}%` }}
                                  />
                                </div>
                              </div>

                              {/* Paso Actual */}
                              <div className="mt-3">
                                <Badge variant="outline" className="bg-slate-50">
                                  Paso {onboarding.paso_actual || 1} de 6
                                </Badge>
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(onboarding)}
                              >
                                Ver Detalles
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(onboarding)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <OnboardingDashboard 
              onboardings={onboardings}
              employees={employees}
            />
          </TabsContent>

          <TabsContent value="profiles" className="space-y-6">
             <PositionProfileManager trainingResources={trainingResources} />
          </TabsContent>



          <TabsContent value="wizard" className="space-y-6">
            <OnboardingWizard
              onboarding={selectedOnboarding}
              onClose={handleCloseWizard}
            />
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>Documentos de formaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="grid grid-cols-1 gap-3">
                    <Input
                      placeholder="Título del documento"
                      value={newDoc.title}
                      onChange={(e) =>
                        setNewDoc((prev) => ({ ...prev, title: e.target.value }))
                      }
                    />
                    <Input
                      placeholder="Descripción breve"
                      value={newDoc.description}
                      onChange={(e) =>
                        setNewDoc((prev) => ({ ...prev, description: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enlace o ruta al documento"
                        value={newDoc.url}
                        onChange={(e) =>
                          setNewDoc((prev) => ({ ...prev, url: e.target.value }))
                        }
                      />
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        onChange={handleFileUpload} 
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        title="Subir archivo"
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddDoc}
                        disabled={!newDoc.title || !newDoc.url}
                        className="min-w-[100px]"
                      >
                        Confirmar
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 italic">
                        * Sube el archivo y pulsa "Confirmar" para guardarlo en la lista.
                    </p>
                  </div>

                  {trainingDocs.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      {trainingDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg bg-slate-50"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{doc.title}</p>
                            {doc.description && (
                              <p className="text-xs text-slate-600">{doc.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm text-blue-600 hover:underline"
                            >
                              Abrir
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteDoc(doc.id)}
                              title="Eliminar documento"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-8 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-500">No hay documentos cargados</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100">
                  <CardTitle>Plan de formaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1 md:col-span-2">
                      <Label>Formación</Label>
                      <Input
                        placeholder="Nombre de la formación"
                        value={newTraining.title}
                        onChange={(e) =>
                          setNewTraining((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Colectivo</Label>
                      <Input
                        placeholder="Ej: Operarios, Mandos intermedios..."
                        value={newTraining.colectivo}
                        onChange={(e) =>
                          setNewTraining((prev) => ({
                            ...prev,
                            colectivo: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Fecha</Label>
                      <Input
                        type="date"
                        value={newTraining.fecha}
                        onChange={(e) =>
                          setNewTraining((prev) => ({
                            ...prev,
                            fecha: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Estado</Label>
                      <Select
                        value={newTraining.estado}
                        onValueChange={(value) =>
                          setNewTraining((prev) => ({ ...prev, estado: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="Programado">Programado</SelectItem>
                          <SelectItem value="Realizado">Realizado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-4 flex justify-end">
                      <Button
                        type="button"
                        onClick={handleAddTraining}
                        disabled={!newTraining.title || !newTraining.fecha}
                      >
                        Añadir formación
                      </Button>
                    </div>
                  </div>

                  {trainings.length > 0 ? (
                    <div className="mt-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50">
                              <TableHead>Formación</TableHead>
                              <TableHead>Colectivo</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {trainings.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>{t.title}</TableCell>
                                <TableCell>{t.colectivo || "-"}</TableCell>
                                <TableCell>{t.fecha}</TableCell>
                                <TableCell>
                                  <Badge className="bg-slate-100 text-slate-800">
                                    {t.estado}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-8 text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                      <p className="text-sm text-slate-500">No hay planes de formación configurados</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="space-y-6">
            {selectedEmployee ? (
              <OnboardingAIAssistant employee={selectedEmployee} />
            ) : (
              <Card>
                <CardContent className="p-12 text-center flex flex-col items-center">
                  <p className="text-slate-500 mb-4">Selecciona un empleado para usar el asistente IA</p>
                  <Select 
                    value={selectedEmployee?.id || ""} 
                    onValueChange={(value) => {
                      const emp = employees.find(e => e.id === value);
                      setSelectedEmployee(emp);
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>


      </div>
    </div>
  );
}
