
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, Search, Plus, Edit, UserCog, KeyRound, 
  Award, Shield, Briefcase, Calendar, ArrowLeft, Settings as SettingsIcon
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EmployeeForm from "../components/employees/EmployeeForm";
import EmployeeMasterDetail from "../components/employees/EmployeeMasterDetail";
import TeamPositionConfig from "../components/employees/TeamPositionConfig"; // Assuming this new component is in the same folder

export default function MasterEmployeeView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showTeamConfig, setShowTeamConfig] = useState(false);
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

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const { data: committeeMembers } = useQuery({
    queryKey: ['committeeMembers'],
    queryFn: () => base44.entities.CommitteeMember.list(),
    initialData: [],
  });

  const { data: emergencyMembers } = useQuery({
    queryKey: ['emergencyTeamMembers'],
    queryFn: () => base44.entities.EmergencyTeamMember.list(),
    initialData: [],
  });

  const { data: employeeSkills } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
    initialData: [],
  });

  const { data: userRoles } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    initialData: [],
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.equipo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const lockersCount = useMemo(() => {
    const uniqueEmployees = new Set();
    lockerAssignments.forEach(la => {
      const hasLocker = la.numero_taquilla_actual?.replace(/['"]/g, '').trim();
      if (hasLocker && la.requiere_taquilla !== false) {
        uniqueEmployees.add(la.employee_id);
      }
    });
    return uniqueEmployees.size;
  }, [lockerAssignments]);

  const getEmployeeExtendedInfo = (employee) => {
    const locker = lockerAssignments.find(la => la.employee_id === employee.id);
    const hasLockerNumber = locker?.numero_taquilla_actual?.replace(/['"]/g, '').trim();
    const committee = committeeMembers.filter(cm => cm.employee_id === employee.id);
    const emergency = emergencyMembers.filter(em => em.employee_id === employee.id);
    const skills = employeeSkills.filter(es => es.employee_id === employee.id);

    return {
      hasLocker: hasLockerNumber && locker.requiere_taquilla !== false,
      isCommitteeMember: committee.length > 0,
      isEmergencyMember: emergency.length > 0,
      skillsCount: skills.length,
      locker,
      committee,
      emergency,
      skills
    };
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleViewDetail = (employee) => {
    setSelectedEmployee(employee);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEmployee(null);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to={createPageUrl("Employees")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Gestión de Empleados
            </Button>
          </Link>
          <Button onClick={() => setShowTeamConfig(true)} variant="outline">
            <SettingsIcon className="w-4 h-4 mr-2" />
            Configurar Puestos por Equipo
          </Button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UserCog className="w-8 h-8 text-blue-600" />
              Vista Maestra de Empleados
            </h1>
            <p className="text-slate-600 mt-1">
              Gestión centralizada de todos los datos de empleados
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Empleado
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Empleados</p>
                  <p className="text-2xl font-bold text-blue-900">{employees.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-700 font-medium">Miembros Comités</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {new Set(committeeMembers.map(cm => cm.employee_id)).size}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Equipo Emergencias</p>
                  <p className="text-2xl font-bold text-red-900">
                    {new Set(emergencyMembers.map(em => em.employee_id)).size}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Con Taquilla</p>
                  <p className="text-2xl font-bold text-green-900">{lockersCount}</p>
                </div>
                <KeyRound className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Buscar Empleado
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Input
              placeholder="Buscar por nombre, email, código, departamento o equipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-lg"
            />
          </CardContent>
        </Card>

        {selectedEmployee ? (
          <EmployeeMasterDetail 
            employee={selectedEmployee}
            onClose={() => setSelectedEmployee(null)}
            onEdit={() => {
              setEditingEmployee(selectedEmployee);
              setShowForm(true);
              setSelectedEmployee(null);
            }}
          />
        ) : (
          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle>Listado Completo ({filteredEmployees.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Tipo Turno</TableHead>
                      <TableHead>Información Adicional</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                          Cargando empleados...
                        </TableCell>
                      </TableRow>
                    ) : filteredEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                          No se encontraron empleados
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEmployees.map((employee) => {
                        const extInfo = getEmployeeExtendedInfo(employee);
                        
                        return (
                          <TableRow key={employee.id} className="hover:bg-slate-50 cursor-pointer">
                            <TableCell onClick={() => handleViewDetail(employee)}>
                              <div>
                                <div className="font-semibold text-slate-900">{employee.nombre}</div>
                                {employee.email && (
                                  <div className="text-xs text-slate-500">{employee.email}</div>
                                )}
                                {employee.codigo_empleado && (
                                  <div className="text-xs text-slate-400">#{employee.codigo_empleado}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell onClick={() => handleViewDetail(employee)}>
                              <Badge variant="outline">{employee.departamento || "N/A"}</Badge>
                            </TableCell>
                            <TableCell onClick={() => handleViewDetail(employee)}>
                              <div className="text-sm">{employee.puesto || "-"}</div>
                            </TableCell>
                            <TableCell onClick={() => handleViewDetail(employee)}>
                              {employee.equipo ? (
                                <Badge className="bg-purple-100 text-purple-800">
                                  {employee.equipo}
                                </Badge>
                              ) : (
                                <span className="text-xs text-slate-400">Sin equipo</span>
                              )}
                            </TableCell>
                            <TableCell onClick={() => handleViewDetail(employee)}>
                              <Badge className="bg-blue-100 text-blue-800">
                                {employee.tipo_turno}
                              </Badge>
                            </TableCell>
                            <TableCell onClick={() => handleViewDetail(employee)}>
                              <div className="flex flex-wrap gap-1">
                                {extInfo.hasLocker && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    <KeyRound className="w-3 h-3 mr-1" />
                                    Taquilla
                                  </Badge>
                                )}
                                {extInfo.isCommitteeMember && (
                                  <Badge className="bg-purple-100 text-purple-700 text-xs">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Comité
                                  </Badge>
                                )}
                                {extInfo.isEmergencyMember && (
                                  <Badge className="bg-red-100 text-red-700 text-xs">
                                    <Shield className="w-3 h-3 mr-1" />
                                    Emergencia
                                  </Badge>
                                )}
                                {extInfo.skillsCount > 0 && (
                                  <Badge className="bg-amber-100 text-amber-700 text-xs">
                                    <Award className="w-3 h-3 mr-1" />
                                    {extInfo.skillsCount}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewDetail(employee)}
                                >
                                  Ver Detalle
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(employee);
                                  }}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showForm && (
        <EmployeeForm
          employee={editingEmployee}
          machines={machines}
          onClose={handleFormClose}
        />
      )}

      {showTeamConfig && (
        <TeamPositionConfig onClose={() => setShowTeamConfig(false)} />
      )}
    </div>
  );
}
