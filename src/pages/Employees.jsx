import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

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
} from "@/components/ui/table.jsx";
import { 
  Users, 
  User,
  Search,
  Filter,
  Eye,
  EyeOff,
  Briefcase,
  Phone,
  Mail,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Cake,
  Calendar,
  Award,
  Columns,
  Bell,
  UserPlus,
  FileText,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  IdCard,
  Contact
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isSameDay, addDays } from "date-fns";
import { es } from "date-fns/locale";
import AdvancedSearch from "../components/common/AdvancedSearch";
import ThemeToggle from "../components/common/ThemeToggle";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";

const EMPTY_ARRAY = [];
const SEARCH_FIELDS = ['nombre', 'codigo_empleado', 'departamento', 'puesto', 'email', 'dni', 'telefono_movil'];
const SORT_OPTIONS = [
  { field: 'nombre', label: 'Nombre' },
  { field: 'departamento', label: 'Departamento' },
  { field: 'puesto', label: 'Puesto' },
  { field: 'fecha_alta', label: 'Fecha Alta' },
  { field: 'fecha_nacimiento', label: 'Fecha Nacimiento' },
  { field: 'fecha_fin_contrato', label: 'Fin Contrato' },
  { field: 'antiguedad', label: 'Antigüedad' },
];

const ALL_COLUMNS = {
  codigo_empleado: { label: "Código", default: false },
  nombre: { label: "Empleado", default: true },
  dni: { label: "DNI/NIE", default: false },
  nuss: { label: "NUSS", default: false },
  departamento: { label: "Departamento / Puesto", default: true },
  equipo: { label: "Equipo", default: false },
  contacto: { label: "Contacto", default: true },
  direccion: { label: "Dirección", default: false },
  nacionalidad: { label: "Nacionalidad", default: false },
  sexo: { label: "Sexo", default: false },
  estado: { label: "Estado", default: true },
  tipo_contrato: { label: "Contrato", default: false },
  tipo_jornada: { label: "Jornada", default: false },
  tipo_turno: { label: "Turno", default: false },
  datos_privados: { label: "Datos Privados", default: true },
  fecha_alta: { label: "Fecha Alta", default: false },
  fecha_fin_contrato: { label: "Fin Contrato", default: false },
  fecha_nacimiento: { label: "Fecha Nacimiento", default: false },
  empresa_ett: { label: "ETT / Empresa", default: false },
  formacion: { label: "Formación", default: false },
  categoria: { label: "Categoría", default: false },
  acciones: { label: "Acciones", default: true }
};

