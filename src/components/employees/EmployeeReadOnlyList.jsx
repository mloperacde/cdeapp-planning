import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, ArrowUpDown } from "lucide-react";
import AdvancedSearch from "../common/AdvancedSearch";

export default function EmployeeReadOnlyList() {
  const [searchFilters, setSearchFilters] = useState({});
  const [sortConfig, setSortConfig] = useState({ field: "nombre", direction: "asc" });

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const filterOptions = useMemo(() => {
    const departamentos = [...new Set(employees.map(e => e.departamento).filter(Boolean))].sort();
    const puestos = [...new Set(employees.map(e => e.puesto).filter(Boolean))].sort();
    const equipos = teams.map(t => t.team_name);
    
    return {
      departamento: {
        label: 'Departamento',
        options: departamentos.map(d => ({ value: d, label: d }))
      },
      puesto: {
        label: 'Puesto',
        options: puestos.map(p => ({ value: p, label: p }))
      },
      equipo: {
        label: 'Equipo',
        options: equipos.map(e => ({ value: e, label: e }))
      },
      sexo: {
        label: 'Sexo',
        options: [
          { value: 'Masculino', label: 'Masculino' },
          { value: 'Femenino', label: 'Femenino' },
          { value: 'Otro', label: 'Otro' }
        ]
      },
      estado_empleado: {
        label: 'Estado',
        options: [
          { value: 'Alta', label: 'Alta' },
          { value: 'Baja', label: 'Baja' }
        ]
      },
      tipo_turno: {
        label: 'Tipo de Turno',
        options: [
          { value: 'Rotativo', label: 'Rotativo' },
          { value: 'Fijo Mañana', label: 'Fijo Mañana' },
          { value: 'Fijo Tarde', label: 'Fijo Tarde' },
          { value: 'Turno Partido', label: 'Turno Partido' }
        ]
      }
    };
  }, [employees, teams]);

  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter(emp => {
      const searchTerm = searchFilters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.puesto?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = !searchFilters.departamento || searchFilters.departamento === "all" || 
        emp.departamento === searchFilters.departamento;
      
      const matchesPuesto = !searchFilters.puesto || searchFilters.puesto === "all" || 
        emp.puesto === searchFilters.puesto;
      
      const matchesTeam = !searchFilters.equipo || searchFilters.equipo === "all" || 
        emp.equipo === searchFilters.equipo;
      
      const matchesSex = !searchFilters.sexo || searchFilters.sexo === "all" || 
        emp.sexo === searchFilters.sexo;

      const matchesEstado = !searchFilters.estado_empleado || searchFilters.estado_empleado === "all" || 
        (emp.estado_empleado || "Alta") === searchFilters.estado_empleado;

      const matchesTurno = !searchFilters.tipo_turno || searchFilters.tipo_turno === "all" || 
        emp.tipo_turno === searchFilters.tipo_turno;
      
      return matchesSearch && matchesDept && matchesPuesto && matchesTeam && matchesSex && matchesEstado && matchesTurno;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortConfig.field] || "";
      let bVal = b[sortConfig.field] || "";
      
      if (sortConfig.direction === "asc") {
        return aVal.toString().localeCompare(bVal.toString());
      } else {
        return bVal.toString().localeCompare(aVal.toString());
      }
    });

    return filtered;
  }, [employees, searchFilters, sortConfig]);

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const SortableHeader = ({ field, label }) => (
    <TableHead 
      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown 
          className={`w-4 h-4 transition-transform 
            ${sortConfig.field === field 
              ? `text-blue-600 dark:text-blue-400 ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}` 
              : 'text-slate-400 dark:text-slate-600'
            }`
          }
        />
      </div>
    </TableHead>
  );

  const stats = useMemo(() => {
    const total = employees.length;
    const activos = employees.filter(e => (e.estado_empleado || "Alta") === "Alta").length;
    const disponibles = employees.filter(e => 
      (e.estado_empleado || "Alta") === "Alta" && 
      (e.disponibilidad || "Disponible") === "Disponible"
    ).length;
    
    return { total, activos, disponibles };
  }, [employees]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Empleados</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">Activos</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.activos}</p>
              </div>
              <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">Disponibles</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.disponibles}</p>
              </div>
              <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="dark:text-slate-100">Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <AdvancedSearch
            data={employees}
            onFilterChange={setSearchFilters}
            searchFields={['nombre', 'codigo_empleado', 'departamento', 'puesto']}
            filterOptions={filterOptions}
            placeholder="Buscar por nombre, código, departamento o puesto..."
          />
        </CardContent>
      </Card>

      <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="dark:text-slate-100">
            Lista de Empleados ({filteredAndSortedEmployees.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">Cargando empleados...</div>
          ) : filteredAndSortedEmployees.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              No hay empleados con los filtros aplicados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800">
                    <SortableHeader field="codigo_empleado" label="Código" />
                    <SortableHeader field="nombre" label="Nombre" />
                    <SortableHeader field="departamento" label="Departamento" />
                    <SortableHeader field="puesto" label="Puesto" />
                    <SortableHeader field="equipo" label="Equipo" />
                    <TableHead className="dark:text-slate-300">Sexo</TableHead>
                    <SortableHeader field="tipo_turno" label="Turno" />
                    <TableHead className="dark:text-slate-300">Estado</TableHead>
                    <TableHead className="dark:text-slate-300">Disponibilidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedEmployees.map((emp) => (
                    <TableRow key={emp.id} className="dark:border-slate-800 dark:hover:bg-slate-800/50">
                      <TableCell className="font-mono text-xs dark:text-slate-300">
                        {emp.codigo_empleado || '-'}
                      </TableCell>
                      <TableCell className="font-semibold dark:text-slate-200">
                        {emp.nombre}
                      </TableCell>
                      <TableCell className="dark:text-slate-300">{emp.departamento || '-'}</TableCell>
                      <TableCell className="dark:text-slate-300">{emp.puesto || '-'}</TableCell>
                      <TableCell className="dark:text-slate-300">{emp.equipo || '-'}</TableCell>
                      <TableCell>
                        <Badge className={
                          emp.sexo === "Femenino" ? "bg-pink-100 text-pink-800" :
                          emp.sexo === "Masculino" ? "bg-blue-100 text-blue-800" :
                          "bg-purple-100 text-purple-800"
                        }>
                          {emp.sexo || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs dark:text-slate-300">{emp.tipo_turno || '-'}</TableCell>
                      <TableCell>
                        <Badge className={
                          (emp.estado_empleado || "Alta") === "Alta" 
                            ? "bg-green-600 dark:bg-green-700" 
                            : "bg-slate-600 dark:bg-slate-700"
                        }>
                          {emp.estado_empleado || "Alta"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          (emp.disponibilidad || "Disponible") === "Disponible" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }>
                          {emp.disponibilidad || "Disponible"}
                        </Badge>
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
  );
}