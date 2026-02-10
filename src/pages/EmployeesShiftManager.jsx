import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Columns,
  IdCard,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
 
import AdvancedSearch from "../components/common/AdvancedSearch";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";


const EMPTY_ARRAY = [];
const SEARCH_FIELDS = ['nombre', 'codigo_empleado', 'puesto', 'email', 'telefono_movil'];
const SORT_OPTIONS = [
  { field: 'nombre', label: 'Nombre' },
  { field: 'puesto', label: 'Puesto' },
  { field: 'fecha_alta', label: 'Fecha Alta' },
  { field: 'fecha_nacimiento', label: 'Fecha Nacimiento' },
  { field: 'antiguedad', label: 'Antigüedad' },
];

const ALL_COLUMNS = {
  codigo_empleado: { label: "Código", default: false },
  nombre: { label: "Empleado", default: true },
  puesto: { label: "Puesto", default: true },
  equipo: { label: "Equipo", default: true },
  contacto: { label: "Contacto", default: true },
  estado: { label: "Estado", default: true },
  tipo_turno: { label: "Turno", default: true },
  acciones: { label: "Acciones", default: true }
};

export default function EmployeesShiftManagerPage() {
  const [filters, setFilters] = useState({});
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem("employeesShiftManagerColumns");
    if (saved) {
      try { return JSON.parse(saved); } catch { return {}; }
    }
    const defaults = {};
    Object.keys(ALL_COLUMNS).forEach(key => {
      defaults[key] = ALL_COLUMNS[key].default;
    });
    return defaults;
  });

  React.useEffect(() => {
    localStorage.setItem("employeesShiftManagerColumns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);
  
  // Permissions for Shift Manager View - STRICT
  const permissions = useMemo(() => ({
    ver_lista: true,
    crear: true,
    editar: true, 
    eliminar: false,
    visibleDepartments: ['FABRICACION'],
    campos: {
      ver_salario: false,
      ver_bancarios: false,
      ver_contacto: true,
      ver_direccion: true,
      ver_dni: false,
      editar_sensible: true,
      editar_contacto: true 
    },
    tabs: {
      personal: true, 
      organizacion: true, 
      horarios: true, 
      taquilla: true, 
      contrato: false, 
      absentismo: true, 
      maquinas: true, 
      disponibilidad: true
    }
  }), []);

  // Fetch ALL employees but filter in memory or API
  const { data: allEmployees = EMPTY_ARRAY } = useQuery({
    queryKey: ['allEmployeesMaster'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    staleTime: 5 * 60 * 1000 
  });

  const [filters, setFilters] = useState({});
  const [visibleColumns, setVisibleColumns] = useState(
    Object.keys(ALL_COLUMNS).reduce((acc, key) => ({ ...acc, [key]: ALL_COLUMNS[key].default }), {})
  );
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Strict Filter: Only FABRICACION
  const effectiveEmployees = useMemo(() => {
    return allEmployees.filter(emp => emp.departamento === 'FABRICACION');
  }, [allEmployees]);

  const filterOptions = useMemo(() => {
    const puestos = [...new Set(effectiveEmployees.map(e => e.puesto).filter(Boolean))].sort();
    const turnos = [...new Set(effectiveEmployees.map(e => e.tipo_turno).filter(Boolean))].sort();
    const equipos = [...new Set(effectiveEmployees.map(e => e.equipo).filter(Boolean))].sort();

    return {
      equipo: {
        label: 'Equipo',
        options: equipos.map(e => ({ value: e, label: e }))
      },
      puesto: {
        label: 'Puesto',
        options: puestos.map(p => ({ value: p, label: p }))
      },
      tipo_turno: {
        label: 'Turno',
        options: turnos.map(t => ({ value: t, label: t }))
      }
    };
  }, [effectiveEmployees]);

  const filteredEmployees = useMemo(() => {
    let result = effectiveEmployees.filter(emp => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.puesto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.telefono_movil?.includes(searchTerm);

      const matchesPuesto = !filters.puesto || filters.puesto === 'all' || 
        emp.puesto === filters.puesto;
      
      const matchesTurno = !filters.tipo_turno || filters.tipo_turno === 'all' || 
        emp.tipo_turno === filters.tipo_turno;

      const matchesEquipo = !filters.equipo || filters.equipo === 'all' ||
        emp.equipo === filters.equipo;

      return matchesSearch && matchesPuesto && matchesTurno && matchesEquipo;
    });

    if (filters.sortField) {
      result = [...result].sort((a, b) => {
        const field = filters.sortField;
        const aVal = a[field];
        const bVal = b[field];
        if (!aVal) return 1;
        if (!bVal) return -1;
        
        let comparison = 0;
        if (field === 'fecha_alta' || field === 'fecha_nacimiento') {
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

  // KPIs
  const stats = useMemo(() => {
    const total = effectiveEmployees.length;
    const activos = effectiveEmployees.filter(e => e.estado_empleado === 'Alta').length;
    const disponibles = effectiveEmployees.filter(e => e.estado_empleado === 'Alta' && e.disponibilidad === 'Disponible').length;
    const now = new Date();
    
    // Contract Expirations (Next 30 days)
    const upcomingContractExpirations = effectiveEmployees.filter(e => {
      if (!e.fecha_fin_contrato || e.estado_empleado !== 'Alta') return false;
      const endContract = new Date(e.fecha_fin_contrato);
      const diffTime = endContract - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    }).length;

    return { total, activos, disponibles, upcomingContractExpirations };
  }, [effectiveEmployees]);

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
        {/* Header Estándar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
                Gestión de Turnos
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
                Administra los turnos y contratos de los empleados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* ThemeToggle removido - disponible en Layout */}
          </div>
        </div>

        {/* Dashboard Cards - Shift Manager View */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-800 border-l-4 border-l-blue-500 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Total Fabricación</p>
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

        {/* Search & Filter */}
        <Card className="mb-6 shadow-sm border-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <AdvancedSearch
              data={effectiveEmployees}
              onFilterChange={setFilters}
              searchFields={SEARCH_FIELDS}
              filterOptions={filterOptions}
              sortOptions={SORT_OPTIONS}
              placeholder="Buscar por nombre, puesto, equipo..."
              pageId="employees_shift_manager"
            />
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="shadow-lg border-0 bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Listado de Operarios</CardTitle>
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
              <div className="p-12 text-center text-slate-500">No se encontraron empleados de fabricación.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                      {visibleColumns.nombre && <TableHead>Empleado</TableHead>}
                      {visibleColumns.puesto && <TableHead>Puesto</TableHead>}
                      {visibleColumns.equipo && <TableHead>Equipo</TableHead>}
                      {visibleColumns.contacto && <TableHead>Contacto</TableHead>}
                      {visibleColumns.estado && <TableHead>Estado</TableHead>}
                      {visibleColumns.tipo_turno && <TableHead>Turno</TableHead>}
                      {visibleColumns.acciones && <TableHead className="text-right">Ficha</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentViewEmployees.map((emp) => (
                      <TableRow 
                        key={emp.id} 
                        className={cn(
                          "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          emp.disponibilidad === "Ausente" && "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30"
                        )}
                      >
                        {visibleColumns.nombre && (
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
                                emp.disponibilidad === "Ausente" 
                                  ? "bg-red-100 text-red-700" 
                                  : "bg-blue-100 text-blue-700"
                              )}>
                                {emp.nombre.charAt(0)}
                              </div>
                              <div>
                                <div className={cn(
                                  "font-medium",
                                  emp.disponibilidad === "Ausente" ? "text-red-700 dark:text-red-400" : "text-slate-900 dark:text-slate-100"
                                )}>
                                  {emp.nombre}
                                  {emp.disponibilidad === "Ausente" && (
                                    <span className="ml-2 inline-flex items-center text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full border border-red-200">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Ausente
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {visibleColumns.codigo_empleado && <div className="text-xs text-slate-500 ml-11">{emp.codigo_empleado}</div>}
                          </TableCell>
                        )}
                        {visibleColumns.puesto && (
                          <TableCell>
                            <div className="text-sm text-slate-900 dark:text-slate-200">{emp.puesto || '-'}</div>
                          </TableCell>
                        )}
                        {visibleColumns.equipo && (
                          <TableCell className="text-xs font-medium text-blue-600">{emp.equipo || '-'}</TableCell>
                        )}
                        {visibleColumns.contacto && (
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {emp.telefono_movil && (
                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                  <Phone className="w-3 h-3" /> {emp.telefono_movil}
                                </div>
                              )}
                              {emp.email && (
                                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                  <Mail className="w-3 h-3" /> {emp.email}
                                </div>
                              )}
                            </div>
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
                        {visibleColumns.tipo_turno && (
                          <TableCell className="text-xs">{emp.tipo_turno || '-'}</TableCell>
                        )}
                        {visibleColumns.acciones && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEmployeeToEdit(emp);
                                setEditDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                              title="Ver Ficha"
                            >
                              <IdCard className="w-5 h-5 text-blue-600 hover:text-blue-800" />
                            </Button>
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

      {editDialogOpen && (
        <MasterEmployeeEditDialog
          employee={employeeToEdit}
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setEmployeeToEdit(null);
          }}
          permissions={permissions} // STRICT PERMISSIONS PASSED HERE
        />
      )}
    </div>
  );
}
