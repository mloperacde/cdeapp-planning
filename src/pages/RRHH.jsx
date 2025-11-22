import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  UserCheck, 
  UserX, 
  Calendar, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  FileText,
  Bell,
  UserPlus,
  Search,
  Filter,
  Pencil,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isWithinInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";
import MasterEmployeeEditDialog from "../components/master/MasterEmployeeEditDialog";

export default function RRHHPage() {
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

  const { data: masterEmployees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('-created_date'),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list('-created_date'),
    initialData: [],
  });

  const { data: vacationBalances = [] } = useQuery({
    queryKey: ['vacationPendingBalances'],
    queryFn: () => base44.entities.VacationPendingBalance.list(),
    initialData: [],
  });

  const { data: onboardingProcesses = [] } = useQuery({
    queryKey: ['employeeOnboarding'],
    queryFn: () => base44.entities.EmployeeOnboarding.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeMasterDatabase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
    },
  });

  const kpis = useMemo(() => {
    const total = masterEmployees.length;
    const activos = masterEmployees.filter(e => (e.estado_empleado || "Alta") === "Alta").length;
    const disponibles = masterEmployees.filter(e => {
      if ((e.estado_empleado || "Alta") !== "Alta") return false;
      return (e.disponibilidad || "Disponible") === "Disponible";
    }).length;

    const today = new Date();
    const ausenciasActivas = absences.filter(a => {
      if (!a.fecha_inicio) return false;
      try {
        const inicio = new Date(a.fecha_inicio);
        if (isNaN(inicio.getTime())) return false;
        const fin = a.fecha_fin ? new Date(a.fecha_fin) : addDays(today, 365);
        if (isNaN(fin.getTime())) return false;
        return isWithinInterval(today, { start: inicio, end: fin });
      } catch {
        return false;
      }
    }).length;

    const pendientesAprobacion = absences.filter(a => a.estado_aprobacion === 'Pendiente').length;
    const totalDiasPendientes = vacationBalances.reduce((sum, vb) => sum + (vb.dias_pendientes || 0), 0);
    const empleadosConFuerzaMayor = masterEmployees.filter(e => (e.horas_causa_mayor_consumidas || 0) > 0).length;
    const onboardingPendientes = onboardingProcesses.filter(p => p.estado !== 'Completado' && p.estado !== 'Cancelado').length;

    return {
      total,
      activos,
      disponibles,
      ausenciasActivas,
      pendientesAprobacion,
      totalDiasPendientes,
      empleadosConFuerzaMayor,
      onboardingPendientes
    };
  }, [masterEmployees, absences, vacationBalances, onboardingProcesses]);

  const recentAbsences = useMemo(() => {
    return absences
      .filter(a => {
        if (!a.estado) return false;
        return a.estado === 'Pendiente' || a.estado === 'Aprobada';
      })
      .slice(0, 5)
      .map(a => {
        const emp = employees.find(e => e.id === a.employee_id) || 
                    masterEmployees.find(me => me.employee_id === a.employee_id);
        return { ...a, employeeName: emp?.nombre || 'Desconocido' };
      });
  }, [absences, employees, masterEmployees]);

  const fuerzaMayorAlerts = useMemo(() => {
    return masterEmployees
      .filter(e => {
        const limite = e.horas_causa_mayor_limite || 0;
        const consumidas = e.horas_causa_mayor_consumidas || 0;
        return limite > 0 && consumidas >= limite * 0.8;
      })
      .slice(0, 5);
  }, [masterEmployees]);

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

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Panel de Recursos Humanos
          </h1>
          <p className="text-slate-600 mt-1">
            Resumen ejecutivo y métricas clave
          </p>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Empleados</p>
                  <p className="text-3xl font-bold text-blue-900">{kpis.total}</p>
                  <p className="text-xs text-blue-600 mt-1">{kpis.activos} activos</p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Disponibles</p>
                  <p className="text-3xl font-bold text-green-900">{kpis.disponibles}</p>
                  <p className="text-xs text-green-600 mt-1">En plantilla ahora</p>
                </div>
                <UserCheck className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Ausencias Activas</p>
                  <p className="text-3xl font-bold text-amber-900">{kpis.ausenciasActivas}</p>
                  <p className="text-xs text-amber-600 mt-1">En este momento</p>
                </div>
                <UserX className="w-10 h-10 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow cursor-pointer">
            <Link to={createPageUrl("AbsenceManagement")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-purple-700 font-medium">Pendientes Aprobación</p>
                    <p className="text-3xl font-bold text-purple-900">{kpis.pendientesAprobacion}</p>
                    <p className="text-xs text-purple-600 mt-1">Requieren atención</p>
                  </div>
                  <Clock className="w-10 h-10 text-purple-600" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        {/* KPIs secundarios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Días Vacaciones Pendientes</p>
                  <p className="text-2xl font-bold text-slate-900">{kpis.totalDiasPendientes}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-600 font-medium">Alertas Fuerza Mayor</p>
                  <p className="text-2xl font-bold text-slate-900">{kpis.empleadosConFuerzaMayor}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-md cursor-pointer">
            <Link to={createPageUrl("EmployeeOnboarding")}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Onboarding Pendientes</p>
                    <p className="text-2xl font-bold text-slate-900">{kpis.onboardingPendientes}</p>
                  </div>
                  <UserPlus className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gestión de Ausencias - Destacado */}
          <Card className="shadow-lg border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader className="border-b border-blue-200">
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <UserX className="w-6 h-6 text-blue-600" />
                Gestión de Ausencias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-slate-700 mb-4">
                Gestiona y aprueba solicitudes de ausencias, permisos y bajas laborales
              </p>
              <Link to={createPageUrl("AbsenceManagement")}>
                <Button className="w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  <FileText className="w-5 h-5 mr-2" />
                  Ir a Gestión de Ausencias
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Últimas Ausencias Solicitadas */}
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-600" />
                  Últimas Solicitudes
                </CardTitle>
                <Link to={createPageUrl("AbsenceManagement")}>
                  <Button variant="ghost" size="sm">Ver todas</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {recentAbsences.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">
                  No hay solicitudes recientes
                </p>
              ) : (
                <div className="space-y-3">
                  {recentAbsences.map((absence) => (
                    <div key={absence.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-semibold text-sm text-slate-900">
                          {absence.employeeName}
                        </span>
                        <Badge className={
                          absence.estado === 'Pendiente' ? 'bg-amber-600' :
                          absence.estado === 'Aprobada' ? 'bg-green-600' :
                          'bg-slate-600'
                        }>
                          {absence.estado}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">
                        {absence.tipo_ausencia || 'Sin tipo'} • {' '}
                        {(() => {
                          try {
                            if (!absence.fecha_inicio) return 'Sin fecha';
                            const date = new Date(absence.fecha_inicio);
                            if (isNaN(date.getTime())) return 'Sin fecha';
                            return format(date, "d MMM", { locale: es });
                          } catch {
                            return 'Sin fecha';
                          }
                        })()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alertas Fuerza Mayor */}
        {fuerzaMayorAlerts.length > 0 && (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mb-6">
            <CardHeader className="border-b border-slate-100 bg-orange-50">
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                Recordatorio: Control de Días por Fuerza Mayor
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-sm text-slate-700 mb-3">
                Los siguientes empleados han consumido más del 80% de su límite anual
              </p>
              <div className="space-y-2">
                {fuerzaMayorAlerts.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                    <span className="text-sm font-medium text-slate-900">{emp.nombre}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-orange-100 text-orange-800">
                        {emp.horas_causa_mayor_consumidas || 0}h / {emp.horas_causa_mayor_limite || 0}h
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to={createPageUrl("WorkCalendarConfig")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Calendario Laboral</h3>
                    <p className="text-xs text-slate-600">Festivos y vacaciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("AdvancedHRDashboard")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-purple-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Dashboard Avanzado</h3>
                    <p className="text-xs text-slate-600">Análisis y tendencias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to={createPageUrl("EmployeeOnboarding")}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <UserPlus className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-slate-900">Onboarding</h3>
                    <p className="text-xs text-slate-600">Procesos de incorporación</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Employee Listing Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Listado de Empleados</h2>
            <Button onClick={handleAdd} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Empleado
            </Button>
          </div>

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

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Empleados ({filteredEmployees.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {filteredEmployees.length === 0 ? (
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
                        <TableHead>Estado</TableHead>
                        <TableHead>Disponibilidad</TableHead>
                        <TableHead>Turno</TableHead>
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
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                              {employee.tipo_turno || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(employee)}
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
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
      </div>

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