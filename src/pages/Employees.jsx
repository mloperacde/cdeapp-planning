import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  AlertCircle
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
];

const ALL_COLUMNS = {
  nombre: { label: "Empleado", default: true },
  departamento: { label: "Departamento / Puesto", default: true },
  contacto: { label: "Contacto", default: true },
  estado: { label: "Estado", default: true },
  datos_privados: { label: "Datos Privados", default: true },
  fecha_alta: { label: "Fecha Alta", default: false },
  fecha_fin_contrato: { label: "Fin Contrato", default: false },
  fecha_nacimiento: { label: "Fecha Nacimiento", default: false },
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

  const { data: userRoleAssignments = EMPTY_ARRAY } = useQuery({
    queryKey: ['userRoleAssignments', currentUser?.email],
    queryFn: () => base44.entities.UserRoleAssignment.filter({ user_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const { data: userRoles = EMPTY_ARRAY } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
  });

  const { isShiftManager, permissions } = useMemo(() => {
    let isShiftManager = false;
    let isAdmin = false;

    const perms = {
      ver_lista: false,
      crear: false,
      editar: false,
      eliminar: false,
      campos: {
        ver_salario: false,
        ver_bancarios: false,
        ver_contacto: false,
        ver_direccion: false,
        ver_dni: false,
        editar_sensible: false
      }
    };

    if (currentUser?.role === 'admin') {
      isAdmin = true;
      perms.ver_lista = true;
      perms.crear = true;
      perms.editar = true;
      perms.eliminar = true;
      perms.campos = {
        ver_salario: true,
        ver_bancarios: true,
        ver_contacto: true,
        ver_direccion: true,
        ver_dni: true,
        editar_sensible: true
      };
    } else {
      userRoleAssignments.forEach(assignment => {
        const role = userRoles.find(r => r.id === assignment.role_id);
        if (role) {
          if (role.role_name === 'Jefe de Turno') isShiftManager = true;
          if (role.is_admin) isAdmin = true;

          if (role.permissions) {
            if (role.permissions.empleados?.ver) perms.ver_lista = true;
            if (role.permissions.empleados?.crear) perms.crear = true;
            if (role.permissions.empleados?.editar) perms.editar = true;
            if (role.permissions.empleados?.eliminar) perms.eliminar = true;
            
            if (role.permissions.campos_empleado) {
              if (role.permissions.campos_empleado.ver_salario) perms.campos.ver_salario = true;
              if (role.permissions.campos_empleado.ver_bancarios) perms.campos.ver_bancarios = true;
              if (role.permissions.campos_empleado.ver_contacto) perms.campos.ver_contacto = true;
              if (role.permissions.campos_empleado.ver_direccion) perms.campos.ver_direccion = true;
              if (role.permissions.campos_empleado.ver_dni) perms.campos.ver_dni = true;
              if (role.permissions.campos_empleado.editar_sensible) perms.campos.editar_sensible = true;
            }
          }
        }
      });
    }

    // If user is Admin, they are NOT restricted as a shift manager
    if (isAdmin) isShiftManager = false;

    return { isShiftManager, permissions: perms };
  }, [currentUser, userRoleAssignments, userRoles]);

  // Fetch ALL employees for stats
  const { data: allEmployees = EMPTY_ARRAY } = useQuery({
    queryKey: ['allEmployeesMaster'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    enabled: permissions.ver_lista,
    staleTime: 5 * 60 * 1000 // 5 minutes cache
  });

  // Fetch Onboardings
  const { data: onboardings = EMPTY_ARRAY } = useQuery({
    queryKey: ['onboardings'],
    queryFn: () => base44.entities.EmployeeOnboarding.list(),
    enabled: permissions.ver_lista && !isShiftManager
  });

  // Fetch Notifications (filtered later if needed)
  const { data: notifications = EMPTY_ARRAY } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => base44.entities.Notification.list(),
    enabled: permissions.ver_lista && !isShiftManager
  });

  // Effective Employees List (Apply Shift Manager Restriction)
  const effectiveEmployees = useMemo(() => {
    if (isShiftManager) {
      return allEmployees.filter(emp => emp.departamento === 'Fabricación');
    }
    return allEmployees;
  }, [allEmployees, isShiftManager]);

  const filterOptions = useMemo(() => {
    const departamentos = [...new Set(effectiveEmployees.map(e => e.departamento).filter(Boolean))].sort();
    const puestos = [...new Set(effectiveEmployees.map(e => e.puesto).filter(Boolean))].sort();
    const estados = [...new Set(effectiveEmployees.map(e => e.estado_empleado).filter(Boolean))].sort();
    const tiposContrato = [...new Set(effectiveEmployees.map(e => e.tipo_contrato).filter(Boolean))].sort();
    const turnos = [...new Set(effectiveEmployees.map(e => e.tipo_turno).filter(Boolean))].sort();

    return {
      // Hide departamento filter for shift managers as it's restricted
      ...(!isShiftManager ? {
        departamento: {
          label: 'Departamento',
          options: departamentos.map(d => ({ value: d, label: d }))
        }
      } : {}),
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

      return matchesSearch && matchesDept && matchesPuesto && matchesEstado && matchesContrato && matchesTurno;
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

    return { 
      total, 
      activos, 
      disponibles,
      bajas, 
      pendingOnboardings, 
      hrNotifications, 
      upcomingContractExpirations,
      byDepartment
    };
  }, [effectiveEmployees, onboardings, notifications]);

  if (!permissions.ver_lista) {
    return (
      <div className="p-8 text-center text-slate-500">
        No tienes permisos para ver el listado de empleados.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
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

        {/* Dashboard Cards - RRHH View */}
        {!isShiftManager && (
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
            <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Empleados</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Disponibles</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.disponibles}</span>
                  <span className="text-xs text-slate-500">de {stats.activos} activos</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Vencimiento Contrato</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.upcomingContractExpirations}</span>
                  <span className="text-xs text-slate-500">próximos 30 días</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-purple-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Onboarding</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.pendingOnboardings}</span>
                  <span className="text-xs text-slate-500">pendientes</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-red-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Notificaciones RRHH</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.hrNotifications}</span>
                  <span className="text-xs text-slate-500">sin leer</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Dashboard Cards - Shift Manager View */}
        {isShiftManager && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-blue-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Personal Fabricación</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-green-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Disponibles</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.disponibles}</span>
                  <span className="text-xs text-slate-500">para turno</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-amber-500 shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Vencimientos Próximos</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.upcomingContractExpirations}</span>
                  <span className="text-xs text-slate-500">contratos</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* HR - Departments Overview */}
        {!isShiftManager && (
          <Card className="mb-8 border-0 shadow-sm bg-slate-50 dark:bg-slate-800/50">
            <CardHeader className="py-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Building className="w-4 h-4" />
                Distribución por Departamento
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <div className="flex flex-wrap gap-4">
                {Object.entries(stats.byDepartment).map(([dept, count]) => (
                  <div key={dept} className="flex items-center gap-2 bg-white dark:bg-slate-700 px-3 py-2 rounded-lg border dark:border-slate-600">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{dept}</span>
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-600 dark:text-slate-100">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search & Filter */}
        <Card className="mb-6 shadow-sm border-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
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
        <Card className="shadow-lg border-0 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-4">
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
              <div className="p-12 text-center text-slate-500">No se encontraron empleados.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
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
                      <TableRow key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        {visibleColumns.nombre && (
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                {emp.nombre.charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-slate-900 dark:text-slate-100">{emp.nombre}</div>
                                <div className="text-xs text-slate-500 font-mono">{emp.codigo_empleado}</div>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.departamento && (
                          <TableCell>
                            <div className="text-sm text-slate-900 dark:text-slate-200">{emp.departamento || '-'}</div>
                            <div className="text-xs text-slate-500">{emp.puesto}</div>
                          </TableCell>
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
                        {visibleColumns.datos_privados && (
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {permissions.campos.ver_salario ? (
                                <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50" title="Salario visible">
                                  <CreditCard className="w-3 h-3 mr-1" />
                                  {emp.salario_anual ? `${(emp.salario_anual).toLocaleString()}€` : '-'}
                                </Badge>
                              ) : (
                                <EyeOff className="w-4 h-4 text-slate-300" title="Salario oculto" />
                              )}
                              
                              {permissions.campos.ver_dni ? (
                                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50" title="DNI visible">
                                  ID
                                </Badge>
                              ) : (
                                <EyeOff className="w-4 h-4 text-slate-300" title="DNI oculto" />
                              )}
                            </div>
                          </TableCell>
                        )}
                        {visibleColumns.fecha_alta && (
                          <TableCell className="text-xs text-slate-500">
                            {emp.fecha_alta ? format(new Date(emp.fecha_alta), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.fecha_fin_contrato && (
                          <TableCell className="text-xs text-slate-500">
                            {emp.fecha_fin_contrato ? format(new Date(emp.fecha_fin_contrato), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.fecha_nacimiento && (
                          <TableCell className="text-xs text-slate-500">
                            {emp.fecha_nacimiento ? format(new Date(emp.fecha_nacimiento), 'dd/MM/yyyy') : '-'}
                          </TableCell>
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
                              >
                                <Briefcase className="w-4 h-4 text-slate-500 hover:text-blue-600" />
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
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
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