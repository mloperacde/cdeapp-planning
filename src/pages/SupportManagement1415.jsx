import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Clock, AlertTriangle, CheckSquare, Printer, ArrowLeft, Filter as FilterIcon, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";

export default function SupportManagement1415Page() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [useQuickFilter, setUseQuickFilter] = useState(true);
  const [taskGroups, setTaskGroups] = useState([
    { id: 1, employees: new Set(), tarea: '', instrucciones: '' }
  ]);
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

  const { data: teamSchedules } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
    initialData: [],
  });

  const { data: savedTasks } = useQuery({
    queryKey: ['supportTasks1415', selectedDate],
    queryFn: () => base44.entities.SupportTask1415.list(),
    initialData: [],
  });

  const saveTaskMutation = useMutation({
    mutationFn: async (tasksData) => {
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
      queryClient.invalidateQueries({ queryKey: ['supportTasks1415'] });
    },
  });

  React.useEffect(() => {
    const tasksForDate = savedTasks.filter(t => t.fecha === selectedDate);
    
    if (tasksForDate.length > 0) {
      // Agrupar tareas por descripción
      const grouped = new Map();
      tasksForDate.forEach(task => {
        const key = `${task.tarea}|||${task.instrucciones || ''}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            tarea: task.tarea,
            instrucciones: task.instrucciones || '',
            employees: new Set()
          });
        }
        grouped.get(key).employees.add(task.employee_id);
      });
      
      // Convertir a array de grupos
      const groups = Array.from(grouped.values()).map((group, index) => ({
        id: index + 1,
        tarea: group.tarea,
        instrucciones: group.instrucciones,
        employees: group.employees
      }));
      
      setTaskGroups(groups.length > 0 ? groups : [{ id: 1, employees: new Set(), tarea: '', instrucciones: '' }]);
    } else {
      setTaskGroups([{ id: 1, employees: new Set(), tarea: '', instrucciones: '' }]);
    }
  }, [savedTasks, selectedDate]);

  // Obtener turno del equipo para la fecha seleccionada
  const getTeamShiftForDate = (teamName, date) => {
    const weekStart = startOfWeek(new Date(date), { weekStartsOn: 1 });
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    const team = teams.find(t => t.team_name === teamName);
    if (!team) return null;
    
    const schedule = teamSchedules.find(
      s => s.team_key === team.team_key && s.fecha_inicio_semana === weekStartStr
    );
    
    return schedule?.turno;
  };

  // Empleados filtrados según modo
  const filteredEmployees = useMemo(() => {
    let filtered = employees.filter(emp => 
      emp.disponibilidad === "Disponible" && emp.incluir_en_planning !== false
    );

    if (useQuickFilter) {
      // Filtro rápido: Jornada completa 8h, turno tarde en fecha seleccionada, depts específicos
      const validDepts = ['FABRICACION', 'MANTENIMIENTO', 'ALMACEN'];
      
      filtered = filtered.filter(emp => {
        // Jornada completa
        if (emp.tipo_jornada !== "Jornada Completa") return false;
        
        // Verificar turno para la fecha
        let hasTardeTurn = false;
        
        if (emp.tipo_turno === "Fijo Tarde") {
          hasTardeTurn = true;
        } else if (emp.tipo_turno === "Rotativo" && emp.equipo) {
          const teamShift = getTeamShiftForDate(emp.equipo, selectedDate);
          hasTardeTurn = teamShift === "Tarde";
        }
        
        if (!hasTardeTurn) return false;
        
        // Departamento válido
        return validDepts.includes(emp.departamento);
      });
      
      // Ordenar por departamento: FABRICACION, MANTENIMIENTO, ALMACEN
      filtered.sort((a, b) => {
        const deptOrder = { 'FABRICACION': 0, 'MANTENIMIENTO': 1, 'ALMACEN': 2 };
        const orderA = deptOrder[a.departamento] ?? 999;
        const orderB = deptOrder[b.departamento] ?? 999;
        return orderA - orderB;
      });
    }

    return filtered;
  }, [employees, useQuickFilter, selectedDate, teams, teamSchedules]);

  // Empleados ya asignados (ocultar o marcar)
  const assignedEmployeeIds = useMemo(() => {
    return savedTasks
      .filter(t => t.fecha === selectedDate)
      .map(t => t.employee_id);
  }, [savedTasks, selectedDate]);

  // Empleados disponibles (no asignados)
  const availableEmployees = useMemo(() => {
    return filteredEmployees.filter(emp => !assignedEmployeeIds.includes(emp.id));
  }, [filteredEmployees, assignedEmployeeIds]);

  const handleToggleEmployee = (empId, groupId) => {
    setTaskGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === groupId) {
          const newEmployees = new Set(group.employees);
          if (newEmployees.has(empId)) {
            newEmployees.delete(empId);
          } else {
            newEmployees.add(empId);
          }
          return { ...group, employees: newEmployees };
        }
        return group;
      })
    );
  };

  const handleSelectAll = (groupId) => {
    setTaskGroups(prevGroups => 
      prevGroups.map(group => {
        if (group.id === groupId) {
          if (group.employees.size === availableEmployees.length) {
            return { ...group, employees: new Set() };
          } else {
            return { ...group, employees: new Set(availableEmployees.map(emp => emp.id)) };
          }
        }
        return group;
      })
    );
  };

  const handleTaskChange = (groupId, field, value) => {
    setTaskGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId ? { ...group, [field]: value } : group
      )
    );
  };

  const handleAddGroup = () => {
    const newId = Math.max(...taskGroups.map(g => g.id), 0) + 1;
    setTaskGroups([...taskGroups, { id: newId, employees: new Set(), tarea: '', instrucciones: '' }]);
  };

  const handleRemoveGroup = (groupId) => {
    if (taskGroups.length === 1) return;
    setTaskGroups(taskGroups.filter(g => g.id !== groupId));
  };

  const handleSaveAllTasks = () => {
    const allTasks = [];
    
    taskGroups.forEach(group => {
      if (group.tarea && group.employees.size > 0) {
        Array.from(group.employees).forEach(empId => {
          allTasks.push({
            fecha: selectedDate,
            employee_id: empId,
            tarea: group.tarea,
            instrucciones: group.instrucciones || '',
            completada: false
          });
        });
      }
    });
    
    if (allTasks.length === 0) {
      alert('No hay tareas para guardar');
      return;
    }
    
    saveTaskMutation.mutate(allTasks);
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

  const allAssignedTasks = useMemo(() => {
    return savedTasks
      .filter(t => t.fecha === selectedDate)
      .map(t => ({
        employee: employees.find(e => e.id === t.employee_id),
        task: t
      }))
      .filter(item => item.employee);
  }, [savedTasks, selectedDate, employees]);

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
              disabled={allAssignedTasks.length === 0}
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
            {/* Selector de Fecha y Filtro */}
            <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <label className="font-medium">Fecha:</label>
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-64"
                    />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Button
                      variant={useQuickFilter ? "default" : "outline"}
                      onClick={() => setUseQuickFilter(!useQuickFilter)}
                      className={useQuickFilter ? "bg-blue-600" : ""}
                    >
                      <FilterIcon className="w-4 h-4 mr-2" />
                      Personal 14-15h
                    </Button>
                    
                    <Button
                      onClick={handleSaveAllTasks}
                      disabled={taskGroups.every(g => !g.tarea || g.employees.size === 0) || saveTaskMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {saveTaskMutation.isPending ? 'Guardando...' : 'Guardar Todas las Tareas'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información del filtro */}
            {useQuickFilter && (
              <Card className="mb-6 bg-blue-50 border-2 border-blue-300">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Filtro "Personal 14-15h" activado:</strong> Se muestran empleados con jornada completa, 
                    turno de tarde en la fecha seleccionada, de los departamentos FABRICACIÓN, MANTENIMIENTO y ALMACÉN (ordenados).
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Disponibles</p>
                      <p className="text-2xl font-bold text-blue-900">{availableEmployees.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-700 font-medium">Ya Asignados</p>
                      <p className="text-2xl font-bold text-purple-900">{assignedEmployeeIds.length}</p>
                    </div>
                    <CheckSquare className="w-8 h-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700 font-medium">Grupos de Tareas</p>
                      <p className="text-2xl font-bold text-green-900">{taskGroups.length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {availableEmployees.length === 0 && assignedEmployeeIds.length === 0 ? (
              <Card className="bg-amber-50 border-2 border-amber-300">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-900">
                        No hay empleados disponibles
                      </p>
                      <p className="text-sm text-amber-800">
                        {useQuickFilter 
                          ? 'No se encontraron empleados que cumplan con los criterios del filtro "Personal 14-15h".'
                          : 'No hay empleados disponibles para asignar tareas.'
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Grupos de Tareas */}
                <div className="space-y-4 mb-6">
                  {taskGroups.map((group, index) => {
                    const selectedInGroup = Array.from(group.employees).filter(id => 
                      availableEmployees.some(emp => emp.id === id)
                    );
                    
                    return (
                      <Card key={group.id} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-blue-900">
                              Grupo de Tarea {index + 1}
                              {selectedInGroup.length > 0 && (
                                <Badge className="ml-2 bg-blue-600">{selectedInGroup.length} empleados</Badge>
                              )}
                            </CardTitle>
                            {taskGroups.length > 1 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveGroup(group.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="space-y-4 mb-4">
                            <div className="space-y-2">
                              <Label htmlFor={`task_${group.id}`} className="text-slate-900 font-semibold">
                                Descripción de Tarea *
                              </Label>
                              <Input
                                id={`task_${group.id}`}
                                placeholder="Ej: Limpieza de área de producción"
                                value={group.tarea}
                                onChange={(e) => handleTaskChange(group.id, 'tarea', e.target.value)}
                                className="text-base"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`instructions_${group.id}`} className="text-slate-900 font-semibold">
                                Instrucciones
                              </Label>
                              <Textarea
                                id={`instructions_${group.id}`}
                                placeholder="Instrucciones detalladas..."
                                value={group.instrucciones}
                                onChange={(e) => handleTaskChange(group.id, 'instrucciones', e.target.value)}
                                rows={2}
                                className="text-base"
                              />
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center mb-3">
                              <Label className="text-slate-900 font-semibold">
                                Seleccionar Empleados ({selectedInGroup.length}/{availableEmployees.length})
                              </Label>
                              <Button
                                onClick={() => handleSelectAll(group.id)}
                                variant="outline"
                                size="sm"
                              >
                                {selectedInGroup.length === availableEmployees.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
                              {availableEmployees.map((emp) => {
                                const isSelected = group.employees.has(emp.id);
                                
                                return (
                                  <div 
                                    key={emp.id} 
                                    className={`flex items-center gap-3 p-3 border-2 rounded-lg transition-all cursor-pointer ${
                                      isSelected ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                    onClick={() => handleToggleEmployee(emp.id, group.id)}
                                  >
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleEmployee(emp.id, group.id)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-slate-900 text-sm truncate">
                                        {emp.nombre}
                                      </div>
                                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                                        <Badge 
                                          style={{ backgroundColor: getTeamColor(emp.equipo) }}
                                          className="text-white text-xs"
                                        >
                                          {emp.equipo}
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                          {emp.departamento}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <Button
                  onClick={handleAddGroup}
                  variant="outline"
                  className="w-full border-2 border-dashed border-blue-300 hover:bg-blue-50"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Añadir Otro Grupo de Tarea
                </Button>

                {/* Empleados ya asignados */}
                {assignedEmployeeIds.length > 0 && (
                  <Card className="mt-6 bg-slate-50 border-2 border-slate-300">
                    <CardHeader>
                      <CardTitle className="text-slate-700">
                        Empleados Ya Asignados ({assignedEmployeeIds.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {assignedEmployeeIds.map(empId => {
                          const emp = employees.find(e => e.id === empId);
                          if (!emp) return null;
                          
                          return (
                            <div key={empId} className="p-2 bg-slate-100 rounded border border-slate-300 opacity-60">
                              <div className="text-sm font-semibold text-slate-700">{emp.nombre}</div>
                              <div className="text-xs text-slate-500">{emp.departamento}</div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
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
              {allAssignedTasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No hay tareas asignadas para esta fecha
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    // Agrupar por tarea
                    const grouped = new Map();
                    allAssignedTasks.forEach(({ employee, task }) => {
                      const key = `${task.tarea}|||${task.instrucciones || ''}`;
                      if (!grouped.has(key)) {
                        grouped.set(key, {
                          tarea: task.tarea,
                          instrucciones: task.instrucciones,
                          employees: []
                        });
                      }
                      grouped.get(key).employees.push(employee);
                    });
                    
                    return Array.from(grouped.values()).map((group, index) => (
                      <div key={index} className="border-2 border-slate-200 rounded-lg p-4">
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                          <h3 className="font-semibold text-blue-900 mb-1">Tarea {index + 1}:</h3>
                          <p className="text-blue-800 font-medium">{group.tarea}</p>
                          {group.instrucciones && (
                            <>
                              <h4 className="font-semibold text-blue-900 mt-2 mb-1">Instrucciones:</h4>
                              <p className="text-blue-800 text-sm">{group.instrucciones}</p>
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
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.employees.map((employee) => (
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
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Información */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg print:hidden">
          <h3 className="font-semibold text-blue-900 mb-2">Información sobre Apoyos 14-15h</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>Filtro "Personal 14-15h":</strong> Jornada completa, turno tarde, depts: FABRICACIÓN, MANTENIMIENTO, ALMACÉN</p>
            <p>• <strong>Sin filtro:</strong> Todos los empleados disponibles</p>
            <p>• Los empleados con tareas asignadas se ocultan de la vista de selección</p>
            <p>• Puedes crear múltiples grupos con tareas diferentes</p>
            <p>• La vista previa muestra todas las configuraciones guardadas</p>
          </div>
        </div>
      </div>
    </div>
  );
}