import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AlertCircle, ExternalLink, Search, UserX, CheckCircle2 } from "lucide-react";

export default function EmployeesWithoutLocker({ employees, lockerAssignments, onAssign }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartamento, setFilterDepartamento] = useState("all");

  const employeesWithoutLocker = useMemo(() => {
    return employees.filter(emp => {
      const assignment = lockerAssignments.find(la => la.employee_id === emp.id);
      
      // Sin asignación o sin taquilla asignada
      if (!assignment) return true;
      if (assignment.requiere_taquilla === false) return false;
      
      const tieneTaquilla = assignment.numero_taquilla_actual && 
                           assignment.numero_taquilla_actual.trim() !== "";
      
      return !tieneTaquilla;
    });
  }, [employees, lockerAssignments]);

  const departments = useMemo(() => {
    const depts = new Set();
    employeesWithoutLocker.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employeesWithoutLocker]);

  const filteredEmployees = useMemo(() => {
    return employeesWithoutLocker.filter(emp => {
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDept = filterDepartamento === "all" || emp.departamento === filterDepartamento;
      
      return matchesSearch && matchesDept;
    });
  }, [employeesWithoutLocker, searchTerm, filterDepartamento]);

  if (employeesWithoutLocker.length === 0) {
    return (
      <Card className="shadow-lg bg-green-50 border-2 border-green-300">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <p className="text-lg font-semibold text-green-900">
            ✅ Todos los empleados tienen taquilla asignada
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg bg-red-50 border-2 border-red-300">
        <CardHeader className="border-b border-red-200">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <UserX className="w-5 h-5" />
              Empleados sin Taquilla Asignada
            </CardTitle>
            <Badge className="bg-red-600 text-white text-lg px-4 py-1">
              {employeesWithoutLocker.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="bg-white rounded-lg p-4 mb-4 border-2 border-red-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">
                  ⚠️ Acción Requerida
                </p>
                <p className="text-xs text-red-800">
                  Hay {employeesWithoutLocker.length} empleado(s) sin taquilla asignada. 
                  Revisa y asigna taquillas desde el mapa interactivo o la pestaña de asignaciones.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <Label>
                <Search className="w-4 h-4 inline mr-1" />
                Buscar
              </Label>
              <Input
                placeholder="Nombre o código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-red-100">
                  <TableHead>Empleado</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead className="text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                      No hay resultados con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map(emp => (
                    <TableRow key={emp.id} className="hover:bg-white">
                      <TableCell className="font-semibold">{emp.nombre}</TableCell>
                      <TableCell className="font-mono text-xs">{emp.codigo_empleado || '-'}</TableCell>
                      <TableCell className="text-sm">{emp.departamento || '-'}</TableCell>
                      <TableCell>
                        <Badge className={
                          emp.sexo === "Femenino" ? "bg-pink-100 text-pink-800" :
                          emp.sexo === "Masculino" ? "bg-blue-100 text-blue-800" :
                          "bg-purple-100 text-purple-800"
                        }>
                          {emp.sexo || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Link to={createPageUrl(`Employees?id=${emp.id}`)}>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Asignar
                          </Button>
                        </Link>
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
