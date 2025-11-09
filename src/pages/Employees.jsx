import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Edit, Trash2, Users, Search } from "lucide-react";
import EmployeeForm from "../components/employees/EmployeeForm";

export default function EmployeesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredEmployees = employees.filter(emp =>
    emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.equipo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAvailabilityBadge = (employee) => {
    if (employee.disponibilidad === "Ausente") {
      return <Badge variant="destructive">Ausente</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Disponible</Badge>;
  };

  const isEmployeeAbsent = (employee) => {
    return employee.disponibilidad === "Ausente";
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

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <div className="flex justify-between items-center">
              <CardTitle>Lista de Empleados ({employees.length})</CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar empleados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando empleados...</div>
            ) : filteredEmployees.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                {searchTerm ? 'No se encontraron empleados' : 'No hay empleados registrados'}
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