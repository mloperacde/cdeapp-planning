import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppData } from "../components/data/DataProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, AlertTriangle, CheckCircle2, UserCheck, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function EmployeeDataCompletionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const queryClient = useQueryClient();

  // Fetch employees from DataProvider
  const { employees, masterEmployees, employeesLoading: isLoading } = useAppData();

  // Fields to check for completion
  const requiredFields = [
    { key: 'email', label: 'Email' },
    { key: 'telefono_movil', label: 'Móvil' },
    { key: 'dni', label: 'DNI' },
    { key: 'nuss', label: 'NUSS' },
    { key: 'direccion', label: 'Dirección' },
    { key: 'fecha_nacimiento', label: 'Fecha Nac.' },
    { key: 'contacto_emergencia_nombre', label: 'Contacto Emergencia' },
    { key: 'contacto_emergencia_telefono', label: 'Tel. Emergencia' }
  ];

  // Calculate completeness
  const employeeData = useMemo(() => {
    return employees.map(emp => {
      const missing = requiredFields.filter(f => !emp[f.key]);
      const completed = requiredFields.length - missing.length;
      const percentage = Math.round((completed / requiredFields.length) * 100);
      
      return {
        ...emp,
        missingFields: missing,
        completeness: percentage
      };
    });
  }, [employees]);

  // Filter incomplete employees
  const incompleteEmployees = useMemo(() => {
    return employeeData
      .filter(e => e.completeness < 100)
      .filter(e => 
        e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.completeness - b.completeness);
  }, [employeeData, searchTerm]);

  // Update mutation - USAR SOLO MASTER DATABASE
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmployeeMasterDatabase.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      toast.success("Datos actualizados correctamente");
      setEditingEmployee(null);
    },
    onError: (err) => toast.error("Error al actualizar: " + err.message)
  });

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const updates = {};
    
    requiredFields.forEach(field => {
      const val = formData.get(field.key);
      if (val) updates[field.key] = val;
    });

    updateMutation.mutate({ id: editingEmployee.id, data: updates });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("HRDashboard")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-8 h-8 text-blue-600" />
            Completitud de Datos
          </h1>
          <p className="text-slate-500">
            Identifica y completa la información faltante de los empleados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">Total Empleados</p>
              <p className="text-2xl font-bold text-blue-900">{employees.length}</p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">Datos Incompletos</p>
              <p className="text-2xl font-bold text-orange-900">{incompleteEmployees.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">Completos</p>
              <p className="text-2xl font-bold text-green-900">
                {employees.length - incompleteEmployees.length}
              </p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-green-600 opacity-50" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Empleados Pendientes</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <CardDescription>
            Listado de empleados con información faltante ordenada por prioridad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Completitud</TableHead>
                <TableHead>Faltan</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incompleteEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-medium">
                    <div>{emp.nombre}</div>
                    <div className="text-xs text-slate-500">{emp.codigo_empleado}</div>
                  </TableCell>
                  <TableCell>{emp.departamento || '-'}</TableCell>
                  <TableCell className="w-[200px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{emp.completeness}%</span>
                      </div>
                      <Progress value={emp.completeness} className="h-2" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {emp.missingFields.slice(0, 3).map(field => (
                        <Badge key={field.key} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                          {field.label}
                        </Badge>
                      ))}
                      {emp.missingFields.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{emp.missingFields.length - 3} más
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setEditingEmployee(emp)}
                    >
                      Completar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {incompleteEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-green-600">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    ¡Todos los empleados tienen los datos completos!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingEmployee} onOpenChange={(open) => !open && setEditingEmployee(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Completar Datos: {editingEmployee?.nombre}</DialogTitle>
          </DialogHeader>
          {editingEmployee && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requiredFields.map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key} className="flex items-center justify-between">
                      {field.label}
                      {!editingEmployee[field.key] && (
                        <span className="text-xs text-red-500 font-medium">Falta</span>
                      )}
                    </Label>
                    <Input 
                      id={field.key} 
                      name={field.key} 
                      defaultValue={editingEmployee[field.key] || ''}
                      className={!editingEmployee[field.key] ? "border-red-300 bg-red-50" : ""}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setEditingEmployee(null)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                  Guardar Cambios
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}