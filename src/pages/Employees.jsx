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
import { Users, User, Trash2, ArrowLeft, CheckCircle2, AlertCircle, Clock, Database, Cake, Calendar, TrendingUp, Columns } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isSameDay, differenceInYears, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import AdvancedSearch from "../components/common/AdvancedSearch";
import ThemeToggle from "../components/common/ThemeToggle";
import { toast } from "sonner";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";

export default function EmployeesPage() {
  const [filters, setFilters] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState({
    codigo_empleado: true,
    nombre: true,
    departamento: true,
    puesto: true,
    estado_empleado: true,
    fecha_alta: false,
    tipo_contrato: false,
    email: false,
    telefono_movil: false,
  });
  const queryClient = useQueryClient();

  const { data: masterEmployees = [], isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('-created_date'),
    initialData: [],
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
    const estados = [...new Set(masterEmployees.map(e => e.estado_empleado).filter(Boolean))].sort();
    const estadosSinc = [...new Set(masterEmployees.map(e => e.estado_sincronizacion).filter(Boolean))].sort();

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
        label: 'Estado Empleado',
        options: estados.map(e => ({ value: e, label: e }))
      },
      estado_sincronizacion: {
        label: 'Estado Sincronización',
        options: estadosSinc.map(e => ({ value: e, label: e }))
      }
    };
  }, [masterEmployees]);

  const filteredEmployees = useMemo(() => {
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
      
      const matchesEstado = !filters.estado_empleado || filters.estado_empleado === 'all' || 
        emp.estado_empleado === filters.estado_empleado;
      
      const matchesEstadoSinc = !filters.estado_sincronizacion || filters.estado_sincronizacion === 'all' || 
        emp.estado_sincronizacion === filters.estado_sincronizacion;

      return matchesSearch && matchesDept && matchesPuesto && matchesEstado && matchesEstadoSinc;
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



  // Métricas de RRHH
  const stats = useMemo(() => {
    const today = new Date();
    const next7Days = addDays(today, 7);
    
    const activeEmployees = masterEmployees.filter(e => e.estado_empleado === 'Alta');
    
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
    
    return {
      total: masterEmployees.length,
      active: activeEmployees.length,
      inactive: masterEmployees.filter(e => e.estado_empleado === 'Baja').length,
      avgTenure: activeEmployees.length > 0 
        ? Math.round(activeEmployees.reduce((sum, e) => {
            if (!e.fecha_alta) return sum;
            return sum + differenceInYears(today, new Date(e.fecha_alta));
          }, 0) / activeEmployees.length)
        : 0,
      birthdays,
      anniversaries
    };
  }, [masterEmployees]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("HRDashboard")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Panel RRHH
            </Button>
          </Link>
        </div>

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

        {/* Resumen Ejecutivo y Métricas Clave */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300 font-medium uppercase">Total Empleados</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
                </div>
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-green-700 dark:text-green-300 font-medium uppercase">Empleados Activos</p>
                  <p className="text-xl font-bold text-green-900 dark:text-green-100">{stats.active}</p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium uppercase">Empleados Baja</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.inactive}</p>
                </div>
                <AlertCircle className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-purple-700 dark:text-purple-300 font-medium uppercase">Antigüedad Media</p>
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{stats.avgTenure} años</p>
                </div>
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cumpleaños y Aniversarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm flex items-center gap-2 dark:text-slate-100">
                <Cake className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                Cumpleaños Próximos (7 días)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {stats.birthdays.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No hay cumpleaños próximos</p>
              ) : (
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {stats.birthdays.slice(0, 3).map((emp) => (
                    <div key={emp.id} className="text-xs flex items-center justify-between p-1.5 rounded bg-pink-50 dark:bg-pink-950/30">
                      <span className="font-medium dark:text-slate-200">{emp.nombre}</span>
                      <span className="text-slate-600 dark:text-slate-400">{format(new Date(emp.fecha_nacimiento), 'd MMM', { locale: es })}</span>
                    </div>
                  ))}
                  {stats.birthdays.length > 3 && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">...y {stats.birthdays.length - 3} más</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-md">
            <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-sm flex items-center gap-2 dark:text-slate-100">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Aniversarios Laborales (7 días)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {stats.anniversaries.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No hay aniversarios próximos</p>
              ) : (
                <div className="space-y-1.5 max-h-24 overflow-y-auto">
                  {stats.anniversaries.slice(0, 3).map((emp) => {
                    const years = differenceInYears(new Date(), new Date(emp.fecha_alta));
                    return (
                      <div key={emp.id} className="text-xs flex items-center justify-between p-1.5 rounded bg-blue-50 dark:bg-blue-950/30">
                        <span className="font-medium dark:text-slate-200">{emp.nombre}</span>
                        <span className="text-slate-600 dark:text-slate-400">{years} años</span>
                      </div>
                    );
                  })}
                  {stats.anniversaries.length > 3 && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">...y {stats.anniversaries.length - 3} más</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
                      {visibleColumns.estado_empleado && <TableHead className="font-semibold dark:text-slate-200">Estado</TableHead>}
                      {visibleColumns.fecha_alta && <TableHead className="font-semibold dark:text-slate-200">Fecha Alta</TableHead>}
                      {visibleColumns.tipo_contrato && <TableHead className="font-semibold dark:text-slate-200">Tipo Contrato</TableHead>}
                      {visibleColumns.email && <TableHead className="font-semibold dark:text-slate-200">Email</TableHead>}
                      {visibleColumns.telefono_movil && <TableHead className="font-semibold dark:text-slate-200">Teléfono</TableHead>}
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
                            {emp.fecha_alta ? format(new Date(emp.fecha_alta), 'dd/MM/yyyy', { locale: es }) : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.tipo_contrato && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.tipo_contrato || '-'}</TableCell>
                        )}
                        {visibleColumns.email && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.email || '-'}</TableCell>
                        )}
                        {visibleColumns.telefono_movil && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.telefono_movil || '-'}</TableCell>
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
      </div>

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
  );
}