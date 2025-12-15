import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Check, ShieldAlert, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import _ from "lodash";

export default function EmployeeDataCorrectionPage() {
  const [activeTab, setActiveTab] = useState("duplicates");
  const queryClient = useQueryClient();

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre', 1000),
    initialData: [],
  });

  // Detect duplicates (by DNI, Email, or Name similarity)
  const duplicateIssues = useMemo(() => {
    const issues = [];
    
    // Group by DNI
    const byDni = _.groupBy(employees.filter(e => e.dni), 'dni');
    Object.entries(byDni).forEach(([dni, emps]) => {
      if (emps.length > 1) {
        issues.push({
          type: 'duplicate_dni',
          label: 'DNI Duplicado',
          value: dni,
          employees: emps
        });
      }
    });

    // Group by Email
    const byEmail = _.groupBy(employees.filter(e => e.email), 'email');
    Object.entries(byEmail).forEach(([email, emps]) => {
      if (emps.length > 1) {
        issues.push({
          type: 'duplicate_email',
          label: 'Email Duplicado',
          value: email,
          employees: emps
        });
      }
    });

    return issues;
  }, [employees]);

  // Detect format errors
  const formatIssues = useMemo(() => {
    const issues = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s-]{9,}$/;
    
    employees.forEach(emp => {
      if (emp.email && !emailRegex.test(emp.email)) {
        issues.push({
          id: emp.id,
          employee: emp,
          field: 'email',
          value: emp.email,
          error: 'Formato de email inválido'
        });
      }
      if (emp.telefono_movil && !phoneRegex.test(emp.telefono_movil)) {
        issues.push({
          id: emp.id,
          employee: emp,
          field: 'telefono_movil',
          value: emp.telefono_movil,
          error: 'Formato de teléfono sospechoso'
        });
      }
      if (emp.dni && emp.dni.length < 5) {
        issues.push({
          id: emp.id,
          employee: emp,
          field: 'dni',
          value: emp.dni,
          error: 'DNI demasiado corto'
        });
      }
    });
    
    return issues;
  }, [employees]);

  // Merge handler (simplified - just deactivate duplicate?)
  const deactivateMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.update(id, { estado_empleado: 'Baja', motivo_baja: 'Duplicado (Corrección de Datos)' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Empleado marcado como baja");
    }
  });

  // Fix format handler
  const updateFieldMutation = useMutation({
    mutationFn: ({ id, field, value }) => base44.entities.Employee.update(id, { [field]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Campo corregido");
    }
  });

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
            <ShieldAlert className="w-8 h-8 text-orange-600" />
            Corrección de Datos
          </h1>
          <p className="text-slate-500">
            Detecta y corrige inconsistencias, duplicados y errores de formato
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-800">Duplicados Detectados</p>
              <p className="text-2xl font-bold text-orange-900">{duplicateIssues.length}</p>
            </div>
            <RefreshCw className="w-8 h-8 text-orange-600 opacity-50" />
          </CardContent>
        </Card>
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-800">Errores de Formato</p>
              <p className="text-2xl font-bold text-yellow-900">{formatIssues.length}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-600 opacity-50" />
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="duplicates">Duplicados ({duplicateIssues.length})</TabsTrigger>
          <TabsTrigger value="format">Formato ({formatIssues.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="duplicates">
          <Card>
            <CardHeader>
              <CardTitle>Registros Duplicados</CardTitle>
              <CardDescription>
                Empleados que comparten identificadores únicos (DNI, Email)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {duplicateIssues.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  <Check className="w-12 h-12 mx-auto mb-2" />
                  No se encontraron duplicados
                </div>
              ) : (
                <div className="space-y-6">
                  {duplicateIssues.map((issue, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-slate-50">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="destructive">{issue.label}</Badge>
                        <span className="font-mono font-medium">{issue.value}</span>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Fecha Alta</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {issue.employees.map(emp => (
                            <TableRow key={emp.id} className="bg-white">
                              <TableCell className="font-medium">{emp.nombre}</TableCell>
                              <TableCell>
                                <Badge variant={emp.estado_empleado === 'Alta' ? 'default' : 'secondary'}>
                                  {emp.estado_empleado}
                                </Badge>
                              </TableCell>
                              <TableCell>{emp.fecha_alta || '-'}</TableCell>
                              <TableCell className="text-right">
                                {emp.estado_empleado === 'Alta' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      if(confirm('¿Marcar este registro como BAJA?')) {
                                        deactivateMutation.mutate(emp.id);
                                      }
                                    }}
                                  >
                                    Dar de Baja
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="format">
          <Card>
            <CardHeader>
              <CardTitle>Errores de Formato</CardTitle>
              <CardDescription>
                Campos que no cumplen con el formato esperado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Valor Actual</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead className="text-right">Corrección</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formatIssues.map((issue, idx) => (
                    <FormatIssueRow key={idx} issue={issue} onUpdate={updateFieldMutation.mutate} />
                  ))}
                  {formatIssues.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-green-600">
                        <Check className="w-12 h-12 mx-auto mb-2" />
                        Todos los datos tienen formato correcto
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FormatIssueRow({ issue, onUpdate }) {
  const [newValue, setNewValue] = useState(issue.value);

  return (
    <TableRow>
      <TableCell className="font-medium">{issue.employee.nombre}</TableCell>
      <TableCell><Badge variant="outline">{issue.field}</Badge></TableCell>
      <TableCell className="text-red-600 font-mono text-sm">{issue.value}</TableCell>
      <TableCell className="text-sm text-slate-500">{issue.error}</TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Input 
            value={newValue} 
            onChange={(e) => setNewValue(e.target.value)} 
            className="w-40 h-8 text-sm"
          />
          <Button 
            size="sm" 
            variant="ghost"
            disabled={newValue === issue.value}
            onClick={() => onUpdate({ id: issue.id, field: issue.field, value: newValue })}
          >
            <Check className="w-4 h-4 text-green-600" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}