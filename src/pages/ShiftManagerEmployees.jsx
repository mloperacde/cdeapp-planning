import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Filter } from "lucide-react";

export default function ShiftManagerEmployees() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    departamento: "all",
    puesto: "all",
    estado_empleado: "all",
    tipo_turno: "all",
  });

  const { data: masterEmployees = [], isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: [],
  });

  const departments = useMemo(() => {
    const depts = new Set();
    masterEmployees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [masterEmployees]);

  const positions = useMemo(() => {
    const psts = new Set();
    masterEmployees.forEach(emp => {
      if (emp.puesto) psts.add(emp.puesto);
    });
    return Array.from(psts).sort();
  }, [masterEmployees]);

  const filteredEmployees = useMemo(() => {
    return masterEmployees.filter(emp => {
      const matchesSearch = 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartamento = filters.departamento === "all" || emp.departamento === filters.departamento;
      const matchesPuesto = filters.puesto === "all" || emp.puesto === filters.puesto;
      const matchesEstado = filters.estado_empleado === "all" || (emp.estado_empleado || "Alta") === filters.estado_empleado;
      const matchesTipoTurno = filters.tipo_turno === "all" || emp.tipo_turno === filters.tipo_turno;
      
      return matchesSearch && matchesDepartamento && matchesPuesto && matchesEstado && matchesTipoTurno;
    });
  }, [masterEmployees, searchTerm, filters]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Listado de Empleados
          </h1>
          <p className="text-slate-600 mt-1">
            Vista de consulta para jefes de turno
          </p>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <Label>Departamento</Label>
                <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
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
                    {positions.map((puesto) => (
                      <SelectItem key={puesto} value={puesto}>{puesto}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            </div>
          </CardContent>
        </Card>

        {/* Employee Table */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Empleados ({filteredEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando empleados...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No se encontraron empleados con estos filtros
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Disponibilidad</TableHead>
                      <TableHead>Jornada</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Taquilla</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs">
                          {employee.codigo_empleado || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900">
                            {employee.nombre}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{employee.departamento || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{employee.puesto || '-'}</span>
                        </TableCell>
                        <TableCell>
                          {employee.equipo ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700">
                              {employee.equipo}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            (employee.estado_empleado || "Alta") === "Alta" 
                              ? 'bg-green-600' 
                              : 'bg-slate-600'
                          }>
                            {employee.estado_empleado || "Alta"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            (employee.disponibilidad || "Disponible") === "Disponible"
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }>
                            {employee.disponibilidad || "Disponible"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {employee.tipo_jornada || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                            {employee.tipo_turno || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {employee.taquilla_vestuario && employee.taquilla_numero ? (
                            <div className="text-xs">
                              <div className="font-semibold">{employee.taquilla_numero}</div>
                              <div className="text-slate-500">{employee.taquilla_vestuario}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Sin asignar</span>
                          )}
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
    </div>
  );
}