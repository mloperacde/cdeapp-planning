import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Filter,
  Download,
} from "lucide-react";
import { format, differenceInDays, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { useAppData } from "../components/data/DataProvider";
import OnboardingWizard from "../components/onboarding/OnboardingWizard";
import OnboardingDashboard from "../components/onboarding/OnboardingDashboard";
import OnboardingAIAssistant from "../components/onboarding/OnboardingAIAssistant";
import PositionProfileManager from "../components/onboarding/PositionProfileManager";
import EmployeeForm from "../components/employees/EmployeeForm";

export default function EmployeeOnboardingPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [ettFilters, setEttFilters] = useState({
    searchTerm: "",
    tipoContrato: "all",
    departamento: "all",
    alertaDias: "all",
    empresaETT: "all",
  });
  const [selectedEttEmployee, setSelectedEttEmployee] = useState(null);
  const [showEttEmployeeForm, setShowEttEmployeeForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: "", description: "", url: "" });
  const [newTraining, setNewTraining] = useState({
    title: "",
    colectivo: "",
    fecha: "",
    estado: "Pendiente",
  });
  const queryClient = useQueryClient();
  const { masterEmployees: employees, machines } = useAppData();

  const { data: onboardings, isLoading } = useQuery({
    queryKey: ['employeeOnboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list('-created_date'),
    initialData: [],
  });

  const { data: trainingResources = [] } = useQuery({
    queryKey: ["onboardingTrainingResources"],
    queryFn: async () => {
      const entity = base44.entities.OnboardingTrainingResource;
      if (!entity || typeof entity.list !== "function") {
        return [];
      }
      return entity.list("-created_at");
    },
    initialData: [],
  });

  const deleteOnboardingMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeOnboarding.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeOnboardings'] });
    },
  });

  const createTrainingResourceMutation = useMutation({
    mutationFn: async (data) => {
      const entity = base44.entities.OnboardingTrainingResource;
      if (!entity || typeof entity.create !== "function") {
        console.warn("OnboardingTrainingResource entity is not configured in Base44");
        return null;
      }
      return entity.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["onboardingTrainingResources"],
      });
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

  const ettAndTemporaryEmployees = useMemo(() => {
    const today = new Date();
    return employees
      .filter(emp => {
        const tipoContrato = emp.tipo_contrato?.toUpperCase() || "";
        return (
          tipoContrato.includes("ETT") ||
          tipoContrato.includes("TEMPORAL") ||
          tipoContrato.includes("OBRA Y SERVICIO") ||
          tipoContrato.includes("INTERINIDAD")
        );
      })
      .map(emp => {
        const fechaFin = emp.fecha_fin_contrato ? new Date(emp.fecha_fin_contrato) : null;
        const diasRestantes = fechaFin ? differenceInDays(fechaFin, today) : null;
        const vencido = fechaFin ? isBefore(fechaFin, today) : false;
        let estadoAlerta = "ok";
        if (vencido) {
          estadoAlerta = "vencido";
        } else if (diasRestantes !== null && diasRestantes <= 7) {
          estadoAlerta = "critico";
        } else if (diasRestantes !== null && diasRestantes <= 30) {
          estadoAlerta = "proximo";
        }
        return {
          ...emp,
          diasRestantes,
          vencido,
          estadoAlerta,
        };
      })
      .sort((a, b) => {
        if (a.vencido && !b.vencido) return -1;
        if (!a.vencido && b.vencido) return 1;
        if (a.diasRestantes === null && b.diasRestantes !== null) return 1;
        if (a.diasRestantes !== null && b.diasRestantes === null) return -1;
        if (a.diasRestantes !== null && b.diasRestantes !== null) {
          return a.diasRestantes - b.diasRestantes;
        }
        return 0;
      });
  }, [employees]);

  const ettStats = useMemo(() => {
    const total = ettAndTemporaryEmployees.length;
    const ettCount = ettAndTemporaryEmployees.filter(e =>
      e.tipo_contrato?.toUpperCase().includes("ETT")
    ).length;
    const temporalesCount = total - ettCount;
    const vencidos = ettAndTemporaryEmployees.filter(e => e.vencido).length;
    const proximos7dias = ettAndTemporaryEmployees.filter(
      e => !e.vencido && e.diasRestantes !== null && e.diasRestantes <= 7
    ).length;
    const proximos30dias = ettAndTemporaryEmployees.filter(
      e =>
        !e.vencido &&
        e.diasRestantes !== null &&
        e.diasRestantes > 7 &&
        e.diasRestantes <= 30
    ).length;
    const sinFecha = ettAndTemporaryEmployees.filter(e => !e.fecha_fin_contrato).length;
    return {
      total,
      ettCount,
      temporalesCount,
      vencidos,
      proximos7dias,
      proximos30dias,
      sinFecha,
    };
  }, [ettAndTemporaryEmployees]);

  const ettEmpresas = useMemo(() => {
    const empresas = new Set();
    ettAndTemporaryEmployees.forEach(emp => {
      if (emp.empresa_ett) empresas.add(emp.empresa_ett);
    });
    return Array.from(empresas).sort();
  }, [ettAndTemporaryEmployees]);

  const ettDepartments = useMemo(() => {
    const depts = new Set();
    ettAndTemporaryEmployees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [ettAndTemporaryEmployees]);

  const trainingDocs = useMemo(
    () => trainingResources.filter(r => r.type === "document"),
    [trainingResources]
  );

  const trainings = useMemo(
    () => trainingResources.filter(r => r.type === "training"),
    [trainingResources]
  );

  const ettFilteredEmployees = useMemo(() => {
    return ettAndTemporaryEmployees.filter(emp => {
      const matchesSearch =
        !ettFilters.searchTerm ||
        emp.nombre?.toLowerCase().includes(ettFilters.searchTerm.toLowerCase());
      const matchesTipo =
        ettFilters.tipoContrato === "all" ||
        (ettFilters.tipoContrato === "ETT" &&
          emp.tipo_contrato?.toUpperCase().includes("ETT")) ||
        (ettFilters.tipoContrato === "TEMPORAL" &&
          !emp.tipo_contrato?.toUpperCase().includes("ETT"));
      const matchesDept =
        ettFilters.departamento === "all" || emp.departamento === ettFilters.departamento;
      const matchesEmpresa =
        ettFilters.empresaETT === "all" || emp.empresa_ett === ettFilters.empresaETT;
      const matchesAlerta =
        ettFilters.alertaDias === "all" ||
        (ettFilters.alertaDias === "vencido" && emp.vencido) ||
        (ettFilters.alertaDias === "7" &&
          !emp.vencido &&
          emp.diasRestantes !== null &&
          emp.diasRestantes <= 7) ||
        (ettFilters.alertaDias === "30" &&
          !emp.vencido &&
          emp.diasRestantes !== null &&
          emp.diasRestantes > 7 &&
          emp.diasRestantes <= 30) ||
        (ettFilters.alertaDias === "sinFecha" && !emp.fecha_fin_contrato);
      return (
        matchesSearch &&
        matchesTipo &&
        matchesDept &&
        matchesEmpresa &&
        matchesAlerta
      );
    });
  }, [ettAndTemporaryEmployees, ettFilters]);

  const getEttEstadoBadge = (estadoAlerta, diasRestantes, vencido) => {
    if (vencido) {
      return <Badge className="bg-red-600 text-white">Vencido</Badge>;
    }
    if (estadoAlerta === "critico") {
      return <Badge className="bg-orange-600 text-white">≤ 7 días</Badge>;
    }
    if (estadoAlerta === "proximo") {
      return <Badge className="bg-amber-100 text-amber-800">≤ 30 días</Badge>;
    }
    if (diasRestantes === null) {
      return <Badge variant="outline">Sin fecha</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">OK</Badge>;
  };

  const handleEttExportCSV = () => {
    const csv = [
      "Empleado,Tipo Contrato,Empresa ETT,Departamento,Fecha Alta,Fecha Fin Contrato,Días Restantes,Estado",
      ...ettFilteredEmployees.map(emp =>
        [
          emp.nombre,
          emp.tipo_contrato || "",
          emp.empresa_ett || "",
          emp.departamento || "",
          emp.fecha_alta ? format(new Date(emp.fecha_alta), "dd/MM/yyyy") : "",
          emp.fecha_fin_contrato
            ? format(new Date(emp.fecha_fin_contrato), "dd/MM/yyyy")
            : "",
          emp.diasRestantes !== null ? emp.diasRestantes : "Sin fecha",
          emp.vencido
            ? "Vencido"
            : emp.estadoAlerta === "critico"
            ? "Crítico"
            : emp.estadoAlerta === "proximo"
            ? "Próximo"
            : "OK",
        ]
          .map(field => `"${String(field).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `empleados_ett_temporales_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleEttViewDetail = employee => {
    setSelectedEttEmployee(employee);
    setShowEttEmployeeForm(true);
  };

  const handleAddDoc = () => {
    if (!newDoc.title || !newDoc.url) return;
    createTrainingResourceMutation.mutate({
      type: "document",
      title: newDoc.title,
      description: newDoc.description,
      url: newDoc.url,
    });
    setNewDoc({ title: "", description: "", url: "" });
  };

  const handleAddTraining = () => {
    if (!newTraining.title || !newTraining.fecha) return;
    createTrainingResourceMutation.mutate({
      type: "training",
      title: newTraining.title,
      colectivo: newTraining.colectivo,
      fecha: newTraining.fecha,
      estado: newTraining.estado,
    });
    setNewTraining({
      title: "",
      colectivo: "",
      fecha: "",
      estado: "Pendiente",
    });
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
              ETT, Temporales, Onboarding
            </h1>
            <p className="text-slate-600 mt-1">
              Gestiona incorporaciones, contratos temporales y empleados ETT
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
            <TabsTrigger value="temporary">
              <Clock className="w-4 h-4 mr-2" />
              ETT y Temporales
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
             <PositionProfileManager />
          </TabsContent>

          <TabsContent value="temporary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Total ETT + Temporales</p>
                      <p className="text-2xl font-bold text-blue-900">{ettStats.total}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        ETT: {ettStats.ettCount} | Temp: {ettStats.temporalesCount}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-700 font-medium">Contratos Vencidos</p>
                      <p className="text-2xl font-bold text-red-900">{ettStats.vencidos}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-orange-700 font-medium">Vencen en 7 días</p>
                      <p className="text-2xl font-bold text-orange-900">{ettStats.proximos7dias}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-amber-700 font-medium">Vencen en 30 días</p>
                      <p className="text-2xl font-bold text-amber-900">{ettStats.proximos30dias}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Buscar por Nombre</Label>
                    <Input
                      placeholder="Nombre del empleado..."
                      value={ettFilters.searchTerm}
                      onChange={e =>
                        setEttFilters({ ...ettFilters, searchTerm: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Contrato</Label>
                    <Select
                      value={ettFilters.tipoContrato}
                      onValueChange={value =>
                        setEttFilters({ ...ettFilters, tipoContrato: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="ETT">ETT</SelectItem>
                        <SelectItem value="TEMPORAL">Temporal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {ettFilters.tipoContrato !== "TEMPORAL" && (
                    <div className="space-y-2">
                      <Label>Empresa ETT</Label>
                      <Select
                        value={ettFilters.empresaETT}
                        onValueChange={value =>
                          setEttFilters({ ...ettFilters, empresaETT: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {ettEmpresas.map(empresa => (
                            <SelectItem key={empresa} value={empresa}>
                              {empresa}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Select
                      value={ettFilters.departamento}
                      onValueChange={value =>
                        setEttFilters({ ...ettFilters, departamento: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {ettDepartments.map(dept => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado de Alerta</Label>
                    <Select
                      value={ettFilters.alertaDias}
                      onValueChange={value =>
                        setEttFilters({ ...ettFilters, alertaDias: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="vencido">Vencidos</SelectItem>
                        <SelectItem value="7">Vencen en ≤ 7 días</SelectItem>
                        <SelectItem value="30">Vencen en ≤ 30 días</SelectItem>
                        <SelectItem value="sinFecha">Sin fecha fin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 flex items-center justify-between">
                <CardTitle>
                  Empleados ETT y Temporales ({ettFilteredEmployees.length})
                </CardTitle>
                <Button onClick={handleEttExportCSV} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Empleado</TableHead>
                        <TableHead>Tipo Contrato</TableHead>
                        <TableHead>Empresa ETT</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Fecha Alta</TableHead>
                        <TableHead>Fecha Fin Contrato</TableHead>
                        <TableHead>Días Restantes</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ettFilteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={9}
                            className="text-center py-12 text-slate-500"
                          >
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay empleados con los filtros seleccionados
                          </TableCell>
                        </TableRow>
                      ) : (
                        ettFilteredEmployees.map(employee => (
                          <TableRow
                            key={employee.id}
                            className={`hover:bg-slate-50 ${
                              employee.vencido
                                ? "bg-red-50"
                                : employee.estadoAlerta === "critico"
                                ? "bg-orange-50"
                                : ""
                            }`}
                          >
                            <TableCell>
                              <div className="font-semibold text-slate-900">
                                {employee.nombre}
                              </div>
                              {employee.codigo_empleado && (
                                <div className="text-xs text-slate-500">
                                  {employee.codigo_empleado}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  employee.tipo_contrato?.toUpperCase().includes("ETT")
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-blue-100 text-blue-800"
                                }
                              >
                                {employee.tipo_contrato || "No especificado"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-slate-700">
                                {employee.empresa_ett || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-slate-700">
                                {employee.departamento || "-"}
                              </div>
                            </TableCell>
                            <TableCell>
                              {employee.fecha_alta ? (
                                <div className="text-sm">
                                  {format(
                                    new Date(employee.fecha_alta),
                                    "dd/MM/yyyy",
                                    { locale: es }
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {employee.fecha_fin_contrato ? (
                                <div className="text-sm font-medium">
                                  {format(
                                    new Date(employee.fecha_fin_contrato),
                                    "dd/MM/yyyy",
                                    { locale: es }
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm">Sin fecha</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {employee.diasRestantes !== null ? (
                                <div
                                  className={`text-sm font-bold ${
                                    employee.vencido
                                      ? "text-red-600"
                                      : employee.diasRestantes <= 7
                                      ? "text-orange-600"
                                      : employee.diasRestantes <= 30
                                      ? "text-amber-600"
                                      : "text-green-600"
                                  }`}
                                >
                                  {employee.vencido
                                    ? `Vencido hace ${Math.abs(
                                        employee.diasRestantes
                                      )} días`
                                    : `${employee.diasRestantes} días`}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getEttEstadoBadge(
                                employee.estadoAlerta,
                                employee.diasRestantes,
                                employee.vencido
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEttViewDetail(employee)}
                              >
                                Ver Detalle
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {ettStats.sinFecha > 0 && (
              <Card className="mt-6 bg-amber-50 border-2 border-amber-300">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        Atención: Contratos sin fecha de finalización
                      </p>
                      <p className="text-sm text-amber-800 mt-1">
                        Hay <strong>{ettStats.sinFecha}</strong> empleado(s) ETT o
                        temporal(es) sin fecha de fin de contrato registrada. 
                        Por favor, actualiza esta información para un mejor seguimiento.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
                      <Button
                        type="button"
                        onClick={handleAddDoc}
                        disabled={!newDoc.title || !newDoc.url}
                      >
                        Añadir
                      </Button>
                    </div>
                  </div>

                  {trainingDocs.length > 0 && (
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
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            Abrir
                          </a>
                        </div>
                      ))}
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

                  {trainings.length > 0 && (
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

        {showEttEmployeeForm && selectedEttEmployee && (
          <EmployeeForm
            employee={selectedEttEmployee}
            machines={machines}
            onClose={() => {
              setShowEttEmployeeForm(false);
              setSelectedEttEmployee(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
