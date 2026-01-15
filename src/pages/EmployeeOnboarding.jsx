import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  BookOpen, // Added for 'training' tab
  Bot // Added for 'AI Assistant' tab
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import OnboardingDashboard from "../components/onboarding/OnboardingDashboard";
import OnboardingAIAssistant from "../components/onboarding/OnboardingAIAssistant";

export default function EmployeeOnboardingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  // const [showWizard, setShowWizard] = useState(false); // Removed as wizard is now a tab
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [activeTab, setActiveTab] = useState("active"); // New state for active tab
  const [selectedEmployee, setSelectedEmployee] = useState(null); // New state for AI assistant
  const queryClient = useQueryClient();

  const { data: onboardings, isLoading } = useQuery({
    queryKey: ['employeeOnboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list('-created_date'),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: [],
  });

  const deleteOnboardingMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeOnboarding.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
    },
  });

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
              Onboarding de Empleados
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona el proceso de incorporación de nuevos empleados
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="active">
              <Users className="w-4 h-4 mr-2" />
              Activos
            </TabsTrigger>
            <TabsTrigger value="dashboard">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="wizard">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Onboarding
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

          <TabsContent value="wizard" className="space-y-6">
            <OnboardingWizard
              onboarding={selectedOnboarding}
              onClose={handleCloseWizard}
            />
          </TabsContent>

          <TabsContent value="training" className="space-y-6">
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-slate-500">Contenido para Formaciones (en desarrollo)</p>
              </CardContent>
            </Card>
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
