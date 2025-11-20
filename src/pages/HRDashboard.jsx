import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, Users, Search, Filter, Edit, Database, Zap, CheckCircle2 } from "lucide-react";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function HRDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    departamento: "all",
    puesto: "all",
    estado_empleado: "all",
    tipo_jornada: "all",
    tipo_turno: "all",
    estado_sincronizacion: "all",
  });
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: masterEmployees = [], isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('-created_date'),
    initialData: [],
  });

  const autoAssignLockersMutation = useMutation({
    mutationFn: async () => {
      const results = { assigned: 0, skipped: 0, errors: [] };
      
      for (const emp of masterEmployees) {
        if (!emp.taquilla_vestuario || !emp.taquilla_numero) {
          results.skipped++;
          continue;
        }

        try {
          // Check if already assigned
          const existing = await base44.entities.LockerAssignment.filter({
            employee_id: emp.employee_id
          });

          if (existing.length > 0) {
            results.skipped++;
            continue;
          }

          // Create assignment if employee is synced
          if (emp.employee_id) {
            await base44.entities.LockerAssignment.create({
              employee_id: emp.employee_id,
              vestuario: emp.taquilla_vestuario,
              numero_taquilla: emp.taquilla_numero,
              fecha_asignacion: new Date().toISOString(),
              estado: 'Asignada'
            });
            results.assigned++;
          } else {
            results.skipped++;
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          results.errors.push({ nombre: emp.nombre, error: error.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      alert(`✅ Auto-asignación completada:\n\n` +
        `• Taquillas asignadas: ${results.assigned}\n` +
        `• Omitidos: ${results.skipped}\n` +
        `• Errores: ${results.errors.length}`
      );
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
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDepartamento = filters.departamento === "all" || emp.departamento === filters.departamento;
      const matchesPuesto = filters.puesto === "all" || emp.puesto === filters.puesto;
      const matchesEstado = filters.estado_empleado === "all" || (emp.estado_empleado || "Alta") === filters.estado_empleado;
      const matchesTipoJornada = filters.tipo_jornada === "all" || emp.tipo_jornada === filters.tipo_jornada;
      const matchesTipoTurno = filters.tipo_turno === "all" || emp.tipo_turno === filters.tipo_turno;
      const matchesSyncStatus = filters.estado_sincronizacion === "all" || emp.estado_sincronizacion === filters.estado_sincronizacion;
      
      return matchesSearch && matchesDepartamento && matchesPuesto && matchesEstado && matchesTipoJornada && matchesTipoTurno && matchesSyncStatus;
    });
  }, [masterEmployees, searchTerm, filters]);

  const stats = {
    total: masterEmployees.length,
    alta: masterEmployees.filter(e => (e.estado_empleado || "Alta") === "Alta").length,
    baja: masterEmployees.filter(e => e.estado_empleado === "Baja").length,
    sincronizados: masterEmployees.filter(e => e.estado_sincronizacion === "Sincronizado").length,
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowEditDialog(true);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              Panel de RRHH - Base de Datos Maestra
            </h1>
            <p className="text-slate-600 mt-1">
              Vista completa y gestión de empleados
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => autoAssignLockersMutation.mutate()}
              disabled={autoAssignLockersMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Auto-Asignar Taquillas
            </Button>
            <Link to={createPageUrl("MasterEmployeeDatabase")}>
              <Button variant="outline">
                <Database className="w-4 h-4 mr-2" />
                BD Maestra
              </Button>
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Empleados</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">En Alta</p>
                  <p className="text-2xl font-bold text-green-900">{stats.alta}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Bajas</p>
                  <p className="text-2xl font-bold text-red-900">{stats.baja}</p>
                </div>
                <Users className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Sincronizados</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.sincronizados}</p>
                </div>
                <Database className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
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
                      <SelectItem key={puesto} value={puesto}>
                        {puesto}
                      </SelectItem>
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
                <Label>Tipo Jornada</Label>
                <Select value={filters.tipo_jornada} onValueChange={(value) => setFilters({...filters, tipo_jornada: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Jornada Completa">Jornada Completa</SelectItem>
                    <SelectItem value="Jornada Parcial">Jornada Parcial</SelectItem>
                    <SelectItem value="Reducción de Jornada">Reducción de Jornada</SelectItem>
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

              <div className="space-y-2">
                <Label>Estado Sincronización</Label>
                <Select value={filters.estado_sincronizacion} onValueChange={(value) => setFilters({...filters, estado_sincronizacion: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Sincronizado">Sincronizado</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Error">Error</SelectItem>
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
                      <TableHead>Jornada</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Taquilla</TableHead>
                      <TableHead>Sincronización</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono text-xs">
                          {employee.codigo_empleado || '-'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {employee.nombre}
                            </div>
                            {employee.email && (
                              <div className="text-xs text-slate-500">
                                {employee.email}
                              </div>
                            )}
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
                              <div className="font-semibold text-slate-700">{employee.taquilla_numero}</div>
                              <div className="text-slate-500 truncate max-w-[120px]">
                                {employee.taquilla_vestuario.replace('Vestuario ', '')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            employee.estado_sincronizacion === 'Sincronizado' ? 'bg-green-600' :
                            employee.estado_sincronizacion === 'Error' ? 'bg-red-600' :
                            'bg-amber-600'
                          }>
                            {employee.estado_sincronizacion || 'Pendiente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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

      {showEditDialog && editingEmployee && (
        <MasterEmployeeEditDialog
          employee={editingEmployee}
          open={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            setEditingEmployee(null);
          }}
        />
      )}
    </div>
  );
}