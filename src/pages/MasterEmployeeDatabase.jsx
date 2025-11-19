import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { 
  Database, 
  ArrowLeft, 
  Search, 
  RefreshCw, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MasterEmployeeImport from "../components/master/MasterEmployeeImport";

export default function MasterEmployeeDatabasePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: masterEmployees = [], isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('-created_date'),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeMasterDatabase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (masterEmployee) => {
      const employeeData = {
        codigo_empleado: masterEmployee.codigo_empleado,
        nombre: masterEmployee.nombre,
        dni: masterEmployee.dni,
        nuss: masterEmployee.nuss,
        email: masterEmployee.email,
        telefono_movil: masterEmployee.telefono_movil,
        fecha_nacimiento: masterEmployee.fecha_nacimiento,
        sexo: masterEmployee.sexo,
        nacionalidad: masterEmployee.nacionalidad,
        direccion: masterEmployee.direccion,
        departamento: masterEmployee.departamento,
        puesto: masterEmployee.puesto,
        categoria: masterEmployee.categoria,
        tipo_jornada: masterEmployee.tipo_jornada || 'Jornada Completa',
        num_horas_jornada: masterEmployee.num_horas_jornada,
        tipo_turno: masterEmployee.tipo_turno || 'Rotativo',
        equipo: masterEmployee.equipo,
        fecha_alta: masterEmployee.fecha_alta,
        tipo_contrato: masterEmployee.tipo_contrato,
        fecha_fin_contrato: masterEmployee.fecha_fin_contrato,
        salario_anual: masterEmployee.salario_anual,
        estado_empleado: masterEmployee.estado_empleado,
        disponibilidad: masterEmployee.disponibilidad,
      };

      let employeeId;

      if (masterEmployee.employee_id) {
        await base44.entities.Employee.update(masterEmployee.employee_id, employeeData);
        employeeId = masterEmployee.employee_id;
      } else if (masterEmployee.codigo_empleado) {
        const existing = await base44.entities.Employee.filter({ 
          codigo_empleado: masterEmployee.codigo_empleado 
        });
        if (existing.length > 0) {
          await base44.entities.Employee.update(existing[0].id, employeeData);
          employeeId = existing[0].id;
        } else {
          const newEmployee = await base44.entities.Employee.create(employeeData);
          employeeId = newEmployee.id;
        }
      } else {
        const newEmployee = await base44.entities.Employee.create(employeeData);
        employeeId = newEmployee.id;
      }

      await base44.entities.EmployeeMasterDatabase.update(masterEmployee.id, {
        employee_id: employeeId,
        ultimo_sincronizado: new Date().toISOString(),
        estado_sincronizacion: 'Sincronizado'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleSyncAll = async () => {
    setSyncing(true);
    const pending = masterEmployees.filter(e => e.estado_sincronizacion !== 'Sincronizado');
    
    for (const employee of pending) {
      try {
        await syncMutation.mutateAsync(employee);
      } catch (error) {
        console.error('Error syncing:', error);
        await base44.entities.EmployeeMasterDatabase.update(employee.id, {
          estado_sincronizacion: 'Error'
        });
      }
    }
    
    setSyncing(false);
  };

  const filteredEmployees = masterEmployees.filter(emp =>
    emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: masterEmployees.length,
    sincronizados: masterEmployees.filter(e => e.estado_sincronizacion === 'Sincronizado').length,
    pendientes: masterEmployees.filter(e => e.estado_sincronizacion === 'Pendiente').length,
    errores: masterEmployees.filter(e => e.estado_sincronizacion === 'Error').length,
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            Base de Datos Maestra de Empleados
          </h1>
          <p className="text-slate-600 mt-1">
            Archivo maestro centralizado de empleados - Fuente única de verdad
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Registros</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Database className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Sincronizados</p>
                  <p className="text-2xl font-bold text-green-900">{stats.sincronizados}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.pendientes}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 font-medium">Errores</p>
                  <p className="text-2xl font-bold text-red-900">{stats.errores}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Importar Datos
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-4 h-4 mr-2" />
              Base de Datos ({stats.total})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <MasterEmployeeImport />
          </TabsContent>

          <TabsContent value="database">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <CardTitle>Registros en Base de Datos Maestra</CardTitle>
                  <Button
                    onClick={handleSyncAll}
                    disabled={syncing || stats.pendientes === 0}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                    Sincronizar Pendientes ({stats.pendientes})
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nombre, código o departamento..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-12 text-slate-500">Cargando...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    No hay registros en la base de datos maestra
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
                          <TableHead>Sincronización</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((emp) => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-mono text-xs">
                              {emp.codigo_empleado || '-'}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {emp.nombre}
                            </TableCell>
                            <TableCell>{emp.departamento || '-'}</TableCell>
                            <TableCell>{emp.puesto || '-'}</TableCell>
                            <TableCell>
                              <Badge className={
                                emp.estado_empleado === 'Alta' 
                                  ? 'bg-green-600' 
                                  : 'bg-slate-600'
                              }>
                                {emp.estado_empleado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {emp.estado_sincronizacion === 'Sincronizado' && (
                                  <Badge className="bg-green-600">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Sincronizado
                                  </Badge>
                                )}
                                {emp.estado_sincronizacion === 'Pendiente' && (
                                  <Badge className="bg-amber-600">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pendiente
                                  </Badge>
                                )}
                                {emp.estado_sincronizacion === 'Error' && (
                                  <Badge className="bg-red-600">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Error
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {emp.estado_sincronizacion !== 'Sincronizado' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => syncMutation.mutate(emp)}
                                    disabled={syncMutation.isPending}
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Sincronizar
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('¿Eliminar este registro?')) {
                                      deleteMutation.mutate(emp.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}