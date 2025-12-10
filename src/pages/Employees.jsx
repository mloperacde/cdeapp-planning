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
import { 
  Users, 
  ArrowLeft, 
  User,
  Columns,
  Search,
  Filter,
  Download,
  Eye,
  EyeOff,
  Briefcase,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AdvancedSearch from "../components/common/AdvancedSearch";
import ThemeToggle from "../components/common/ThemeToggle";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";

const EMPTY_ARRAY = [];
const SEARCH_FIELDS = ['nombre', 'codigo_empleado', 'departamento', 'puesto', 'email'];
const SORT_OPTIONS = [
  { field: 'nombre', label: 'Nombre' },
  { field: 'departamento', label: 'Departamento' },
  { field: 'puesto', label: 'Puesto' },
  { field: 'fecha_alta', label: 'Fecha Alta' },
];

export default function EmployeesPage() {
  const [filters, setFilters] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
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

  const permissions = useMemo(() => {
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
      return {
        ver_lista: true,
        crear: true,
        editar: true,
        eliminar: true,
        campos: {
          ver_salario: true,
          ver_bancarios: true,
          ver_contacto: true,
          ver_direccion: true,
          ver_dni: true,
          editar_sensible: true
        }
      };
    }

    // Combine permissions from all roles
    userRoleAssignments.forEach(assignment => {
      const role = userRoles.find(r => r.id === assignment.role_id);
      if (role?.permissions) {
        if (role.permissions.empleados?.ver) perms.ver_lista = true;
        if (role.permissions.empleados?.crear) perms.crear = true;
        if (role.permissions.empleados?.editar) perms.editar = true;
        if (role.permissions.empleados?.eliminar) perms.eliminar = true;
        
        // Field permissions
        if (role.permissions.campos_empleado) {
          if (role.permissions.campos_empleado.ver_salario) perms.campos.ver_salario = true;
          if (role.permissions.campos_empleado.ver_bancarios) perms.campos.ver_bancarios = true;
          if (role.permissions.campos_empleado.ver_contacto) perms.campos.ver_contacto = true;
          if (role.permissions.campos_empleado.ver_direccion) perms.campos.ver_direccion = true;
          if (role.permissions.campos_empleado.ver_dni) perms.campos.ver_dni = true;
          if (role.permissions.campos_empleado.editar_sensible) perms.campos.editar_sensible = true;
        }
      }
    });

    return perms;
  }, [currentUser, userRoleAssignments, userRoles]);

  const { data: employees = EMPTY_ARRAY, isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase', page, pageSize],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('-created_date', pageSize, page * pageSize),
    enabled: permissions.ver_lista
  });

  const filterOptions = useMemo(() => {
    const departamentos = [...new Set(employees.map(e => e.departamento).filter(Boolean))].sort();
    const puestos = [...new Set(employees.map(e => e.puesto).filter(Boolean))].sort();
    const estados = [...new Set(employees.map(e => e.estado_empleado).filter(Boolean))].sort();

    return {
      departamento: {
        label: 'Departamento',
        options: departamentos.map(d => ({ value: d, label: d }))
      },
      puesto: {
        label: 'Puesto',
        options: puestos.map(p => ({ value: p, label: p }))
      },
      estado_empleado: {
        label: 'Estado',
        options: estados.map(e => ({ value: e, label: e }))
      }
    };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = !filters.departamento || filters.departamento === 'all' || 
        emp.departamento === filters.departamento;
      
      const matchesPuesto = !filters.puesto || filters.puesto === 'all' || 
        emp.puesto === filters.puesto;
      
      const matchesEstado = !filters.estado_empleado || filters.estado_empleado === 'all' || 
        emp.estado_empleado === filters.estado_empleado;

      return matchesSearch && matchesDept && matchesPuesto && matchesEstado;
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        const field = filters.sortField;
        const aVal = a[field];
        const bVal = b[field];
        if (!aVal) return 1;
        if (!bVal) return -1;
        return filters.sortDirection === 'desc' 
          ? String(bVal).localeCompare(String(aVal))
          : String(aVal).localeCompare(String(bVal));
      });
    }

    return result;
  }, [employees, filters]);

  // KPIs
  const stats = useMemo(() => {
    const total = employees.length;
    const activos = employees.filter(e => e.estado_empleado === 'Alta').length;
    const bajas = employees.filter(e => e.estado_empleado === 'Baja').length;
    const nuevosMes = employees.filter(e => {
      if (!e.fecha_alta) return false;
      const alta = new Date(e.fecha_alta);
      const now = new Date();
      return alta.getMonth() === now.getMonth() && alta.getFullYear() === now.getFullYear();
    }).length;

    return { total, activos, bajas, nuevosMes };
  }, [employees]);

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
              Gestión de Empleados
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Panel de RRHH para la gestión del personal
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

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Activos</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.activos}</span>
                <span className="text-xs text-slate-500">en plantilla</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-slate-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Bajas</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.bajas}</span>
                <span className="text-xs text-slate-500">histórico</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-purple-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Nuevos este mes</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.nuevosMes}</span>
                <span className="text-xs text-slate-500">incorporaciones</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter */}
        <Card className="mb-6 shadow-sm border-0 bg-white/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <AdvancedSearch
              data={employees}
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
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando empleados...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-500">No se encontraron empleados.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento / Puesto</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Datos Privados</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
                        <TableCell>
                          <div className="text-sm text-slate-900 dark:text-slate-200">{emp.departamento || '-'}</div>
                          <div className="text-xs text-slate-500">{emp.puesto}</div>
                        </TableCell>
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
                        <TableCell>
                          <Badge className={
                            emp.estado_empleado === 'Alta' 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }>
                            {emp.estado_empleado}
                          </Badge>
                        </TableCell>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando {filteredEmployees.length} registros
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
                disabled={filteredEmployees.length < pageSize}
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