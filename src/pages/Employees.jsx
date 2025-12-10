import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, User, Trash2, ArrowLeft, CheckCircle2, AlertCircle, Clock, Database, Cake, Calendar, TrendingUp, Columns, UserCheck, UserX, Bell, FileText, UserPlus, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isSameDay, differenceInYears, addDays, isWithinInterval } from "date-fns";
import PendingTasksPanel from "../components/hr/PendingTasksPanel";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AdvancedSearch from "../components/common/AdvancedSearch";
import ThemeToggle from "../components/common/ThemeToggle";
import { toast } from "sonner";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";
import UnifiedAbsenceManager from "../components/absences/UnifiedAbsenceManager";
import ProfileApprovalPanel from "../components/profile/ProfileApprovalPanel";

const EMPTY_ARRAY = [];

export default function EmployeesPage() {
  const [filters, setFilters] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [activeTab, setActiveTab] = useState("employees");
  const [visibleColumns, setVisibleColumns] = useState({
    codigo_empleado: true,
    nombre: true,
    departamento: true,
    puesto: true,
    categoria: false,
    estado_empleado: true,
    fecha_alta: false,
    tipo_jornada: false,
    num_horas_jornada: false,
    tipo_turno: false,
    equipo: false,
    tipo_contrato: false,
    fecha_fin_contrato: false,
    disponibilidad: false,
    email: false,
    telefono_movil: false,
    dni: false,
    nuss: false,
  });
  const queryClient = useQueryClient();

  const { data: masterEmployees = EMPTY_ARRAY, isLoading: loadingMasterEmployees } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('-created_date'),
  });

  // const { data: employees = EMPTY_ARRAY, isLoading: loadingEmployees } = useQuery({
  //   queryKey: ['employees'],
  //   queryFn: () => base44.entities.Employee.list(),
  // });

  const isLoading = loadingMasterEmployees;

  const { data: absences = EMPTY_ARRAY } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-created_date'),
  });

  const { data: vacationBalances = EMPTY_ARRAY } = useQuery({
    queryKey: ['vacationPendingBalances'],
    queryFn: () => base44.entities.VacationPendingBalance.list(),
  });

  const { data: onboardingProcesses = EMPTY_ARRAY } = useQuery({
    queryKey: ['employeeOnboarding'],
    queryFn: () => base44.entities.EmployeeOnboarding.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeMasterDatabase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Empleado eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar empleado: " + error.message);
    }
  });

  const filterOptions = useMemo(() => {
    const departamentos = [...new Set(masterEmployees.map(e => e.departamento).filter(Boolean))].sort();
    const puestos = [...new Set(masterEmployees.map(e => e.puesto).filter(Boolean))].sort();
    const categorias = [...new Set(masterEmployees.map(e => e.categoria).filter(Boolean))].sort();
    const estados = [...new Set(masterEmployees.map(e => e.estado_empleado).filter(Boolean))].sort();
    const tiposJornada = [...new Set(masterEmployees.map(e => e.tipo_jornada).filter(Boolean))].sort();
    const tiposTurno = [...new Set(masterEmployees.map(e => e.tipo_turno).filter(Boolean))].sort();
    const equipos = [...new Set(masterEmployees.map(e => e.equipo).filter(Boolean))].sort();
    const tiposContrato = [...new Set(masterEmployees.map(e => e.tipo_contrato).filter(Boolean))].sort();
    const disponibilidades = [...new Set(masterEmployees.map(e => e.disponibilidad).filter(Boolean))].sort();

    return {
      departamento: {
        label: 'Departamento',
        options: departamentos.map(d => ({ value: d, label: d }))
      },
      puesto: {
        label: 'Puesto',
        options: puestos.map(p => ({ value: p, label: p }))
      },
      categoria: {
        label: 'Categoría',
        options: categorias.map(c => ({ value: c, label: c }))
      },
      estado_empleado: {
        label: 'Estado',
        options: estados.map(e => ({ value: e, label: e }))
      },
      tipo_jornada: {
        label: 'Tipo Jornada',
        options: tiposJornada.map(t => ({ value: t, label: t }))
      },
      tipo_turno: {
        label: 'Tipo Turno',
        options: tiposTurno.map(t => ({ value: t, label: t }))
      },
      equipo: {
        label: 'Equipo',
        options: equipos.map(e => ({ value: e, label: e }))
      },
      tipo_contrato: {
        label: 'Tipo Contrato',
        options: tiposContrato.map(t => ({ value: t, label: t }))
      },
      disponibilidad: {
        label: 'Disponibilidad',
        options: disponibilidades.map(d => ({ value: d, label: d }))
      }
    };
  }, [masterEmployees]);

  const filteredEmployees = useMemo(() => {
    // Use masterEmployees as the single source of truth
    let result = masterEmployees.filter(emp => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.puesto?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = !filters.departamento || filters.departamento === 'all' || 
        emp.departamento === filters.departamento;
      
      const matchesPuesto = !filters.puesto || filters.puesto === 'all' || 
        emp.puesto === filters.puesto;
      
      const matchesCategoria = !filters.categoria || filters.categoria === 'all' || 
        emp.categoria === filters.categoria;
      
      const matchesEstado = !filters.estado_empleado || filters.estado_empleado === 'all' || 
        emp.estado_empleado === filters.estado_empleado;
      
      const matchesTipoJornada = !filters.tipo_jornada || filters.tipo_jornada === 'all' || 
        emp.tipo_jornada === filters.tipo_jornada;
      
      const matchesTipoTurno = !filters.tipo_turno || filters.tipo_turno === 'all' || 
        emp.tipo_turno === filters.tipo_turno;
      
      const matchesEquipo = !filters.equipo || filters.equipo === 'all' || 
        emp.equipo === filters.equipo;
      
      const matchesTipoContrato = !filters.tipo_contrato || filters.tipo_contrato === 'all' || 
        emp.tipo_contrato === filters.tipo_contrato;
      
      const matchesDisponibilidad = !filters.disponibilidad || filters.disponibilidad === 'all' || 
        emp.disponibilidad === filters.disponibilidad;

      return matchesSearch && matchesDept && matchesPuesto && matchesCategoria && 
             matchesEstado && matchesTipoJornada && matchesTipoTurno && matchesEquipo && 
             matchesTipoContrato && matchesDisponibilidad;
    });

    // Aplicar ordenación
    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        const field = filters.sortField;
        const aVal = a[field];
        const bVal = b[field];
        
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'string') {
          comparison = aVal.localeCompare(bVal, 'es', { numeric: true });
        } else if (typeof aVal === 'number') {
          comparison = aVal - bVal;
        } else if (aVal instanceof Date || typeof aVal === 'string' && !isNaN(Date.parse(aVal))) {
          comparison = new Date(aVal) - new Date(bVal);
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [masterEmployees, filters]);



  // Métricas completas de RRHH
  const stats = useMemo(() => {
    const today = new Date();
    const next7Days = addDays(today, 7);
    
    const activeEmployees = masterEmployees.filter(e => (e.estado_empleado || "Alta") === "Alta");
    
    const ausenciasActivas = absences.filter(a => {
      if (!a.fecha_inicio) return false;
      try {
        const inicio = new Date(a.fecha_inicio);
        if (isNaN(inicio.getTime())) return false;
        
        // Normalizar fechas para comparación precisa
        const start = new Date(inicio);
        start.setHours(0,0,0,0);
        
        const fin = a.fecha_fin ? new Date(a.fecha_fin) : addDays(today, 365);
        const end = new Date(fin);
        end.setHours(23,59,59,999);
        
        const checkDate = new Date(today);
        checkDate.setHours(12,0,0,0);

        return checkDate >= start && checkDate <= end;
      } catch {
        return false;
      }
    }).length;

    // Calcular disponibles dinámicamente: Activos - Ausentes Reales
    const disponibles = Math.max(0, activeEmployees.length - ausenciasActivas);

    const pendientesAprobacion = absences.filter(a => a.estado_aprobacion === 'Pendiente').length;
    const totalDiasPendientes = vacationBalances.reduce((sum, vb) => sum + (vb.dias_pendientes || 0), 0);
    const empleadosConFuerzaMayor = masterEmployees.filter(e => (e.horas_causa_mayor_consumidas || 0) > 0).length;
    const onboardingPendientes = onboardingProcesses.filter(p => p.estado !== 'Completado' && p.estado !== 'Cancelado').length;
    
    const birthdays = masterEmployees.filter(emp => {
      if (!emp.fecha_nacimiento) return false;
      const birthDate = new Date(emp.fecha_nacimiento);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      return thisYearBirthday >= today && thisYearBirthday <= next7Days;
    });
    
    const anniversaries = masterEmployees.filter(emp => {
      if (!emp.fecha_alta) return false;
      const hireDate = new Date(emp.fecha_alta);
      const thisYearAnniversary = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate());
      const years = differenceInYears(today, hireDate);
      return years > 0 && thisYearAnniversary >= today && thisYearAnniversary <= next7Days;
    });

    const fuerzaMayorAlerts = masterEmployees.filter(e => {
      const limite = e.horas_causa_mayor_limite || 0;
      const consumidas = e.horas_causa_mayor_consumidas || 0;
      return limite > 0 && consumidas >= limite * 0.8;
    }).slice(0, 5);

    const recentAbsences = absences
      .filter(a => a.estado_aprobacion === 'Pendiente' || a.estado_aprobacion === 'Aprobada')
      .slice(0, 5)
      .map(a => {
        const emp = masterEmployees.find(me => me.id === a.employee_id);
        return { ...a, employeeName: emp?.nombre || 'Desconocido' };
      });
    
    return {
      total: masterEmployees.length,
      active: activeEmployees.length,
      disponibles,
      ausenciasActivas,
      pendientesAprobacion,
      totalDiasPendientes,
      empleadosConFuerzaMayor,
      onboardingPendientes,
      birthdays,
      anniversaries,
      fuerzaMayorAlerts,
      recentAbsences
    };
  }, [masterEmployees, absences, vacationBalances, onboardingProcesses]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">


        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Base de Datos de Empleados
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Gestión completa de empleados - Vista maestra
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              onClick={() => {
                setEmployeeToEdit(null);
                setEditDialogOpen(true);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <User className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </Button>
          </div>
        </div>

        {/* KPIs principales - Compacto */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 mb-3">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-2">
              <p className="text-[9px] text-blue-700 dark:text-blue-300 font-medium">Total</p>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-2">
              <p className="text-[9px] text-green-700 dark:text-green-300 font-medium">Activos</p>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-2">
              <p className="text-[9px] text-emerald-700 dark:text-emerald-300 font-medium">Disponibles</p>
              <p className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{stats.disponibles}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
            <CardContent className="p-2">
              <p className="text-[9px] text-amber-700 dark:text-amber-300 font-medium">Ausencias</p>
              <p className="text-lg font-bold text-amber-900 dark:text-amber-100">{stats.ausenciasActivas}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardContent className="p-2">
              <p className="text-[9px] text-purple-700 dark:text-purple-300 font-medium">Pend. Apr.</p>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">{stats.pendientesAprobacion}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900 border-cyan-200 dark:border-cyan-800">
            <CardContent className="p-2">
              <p className="text-[9px] text-cyan-700 dark:text-cyan-300 font-medium">Días Vac.</p>
              <p className="text-lg font-bold text-cyan-900 dark:text-cyan-100">{stats.totalDiasPendientes}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
            <CardContent className="p-2">
              <p className="text-[9px] text-orange-700 dark:text-orange-300 font-medium">Fza. Mayor</p>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{stats.empleadosConFuerzaMayor}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900 border-teal-200 dark:border-teal-800">
            <CardContent className="p-2">
              <p className="text-[9px] text-teal-700 dark:text-teal-300 font-medium">Onboard.</p>
              <p className="text-lg font-bold text-teal-900 dark:text-teal-100">{stats.onboardingPendientes}</p>
            </CardContent>
          </Card>
        </div>

        {/* Paneles compactos: Cumpleaños, Aniversarios, Solicitudes, Alertas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="p-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs flex items-center gap-1 dark:text-slate-100">
                <Cake className="w-3 h-3 text-pink-600 dark:text-pink-400" />
                Cumpleaños (7d)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {stats.birthdays.length === 0 ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Sin cumpleaños</p>
              ) : (
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {stats.birthdays.slice(0, 2).map((emp) => (
                    <div key={emp.id} className="text-[10px] flex justify-between p-1 rounded bg-pink-50 dark:bg-pink-950/30">
                      <span className="font-medium dark:text-slate-200 truncate">{emp.nombre}</span>
                      <span className="text-slate-600 dark:text-slate-400">{format(new Date(emp.fecha_nacimiento), 'd/M', { locale: es })}</span>
                    </div>
                  ))}
                  {stats.birthdays.length > 2 && <p className="text-[9px] text-slate-500 dark:text-slate-400">+{stats.birthdays.length - 2}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="p-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs flex items-center gap-1 dark:text-slate-100">
                <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                Aniversarios (7d)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {stats.anniversaries.length === 0 ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Sin aniversarios</p>
              ) : (
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {stats.anniversaries.slice(0, 2).map((emp) => {
                    const years = differenceInYears(new Date(), new Date(emp.fecha_alta));
                    return (
                      <div key={emp.id} className="text-[10px] flex justify-between p-1 rounded bg-blue-50 dark:bg-blue-950/30">
                        <span className="font-medium dark:text-slate-200 truncate">{emp.nombre}</span>
                        <span className="text-slate-600 dark:text-slate-400">{years}a</span>
                      </div>
                    );
                  })}
                  {stats.anniversaries.length > 2 && <p className="text-[9px] text-slate-500 dark:text-slate-400">+{stats.anniversaries.length - 2}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="p-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs flex items-center gap-1 dark:text-slate-100">
                <Bell className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                Últimas Solicitudes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {stats.recentAbsences.length === 0 ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Sin solicitudes</p>
              ) : (
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {stats.recentAbsences.slice(0, 2).map((absence) => (
                    <div key={absence.id} className="text-[10px] p-1 rounded bg-slate-50 dark:bg-slate-800">
                      <span className="font-medium dark:text-slate-200 truncate block">{absence.employeeName}</span>
                      <Badge className="text-[8px] h-4 px-1 mt-0.5 bg-amber-600">{absence.estado_aprobacion}</Badge>
                    </div>
                  ))}
                  {stats.recentAbsences.length > 2 && <p className="text-[9px] text-slate-500 dark:text-slate-400">+{stats.recentAbsences.length - 2}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader className="p-2 pb-1 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-xs flex items-center gap-1 dark:text-slate-100">
                <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                Fuerza Mayor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {stats.fuerzaMayorAlerts.length === 0 ? (
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Sin alertas</p>
              ) : (
                <div className="space-y-1 max-h-16 overflow-y-auto">
                  {stats.fuerzaMayorAlerts.slice(0, 2).map((emp) => (
                    <div key={emp.id} className="text-[10px] flex justify-between p-1 rounded bg-orange-50 dark:bg-orange-950/50">
                      <span className="font-medium dark:text-slate-200 truncate">{emp.nombre}</span>
                      <span className="text-slate-600 dark:text-slate-400">{emp.horas_causa_mayor_consumidas}h</span>
                    </div>
                  ))}
                  {stats.fuerzaMayorAlerts.length > 2 && <p className="text-[9px] text-slate-500 dark:text-slate-400">+{stats.fuerzaMayorAlerts.length - 2}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab("employees")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "employees"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Base de Datos
          </button>
          <button
            onClick={() => setActiveTab("absences")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "absences"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Gestión de Ausencias
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === "profile"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Aprobación de Cambios
          </button>
        </div>
      </div>

      {activeTab === "employees" && (
        <>
          <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm mb-4">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base dark:text-slate-100">Búsqueda y Filtros</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <AdvancedSearch
              data={masterEmployees}
              onFilterChange={setFilters}
              searchFields={['nombre', 'codigo_empleado', 'departamento', 'puesto']}
              filterOptions={filterOptions}
              sortOptions={[
                { field: 'nombre', label: 'Nombre' },
                { field: 'codigo_empleado', label: 'Código' },
                { field: 'departamento', label: 'Departamento' },
                { field: 'puesto', label: 'Puesto' },
                { field: 'estado_empleado', label: 'Estado' },
                { field: 'fecha_alta', label: 'Fecha Alta' },
              ]}
              placeholder="Buscar por nombre, código, departamento o puesto..."
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base dark:text-slate-100">
                Empleados ({filteredEmployees.length})
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="dark:bg-slate-800 dark:border-slate-700">
                    <Columns className="w-4 h-4 mr-2" />
                    Columnas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 dark:bg-slate-800 dark:border-slate-700">
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.codigo_empleado}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, codigo_empleado: checked})}
                    className="dark:text-slate-200"
                  >
                    Código
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.nombre}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, nombre: checked})}
                    className="dark:text-slate-200"
                  >
                    Nombre
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.departamento}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, departamento: checked})}
                    className="dark:text-slate-200"
                  >
                    Departamento
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.puesto}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, puesto: checked})}
                    className="dark:text-slate-200"
                  >
                    Puesto
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.estado_empleado}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, estado_empleado: checked})}
                    className="dark:text-slate-200"
                  >
                    Estado
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.fecha_alta}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, fecha_alta: checked})}
                    className="dark:text-slate-200"
                  >
                    Fecha Alta
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.tipo_contrato}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, tipo_contrato: checked})}
                    className="dark:text-slate-200"
                  >
                    Tipo Contrato
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.email}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, email: checked})}
                    className="dark:text-slate-200"
                  >
                    Email
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.telefono_movil}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, telefono_movil: checked})}
                    className="dark:text-slate-200"
                  >
                    Teléfono
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.categoria}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, categoria: checked})}
                    className="dark:text-slate-200"
                  >
                    Categoría
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.tipo_jornada}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, tipo_jornada: checked})}
                    className="dark:text-slate-200"
                  >
                    Tipo Jornada
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.num_horas_jornada}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, num_horas_jornada: checked})}
                    className="dark:text-slate-200"
                  >
                    Horas Semanales
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.tipo_turno}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, tipo_turno: checked})}
                    className="dark:text-slate-200"
                  >
                    Tipo Turno
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.equipo}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, equipo: checked})}
                    className="dark:text-slate-200"
                  >
                    Equipo
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.fecha_fin_contrato}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, fecha_fin_contrato: checked})}
                    className="dark:text-slate-200"
                  >
                    Fin Contrato
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.disponibilidad}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, disponibilidad: checked})}
                    className="dark:text-slate-200"
                  >
                    Disponibilidad
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.dni}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, dni: checked})}
                    className="dark:text-slate-200"
                  >
                    DNI
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={visibleColumns.nuss}
                    onCheckedChange={(checked) => setVisibleColumns({...visibleColumns, nuss: checked})}
                    className="dark:text-slate-200"
                  >
                    NUSS
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">Cargando...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                {filters.searchTerm || Object.keys(filters).length > 0 
                  ? 'No se encontraron resultados con los filtros aplicados' 
                  : 'No hay registros en la base de datos'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      {visibleColumns.codigo_empleado && <TableHead className="font-semibold dark:text-slate-200">Código</TableHead>}
                      {visibleColumns.nombre && <TableHead className="font-semibold dark:text-slate-200">Nombre</TableHead>}
                      {visibleColumns.departamento && <TableHead className="font-semibold dark:text-slate-200">Departamento</TableHead>}
                      {visibleColumns.puesto && <TableHead className="font-semibold dark:text-slate-200">Puesto</TableHead>}
                      {visibleColumns.categoria && <TableHead className="font-semibold dark:text-slate-200">Categoría</TableHead>}
                      {visibleColumns.estado_empleado && <TableHead className="font-semibold dark:text-slate-200">Estado</TableHead>}
                      {visibleColumns.fecha_alta && <TableHead className="font-semibold dark:text-slate-200">Fecha Alta</TableHead>}
                      {visibleColumns.tipo_jornada && <TableHead className="font-semibold dark:text-slate-200">Tipo Jornada</TableHead>}
                      {visibleColumns.num_horas_jornada && <TableHead className="font-semibold dark:text-slate-200">Hrs/Sem</TableHead>}
                      {visibleColumns.tipo_turno && <TableHead className="font-semibold dark:text-slate-200">Turno</TableHead>}
                      {visibleColumns.equipo && <TableHead className="font-semibold dark:text-slate-200">Equipo</TableHead>}
                      {visibleColumns.tipo_contrato && <TableHead className="font-semibold dark:text-slate-200">Tipo Contrato</TableHead>}
                      {visibleColumns.fecha_fin_contrato && <TableHead className="font-semibold dark:text-slate-200">Fin Contrato</TableHead>}
                      {visibleColumns.disponibilidad && <TableHead className="font-semibold dark:text-slate-200">Disponibilidad</TableHead>}
                      {visibleColumns.email && <TableHead className="font-semibold dark:text-slate-200">Email</TableHead>}
                      {visibleColumns.telefono_movil && <TableHead className="font-semibold dark:text-slate-200">Teléfono</TableHead>}
                      {visibleColumns.dni && <TableHead className="font-semibold dark:text-slate-200">DNI</TableHead>}
                      {visibleColumns.nuss && <TableHead className="font-semibold dark:text-slate-200">NUSS</TableHead>}
                      <TableHead className="text-right font-semibold dark:text-slate-200">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => (
                      <TableRow key={emp.id} className="border-b border-slate-100 dark:border-slate-800 dark:hover:bg-slate-800/50">
                        {visibleColumns.codigo_empleado && (
                          <TableCell className="font-mono text-xs dark:text-slate-300">
                            {emp.codigo_empleado || '-'}
                          </TableCell>
                        )}
                        {visibleColumns.nombre && (
                          <TableCell className="font-semibold dark:text-slate-200">
                            {emp.nombre}
                          </TableCell>
                        )}
                        {visibleColumns.departamento && (
                          <TableCell className="dark:text-slate-300">{emp.departamento || '-'}</TableCell>
                        )}
                        {visibleColumns.puesto && (
                          <TableCell className="dark:text-slate-300">{emp.puesto || '-'}</TableCell>
                        )}
                        {visibleColumns.categoria && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.categoria || '-'}</TableCell>
                        )}
                        {visibleColumns.estado_empleado && (
                          <TableCell>
                            <Badge className={
                              emp.estado_empleado === 'Alta' 
                                ? 'bg-green-600 dark:bg-green-700' 
                                : 'bg-slate-600 dark:bg-slate-700'
                            }>
                              {emp.estado_empleado}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.fecha_alta && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {emp.fecha_alta ? format(new Date(emp.fecha_alta), 'dd/MM/yy', { locale: es }) : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.tipo_jornada && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.tipo_jornada || '-'}</TableCell>
                        )}
                        {visibleColumns.num_horas_jornada && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.num_horas_jornada || '-'}</TableCell>
                        )}
                        {visibleColumns.tipo_turno && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.tipo_turno || '-'}</TableCell>
                        )}
                        {visibleColumns.equipo && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.equipo || '-'}</TableCell>
                        )}
                        {visibleColumns.tipo_contrato && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.tipo_contrato || '-'}</TableCell>
                        )}
                        {visibleColumns.fecha_fin_contrato && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {emp.fecha_fin_contrato ? format(new Date(emp.fecha_fin_contrato), 'dd/MM/yy', { locale: es }) : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.disponibilidad && (
                          <TableCell>
                            <Badge className={emp.disponibilidad === 'Disponible' ? 'bg-green-600' : 'bg-red-600'}>
                              {emp.disponibilidad || 'Disponible'}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.email && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.email || '-'}</TableCell>
                        )}
                        {visibleColumns.telefono_movil && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.telefono_movil || '-'}</TableCell>
                        )}
                        {visibleColumns.dni && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.dni || '-'}</TableCell>
                        )}
                        {visibleColumns.nuss && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.nuss || '-'}</TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => {
                                setEmployeeToEdit(emp);
                                setEditDialogOpen(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <User className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (confirm('¿Eliminar este registro?')) {
                                  deleteMutation.mutate(emp.id);
                                }
                              }}
                            >
                              <Trash2 className="w-3 h-3 text-red-600 dark:text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          </Card>
          </>
          )}

      {activeTab === "absences" && (
        <UnifiedAbsenceManager sourceContext="rrhh" />
      )}

      {activeTab === "profile" && (
        <ProfileApprovalPanel />
      )}

      {editDialogOpen && (
        <MasterEmployeeEditDialog
          employee={employeeToEdit}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEmployeeToEdit(null);
          }}
        />
      )}
      </div>
    </div>
  );
}