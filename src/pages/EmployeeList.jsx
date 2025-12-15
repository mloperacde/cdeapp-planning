import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function EmployeeListPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre', 1000),
  });

  const filteredEmployees = employees.filter(employee =>
    employee.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.departamento?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Listado de Empleados</h1>
          <p className="text-slate-500">Vista general de la plantilla</p>
        </div>
        <Link to={createPageUrl("Employees")}>
          <Button variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Gestión Avanzada
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Empleados ({filteredEmployees.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar por nombre, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Cargando empleados...
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No se encontraron empleados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-mono">{employee.codigo_empleado}</TableCell>
                      <TableCell className="font-medium">{employee.nombre}</TableCell>
                      <TableCell>{employee.departamento || '-'}</TableCell>
                      <TableCell>{employee.puesto || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={employee.estado_empleado === 'Baja' ? 'destructive' : 'default'}>
                          {employee.estado_empleado || 'Alta'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}