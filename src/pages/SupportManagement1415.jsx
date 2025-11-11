
import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Clock, AlertTriangle, CheckSquare, Printer, ArrowLeft } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function SupportManagement1415Page() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [tasks, setTasks] = useState({});
  const [showPrintView, setShowPrintView] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: savedTasks } = useQuery({
    queryKey: ['supportTasks1415', selectedDate],
    queryFn: () => base44.entities.SupportTask1415.list(),
    initialData: [],
  });

  const saveTaskMutation = useMutation({
    mutationFn: (data) => {
      const existing = savedTasks.find(t => t.employee_id === data.employee_id && t.fecha === data.fecha);
      if (existing) {
        return base44.entities.SupportTask1415.update(existing.id, data);
      }
      return base44.entities.SupportTask1415.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTasks1415'] });
    },
  });

  React.useEffect(() => {
    const tasksForDate = savedTasks.filter(t => t.fecha === selectedDate);
    const taskMap = {};
    const selectedSet = new Set();
    
    tasksForDate.forEach(t => {
      taskMap[t.employee_id] = {
        tarea: t.tarea,
        instrucciones: t.instrucciones
      };
      selectedSet.add(t.employee_id);
    });
    
    setTasks(taskMap);
    setSelectedEmployees(selectedSet);
  }, [savedTasks, selectedDate]);

  // Solo empleados de MANTENIMIENTO y FABRICACION
  // De FABRICACION solo: responsable de línea, segunda de línea, operaria de línea
  const supportEmployees = useMemo(() => {
    const validPositions = ['responsable de linea', 'segunda de linea', 'operaria de linea'];
    
    return employees.filter(emp => {
      if (emp.disponibilidad !== "Disponible" || emp.incluir_en_planning === false) {
        return false;
      }
      
      if (emp.departamento === "MANTENIMIENTO") {
        return true;
      }
      
      if (emp.departamento === "FABRICACION") {
        const puesto = (emp.puesto || '').toLowerCase();
        return validPositions.some(vp => puesto.includes(vp));
      }
      
      return false;
    });
  }, [employees]);

  const handleSelectAll = () => {
    if (selectedEmployees.size === supportEmployees.length) {
      setSelectedEmployees(new Set());
    } else {
      setSelectedEmployees(new Set(supportEmployees.map(emp => emp.id)));
    }
  };

  const handleToggleEmployee = (empId) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(empId)) {
      newSelected.delete(empId);
      const newTasks = { ...tasks };
      delete newTasks[empId];
      setTasks(newTasks);
    } else {
      newSelected.add(empId);
    }
    setSelectedEmployees(newSelected);
  };

  const handleTaskChange = (empId, field, value) => {
    setTasks({
      ...tasks,
      [empId]: {
        ...tasks[empId],
        [field]: value
      }
    });
  };

  const handleSaveAllTasks = () => {
    selectedEmployees.forEach(empId => {
      const task = tasks[empId];
      if (task && task.tarea) {
        saveTaskMutation.mutate({
          fecha: selectedDate,
          employee_id: empId,
          tarea: task.tarea,
          instrucciones: task.instrucciones || '',
          completada: false
        });
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const getTeamColor = (teamName) => {
    const team = teams.find(t => t.team_name === teamName);
    return team?.color || '#3B82F6';
  };

  const getEmployeeName = (empId) => {
    return employees.find(e => e.id === empId)?.nombre || 'Desconocido';
  };

  const assignedTasks = Array.from(selectedEmployees)
    .map(empId => ({
      employee: employees.find(e => e.id === empId),
      task: tasks[empId]
    }))
    .filter(item => item.employee && item.task && item.task.tarea);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 print:hidden">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Jefes de Turno
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8 print:mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3 print:text-2xl">
              <Clock className="w-8 h-8 text-blue-600 print:hidden" />
              Apoyos 14-15h
            </h1>
            <p className="text-slate-600 mt-1 print:text-sm">
              Asignación de tareas para franja horaria 14:00-15:00h
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button
              onClick={() => setShowPrintView(!showPrintView)}
              variant="outline"
              disabled={assignedTasks.length === 0}
            >
              {showPrintView ? 'Volver a Edición' : 'Vista Previa'}
            </Button>
            {showPrintView && (
              <Button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
            )}
          </div>
        </div>

        {!showPrintView ? (
          <>
            {/* Selector de Fecha */}
            <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <label className="font-medium">Fecha:</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-64"
                  />
                  <Button
                    onClick={handleSaveAllTasks}
                    disabled={assignedTasks.length === 0 || saveTaskMutation.isPending}
                    className="ml-auto bg-green-600 hover:bg-green-700"
                  >
                    {saveTaskMutation.isPending ? 'Guardando...' : 'Guardar Todas las Tareas'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Total Empleados</p>
                      <p className="text-2xl font-bold text-blue-900">{supportEmployees.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700 font-medium">Seleccionados</p>
                      <p className="text-2xl font-bold text-green-900">{selectedEmployees.size}</p>
                    </div>
                    <CheckSquare className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-orange-700 font-medium">Con Tareas</p>
                      <p className="text-2xl font-bold text-orange-900">{assignedTasks.length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {supportEmployees.length === 0 ? (
              <Card className="bg-amber-50 border-2 border-amber-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        No hay empleados disponibles
                      </p>
                      <p className="text-sm text-amber-800">
                        No se encontraron empleados de MANTENIMIENTO o FABRICACION con los puestos requeridos.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-slate-100">
                  <div className="flex justify-between items-center">
                    <CardTitle>Asignación de Tareas - {format(new Date(selectedDate), "d 'de' MMMM 'de' yyyy", { locale: es })}</CardTitle>
                    <Button
                      onClick={handleSelectAll}
                      variant="outline"
                      size="sm"
                    >
                      {selectedEmployees.size === supportEmployees.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {supportEmployees.map((emp) => {
                      const isSelected = selectedEmployees.has(emp.id);
                      const task = tasks[emp.id] || {};
                      
                      return (
                        <div 
                          key={emp.id} 
                          className={`border-2 rounded-lg p-4 transition-all ${
                            isSelected ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleEmployee(emp.id)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-slate-900">{emp.nombre}</span>
                                <Badge 
                                  style={{ backgroundColor: getTeamColor(emp.equipo) }}
                                  className="text-white text-xs"
                                >
                                  {emp.equipo}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {emp.departamento}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {emp.puesto}
                                </Badge>
                              </div>
                              
                              {isSelected && (
                                <div className="space-y-3 mt-3">
                                  <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Tarea *</label>
                                    <Input
                                      placeholder="Ej: Limpieza de área de producción"
                                      value={task.tarea || ''}
                                      onChange={(e) => handleTaskChange(emp.id, 'tarea', e.target.value)}
                                      className="bg-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-sm font-medium text-slate-700">Instrucciones</label>
                                    <Textarea
                                      placeholder="Instrucciones detalladas de la tarea..."
                                      value={task.instrucciones || ''}
                                      onChange={(e) => handleTaskChange(emp.id, 'instrucciones', e.target.value)}
                                      rows={2}
                                      className="bg-white"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          /* Vista de Impresión */
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-center">
                Tareas Asignadas - Apoyos 14:00-15:00h
                <div className="text-sm font-normal text-slate-600 mt-2">
                  {format(new Date(selectedDate), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {assignedTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No hay tareas asignadas para esta fecha
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Tarea</TableHead>
                      <TableHead>Instrucciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedTasks.map(({ employee, task }) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-semibold">{employee.nombre}</TableCell>
                        <TableCell>
                          <Badge 
                            style={{ backgroundColor: getTeamColor(employee.equipo) }}
                            className="text-white"
                          >
                            {employee.equipo}
                          </Badge>
                        </TableCell>
                        <TableCell>{employee.departamento}</TableCell>
                        <TableCell>{employee.puesto}</TableCell>
                        <TableCell className="font-medium">{task.tarea}</TableCell>
                        <TableCell className="text-sm">{task.instrucciones || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Información */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg print:hidden">
          <h3 className="font-semibold text-blue-900 mb-2">Información sobre Apoyos 14-15h</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Empleados de MANTENIMIENTO (todos los puestos)</p>
            <p>• Empleados de FABRICACION (solo: responsable de línea, segunda de línea, operaria de línea)</p>
            <p>• Disponibles en la franja horaria de 14:00 a 15:00h</p>
            <p>• Selecciona empleados y asigna tareas específicas para cada uno</p>
            <p>• Las tareas se guardan por fecha y pueden imprimirse</p>
          </div>
        </div>
      </div>
    </div>
  );
}
