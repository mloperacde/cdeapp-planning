import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../components/data/DataProvider";
import { usePermissions } from "../components/permissions/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { UserPlus, Search, Filter, Shield, Users, AlertCircle, CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";


export default function AppUserManagementPage() {
  const [filters, setFilters] = useState({
    departamento: "all",
    puesto: "all",
    enComite: "all",
    tieneUsuario: "all",
    searchTerm: ""
  });
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const queryClient = useQueryClient();

  // Usar datos del DataProvider
  const { employees: masterEmployees } = useAppData();
  const permissions = usePermissions();
  const employees = masterEmployees;

  const { data: systemUsers = [] } = useQuery({
    queryKey: ['systemUsers'],
    queryFn: async () => {
      // Solo admin puede listar usuarios
      if (!permissions.isAdmin) return [];
      return await base44.entities.User.list();
    },
    enabled: permissions.isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: committeeMembers } = useQuery({
    queryKey: ['committeeMembers'],
    queryFn: () => base44.entities.CommitteeMember.list(),
    initialData: [],
  });

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

  const employeesWithUserStatus = useMemo(() => {
    return employees.map(emp => {
      const hasUser = systemUsers.some(u => u.email === emp.email);
      const inCommittee = committeeMembers.some(cm => cm.employee_id === emp.id && cm.activo);
      return {
        ...emp,
        hasUser,
        inCommittee
      };
    });
  }, [employees, systemUsers, committeeMembers]);

  const filteredEmployees = useMemo(() => {
    return employeesWithUserStatus.filter(emp => {
      const matchesDept = filters.departamento === "all" || emp.departamento === filters.departamento;
      const matchesPuesto = filters.puesto === "all" || emp.puesto === filters.puesto;
      const matchesComite = filters.enComite === "all" || 
        (filters.enComite === "si" && emp.inCommittee) ||
        (filters.enComite === "no" && !emp.inCommittee);
      const matchesUsuario = filters.tieneUsuario === "all" ||
        (filters.tieneUsuario === "si" && emp.hasUser) ||
        (filters.tieneUsuario === "no" && !emp.hasUser);
      const matchesSearch = !filters.searchTerm || 
        emp.nombre?.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        emp.email?.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      return matchesDept && matchesPuesto && matchesComite && matchesUsuario && matchesSearch;
    });
  }, [employeesWithUserStatus, filters]);

  const stats = useMemo(() => {
    return {
      totalEmpleados: employees.length,
      conUsuario: employeesWithUserStatus.filter(e => e.hasUser).length,
      sinUsuario: employeesWithUserStatus.filter(e => !e.hasUser && e.email).length,
      sinEmail: employees.filter(e => !e.email).length,
      enComite: employeesWithUserStatus.filter(e => e.inCommittee).length
    };
  }, [employees, employeesWithUserStatus]);

  const handleSelectEmployee = (employeeId) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(employeeId)) {
        newSet.delete(employeeId);
      } else {
        newSet.add(employeeId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.size === filteredEmployees.filter(e => e.email && !e.hasUser).length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(filteredEmployees.filter(e => e.email && !e.hasUser).map(e => e.id)));
    }
  };

  const inviteMutation = useMutation({
    mutationFn: async (employeeIds) => {
      const employeesToInvite = employees.filter(e => employeeIds.includes(e.id));
      const results = [];
      
      for (const emp of employeesToInvite) {
        if (!emp.email) {
          results.push({ employee: emp.nombre, status: "error", message: "Sin email" });
          continue;
        }

        const existingUser = systemUsers.find(u => u.email === emp.email);
        if (existingUser) {
          results.push({ employee: emp.nombre, status: "skip", message: "Ya tiene usuario" });
          continue;
        }

        try {
          await base44.integrations.Core.SendEmail({
            to: emp.email,
            subject: "Invitación a CDE PlanApp",
            body: `Hola ${emp.nombre},\n\nHas sido invitado a acceder al sistema CDE PlanApp.\n\nPor favor, contacta con el administrador para completar tu registro.\n\nEmail: ${emp.email}\n\nSaludos.`
          });
          results.push({ employee: emp.nombre, status: "success", message: "Invitación enviada" });
        } catch (error) {
          results.push({ employee: emp.nombre, status: "error", message: error.message });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const success = results.filter(r => r.status === "success").length;
      const errors = results.filter(r => r.status === "error").length;
      
      if (success > 0) {
        toast.success(`${success} invitaciones enviadas correctamente`);
      }
      if (errors > 0) {
        toast.error(`${errors} errores al enviar invitaciones`);
      }
      
      setSelectedEmployees(new Set());
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const handleInviteSelected = () => {
    if (selectedEmployees.size === 0) {
      toast.error("Selecciona al menos un empleado");
      return;
    }

    if (window.confirm(`¿Enviar invitaciones a ${selectedEmployees.size} empleado(s)?`)) {
      inviteMutation.mutate(Array.from(selectedEmployees));
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to="/Configuration">
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-blue-600" />
              Gestión de Usuarios de la Aplicación
            </h1>
            <p className="text-slate-600 mt-1">
              Invita a empleados a usar el sistema CDE PlanApp
            </p>
          </div>
          {selectedEmployees.size > 0 && (
            <Button 
              onClick={handleInviteSelected}
              disabled={inviteMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Mail className="w-4 h-4 mr-2" />
              Enviar Invitaciones ({selectedEmployees.size})
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Empleados</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalEmpleados}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Con Usuario</p>
                  <p className="text-2xl font-bold text-green-900">{stats.conUsuario}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Sin Usuario</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.sinUsuario}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Sin Email</p>
                  <p className="text-2xl font-bold text-red-900">{stats.sinEmail}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">En Comités</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.enComite}</p>
                </div>
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {stats.sinEmail > 0 && (
          <Card className="mb-6 bg-red-50 border-2 border-red-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">
                    {stats.sinEmail} empleado(s) sin email configurado
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    Para poder invitarlos al sistema, primero añade sus emails en la Vista Maestra de Empleados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Departamentos</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Select value={filters.puesto} onValueChange={(value) => setFilters({...filters, puesto: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Puesto" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Puestos</SelectItem>
                    {puestos.map((puesto) => (
                      <SelectItem key={puesto} value={puesto}>
                        {puesto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Select value={filters.enComite} onValueChange={(value) => setFilters({...filters, enComite: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="En Comité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="si">En Comité</SelectItem>
                    <SelectItem value="no">No en Comité</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Select value={filters.tieneUsuario} onValueChange={(value) => setFilters({...filters, tieneUsuario: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado Usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="si">Con Usuario</SelectItem>
                    <SelectItem value="no">Sin Usuario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle>Empleados ({filteredEmployees.length})</CardTitle>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedEmployees.size === filteredEmployees.filter(e => e.email && !e.hasUser).length && filteredEmployees.filter(e => e.email && !e.hasUser).length > 0 ? "Deseleccionar Todo" : "Seleccionar Todo"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedEmployees.size === filteredEmployees.filter(e => e.email && !e.hasUser).length && filteredEmployees.filter(e => e.email && !e.hasUser).length > 0}
                        onCheckedChange={handleSelectAll}
                        disabled={filteredEmployees.filter(e => e.email && !e.hasUser).length === 0}
                      />
                    </TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Roles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                        No se encontraron empleados
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee.id} className="hover:bg-slate-50">
                        <TableCell>
                          <Checkbox
                            checked={selectedEmployees.has(employee.id)}
                            onCheckedChange={() => handleSelectEmployee(employee.id)}
                            disabled={!employee.email || employee.hasUser}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-slate-900">{employee.nombre}</div>
                          {employee.codigo_empleado && (
                            <div className="text-xs text-slate-500">#{employee.codigo_empleado}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{employee.departamento || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{employee.puesto || "-"}</div>
                        </TableCell>
                        <TableCell>
                          {employee.email ? (
                            <div className="text-sm">{employee.email}</div>
                          ) : (
                            <Badge variant="destructive" className="text-xs">Sin Email</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!employee.email ? (
                            <Badge variant="destructive">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Sin Email
                            </Badge>
                          ) : employee.hasUser ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Con Usuario
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {/* Mostrar rol nativo de Base44 si tiene usuario */}
                            {employee.hasUser && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                {systemUsers.find(u => u.email === employee.email)?.role === 'admin' ? 'Admin' : 'User'}
                              </Badge>
                            )}
                            {employee.inCommittee && (
                              <Badge className="bg-purple-100 text-purple-700 text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Comité
                              </Badge>
                            )}
                            {employee.departamento === "Mantenimiento" && (
                              <Badge className="bg-blue-100 text-blue-700 text-xs">
                                Técnico
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 space-y-4">
          <Card className="bg-blue-50 border-2 border-blue-300">
            <CardContent className="p-4">
              <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Instrucciones</h3>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Filtra los empleados según departamento, puesto o pertenencia a comités</li>
                <li>Selecciona los empleados que necesitan acceso al sistema</li>
                <li>Haz clic en "Enviar Invitaciones" para notificarles por email</li>
                <li>Los empleados recibirán instrucciones para completar su registro</li>
                <li>Una vez registrados, podrán acceder según sus permisos de rol</li>
              </ol>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-4">
              <h3 className="font-semibold text-amber-900 mb-2">⚠️ Sistema de Roles Nativo Base44</h3>
              <p className="text-sm text-amber-800 mb-3">
                Los usuarios son gestionados por el sistema nativo de Base44:
              </p>
              <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside ml-4">
                <li><strong>Admin:</strong> Acceso completo a todos los módulos, configuración y gestión</li>
                <li><strong>User:</strong> Acceso limitado según permisos configurados en Base44 Dashboard</li>
              </ul>
              <p className="text-sm text-amber-800 mt-3 pt-3 border-t border-amber-200">
                📌 <strong>Nota:</strong> Los roles se asignan en el Dashboard de Base44 → Seguridad → Usuarios
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}