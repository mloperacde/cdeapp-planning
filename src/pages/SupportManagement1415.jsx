
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
import { Label } from "@/components/ui/label"; // Added Label import

export default function SupportManagement1415Page() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [commonTask, setCommonTask] = useState({ tarea: '', instrucciones: '' }); // Added commonTask state
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
    mutationFn: async (tasksData) => { // Modified to accept an array of tasks
      const promises = tasksData.map(data => {
        const existing = savedTasks.find(t => t.employee_id === data.employee_id && t.fecha === data.fecha);
        if (existing) {
          return base44.entities.SupportTask1415.update(existing.id, data);
        }
        return base44.entities.SupportTask1415.create(data);
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supportTasks1415', selectedDate] }); // Invalidate for specific date
    },
  });

  React.useEffect(() => {
    const tasksForDate = savedTasks.filter(t => t.fecha === selectedDate);

    if (tasksForDate.length > 0) {
      // Cargar la primera tarea como común
      const firstTask = tasksForDate[0];
      setCommonTask({
        tarea: firstTask.tarea,
        instrucciones: firstTask.instrucciones || ''
      });

      // Seleccionar empleados que tienen tareas guardadas
      const selectedSet = new Set(tasksForDate.map(t => t.employee_id));
      setSelectedEmployees(selectedSet);
    } else {
      setCommonTask({ tarea: '', instrucciones: '' }); // Reset common task if no tasks for date
      setSelectedEmployees(new Set()); // Reset selected employees
    }
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
    } else {
      newSelected.add(empId);
    }
    setSelectedEmployees(newSelected);
  };

  // handleTaskChange and tasks state are removed as we're using commonTask

  const handleSaveAllTasks = () => {
    if (!commonTask.tarea || commonTask.tarea.trim() === '') {
      alert('Por favor, ingresa una descripción de tarea');
      return;
    }
    if (selectedEmployees.size === 0) {
      alert('Por favor, selecciona al menos un empleado para asignar la tarea.');
      return;
    }

    const tasksToSave = Array.from(selectedEmployees).map(empId => ({
      fecha: selectedDate,
      employee_id: empId,
      tarea: commonTask.tarea,
      instrucciones: commonTask.instrucciones || '',
      completada: false
    }));

    saveTaskMutation.mutate(tasksToSave);
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
      task: commonTask // Use commonTask here
    }))
    .filter(item => item.employee && commonTask.tarea && commonTask.tarea.trim() !== ''); // Filter if common task exists

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
                    disabled={selectedEmployees.size === 0 || !commonTask.tarea || commonTask.tarea.trim() === '' || saveTaskMutation.isPending}
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
              <>
                {/* Tarea Común para Todos */}
                <Card className="mb-6 shadow-lg border-0 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardHeader className="border-b border-blue-200">
                    <CardTitle className="text-blue-900">
                      Tarea Común para Empleados Seleccionados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="common_task" className="text-blue-900 font-semibold">
                          Descripción de Tarea *
                        </Label>
                        <Input
                          id="common_task"
                          placeholder="Ej: Limpieza de área de producción"
                          value={commonTask.tarea}
                          onChange={(e) => setCommonTask({ ...commonTask, tarea: e.target.value })}
                          className="bg-white text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="common_instructions" className="text-blue-900 font-semibold">
                          Instrucciones
                        </Label>
                        <Textarea
                          id="common_instructions"
                          placeholder="Instrucciones detalladas que se aplicarán a todos los empleados seleccionados..."
                          value={commonTask.instrucciones}
                          onChange={(e) => setCommonTask({ ...commonTask, instrucciones: e.target.value })}
                          rows={3}
                          className="bg-white text-base"
                        />
                      </div>
                      <p className="text-sm text-blue-700">
                        Esta tarea e instrucciones se asignarán a todos los empleados que selecciones abajo.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Empleados */}
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <CardTitle>
                        Seleccionar Empleados - {format(new Date(selectedDate), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </CardTitle>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {supportEmployees.map((emp) => {
                        const isSelected = selectedEmployees.has(emp.id);

                        return (
                          <div
                            key={emp.id}
                            className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all cursor-pointer ${
                              isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            onClick={() => handleToggleEmployee(emp.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleEmployee(emp.id)}
                              onClick={(e) => e.stopPropagation()} // Prevent parent onClick from firing twice
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-900 text-sm truncate">
                                {emp.nombre}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge
                                  style={{ backgroundColor: getTeamColor(emp.equipo) }}
                                  className="text-white text-xs"
                                >
                                  {emp.equipo}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {emp.puesto}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
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
                <>
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">Tarea Asignada:</h3>
                    <p className="text-blue-800 font-medium">{commonTask.tarea}</p>
                    {commonTask.instrucciones && commonTask.instrucciones.trim() !== '' && (
                      <>
                        <h4 className="font-semibold text-blue-900 mt-3 mb-1">Instrucciones:</h4>
                        <p className="text-blue-800 text-sm">{commonTask.instrucciones}</p>
                      </>
                    )}
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Equipo</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Puesto</TableHead>
                        {/* Task and Instructions columns removed here */}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedTasks.map(({ employee }) => ( // employee, task destructuring removed here
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
                          {/* Task and Instructions cells removed here */}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
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
            <p>• Selecciona empleados y asigna una tarea común específica para todos</p>
            <p>• Las tareas se guardan por fecha y pueden imprimirse</p>
          </div>
        </div>
      </div>
    </div>
  );
}