export default function EmployeesPage() {
  const [filters, setFilters] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("employeesPageColumns");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return {}; }
    }
    const defaults = {};
    Object.keys(ALL_COLUMNS).forEach(key => {
      defaults[key] = ALL_COLUMNS[key].default;
    });
    return defaults;
  });

  React.useEffect(() => {
    localStorage.setItem("employeesPageColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // RBAC System Removed - Defaulting to Full Access
  const isShiftManager = false; // Always show HR view

  const permissions = useMemo(() => ({
    ver_lista: true,
    crear: true,
    editar: true,
    eliminar: true,
    visibleDepartments: ['*'],
    campos: {
      ver_salario: true,
      ver_bancarios: true,
      ver_dni: true,
      ver_contacto: true,
      ver_direccion: true,
      editar_sensible: true,
      editar_contacto: true
    },
    tabs: {
      personal: true,
      organizacion: true,
      horarios: true,
      taquilla: true,
      contrato: true,
      absentismo: true,
      maquinas: true,
      disponibilidad: true
    },
    contrato: { ver: true, editar: true }
  }), []);

  // Fetch ALL employees for stats
  const { data: allEmployees = EMPTY_ARRAY } = useQuery({
    queryKey: ['allEmployeesMaster'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    enabled: !!permissions.ver_lista,
    staleTime: 5 * 60 * 1000 // 5 minutes cache
  });

  // Fetch Onboardings
  const { data: onboardings = EMPTY_ARRAY } = useQuery({
    queryKey: ['onboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list(),
    enabled: !!permissions.ver_lista && !isShiftManager
  });

  // Fetch Notifications (filtered later if needed)
  const { data: notifications = EMPTY_ARRAY } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list(),
    enabled: !!permissions.ver_lista && !isShiftManager
  });

  // Effective Employees List (Apply Permissions Restriction)
  const effectiveEmployees = useMemo(() => {
    let list = allEmployees;
    
    // Filter by permitted departments
    if (permissions.visibleDepartments && Array.isArray(permissions.visibleDepartments) && !permissions.visibleDepartments.includes('*')) {
      const visibleDepts = permissions.visibleDepartments
        .filter(d => d !== null && d !== undefined)
        .map(d => String(d).toUpperCase());
        
      list = list.filter(emp => {
        if (!emp.departamento) return true; // Keep employees without department? Or filter them out? Assuming keep if permission is restrictive but emp has no dept, usually safe to hide or show? Logic above was (!emp.departamento || ...) so keeping it.
        try {
          return visibleDepts.includes(String(emp.departamento).toUpperCase());
        } catch (e) {
          return false;
        }
      });
    }

    return list;
  }, [allEmployees, permissions.visibleDepartments]);

  // Audit Logging Helper
  const logAction = async (actionType, targetEmployee, details = {}) => {
    try {
      await base44.entities.EmployeeAuditLog.create({
        action_type: actionType,
        user_email: currentUser?.email,
        target_employee_id: targetEmployee?.id,
        target_employee_name: targetEmployee?.nombre,
        details: JSON.stringify(details),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to log audit action", error);
    }
  };

  const filterOptions = useMemo(() => {
    const departamentos = [...new Set(effectiveEmployees.map(e => e.departamento).filter(Boolean))].sort();
    const puestos = [...new Set(effectiveEmployees.map(e => e.puesto).filter(Boolean))].sort();
    const estados = [...new Set(effectiveEmployees.map(e => e.estado_empleado).filter(Boolean))].sort();
    const tiposContrato = [...new Set(effectiveEmployees.map(e => e.tipo_contrato).filter(Boolean))].sort();
    const turnos = [...new Set(effectiveEmployees.map(e => e.tipo_turno).filter(Boolean))].sort();
    const nacionalidades = [...new Set(effectiveEmployees.map(e => e.nacionalidad).filter(Boolean))].sort();
    const sexos = [...new Set(effectiveEmployees.map(e => e.sexo).filter(Boolean))].sort();
    const empresas = [...new Set(effectiveEmployees.map(e => e.empresa_ett).filter(Boolean))].sort();
    const equipos = [...new Set(effectiveEmployees.map(e => e.equipo).filter(Boolean))].sort();

    return {
      // Hide departamento filter for shift managers as it's restricted
      ...(!isShiftManager ? {
        departamento: {
          label: 'Departamento',
          options: departamentos.map(d => ({ value: d, label: d }))
        }
      } : {}),
      equipo: {
        label: 'Equipo',
        options: equipos.map(e => ({ value: e, label: e }))
      },
      puesto: {
        label: 'Puesto',
        options: puestos.map(p => ({ value: p, label: p }))
      },
      estado_empleado: {
        label: 'Estado',
        options: estados.map(e => ({ value: e, label: e }))
      },
      tipo_contrato: {
        label: 'Contrato',
        options: tiposContrato.map(t => ({ value: t, label: t }))
      },
      tipo_turno: {
        label: 'Turno',
        options: turnos.map(t => ({ value: t, label: t }))
      },
      nacionalidad: {
        label: 'Nacionalidad',
        options: nacionalidades.map(n => ({ value: n, label: n }))
      },
      sexo: {
        label: 'Sexo',
        options: sexos.map(s => ({ value: s, label: s }))
      },
      empresa_ett: {
        label: 'Empresa/ETT',
        options: empresas.map(e => ({ value: e, label: e }))
      }
    };
  }, [effectiveEmployees, isShiftManager]);

  const filteredEmployees = useMemo(() => {
    let result = effectiveEmployees.filter(emp => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.dni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.telefono_movil?.includes(searchTerm);

      // Explicit filters
      const matchesDept = !filters.departamento || filters.departamento === 'all' || 
        emp.departamento === filters.departamento;
      
      const matchesPuesto = !filters.puesto || filters.puesto === 'all' || 
        emp.puesto === filters.puesto;
      
      const matchesEstado = !filters.estado_empleado || filters.estado_empleado === 'all' || 
        emp.estado_empleado === filters.estado_empleado;

      const matchesContrato = !filters.tipo_contrato || filters.tipo_contrato === 'all' || 
        emp.tipo_contrato === filters.tipo_contrato;

      const matchesTurno = !filters.tipo_turno || filters.tipo_turno === 'all' || 
        emp.tipo_turno === filters.tipo_turno;

      const matchesNacionalidad = !filters.nacionalidad || filters.nacionalidad === 'all' ||
        emp.nacionalidad === filters.nacionalidad;

      const matchesSexo = !filters.sexo || filters.sexo === 'all' ||
        emp.sexo === filters.sexo;

      const matchesEmpresa = !filters.empresa_ett || filters.empresa_ett === 'all' ||
        emp.empresa_ett === filters.empresa_ett;

      const matchesEquipo = !filters.equipo || filters.equipo === 'all' ||
        emp.equipo === filters.equipo;

      return matchesSearch && matchesDept && matchesPuesto && matchesEstado && matchesContrato && matchesTurno && matchesNacionalidad && matchesSexo && matchesEmpresa && matchesEquipo;
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        const field = filters.sortField;
        const aVal = a[field];
        const bVal = b[field];
        if (!aVal) return 1;
        if (!bVal) return -1;
        
        let comparison = 0;
        if (field === 'fecha_alta' || field === 'fecha_nacimiento' || field === 'fecha_fin_contrato') {
          comparison = new Date(aVal) - new Date(bVal);
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [effectiveEmployees, filters]);

  const currentViewEmployees = useMemo(() => {
    const start = page * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  // KPIs and Upcoming Events
  const stats = useMemo(() => {
    const total = effectiveEmployees.length;
    const activos = effectiveEmployees.filter(e => e.estado_empleado === 'Alta').length;
    const disponibles = effectiveEmployees.filter(e => e.estado_empleado === 'Alta' && e.disponibilidad === 'Disponible').length;
    const bajas = effectiveEmployees.filter(e => e.estado_empleado === 'Baja').length;
    const now = new Date();
    
    // HR Specific Stats
    const pendingOnboardings = onboardings.filter(o => o.estado !== 'Completado').length;
    const hrNotifications = notifications.filter(n => !n.leida && ['Contrato Próximo a Vencer', 'Ausencia Finalizada'].includes(n.tipo)).length;
    
    // Contract Expirations (Next 30 days)
    const upcomingContractExpirations = effectiveEmployees.filter(e => {
      if (!e.fecha_fin_contrato || e.estado_empleado !== 'Alta') return false;
      const endContract = new Date(e.fecha_fin_contrato);
      const diffTime = endContract - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;

    // By Department
    const byDepartment = effectiveEmployees.reduce((acc, curr) => {
      if (curr.departamento && curr.estado_empleado === 'Alta') {
        acc[curr.departamento] = (acc[curr.departamento] || 0) + 1;
      }
      return acc;
    }, {});

    // Upcoming Birthdays (next 15 days)
    const upcomingBirthdays = effectiveEmployees
      .filter(emp => emp.fecha_nacimiento && emp.estado_empleado === 'Alta')
      .map(emp => {
        const birthDate = new Date(emp.fecha_nacimiento);
        const thisYear = now.getFullYear();
        let nextBirthday = new Date(thisYear, birthDate.getMonth(), birthDate.getDate());
        
        if (nextBirthday < now) {
          nextBirthday = new Date(thisYear + 1, birthDate.getMonth(), birthDate.getDate());
        }
        
        const diffTime = nextBirthday - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return { ...emp, nextBirthday, diffDays };
      })
      .filter(emp => emp.diffDays >= 0 && emp.diffDays <= 15)
      .sort((a, b) => a.nextBirthday - b.nextBirthday);

    // Upcoming Anniversaries (next 30 days)
    const upcomingAnniversaries = effectiveEmployees
      .filter(emp => emp.fecha_alta && emp.estado_empleado === 'Alta')
      .map(emp => {
        const startDate = new Date(emp.fecha_alta);
        const thisYear = now.getFullYear();
        let nextAnniversary = new Date(thisYear, startDate.getMonth(), startDate.getDate());
        
        if (nextAnniversary < now) {
          nextAnniversary = new Date(thisYear + 1, startDate.getMonth(), startDate.getDate());
        }
        
        const diffTime = nextAnniversary - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const years = nextAnniversary.getFullYear() - startDate.getFullYear();
        
        return { ...emp, nextAnniversary, diffDays, years };
      })
      .filter(emp => emp.diffDays >= 0 && emp.diffDays <= 30 && emp.years > 0)
      .sort((a, b) => a.nextAnniversary - b.nextAnniversary);

    return { 
      total, 
      activos, 
      disponibles,
      bajas, 
      pendingOnboardings, 
      hrNotifications, 
      upcomingContractExpirations,
      byDepartment,
      upcomingBirthdays,
      upcomingAnniversaries
    };
  }, [effectiveEmployees, onboardings, notifications]);

  if (!permissions.ver_lista) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        No tienes permisos para ver el listado de empleados.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost" className="mb-2">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>

        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Gestión de Empleados {isShiftManager ? "(Fabricación)" : "RRHH"}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {isShiftManager 
                ? "Gestión de personal de turno y fabricación" 
                : "Panel de control integral de Recursos Humanos"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {permissions.crear && (
              <Button 
                onClick={() => {
                  setEmployeeToEdit(null);
                  setEditDialogOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <User className="w-4 h-4 mr-2" />
                Nuevo Empleado
              </Button>
            )}
          </div>
        </div>

        {/* Audit Log Warning for Sensitive Data */}
        {permissions.campos.ver_salario && (
          <div className="mb-4 text-xs text-slate-400 text-right">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">
              <Eye className="w-3 h-3 inline mr-1" />
              El acceso a datos sensibles (salarios, DNI) está siendo auditado.
            </span>
          </div>
        )}

        {/* Dashboard Cards - RRHH View */}
        {!isShiftManager && (
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <Card className="bg-white dark:bg-card dark:bg-slate-800 border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Total Empleados</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card dark:bg-slate-800 border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Disponibles</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.disponibles}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">de {stats.activos} activos</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card dark:bg-slate-800 border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Vencimiento Contrato</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.upcomingContractExpirations}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">próximos 30 días</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card dark:bg-slate-800 border-l-4 border-l-purple-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Onboarding</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.pendingOnboardings}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">pendientes</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card dark:bg-slate-800 border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Notificaciones RRHH</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.hrNotifications}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">sin leer</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Cards - Shift Manager View */}
        {isShiftManager && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-white dark:bg-card dark:bg-slate-800 border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Personal Fabricación</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 dark:text-slate-100">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card dark:bg-slate-800 border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Disponibles</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.disponibles}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">para turno</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-card dark:bg-slate-800 border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 dark:text-slate-400 uppercase">Vencimientos Próximos</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.upcomingContractExpirations}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">contratos</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HR - Extended Info (Birthdays & Anniversaries) */}
        {!isShiftManager && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="shadow-sm border-0 bg-white dark:bg-card/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 dark:border-slate-700 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cake className="w-4 h-4 text-pink-500" />
                  Próximos Cumpleaños (15 días)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {stats.upcomingBirthdays.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">No hay cumpleaños próximos</p>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                    {stats.upcomingBirthdays.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">
                            {emp.nombre.charAt(0)}
                          </div>
                          <span className="font-medium">{emp.nombre}</span>
                        </div>
                        <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                          {format(emp.nextBirthday, "d 'de' MMMM", { locale: es })}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0 bg-white dark:bg-card/80 dark:bg-slate-800/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 dark:border-slate-700 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  Aniversarios Próximos (30 días)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {stats.upcomingAnniversaries.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">No hay aniversarios próximos</p>
                ) : (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto pr-2">
                    {stats.upcomingAnniversaries.map(emp => (
                      <div key={emp.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                            {emp.nombre.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium block">{emp.nombre}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">Alta: {format(new Date(emp.fecha_alta), "d MMM yyyy", { locale: es })}</span>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          {emp.years} años
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* HR - Departments Overview */}
        {!isShiftManager && (
          <Card className="mb-8 border-0 shadow-sm bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50">
            <CardHeader className="py-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building className="w-4 h-4" />
                Distribución por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <div className="flex flex-wrap gap-4">
                {Object.entries(stats.byDepartment).map(([dept, count]) => (
                  <div key={dept} className="flex items-center gap-2 bg-white dark:bg-card dark:bg-slate-700 px-3 py-2 rounded-lg border dark:border-slate-600">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{dept}</span>
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-600 dark:text-slate-100">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filter */}
        <Card className="mb-6 shadow-sm border-0 bg-white dark:bg-card/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <AdvancedSearch
              data={effectiveEmployees}
              onFilterChange={setFilters}
              searchFields={SEARCH_FIELDS}
              filterOptions={filterOptions}
              sortOptions={SORT_OPTIONS}
              placeholder="Buscar empleado..."
              pageId="employees_dashboard"
            />
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="shadow-lg border-0 bg-white dark:bg-card dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Listado de Empleados</CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="ml-auto">
                    <Columns className="w-4 h-4 mr-2" />
                    Columnas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {Object.keys(ALL_COLUMNS).map((key) => (
                    <DropdownMenuCheckboxItem
                      key={key}
                      checked={visibleColumns[key]}
                      onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [key]: checked }))}
                    >
                      {ALL_COLUMNS[key].label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {currentViewEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-500 dark:text-slate-400">No se encontraron empleados.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50 dark:bg-slate-800/50">
                      {visibleColumns.nombre && <TableHead>Empleado</TableHead>}
                      {visibleColumns.departamento && <TableHead>Departamento / Puesto</TableHead>}
                      {visibleColumns.contacto && <TableHead>Contacto</TableHead>}
                      {visibleColumns.estado && <TableHead>Estado</TableHead>}
                      {visibleColumns.datos_privados && <TableHead>Datos Privados</TableHead>}
                      {visibleColumns.fecha_alta && <TableHead>Fecha Alta</TableHead>}
                      {visibleColumns.fecha_fin_contrato && <TableHead>Fin Contrato</TableHead>}
                      {visibleColumns.fecha_nacimiento && <TableHead>F. Nacimiento</TableHead>}
                      {visibleColumns.acciones && <TableHead className="text-right">Acciones</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentViewEmployees.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-slate-50 dark:bg-slate-800/50 dark:hover:bg-slate-800/50">
                        {visibleColumns.codigo_empleado && (
                          <TableCell className="text-xs font-mono">{emp.codigo_empleado || '-'}</TableCell>
                        )}
                        {visibleColumns.nombre && (
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                {emp.nombre.charAt(0)}
                              </div>
                              <div className="font-medium text-slate-900 dark:text-slate-100 dark:text-slate-100">{emp.nombre}</div>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.dni && (
                          <TableCell className="text-xs text-slate-600">
                            {permissions.campos.ver_dni ? emp.dni || '-' : '******'}
                          </TableCell>
                        )}
                        {visibleColumns.nuss && (
                          <TableCell className="text-xs text-slate-600">
                            {permissions.campos.ver_dni ? emp.nuss || '-' : '******'}
                          </TableCell>
                        )}
                        {visibleColumns.departamento && (
                          <TableCell>
                            <div className="text-sm text-slate-900 dark:text-slate-100 dark:text-slate-200">{emp.departamento || '-'}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{emp.puesto}</div>
                          </TableCell>
                        )}
                        {visibleColumns.equipo && (
                          <TableCell className="text-xs">{emp.equipo || '-'}</TableCell>
                        )}
                        {visibleColumns.contacto && (
                          <TableCell>
                            {permissions.campos.ver_contacto ? (
                              <div className="flex flex-col gap-1 text-xs">
                                {emp.email && (
                                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                    <Mail className="w-3 h-3" /> {emp.email}
                                  </div>
                                )}
                                {emp.telefono_movil && (
                                  <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                    <Phone className="w-3 h-3" /> {emp.telefono_movil}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Oculto</span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.direccion && (
                          <TableCell className="text-xs max-w-[150px] truncate" title={emp.direccion}>
                            {permissions.campos.ver_direccion ? emp.direccion || '-' : '******'}
                          </TableCell>
                        )}
                        {visibleColumns.nacionalidad && (
                          <TableCell className="text-xs">{emp.nacionalidad || '-'}</TableCell>
                        )}
                        {visibleColumns.sexo && (
                          <TableCell className="text-xs">{emp.sexo || '-'}</TableCell>
                        )}
                        {visibleColumns.estado && (
                          <TableCell>
                            <Badge className={
                              emp.estado_empleado === 'Alta' 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }>
                              {emp.estado_empleado}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.tipo_contrato && (
                          <TableCell className="text-xs">{emp.tipo_contrato || '-'}</TableCell>
                        )}
                        {visibleColumns.tipo_jornada && (
                          <TableCell className="text-xs">{emp.tipo_jornada || '-'}</TableCell>
                        )}
                        {visibleColumns.tipo_turno && (
                          <TableCell className="text-xs">{emp.tipo_turno || '-'}</TableCell>
                        )}
                        {visibleColumns.datos_privados && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {permissions.campos.ver_salario ? (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border-green-200 text-green-700 bg-green-50 cursor-help" 
                                  title="Salario visible"
                                  onClick={() => logAction('view_sensitive', emp, { field: 'salario' })}
                                >
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  {emp.salario_anual ? `${(emp.salario_anual).toLocaleString()}€` : '-'}
                                </Badge>
                              ) : (
                                <EyeOff className="w-4 h-4 text-slate-300" title="Salario oculto" />
                              )}
                              
                              {permissions.campos.ver_dni ? (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs border-blue-200 text-blue-700 bg-blue-50 cursor-help" 
                                  title="DNI visible"
                                  onClick={() => logAction('view_sensitive', emp, { field: 'dni' })}
                                >
                                  ID
                                </Badge>
                              ) : (
                                <EyeOff className="w-4 h-4 text-slate-300" title="DNI oculto" />
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.fecha_alta && (
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                            {emp.fecha_alta ? format(new Date(emp.fecha_alta), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.fecha_fin_contrato && (
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                            {emp.fecha_fin_contrato ? format(new Date(emp.fecha_fin_contrato), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.fecha_nacimiento && (
                          <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                            {emp.fecha_nacimiento ? format(new Date(emp.fecha_nacimiento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.empresa_ett && (
                          <TableCell className="text-xs">{emp.empresa_ett || '-'}</TableCell>
                        )}
                        {visibleColumns.formacion && (
                          <TableCell className="text-xs max-w-[150px] truncate" title={emp.formacion}>
                            {emp.formacion || '-'}
                          </TableCell>
                        )}
                        {visibleColumns.categoria && (
                          <TableCell className="text-xs">{emp.categoria || '-'}</TableCell>
                        )}
                        {visibleColumns.acciones && (
                          <TableCell className="text-right">
                            {permissions.editar && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEmployeeToEdit(emp);
                                  setEditDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0"
                                title="Ver Ficha Completa"
                              >
                                <IdCard className="w-5 h-5 text-blue-600 hover:text-blue-800" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Mostrando {currentViewEmployees.length} de {filteredEmployees.length} registros
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * pageSize >= filteredEmployees.length}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {editDialogOpen && (
        <MasterEmployeeEditDialog
          employee={employeeToEdit}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEmployeeToEdit(null);
          }}
          permissions={permissions} // Pass permissions to dialog
        />
      )}
    </div>
  );
}