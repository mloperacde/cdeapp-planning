import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../components/data/DataProvider";
import { usePermissions } from "../components/permissions/usePermissions";
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
import { Database, Trash2, User, Columns } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";
import AdvancedSearch from "../components/common/AdvancedSearch";
import MachineDisplayVerification from "../components/verification/MachineDisplayVerification";

// Definición completa de columnas disponibles (Moved outside component to avoid recreation)
const ALL_COLUMNS = {
  codigo_empleado: { label: "Código", default: true },
  nombre: { label: "Nombre", default: true },
  departamento: { label: "Departamento", default: true },
  puesto: { label: "Puesto", default: true },
  categoria: { label: "Categoría", default: false },
  estado_empleado: { label: "Estado", default: true },
  fecha_alta: { label: "Fecha Alta", default: false },
  fecha_baja: { label: "Fecha Baja", default: false },
  motivo_baja: { label: "Motivo Baja", default: false },
  dni: { label: "DNI", default: false },
  nuss: { label: "NUSS", default: false },
  sexo: { label: "Sexo", default: false },
  nacionalidad: { label: "Nacionalidad", default: false },
  direccion: { label: "Dirección", default: false },
  email: { label: "Email", default: false },
  telefono_movil: { label: "Móvil", default: false },
  tipo_jornada: { label: "Jornada", default: false },
  num_horas_jornada: { label: "Horas/Sem", default: false },
  tipo_turno: { label: "Turno", default: false },
  equipo: { label: "Equipo", default: false },
  tipo_contrato: { label: "Contrato", default: false },
  codigo_contrato: { label: "Cód. Contrato", default: false },
  fecha_fin_contrato: { label: "Fin Contrato", default: false },
  empresa_ett: { label: "ETT", default: false },
  salario_anual: { label: "Salario", default: false },
  iban: { label: "IBAN", default: false },
  taquilla_vestuario: { label: "Vestuario", default: false },
  taquilla_numero: { label: "Taquilla", default: false },
  disponibilidad: { label: "Disponibilidad", default: false },
  estado_sincronizacion: { label: "Sync Status", default: true },
  ultimo_sincronizado: { label: "Últ. Sync", default: true },
  acciones: { label: "Acciones", default: true }
};

// Constant arrays for stable references
const EMPTY_ARRAY = [];
const SEARCH_FIELDS = ['nombre', 'codigo_empleado', 'departamento', 'puesto', 'dni', 'email'];
const SORT_OPTIONS = [
  { field: 'nombre', label: 'Nombre' },
  { field: 'codigo_empleado', label: 'Código' },
  { field: 'departamento', label: 'Departamento' },
  { field: 'puesto', label: 'Puesto' },
  { field: 'estado_empleado', label: 'Estado' },
  { field: 'estado_sincronizacion', label: 'Estado Sincronización' },
  { field: 'fecha_alta', label: 'Fecha Alta' },
  { field: 'ultimo_sincronizado', label: 'Última Sincronización' },
];

