import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../components/data/DataProvider";
import { usePermissions } from "../components/permissions/usePermissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
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
import { 
  Database, 
  Trash2, 
  User, 
  Columns, 
  Search,
  Plus,
  Users,
  UserX,
  UserCheck,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";
import MasterEmployeeBulkEditDialog from "../components/master/MasterEmployeeBulkEditDialog";
import AdvancedSearch from "../components/common/AdvancedSearch";
import MachineDisplayVerification from "../components/verification/MachineDisplayVerification";

// Definición completa de columnas disponibles
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Bulk actions state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState(() => {
    try {
      const saved = localStorage.getItem("masterEmployeeColumns");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Error loading columns from localStorage", e);
    }
    const defaults = {};
    Object.keys(ALL_COLUMNS).forEach(key => {
      defaults[key] = ALL_COLUMNS[key].default;
    });
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem("masterEmployeeColumns", JSON.stringify(visibleColumns));
    } catch (e) {
      console.warn("Error saving columns to localStorage", e);
    }
  }, [visibleColumns]);

  const queryClient = useQueryClient();
  // Safe destructuring with defaults to prevent crashes
  const appData = useAppData() || {};
  const { employees: masterEmployees = EMPTY_ARRAY, employeesLoading: isLoading } = appData;
  const permissions = usePermissions() || {};

  const canCreateEmployee = permissions.isAdmin || permissions.canEditEmployees;
  // Use centralized permission check instead of hardcoded role check
  const isHrModuleAllowed = permissions.canAccessPage 
    ? permissions.canAccessPage('/MasterEmployeeDatabase') 
    : (permissions.role === "hr_manager" || permissions.isAdmin);

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeMasterDatabase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
    },
  });

  const filterOptions = useMemo(() => {
    if (!masterEmployees) return {};
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
    if (!masterEmployees) return [];
    
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
        } else if (aVal instanceof Date || (typeof aVal === 'string' && !isNaN(Date.parse(aVal)))) {
          comparison = new Date(aVal) - new Date(bVal);
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return filters.sortDirection === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [masterEmployees, filters]);

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIds = filteredEmployees.map(e => e.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id, checked) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const stats = useMemo(() => {
    if (!masterEmployees) return { total: 0, active: 0, absent: 0, departments: 0, employeesPerDept: [] };
    
    // Calculate employees per department
    const deptCounts = masterEmployees.reduce((acc, emp) => {
      const dept = emp.departamento || 'Sin Departamento';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    const employeesPerDept = Object.entries(deptCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: masterEmployees.filter(e => ['Alta', 'Excedencia'].includes(e.estado_empleado)).length,
      active: masterEmployees.filter(e => e.estado_empleado === 'Alta').length,
      absent: masterEmployees.filter(e => e.disponibilidad === 'Ausente').length,
      departments: new Set(masterEmployees.map(e => e.departamento).filter(Boolean)).size,
      employeesPerDept
    };
  }, [masterEmployees]);

  if (!isHrModuleAllowed) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
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
    <div className="h-full flex flex-col p-2 gap-2 bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header Section Compact */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Base de Datos Maestra
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestión centralizada de empleados
            </p>
          </div>
        </div>
        
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 shrink-0">
        <Card className="p-3 flex flex-col justify-between bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Resumen de Personal</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</span>
              <span className="text-[10px] text-slate-500">Total</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-green-500" />
                <span className="text-4xl font-bold text-green-600 dark:text-green-400">{stats.active}</span>
              </div>
              <span className="text-[10px] text-slate-500">Activos</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <UserX className="w-3 h-3 text-red-500" />
                <span className="text-4xl font-bold text-red-600 dark:text-red-400">{stats.absent}</span>
              </div>
              <span className="text-[10px] text-slate-500">Ausentes</span>
            </div>
          </div>
        </Card>

        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Por Departamento</span>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 overflow-x-auto no-scrollbar">
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 min-w-max pb-2">
              {stats.employeesPerDept.map((dept, i) => (
                <div key={i} className="flex flex-col p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none mb-1">{dept.count}</span>
                  <span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight truncate max-w-[120px]" title={dept.name}>{dept.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar Section */}
      <div className="flex flex-col sm:flex-row gap-2 shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar empleado por nombre, código, puesto..."
            className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            value={filters.searchTerm || ""}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          />
        </div>
        
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-md font-medium flex items-center gap-2">
              <span className="bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">{selectedIds.size}</span>
              <span>seleccionados</span>
            </div>
            <Button 
              size="sm" 
              variant="secondary"
              className="h-9 bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
              onClick={() => setBulkEditDialogOpen(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              Cambiar Dept.
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              className="h-9 w-9 p-0 text-slate-500 hover:text-slate-700"
              onClick={() => setSelectedIds(new Set())}
              title="Limpiar selección"
            >
              <UserX className="w-4 h-4" />
            </Button>
            <div className="w-px h-6 bg-slate-300 mx-1"></div>
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-9 px-3 ${showFilters ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}
          >
            <Search className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{showFilters ? 'Ocultar Filtros' : 'Filtros'}</span>
            {showFilters ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 px-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                <Columns className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Columnas</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
              {Object.keys(ALL_COLUMNS).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column}
                  checked={visibleColumns[column]}
                  onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, [column]: checked }))}
                >
                  {ALL_COLUMNS[column].label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {canCreateEmployee && (
            <Button
              onClick={() => {
                setEmployeeToEdit(null);
                setEditDialogOpen(true);
              }}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 h-9 px-3"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm shrink-0 animate-in slide-in-from-top-2 duration-200">
          <AdvancedSearch
            data={masterEmployees}
            onFilterChange={setFilters}
            searchFields={SEARCH_FIELDS}
            filterOptions={filterOptions}
            sortOptions={SORT_OPTIONS}
            placeholder="Buscar..."
            pageId="master_employee_database"
            enableSearch={false}
            currentSearchTerm={filters.searchTerm || ""}
          />
        </Card>
      )}

      {/* Main Content Area */}
      <Card className="flex-1 flex flex-col min-h-0 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
        <div className="flex-1 overflow-auto relative">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="flex flex-col items-center gap-2">
                 <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                 <p className="text-xs">Cargando datos...</p>
              </div>
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p className="text-sm">No se encontraron registros</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 shadow-sm">
                <TableRow className="hover:bg-transparent border-b-slate-200 dark:border-b-slate-800 h-8">
                  <TableHead className="w-[40px] px-3 bg-slate-50 dark:bg-slate-950">
                    <Checkbox 
                      checked={filteredEmployees.length > 0 && selectedIds.size === filteredEmployees.length}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                      className="translate-y-[2px]"
                    />
                  </TableHead>
                  {Object.keys(ALL_COLUMNS).map(key => 
                    visibleColumns[key] && (
                      <TableHead 
                        key={key} 
                        className="whitespace-nowrap h-8 py-1 px-3 text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider bg-slate-50 dark:bg-slate-950"
                      >
                        {ALL_COLUMNS[key].label}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow 
                    key={emp.id} 
                    className={`
                      border-b-slate-100 dark:border-b-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors h-8 group
                      ${emp.disponibilidad === 'Ausente' ? 'bg-red-50/40 hover:bg-red-50 dark:bg-red-950/10 dark:hover:bg-red-950/20' : ''}
                  `}
                >
                  <TableCell className="py-0.5 px-3 w-[40px]">
                    <Checkbox 
                      checked={selectedIds.has(emp.id)}
                      onCheckedChange={(checked) => handleSelectOne(emp.id, checked)}
                      aria-label={`Select ${emp.nombre}`}
                      className="translate-y-[2px]"
                    />
                  </TableCell>
                  {visibleColumns.codigo_empleado && (
                      <TableCell className="py-0.5 px-3 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                        {emp.codigo_empleado || '-'}
                      </TableCell>
                    )}
                    {visibleColumns.nombre && (
                      <TableCell className="py-0.5 px-3 text-[11px] font-medium text-slate-900 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          {emp.disponibilidad === 'Ausente' && (
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" title="Ausente" />
                          )}
                          <span className="truncate max-w-[180px]" title={emp.nombre}>{emp.nombre}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.departamento && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[120px]" title={emp.departamento}>
                        {emp.departamento || '-'}
                      </TableCell>
                    )}
                    {visibleColumns.puesto && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[120px]" title={emp.puesto}>
                        {emp.puesto || '-'}
                      </TableCell>
                    )}
                    {visibleColumns.categoria && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{emp.categoria || '-'}</TableCell>
                    )}
                    {visibleColumns.estado_empleado && (
                      <TableCell className="py-0.5 px-3">
                        <Badge variant="secondary" className={`
                          h-4 text-[9px] px-1 font-medium rounded-sm
                          ${emp.estado_empleado === 'Alta' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}
                        `}>
                          {emp.estado_empleado}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.fecha_alta && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.fecha_alta ? format(new Date(emp.fecha_alta), 'dd/MM/yy') : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.fecha_baja && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.fecha_baja ? format(new Date(emp.fecha_baja), 'dd/MM/yy') : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.motivo_baja && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{emp.motivo_baja || '-'}</TableCell>
                    )}
                    {visibleColumns.dni && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                        {permissions.isAdmin || permissions.canViewPersonalData ? emp.dni || '-' : '******'}
                      </TableCell>
                    )}
                    {visibleColumns.nuss && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400">{emp.nuss || '-'}</TableCell>
                    )}
                    {visibleColumns.sexo && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400">{emp.sexo || '-'}</TableCell>
                    )}
                    {visibleColumns.nacionalidad && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[80px]">{emp.nacionalidad || '-'}</TableCell>
                    )}
                    {visibleColumns.direccion && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={emp.direccion}>
                        {permissions.isAdmin || permissions.canViewPersonalData ? emp.direccion || '-' : '******'}
                      </TableCell>
                    )}
                    {visibleColumns.email && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={emp.email}>
                        {permissions.isAdmin || permissions.canViewPersonalData ? emp.email || '-' : '******'}
                      </TableCell>
                    )}
                    {visibleColumns.telefono_movil && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                        {permissions.isAdmin || permissions.canViewPersonalData ? emp.telefono_movil || '-' : '******'}
                      </TableCell>
                    )}
                    {visibleColumns.tipo_jornada && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{emp.tipo_jornada || '-'}</TableCell>
                    )}
                    {visibleColumns.num_horas_jornada && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 text-center">{emp.num_horas_jornada || '-'}</TableCell>
                    )}
                    {visibleColumns.tipo_turno && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{emp.tipo_turno || '-'}</TableCell>
                    )}
                    {visibleColumns.equipo && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{emp.equipo || '-'}</TableCell>
                    )}
                    {visibleColumns.tipo_contrato && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{emp.tipo_contrato || '-'}</TableCell>
                    )}
                    {visibleColumns.codigo_contrato && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 font-mono">{emp.codigo_contrato || '-'}</TableCell>
                    )}
                    {visibleColumns.fecha_fin_contrato && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.fecha_fin_contrato ? format(new Date(emp.fecha_fin_contrato), 'dd/MM/yy') : '-'}
                      </TableCell>
                    )}
                    {visibleColumns.empresa_ett && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{emp.empresa_ett || '-'}</TableCell>
                    )}
                    {visibleColumns.salario_anual && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 font-mono text-right">
                        {permissions.isAdmin || permissions.canViewSalary ? emp.salario_anual || '-' : '******'}
                      </TableCell>
                    )}
                    {visibleColumns.iban && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 font-mono max-w-[120px] truncate">
                        {permissions.isAdmin || permissions.canViewBankingData ? emp.iban || '-' : '******'}
                      </TableCell>
                    )}
                    {visibleColumns.taquilla_vestuario && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 text-center">{emp.taquilla_vestuario || '-'}</TableCell>
                    )}
                    {visibleColumns.taquilla_numero && (
                      <TableCell className="py-0.5 px-3 text-[10px] text-slate-600 dark:text-slate-400 text-center">{emp.taquilla_numero || '-'}</TableCell>
                    )}
                    {visibleColumns.disponibilidad && (
                      <TableCell className="py-0.5 px-3 text-[10px]">
                        {emp.disponibilidad === 'Ausente' ? (
                          <Badge variant="outline" className="h-4 text-[9px] px-1 border-red-200 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-900/20 rounded-sm">
                            Ausente
                          </Badge>
                        ) : (
                          <span className="text-slate-600 dark:text-slate-400">{emp.disponibilidad || '-'}</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.estado_sincronizacion && (
                      <TableCell className="py-0.5 px-3">
                        <Badge variant="outline" className="h-4 text-[9px] px-1 border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-400 rounded-sm truncate max-w-[100px]">
                          {emp.estado_sincronizacion || "-"}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.ultimo_sincronizado && (
                      <TableCell className="py-0.5 px-3 text-[9px] text-slate-500 whitespace-nowrap">
                        {emp.ultimo_sincronizado && (
                          (() => {
                            try {
                              const date = new Date(emp.ultimo_sincronizado);
                              if (isNaN(date.getTime())) return '';
                              return format(date, 'dd/MM HH:mm', { locale: es });
                            } catch {
                              return '';
                            }
                          })()
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.acciones && (
                      <TableCell className="py-0.5 px-3 text-right bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEmployeeToEdit(emp);
                              setEditDialogOpen(true);
                            }}
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="Editar"
                          >
                            <User className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEmployeeToDelete(emp);
                              setDeleteConfirmOpen(true);
                            }}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

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
            <div className="fixed bottom-4 right-4 max-w-md z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
              <MachineDisplayVerification employeeId={employeeToEdit.id} />
            </div>
          )}
        </>
      )}

      {bulkEditDialogOpen && (
        <MasterEmployeeBulkEditDialog
          selectedIds={Array.from(selectedIds)}
          open={bulkEditDialogOpen}
          onClose={() => setBulkEditDialogOpen(false)}
          onSuccess={() => setSelectedIds(new Set())}
        />
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empleado permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará a <span className="font-bold text-slate-900 dark:text-slate-100">{employeeToDelete?.nombre}</span> de la base de datos. 
              No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
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
