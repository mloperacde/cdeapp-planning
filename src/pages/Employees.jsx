
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Edit, Trash2, Users, Search, Filter, UserX, TrendingUp, UsersRound, UserCog } from "lucide-react";
import EmployeeForm from "../components/employees/EmployeeForm";
import BirthdayPanel from "../components/employees/BirthdayPanel";
import AnniversaryPanel from "../components/employees/AnniversaryPanel";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmployeesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    tipo_jornada: "all",
    tipo_turno: "all",
    equipo: "all",
    disponibilidad: "all",
    departamento: "all", // New filter
    puesto: "all",       // New filter
  });
  const queryClient = useQueryClient();

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('-created_date'),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const puestos = useMemo(() => {
    const psts = new Set();
    employees.forEach(emp => {
      if (emp.puesto) psts.add(emp.puesto);
    });
    return Array.from(psts).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.equipo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTipoJornada = filters.tipo_jornada === "all" || emp.tipo_jornada === filters.tipo_jornada;
      const matchesTipoTurno = filters.tipo_turno === "all" || emp.tipo_turno === filters.tipo_turno;
      const matchesEquipo = filters.equipo === "all" || emp.equipo === filters.equipo;
      const matchesDisponibilidad = filters.disponibilidad === "all" || emp.disponibilidad === filters.disponibilidad;
      const matchesDepartamento = filters.departamento === "all" || emp.departamento === filters.departamento; // New filter logic
      const matchesPuesto = filters.puesto === "all" || emp.puesto === filters.puesto;                       // New filter logic
      
      return matchesSearch && matchesTipoJornada && matchesTipoTurno && matchesEquipo && matchesDisponibilidad && matchesDepartamento && matchesPuesto;
    });
  }, [employees, searchTerm, filters]);

  const getAvailabilityBadge = (employee) => {
    if (employee.disponibilidad === "Ausente") {
      return <Badge variant="destructive">Ausente</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Disponible</Badge>;
  };

  const isEmployeeAbsent = (employee) => {
    return employee.disponibilidad === "Ausente";
  };

  const subPages = [
    {
      title: "Gestión de Ausencias",
      description: "Registra y gestiona ausencias de empleados",
      icon: UserX,
      url: createPageUrl("AbsenceManagement"),
      color: "red"
    },
    {
      title: "Gestión de Rendimiento",
      description: "Evaluaciones y planes de mejora",
      icon: TrendingUp,
      url: createPageUrl("PerformanceManagement"),
      color: "emerald"
    },
    {
      title: "Equipos de Turno",
      description: "Configura equipos y turnos rotativos",
      icon: UsersRound,
      url: createPageUrl("TeamConfiguration"),
      color: "purple"
    },
    {
      title: "Asignaciones Operarios Máquinas",
      description: "Asigna operarios a máquinas por equipo",
      icon: UserCog,
      url: createPageUrl("MachineAssignments"),
      color: "blue"
    }
  ];

  const colorClasses = {
    red: "from-red-500 to-red-600",
    emerald: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
    blue: "from-blue-500 to-blue-600"
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              Gestión de Empleados
            </h1>
            <p className="text-slate-600 mt-1">
              Administra la base de datos de empleados
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>

        {/* Paneles de Cumpleaños y Aniversarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <BirthdayPanel employees={employees} />
          <div>
            <AnniversaryPanel employees={employees} />
          </div>
        </div>

        {/* Sub-páginas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {subPages.map((page) => {
            const Icon = page.icon;
            return (
              <Link key={page.title} to={page.url}>
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm cursor-pointer group">
                  <CardContent className="p-4">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorClasses[page.color]} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-xs text-slate-600">{page.description}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* Filtros */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
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
                    <SelectValue placeholder="Selecciona un departamento" />
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
                    <SelectValue placeholder="Selecciona un puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {puestos.map((puesto) => (
                      <SelectItem key={puesto} value={puesto}>
                        {puesto}
                      </SelectItem>
                    ))}
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
                <Label>Equipo</Label>
                <Select value={filters.equipo} onValueChange={(value) => setFilters({...filters, equipo: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.team_name}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Disponibilidad</Label>
                <Select value={filters.disponibilidad} onValueChange={(value) => setFilters({...filters, disponibilidad: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Disponible">Disponible</SelectItem>
                    <SelectItem value="Ausente">Ausente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Lista de Empleados ({filteredEmployees.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando empleados...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                {searchTerm || Object.values(filters).some(f => f !== "all") ? 'No se encontraron empleados con estos filtros' : 'No hay empleados registrados'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo Jornada</TableHead>
                      <TableHead>Tipo Turno</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Disponibilidad</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => {
                      const isAbsent = isEmployeeAbsent(employee);
                      
                      return (
                        <TableRow 
                          key={employee.id} 
                          className={`hover:bg-slate-50 ${isAbsent ? 'bg-red-50' : ''}`}
                        >
                          <TableCell>
                            <div>
                              <div className={`font-semibold ${isAbsent ? 'text-red-700' : 'text-slate-900'}`}>
                                {employee.nombre}
                              </div>
                              {employee.email && (
                                <div className={`text-xs ${isAbsent ? 'text-red-600' : 'text-slate-500'}`}>
                                  {employee.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={isAbsent ? 'border-red-300 text-red-700' : ''}>
                              {employee.tipo_jornada}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={isAbsent ? 'border-red-300 text-red-700 bg-red-50' : 'bg-blue-50 text-blue-700'}>
                              {employee.tipo_turno}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={
                              isAbsent ? "bg-red-200 text-red-900" :
                              employee.equipo === "Equipo Turno Isa" 
                                ? "bg-purple-100 text-purple-800" 
                                : "bg-pink-100 text-pink-800"
                            }>
                              {employee.equipo}
                            </Badge>
                          </TableCell>
                          <TableCell>{getAvailabilityBadge(employee)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(employee)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(employee.id)}
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          machines={machines}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}