export default function MasterEmployeeDatabasePage() {
  const [filters, setFilters] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);

  // Estado para confirmación de borrado
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("masterEmployeeColumns");
    if (saved) {
      return JSON.parse(saved);
    }
    const defaults = {};
    Object.keys(ALL_COLUMNS).forEach(key => {
      defaults[key] = ALL_COLUMNS[key].default;
    });
    return defaults;
  });

  // Persistir selección de columnas
  useEffect(() => {
    localStorage.setItem("masterEmployeeColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const queryClient = useQueryClient();

  const { 
    employees: masterEmployees = EMPTY_ARRAY, 
    employeesLoading: isLoading 
  } = useAppData();

  const permissions = usePermissions();

  const canCreateEmployee = permissions.isAdmin || permissions.canEditEmployees;
  const isHrModuleAllowed = permissions.role === "hr_manager" || permissions.isAdmin;

  // const { data: employees = [] } = useQuery({
  //   queryKey: ['employees'],
  //   queryFn: () => base44.entities.Employee.list(),
  //   initialData: [],
  // });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeMasterDatabase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
    },
  });

  // Opciones únicas para filtros
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
        
        // Manejo de valores nulos
        if (!aVal && !bVal) return 0;
        if (!aVal) return 1;
        if (!bVal) return -1;
        
        // Comparación según tipo
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

  const stats = {
    total: masterEmployees.length,
  };

  const employeesByDepartment = useMemo(() => {
    const map = {};
    masterEmployees.forEach(emp => {
      const dept = emp.departamento || "Sin departamento";
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [masterEmployees]);

  if (!isHrModuleAllowed) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Acceso restringido
          </h1>
          <p className="text-slate-600 dark:text-slate-300">
            No tienes permisos para acceder a la base de datos de empleados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">

        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Base de datos de Empleados
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Archivo maestro centralizado de empleados para gestión de RRHH
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total empleados en el sistema</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
                </div>
                <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">Distribución por Departamento</h3>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                    Visión rápida de dónde están tus equipos
                  </p>
                </div>
                <div className="p-2 bg-emerald-200/50 dark:bg-emerald-800/50 rounded-lg">
                    <User className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {employeesByDepartment.map(dept => (
                  <div key={dept.name} className="flex flex-col p-3 rounded-lg bg-white/60 dark:bg-black/20 border border-emerald-100 dark:border-emerald-800/50 hover:bg-white/80 dark:hover:bg-black/30 transition-colors">
                    <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                      {dept.count}
                    </span>
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 truncate" title={dept.name}>
                      {dept.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardTitle className="dark:text-slate-100">Registros en Base de Datos Maestra</CardTitle>
                
                <div className="flex gap-2">
                  {canCreateEmployee && (
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
                  )}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <AdvancedSearch
                    data={masterEmployees}
                    onFilterChange={setFilters}
                    searchFields={SEARCH_FIELDS}
                    filterOptions={filterOptions}
                    sortOptions={SORT_OPTIONS}
                    placeholder="Buscar por nombre, código, DNI, email..."
                    pageId="master_employee_database"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800 pt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 min-w-[140px]">
                      <Columns className="w-4 h-4 mr-2" />
                      Configurar Vista
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto dark:bg-slate-800 dark:border-slate-700">
                    {Object.keys(ALL_COLUMNS).map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column}
                        checked={visibleColumns[column]}
                        onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [column]: checked }))}
                        className="dark:text-slate-200"
                      >
                        {ALL_COLUMNS[column].label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">

            {isLoading ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">Cargando...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                {filters.searchTerm || Object.keys(filters).length > 0 
                  ? 'No se encontraron resultados con los filtros aplicados' 
                  : 'No hay registros en la base de datos maestra'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800">
                      {Object.keys(ALL_COLUMNS).map(key => 
                        visibleColumns[key] && <TableHead key={key} className="dark:text-slate-300 whitespace-nowrap">{ALL_COLUMNS[key].label}</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => (
                      <TableRow key={emp.id} className="dark:border-slate-800 dark:hover:bg-slate-800/50">
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
                          <TableCell className="dark:text-slate-300 text-xs">{emp.categoria || '-'}</TableCell>
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
                            {emp.fecha_alta ? format(new Date(emp.fecha_alta), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.fecha_baja && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {emp.fecha_baja ? format(new Date(emp.fecha_baja), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.motivo_baja && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.motivo_baja || '-'}</TableCell>
                        )}
                        {visibleColumns.dni && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {permissions.isAdmin || permissions.canViewPersonalData ? emp.dni || '-' : '******'}
                          </TableCell>
                        )}
                        {visibleColumns.nuss && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.nuss || '-'}</TableCell>
                        )}
                        {visibleColumns.sexo && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.sexo || '-'}</TableCell>
                        )}
                        {visibleColumns.nacionalidad && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.nacionalidad || '-'}</TableCell>
                        )}
                        {visibleColumns.direccion && (
                          <TableCell className="text-xs dark:text-slate-300 truncate max-w-[150px]" title={emp.direccion}>
                            {permissions.isAdmin || permissions.canViewPersonalData ? emp.direccion || '-' : '******'}
                          </TableCell>
                        )}
                        {visibleColumns.email && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {permissions.isAdmin || permissions.canViewPersonalData ? emp.email || '-' : '******'}
                          </TableCell>
                        )}
                        {visibleColumns.telefono_movil && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {permissions.isAdmin || permissions.canViewPersonalData ? emp.telefono_movil || '-' : '******'}
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
                        {visibleColumns.codigo_contrato && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.codigo_contrato || '-'}</TableCell>
                        )}
                        {visibleColumns.fecha_fin_contrato && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {emp.fecha_fin_contrato ? format(new Date(emp.fecha_fin_contrato), 'dd/MM/yyyy') : '-'}
                          </TableCell>
                        )}
                        {visibleColumns.empresa_ett && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.empresa_ett || '-'}</TableCell>
                        )}
                        {visibleColumns.salario_anual && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {permissions.isAdmin || permissions.canViewSalary ? emp.salario_anual || '-' : '******'}
                          </TableCell>
                        )}
                        {visibleColumns.iban && (
                          <TableCell className="text-xs dark:text-slate-300">
                            {permissions.isAdmin || permissions.canViewBankingData ? emp.iban || '-' : '******'}
                          </TableCell>
                        )}
                        {visibleColumns.taquilla_vestuario && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.taquilla_vestuario || '-'}</TableCell>
                        )}
                        {visibleColumns.taquilla_numero && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.taquilla_numero || '-'}</TableCell>
                        )}
                        {visibleColumns.disponibilidad && (
                          <TableCell className="text-xs dark:text-slate-300">{emp.disponibilidad || '-'}</TableCell>
                        )}
                        {visibleColumns.estado_sincronizacion && (
                          <TableCell>
                            <Badge className="bg-slate-600 dark:bg-slate-700 w-fit">
                              {emp.estado_sincronizacion || "-"}
                            </Badge>
                          </TableCell>
                        )}
                        {visibleColumns.ultimo_sincronizado && (
                          <TableCell>
                            {emp.ultimo_sincronizado && (
                              <span className="text-[10px] text-slate-500">
                                {(() => {
                                  try {
                                    const date = new Date(emp.ultimo_sincronizado);
                                    if (isNaN(date.getTime())) return '';
                                    return format(date, 'dd/MM HH:mm', { locale: es });
                                  } catch {
                                    return '';
                                  }
                                })()}
                              </span>
                            )}
                          </TableCell>
                        )}
                        {visibleColumns.acciones && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  setEmployeeToEdit(emp);
                                  setEditDialogOpen(true);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 h-8 w-8 p-0 rounded-full"
                                title="Editar"
                              >
                                <User className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEmployeeToDelete(emp);
                                  setDeleteConfirmOpen(true);
                                }}
                                className="h-8 w-8 p-0 rounded-full hover:bg-red-100"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
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
        <>
          <MasterEmployeeEditDialog
            employee={employeeToEdit}
            open={editDialogOpen}
            onClose={() => {
              setEditDialogOpen(false);
              setEmployeeToEdit(null);
            }}
          />
          {employeeToEdit && (
            <div className="fixed bottom-4 right-4 max-w-md z-50">
              <MachineDisplayVerification employeeId={employeeToEdit.id} />
            </div>
          )}
        </>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente al empleado 
              <span className="font-bold text-slate-900 dark:text-slate-100"> {employeeToDelete?.nombre} </span>
              de la base de datos maestra y del sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              onClick={() => {
                if (employeeToDelete) {
                  deleteMutation.mutate(employeeToDelete.id);
                  setDeleteConfirmOpen(false);
                  setEmployeeToDelete(null);
                }
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
