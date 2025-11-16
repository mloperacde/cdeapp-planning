import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash2, Users, Search, Filter, UserX, TrendingUp, UsersRound, Building2, Cake, UserCheck, Calendar, FileText, Award, UserPlus, Download } from "lucide-react";
import EmployeeForm from "../components/employees/EmployeeForm";
import BirthdayPanel from "../components/employees/BirthdayPanel";
import AnniversaryPanel from "../components/employees/AnniversaryPanel";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";

const isSameDay2 = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

export default function EmployeesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [filters, setFilters] = useState({
    tipo_jornada: "all",
    tipo_turno: "all",
    equipo: "all",
    disponibilidad: "all",
    departamento: "all",
    puesto: "all",
    tipo_contrato: "all",
    empresa_ett: "all",
    estado_empleado: "all",
  });
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: absences } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: onboardings = [] } = useQuery({
    queryKey: ['onboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list(),
    initialData: [],
  });

  const { data: vacationBalances = [] } = useQuery({
    queryKey: ['vacationBalances'],
    queryFn: () => base44.entities.AbsenceDaysBalance.list(),
    initialData: [],
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list('orden'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const activeAbsences = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return absences.filter(abs => {
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return now >= start && now <= end && abs.estado_aprobacion === "Aprobada";
    });
  }, [absences]);

  const pendingAbsences = useMemo(() => {
    return absences.filter(abs => abs.estado_aprobacion === "Pendiente");
  }, [absences]);

  const activeOnboardings = useMemo(() => {
    return onboardings.filter(o => o.estado !== "Completado");
  }, [onboardings]);

  const vacationSummary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const thisYearBalances = vacationBalances.filter(v => v.anio === currentYear && v.tipo_permiso === "Vacaciones");
    
    const totalDays = thisYearBalances.reduce((sum, v) => sum + (v.dias_totales_derecho || 0), 0);
    const consumedDays = thisYearBalances.reduce((sum, v) => sum + (v.dias_disfrutados || 0), 0);
    const pendingDays = thisYearBalances.reduce((sum, v) => sum + (v.dias_pendientes || 0), 0);
    
    return { totalDays, consumedDays, pendingDays };
  }, [vacationBalances]);

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const puestos = useMemo(() => {
    const psts = new Set();
    employees.forEach(emp => {
      if (emp.puesto) psts.add(emp.puesto);
    });
    return Array.from(psts).sort();
  }, [employees]);

  const tiposContrato = useMemo(() => {
    const tipos = new Set();
    employees.forEach(emp => {
      if (emp.tipo_contrato) tipos.add(emp.tipo_contrato);
    });
    return Array.from(tipos).sort();
  }, [employees]);

  const empresasETT = useMemo(() => {
    const empresas = new Set();
    employees.forEach(emp => {
      if (emp.empresa_ett) empresas.add(emp.empresa_ett);
    });
    return Array.from(empresas).sort();
  }, [employees]);

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    return employees.filter(emp => {
      if (!emp.fecha_nacimiento) return false;
      try {
        const birthDate = new Date(emp.fecha_nacimiento);
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        thisYearBirthday.setHours(0, 0, 0, 0);

        return (isSameDay2(thisYearBirthday, today) || (thisYearBirthday >= today && thisYearBirthday <= nextWeek));
      } catch {
        return false;
      }
    }).sort((a, b) => {
      const aBirthDate = new Date(a.fecha_nacimiento);
      const bBirthDate = new Date(b.fecha_nacimiento);
      const aThisYearBirthday = new Date(today.getFullYear(), aBirthDate.getMonth(), aBirthDate.getDate());
      const bThisYearBirthday = new Date(today.getFullYear(), bBirthDate.getMonth(), bBirthDate.getDate());
      return aThisYearBirthday - bThisYearBirthday;
    });
  }, [employees]);

  const recentHires = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return employees.filter(emp => {
      if (!emp.fecha_alta) return false;
      const hireDate = new Date(emp.fecha_alta);
      return hireDate >= thirtyDaysAgo;
    }).sort((a, b) => new Date(b.fecha_alta) - new Date(a.fecha_alta));
  }, [employees]);

  const expiringContracts = useMemo(() => {
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    
    return employees.filter(emp => {
      if (!emp.fecha_fin_contrato) return false;
      const endDate = new Date(emp.fecha_fin_contrato);
      return endDate >= now && endDate <= threeMonthsFromNow;
    }).sort((a, b) => new Date(a.fecha_fin_contrato) - new Date(b.fecha_fin_contrato));
  }, [employees]);

  const hasActiveAbsenceToday = (employeeId) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0); 

    return absences.some(absence => {
      if (absence.employee_id !== employeeId) return false;
      const start = new Date(absence.fecha_inicio);
      const end = new Date(absence.fecha_fin);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      return now >= start && now <= end;
    });
  };

  const employeesByDepartment = useMemo(() => {
    const byDept = {};
    employees.forEach(emp => {
      const dept = emp.departamento || 'Sin Departamento';
      if (!byDept[dept]) {
        byDept[dept] = { total: 0, available: 0 };
      }
      byDept[dept].total++;
      if (!hasActiveAbsenceToday(emp.id)) {
        byDept[dept].available++;
      }
    });
    return Object.entries(byDept).sort((a, b) => b[1].total - a[1].total);
  }, [employees, absences]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.equipo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTipoJornada = filters.tipo_jornada === "all" || emp.tipo_jornada === filters.tipo_jornada;
      const matchesTipoTurno = filters.tipo_turno === "all" || emp.tipo_turno === filters.tipo_turno;
      const matchesEquipo = filters.equipo === "all" || emp.equipo === filters.equipo;
      const matchesDisponibilidad = filters.disponibilidad === "all" || emp.disponibilidad === filters.disponibilidad;
      const matchesDepartamento = filters.departamento === "all" || emp.departamento === filters.departamento;
      const matchesPuesto = filters.puesto === "all" || emp.puesto === filters.puesto;
      const matchesTipoContrato = filters.tipo_contrato === "all" || emp.tipo_contrato === filters.tipo_contrato;
      const matchesEmpresaETT = filters.empresa_ett === "all" || emp.empresa_ett === filters.empresa_ett;
      const matchesEstado = filters.estado_empleado === "all" || (emp.estado_empleado || "Alta") === filters.estado_empleado;
      
      return matchesSearch && matchesTipoJornada && matchesTipoTurno && matchesEquipo && matchesDisponibilidad && matchesDepartamento && matchesPuesto && matchesTipoContrato && matchesEmpresaETT && matchesEstado;
    });
  }, [employees, searchTerm, filters]);

  const getAvailabilityBadge = (employee) => {
    if (employee.disponibilidad === "Ausente") {
      return <Badge variant="destructive">Ausente</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Disponible</Badge>;
  };

  const getEstadoBadge = (employee) => {
    const estado = employee.estado_empleado || "Alta";
    if (estado === "Baja") {
      return <Badge variant="destructive">Baja</Badge>;
    }
    return <Badge className="bg-green-600 text-white">Alta</Badge>;
  };

  const isEmployeeAbsent = (employee) => {
    return employee.disponibilidad === "Ausente";
  };

  const downloadAbsenceTypesPDF = () => {
    const printWindow = window.open('', '_blank');
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tipos de Ausencias y Permisos - ${format(new Date(), 'dd/MM/yyyy')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              background: white;
            }
            h1 { 
              color: #1e293b; 
              margin-bottom: 10px;
              font-size: 24px;
            }
            .subtitle { 
              color: #64748b; 
              margin-bottom: 30px;
              font-size: 14px;
            }
            .absence-type {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            .absence-header {
              display: flex;
              align-items: center;
              gap: 10px;
              margin-bottom: 10px;
              padding-bottom: 10px;
              border-bottom: 2px solid #e2e8f0;
            }
            .absence-title {
              font-size: 16px;
              font-weight: bold;
              color: #0f172a;
            }
            .absence-code {
              padding: 2px 8px;
              background: #f1f5f9;
              border-radius: 4px;
              font-size: 11px;
              color: #64748b;
            }
            .badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              margin-right: 5px;
              margin-bottom: 5px;
            }
            .badge-green { background: #d1fae5; color: #065f46; }
            .badge-orange { background: #fed7aa; color: #9a3412; }
            .badge-red { background: #fecaca; color: #991b1b; }
            .badge-gray { background: #f1f5f9; color: #475569; }
            .info-section {
              margin-top: 10px;
              font-size: 13px;
              line-height: 1.6;
            }
            .info-label {
              font-weight: bold;
              color: #475569;
            }
            .info-value {
              color: #0f172a;
              margin-bottom: 5px;
            }
            @media print {
              body { padding: 20px; }
              .absence-type { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <h1>Tipos de Ausencias y Permisos</h1>
          <p class="subtitle">Generado el ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
          
          ${absenceTypes.map(type => `
            <div class="absence-type">
              <div class="absence-header">
                <span class="absence-title">${type.nombre}</span>
                <span class="absence-code">${type.codigo}</span>
              </div>
              
              <div>
                ${type.remunerada ? '<span class="badge badge-green">Remunerada</span>' : ''}
                ${type.requiere_aprobacion ? '<span class="badge badge-orange">Requiere Aprobación</span>' : ''}
                ${type.es_critica ? '<span class="badge badge-red">Crítica</span>' : ''}
                <span class="badge badge-gray">${type.categoria_principal}</span>
                <span class="badge badge-gray">${type.subcategoria}</span>
              </div>
              
              <div class="info-section">
                ${type.descripcion ? `<div class="info-value">${type.descripcion}</div>` : ''}
                
                ${type.duracion_descripcion ? `
                  <div><span class="info-label">Duración:</span> <span class="info-value">${type.duracion_descripcion}</span></div>
                ` : ''}
                
                ${type.hecho_causante ? `
                  <div><span class="info-label">Hecho Causante:</span> <span class="info-value">${type.hecho_causante}</span></div>
                ` : ''}
                
                ${type.articulo_referencia ? `
                  <div><span class="info-label">Referencia Legal:</span> <span class="info-value">${type.articulo_referencia}</span></div>
                ` : ''}
                
                ${type.consideraciones ? `
                  <div><span class="info-label">Consideraciones:</span> <span class="info-value">${type.consideraciones}</span></div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const subPages = [
    {
      title: "Gestión de Ausencias",
      description: "Registra y gestiona ausencias de empleados",
      icon: UserX,
      url: createPageUrl("AbsenceManagement"),
      color: "red"
    },
    {
      title: "Gestión de Rendimiento",
      description: "Evaluaciones y planes de mejora",
      icon: TrendingUp,
      url: createPageUrl("PerformanceManagement"),
      color: "emerald"
    },
    {
      title: "Equipos de Turno",
      description: "Configura equipos y turnos rotativos",
      icon: UsersRound,
      url: createPageUrl("TeamConfiguration"),
      color: "purple"
    }
  ];

  const colorClasses = {
    red: "from-red-500 to-red-600",
    emerald: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
    blue: "from-blue-500 to-blue-600"
  };

  const departmentColors = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-pink-500 to-pink-600',
    'from-orange-500 to-orange-600',
    'from-green-500 to-green-600',
    'from-indigo-500 to-indigo-600',
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Gestión de RRHH
            </h1>
            <p className="text-slate-600 mt-1">
              Panel de control y gestión de empleados
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadAbsenceTypesPDF} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Descargar Guía PDF
            </Button>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="dashboard">Panel de Control</TabsTrigger>
            <TabsTrigger value="employees">Lista de Empleados</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Total Empleados</p>
                      <p className="text-4xl font-bold mt-2">{employees.length}</p>
                    </div>
                    <Users className="w-12 h-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-green-500 to-green-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Disponibles</p>
                      <p className="text-4xl font-bold mt-2">
                        {employees.filter(e => e.disponibilidad === "Disponible").length}
                      </p>
                    </div>
                    <UserCheck className="w-12 h-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-red-500 to-red-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Ausencias Activas</p>
                      <p className="text-4xl font-bold mt-2">{activeAbsences.length}</p>
                    </div>
                    <UserX className="w-12 h-12 text-red-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Solicitudes Pendientes</p>
                      <p className="text-4xl font-bold mt-2">{pendingAbsences.length}</p>
                    </div>
                    <Calendar className="w-12 h-12 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Resumen de Vacaciones {new Date().getFullYear()}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-blue-900">Días Totales</span>
                      <Badge className="bg-blue-600 text-white text-lg px-3">
                        {vacationSummary.totalDays}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-red-900">Días Consumidos</span>
                      <Badge className="bg-red-600 text-white text-lg px-3">
                        {vacationSummary.consumedDays}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-green-900">Días Pendientes</span>
                      <Badge className="bg-green-600 text-white text-lg px-3">
                        {vacationSummary.pendingDays}
                      </Badge>
                    </div>
                  </div>
                  <Link to={createPageUrl("AbsenceManagement")}>
                    <Button className="w-full" variant="outline">Ver Detalles</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                    Estado de Onboarding
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="text-center p-4 bg-emerald-50 rounded-lg">
                    <div className="text-3xl font-bold text-emerald-900">{activeOnboardings.length}</div>
                    <div className="text-sm text-emerald-700">En Proceso</div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-slate-700">Altas Recientes (30 días)</p>
                    {recentHires.slice(0, 3).map(emp => (
                      <div key={emp.id} className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-sm font-medium text-slate-900">{emp.nombre}</p>
                        <p className="text-xs text-slate-600">
                          {format(new Date(emp.fecha_alta), "d MMM", { locale: es })} • {emp.puesto || 'Sin puesto'}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link to={createPageUrl("EmployeeOnboarding")}>
                    <Button className="w-full" variant="outline">Ver Onboarding</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    Distribución por Departamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    {employeesByDepartment.slice(0, 5).map(([dept, stats], index) => (
                      <div key={dept} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${departmentColors[index % departmentColors.length]}`} />
                          <span className="text-sm font-medium text-slate-700">{dept}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {stats.total}
                          </Badge>
                          <Badge className="bg-green-600 text-white text-xs">
                            {stats.available} disp.
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-600" />
                    Solicitudes de Ausencia Pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {pendingAbsences.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No hay solicitudes pendientes</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {pendingAbsences.map(abs => {
                        const emp = employees.find(e => e.id === abs.employee_id);
                        return (
                          <div key={abs.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="font-semibold text-sm text-amber-900">{emp?.nombre || 'Empleado'}</p>
                            <p className="text-xs text-amber-700">
                              {abs.motivo} • {format(new Date(abs.fecha_inicio), "d MMM", { locale: es })} - 
                              {format(new Date(abs.fecha_fin), "d MMM", { locale: es })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <Link to={createPageUrl("AbsenceManagement")}>
                    <Button className="w-full mt-4" variant="outline">Gestionar Ausencias</Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-red-600" />
                    Contratos Próximos a Vencer (3 meses)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {expiringContracts.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">No hay contratos próximos a vencer</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {expiringContracts.map(emp => {
                        const daysUntil = differenceInDays(new Date(emp.fecha_fin_contrato), new Date());
                        return (
                          <div key={emp.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="font-semibold text-sm text-red-900">{emp.nombre}</p>
                            <p className="text-xs text-red-700">
                              Vence: {format(new Date(emp.fecha_fin_contrato), "d MMM yyyy", { locale: es })}
                              {' '}({daysUntil} días)
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sub-pages */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subPages.map((page) => {
                const Icon = page.icon;
                return (
                  <Link key={page.title} to={page.url}>
                    <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                      <CardContent className="p-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[page.color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {page.title}
                        </h3>
                        <p className="text-xs text-slate-600">{page.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-1">
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm h-full">
                  <CardHeader className="border-b border-slate-100 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Cake className="w-5 h-5 text-purple-600" />
                      Próximos Cumpleaños
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    {upcomingBirthdays.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-slate-500">No hay cumpleaños esta semana</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {upcomingBirthdays.map(emp => {
                          const birthDate = new Date(emp.fecha_nacimiento);
                          const thisYearBirthday = new Date(new Date().getFullYear(), birthDate.getMonth(), birthDate.getDate());
                          const isToday = isSameDay2(thisYearBirthday, new Date());
                          
                          return (
                            <div 
                              key={emp.id} 
                              className={`p-2 rounded-lg ${
                                isToday ? 'bg-purple-100 border-2 border-purple-400' : 'bg-slate-50'
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-semibold text-sm text-slate-900">{emp.nombre}</div>
                                  <div className="text-xs text-slate-600">
                                    {format(thisYearBirthday, "d 'de' MMMM", { locale: es })}
                                  </div>
                                </div>
                                {isToday && (
                                  <Badge className="bg-purple-600 text-white">
                                    ¡HOY! 🎉
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              <div className="lg:col-span-1">
                <AnniversaryPanel employees={employees} compact={true} />
              </div>

              <div className="lg:col-span-1">
                <VacationPendingBalancePanel employees={employees} compact={true} />
              </div>
            </div>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Búsqueda</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Buscar empleados..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={filters.estado_empleado} onValueChange={(value) => setFilters({...filters, estado_empleado: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Baja">Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Puesto</Label>
                    <Select value={filters.puesto} onValueChange={(value) => setFilters({...filters, puesto: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {puestos.map((puesto) => (
                          <SelectItem key={puesto} value={puesto}>
                            {puesto}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo Contrato</Label>
                    <Select value={filters.tipo_contrato} onValueChange={(value) => {
                      const newFilters = { ...filters, tipo_contrato: value };
                      if (value === "all" || !value?.toUpperCase().includes('ETT')) {
                        newFilters.empresa_ett = "all";
                      }
                      setFilters(newFilters);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {tiposContrato.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {filters.tipo_contrato !== "all" && filters.tipo_contrato?.toUpperCase().includes('ETT') && (
                    <div className="space-y-2">
                      <Label>Empresa ETT</Label>
                      <Select value={filters.empresa_ett || "all"} onValueChange={(value) => setFilters({...filters, empresa_ett: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas</SelectItem>
                          {empresasETT.map((empresa) => (
                            <SelectItem key={empresa} value={empresa}>
                              {empresa}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Tipo Jornada</Label>
                    <Select value={filters.tipo_jornada} onValueChange={(value) => setFilters({...filters, tipo_jornada: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="Jornada Completa">Jornada Completa</SelectItem>
                        <SelectItem value="Jornada Parcial">Jornada Parcial</SelectItem>
                        <SelectItem value="Reducción de Jornada">Reducción de Jornada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo Turno</Label>
                    <Select value={filters.tipo_turno} onValueChange={(value) => setFilters({...filters, tipo_turno: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Rotativo">Rotativo</SelectItem>
                        <SelectItem value="Fijo Mañana">Fijo Mañana</SelectItem>
                        <SelectItem value="Fijo Tarde">Fijo Tarde</SelectItem>
                        <SelectItem value="Turno Partido">Turno Partido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Equipo</Label>
                    <Select value={filters.equipo} onValueChange={(value) => setFilters({...filters, equipo: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.team_name}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Disponibilidad</Label>
                    <Select value={filters.disponibilidad} onValueChange={(value) => setFilters({...filters, disponibilidad: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="Disponible">Disponible</SelectItem>
                        <SelectItem value="Ausente">Ausente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Lista de Empleados ({filteredEmployees.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-12 text-center text-slate-500">Cargando empleados...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    {searchTerm || Object.values(filters).some(f => f !== "all") ? 'No se encontraron empleados con estos filtros' : 'No hay empleados registrados'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50">
                          <TableHead>Nombre</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Tipo Jornada</TableHead>
                          <TableHead>Tipo Turno</TableHead>
                          <TableHead>Equipo</TableHead>
                          <TableHead>Disponibilidad</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((employee) => {
                          const isAbsent = isEmployeeAbsent(employee);
                          
                          return (
                            <TableRow 
                              key={employee.id} 
                              className={`hover:bg-slate-50 ${isAbsent ? 'bg-red-50' : ''}`}
                            >
                              <TableCell>
                                <div>
                                  <div className={`font-semibold ${isAbsent ? 'text-red-700' : 'text-slate-900'}`}>
                                    {employee.nombre}
                                  </div>
                                  {employee.email && (
                                    <div className={`text-xs ${isAbsent ? 'text-red-600' : 'text-slate-500'}`}>
                                      {employee.email}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{getEstadoBadge(employee)}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={isAbsent ? 'border-red-300 text-red-700' : ''}>
                                  {employee.tipo_jornada}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={isAbsent ? 'border-red-300 text-red-700 bg-red-50' : 'bg-blue-50 text-blue-700'}>
                                  {employee.tipo_turno}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {employee.equipo ? (
                                  <Badge className={
                                    isAbsent ? "bg-red-200 text-red-900" :
                                    employee.equipo === "Turno 1 (Isa)"
                                      ? "bg-purple-100 text-purple-800" 
                                      : employee.equipo === "Turno 2 (Sara)"
                                      ? "bg-pink-100 text-pink-800"
                                      : "bg-blue-100 text-blue-800"
                                  }>
                                    {employee.equipo}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-slate-400">Sin equipo</span>
                                )}
                              </TableCell>
                              <TableCell>{getAvailabilityBadge(employee)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(employee)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(employee.id)}
                                    className="hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          machines={machines}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}