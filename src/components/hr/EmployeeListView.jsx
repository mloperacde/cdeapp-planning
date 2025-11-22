import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Plus, Pencil, Trash2 } from "lucide-react";
import MasterEmployeeEditDialog from "../master/MasterEmployeeEditDialog";

export default function EmployeeListView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    departamento: "all",
    puesto: "all",
    estado_empleado: "all",
    tipo_turno: "all",
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: masterEmployees = [], isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeMasterDatabase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
    },
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

  const handleAdd = () => {
    setEditingEmployee(null);
    setShowDialog(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowDialog(true);
  };

  const handleDelete = (employee) => {
    if (confirm(`¿Eliminar a ${employee.nombre}?`)) {
      deleteMutation.mutate(employee.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-semibold text-slate-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Búsqueda</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Departamento</Label>
            <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
              <SelectTrigger className="h-8 text-sm">
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

          <div className="space-y-1">
            <Label className="text-xs">Puesto</Label>
            <Select value={filters.puesto} onValueChange={(value) => setFilters({...filters, puesto: value})}>
              <SelectTrigger className="h-8 text-sm">
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

          <div className="space-y-1">
            <Label className="text-xs">Estado</Label>
            <Select value={filters.estado_empleado} onValueChange={(value) => setFilters({...filters, estado_empleado: value})}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Alta">Alta</SelectItem>
                <SelectItem value="Baja">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tipo Turno</Label>
            <Select value={filters.tipo_turno} onValueChange={(value) => setFilters({...filters, tipo_turno: value})}>
              <SelectTrigger className="h-8 text-sm">
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
      </div>

      {/* Botón añadir */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-600">
          Mostrando {filteredEmployees.length} de {masterEmployees.length} empleados
        </span>
        <Button onClick={handleAdd} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-1" />
          Nuevo Empleado
        </Button>
      </div>

      {/* Tabla de empleados */}
      {isLoading ? (
        <div className="p-8 text-center text-slate-500">Cargando empleados...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          No se encontraron empleados con estos filtros
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs">Código</TableHead>
                <TableHead className="text-xs">Nombre</TableHead>
                <TableHead className="text-xs">Departamento</TableHead>
                <TableHead className="text-xs">Puesto</TableHead>
                <TableHead className="text-xs">Equipo</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
                <TableHead className="text-xs">Disponibilidad</TableHead>
                <TableHead className="text-xs">Jornada</TableHead>
                <TableHead className="text-xs">Turno</TableHead>
                <TableHead className="text-xs">Taquilla</TableHead>
                <TableHead className="text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.id} className="hover:bg-slate-50">
                  <TableCell className="font-mono text-xs py-2">
                    {employee.codigo_empleado || '-'}
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="font-semibold text-sm text-slate-900">
                      {employee.nombre}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs">{employee.departamento || '-'}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    <span className="text-xs">{employee.puesto || '-'}</span>
                  </TableCell>
                  <TableCell className="py-2">
                    {employee.equipo ? (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                        {employee.equipo}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge className={
                      (employee.estado_empleado || "Alta") === "Alta" 
                        ? 'bg-green-600 text-xs' 
                        : 'bg-slate-600 text-xs'
                    }>
                      {employee.estado_empleado || "Alta"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge className={
                      (employee.disponibilidad || "Disponible") === "Disponible"
                        ? 'bg-green-100 text-green-800 text-xs'
                        : 'bg-red-100 text-red-800 text-xs'
                    }>
                      {employee.disponibilidad || "Disponible"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-xs">
                      {employee.tipo_jornada || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                      {employee.tipo_turno || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">
                    {employee.taquilla_vestuario && employee.taquilla_numero ? (
                      <div className="text-xs">
                        <div className="font-semibold">{employee.taquilla_numero}</div>
                        <div className="text-slate-500">{employee.taquilla_vestuario}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(employee)}
                      >
                        <Pencil className="w-3 h-3 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => handleDelete(employee)}
                      >
                        <Trash2 className="w-3 h-3 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showDialog && (
        <MasterEmployeeEditDialog
          employee={editingEmployee}
          open={showDialog}
          onClose={() => {
            setShowDialog(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}