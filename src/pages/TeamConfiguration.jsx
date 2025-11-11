
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Users, Sunrise, Sunset, Calendar, RefreshCw, Save, Filter, ArrowLeft, UsersRound, Edit, CheckCircle2, XCircle } from "lucide-react";
import { format, addWeeks, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import EmployeeForm from "../components/employees/EmployeeForm";

export default function TeamConfigurationPage() {
  const [selectedWeek, setSelectedWeek] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: teams, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: schedules } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list(),
    initialData: [],
  });

  const [teamFormData, setTeamFormData] = useState({
    team_1: { team_key: 'team_1', team_name: 'Turno Equipo Isa', descripcion: '', activo: true, color: '#8B5CF6' },
    team_2: { team_key: 'team_2', team_name: 'Turno Equipo Sara', descripcion: '', activo: true, color: '#EC4899' }
  });

  React.useEffect(() => {
    if (teams.length > 0) {
      const newFormData = { ...teamFormData };
      teams.forEach(team => {
        newFormData[team.team_key] = team;
      });
      setTeamFormData(newFormData);
    }
  }, [teams]);

  const saveTeamMutation = useMutation({
    mutationFn: async (data) => {
      const existing = teams.find(t => t.team_key === data.team_key);
      if (existing) {
        return base44.entities.TeamConfig.update(existing.id, data);
      }
      return base44.entities.TeamConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamConfigs'] });
    },
  });

  const saveScheduleMutation = useMutation({
    mutationFn: async (data) => {
      const dateStr = format(data.fecha_inicio_semana, 'yyyy-MM-dd');
      const existing = schedules.find(
        s => s.team_key === data.team_key && s.fecha_inicio_semana === dateStr
      );
      if (existing) {
        return base44.entities.TeamWeekSchedule.update(existing.id, { ...data, fecha_inicio_semana: dateStr });
      }
      return base44.entities.TeamWeekSchedule.create({ ...data, fecha_inicio_semana: dateStr });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamWeekSchedules'] });
    },
  });

  const togglePlanningMutation = useMutation({
    mutationFn: ({ id, incluirEnPlanning }) => 
      base44.entities.Employee.update(id, { incluir_en_planning: incluirEnPlanning }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleSaveTeams = () => {
    saveTeamMutation.mutate(teamFormData.team_1);
    saveTeamMutation.mutate(teamFormData.team_2);
  };

  const getWeekSchedule = (teamKey, week) => {
    const dateStr = format(week, 'yyyy-MM-dd');
    return schedules.find(s => s.team_key === teamKey && s.fecha_inicio_semana === dateStr);
  };

  const handleScheduleChange = (teamKey, week, turno) => {
    saveScheduleMutation.mutate({
      team_key: teamKey,
      fecha_inicio_semana: week,
      turno: turno
    });
  };

  const handleAutoSchedule = () => {
    const weeks = Array.from({ length: 8 }, (_, i) => addWeeks(selectedWeek, i));
    weeks.forEach((week, index) => {
      const team1Turno = index % 2 === 0 ? "Mañana" : "Tarde";
      const team2Turno = index % 2 === 0 ? "Tarde" : "Mañana";
      
      saveScheduleMutation.mutate({
        team_key: 'team_1',
        fecha_inicio_semana: week,
        turno: team1Turno
      });
      
      saveScheduleMutation.mutate({
        team_key: 'team_2',
        fecha_inicio_semana: week,
        turno: team2Turno
      });
    });
  };

  const getTeamEmployees = (teamName) => {
    let teamEmployees = employees.filter(emp => emp.equipo === teamName);
    
    if (selectedDepartment !== "all") {
      teamEmployees = teamEmployees.filter(emp => emp.departamento === selectedDepartment);
    }
    
    return teamEmployees;
  };

  const getDepartments = () => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) {
        depts.add(emp.departamento);
      }
    });
    return Array.from(depts).sort();
  };

  const groupByDepartmentAndPosition = (teamEmployees) => {
    const grouped = {};
    
    teamEmployees.forEach(emp => {
      const dept = emp.departamento || "Sin Departamento";
      const position = emp.puesto || "Sin Puesto";
      
      if (!grouped[dept]) {
        grouped[dept] = {};
      }
      
      if (!grouped[dept][position]) {
        grouped[dept][position] = [];
      }
      
      grouped[dept][position].push(emp);
    });
    
    return grouped;
  };

  const handleEditEmployee = (employee) => {
    setEditingEmployee(employee);
    setShowEmployeeForm(true);
  };

  const handleCloseEmployeeForm = () => {
    setEditingEmployee(null);
    setShowEmployeeForm(false);
  };

  const handleTogglePlanning = (employee) => {
    const newValue = !(employee.incluir_en_planning ?? true);
    togglePlanningMutation.mutate({
      id: employee.id,
      incluirEnPlanning: newValue
    });
  };

  const weeks = Array.from({ length: 8 }, (_, i) => addWeeks(selectedWeek, i));
  const departments = getDepartments();

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Jefes de Turno
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <UsersRound className="w-8 h-8 text-blue-600" />
              Equipos de Turno
            </h1>
            <p className="text-slate-600 mt-1">
              Configura equipos y programa sus turnos semanales
            </p>
          </div>
        </div>

        <Tabs defaultValue="teams" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teams">Equipos</TabsTrigger>
            <TabsTrigger value="schedules">Horarios Semanales</TabsTrigger>
            <TabsTrigger value="members">Miembros</TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Configuración de Equipos</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Equipo 1 */}
                  <div className="p-6 border-2 border-purple-200 rounded-lg bg-purple-50/50">
                    <h3 className="text-lg font-semibold text-purple-900 mb-4">Equipo 1</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="team1_name">Nombre del Equipo *</Label>
                        <Input
                          id="team1_name"
                          value={teamFormData.team_1.team_name}
                          onChange={(e) => setTeamFormData({
                            ...teamFormData,
                            team_1: { ...teamFormData.team_1, team_name: e.target.value }
                          })}
                          placeholder="ej. Turno Equipo Isa"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team1_color">Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="team1_color"
                            type="color"
                            value={teamFormData.team_1.color || '#8B5CF6'}
                            onChange={(e) => setTeamFormData({
                              ...teamFormData,
                              team_1: { ...teamFormData.team_1, color: e.target.value }
                            })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={teamFormData.team_1.color || '#8B5CF6'}
                            onChange={(e) => setTeamFormData({
                              ...teamFormData,
                              team_1: { ...teamFormData.team_1, color: e.target.value }
                            })}
                            placeholder="#8B5CF6"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="team1_desc">Descripción</Label>
                        <Textarea
                          id="team1_desc"
                          value={teamFormData.team_1.descripcion || ''}
                          onChange={(e) => setTeamFormData({
                            ...teamFormData,
                            team_1: { ...teamFormData.team_1, descripcion: e.target.value }
                          })}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Equipo 2 */}
                  <div className="p-6 border-2 border-pink-200 rounded-lg bg-pink-50/50">
                    <h3 className="text-lg font-semibold text-pink-900 mb-4">Equipo 2</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="team2_name">Nombre del Equipo *</Label>
                        <Input
                          id="team2_name"
                          value={teamFormData.team_2.team_name}
                          onChange={(e) => setTeamFormData({
                            ...teamFormData,
                            team_2: { ...teamFormData.team_2, team_name: e.target.value }
                          })}
                          placeholder="ej. Turno Equipo Sara"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team2_color">Color</Label>
                        <div className="flex gap-2">
                          <Input
                            id="team2_color"
                            type="color"
                            value={teamFormData.team_2.color || '#EC4899'}
                            onChange={(e) => setTeamFormData({
                              ...teamFormData,
                              team_2: { ...teamFormData.team_2, color: e.target.value }
                            })}
                            className="w-20 h-10"
                          />
                          <Input
                            value={teamFormData.team_2.color || '#EC4899'}
                            onChange={(e) => setTeamFormData({
                              ...teamFormData,
                              team_2: { ...teamFormData.team_2, color: e.target.value }
                            })}
                            placeholder="#EC4899"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="team2_desc">Descripción</Label>
                        <Textarea
                          id="team2_desc"
                          value={teamFormData.team_2.descripcion || ''}
                          onChange={(e) => setTeamFormData({
                            ...teamFormData,
                            team_2: { ...teamFormData.team_2, descripcion: e.target.value }
                          })}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveTeams}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={saveTeamMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveTeamMutation.isPending ? 'Guardando...' : 'Guardar Configuración'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedules">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <CardTitle>Horarios Semanales (Rotación)</CardTitle>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={format(selectedWeek, 'yyyy-MM-dd')}
                      onChange={(e) => setSelectedWeek(startOfWeek(new Date(e.target.value), { weekStartsOn: 1 }))}
                      className="w-48"
                    />
                    <Button
                      variant="outline"
                      onClick={handleAutoSchedule}
                      disabled={saveScheduleMutation.isPending}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Auto-Asignar 8 Semanas
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">
                          Semana
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-purple-700">
                          {teamFormData.team_1.team_name}
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-pink-700">
                          {teamFormData.team_2.team_name}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeks.map((week, i) => {
                        const team1Schedule = getWeekSchedule('team_1', week);
                        const team2Schedule = getWeekSchedule('team_2', week);
                        
                        return (
                          <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900">
                                {format(week, "d 'de' MMMM", { locale: es })}
                              </div>
                              <div className="text-xs text-slate-500">
                                Semana {i + 1}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Select
                                value={team1Schedule?.turno || ''}
                                onValueChange={(value) => handleScheduleChange('team_1', week, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Mañana">
                                    <div className="flex items-center gap-2">
                                      <Sunrise className="w-4 h-4 text-amber-600" />
                                      Mañana (7:00-15:00)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Tarde">
                                    <div className="flex items-center gap-2">
                                      <Sunset className="w-4 h-4 text-indigo-600" />
                                      Tarde (14:00/15:00-22:00)
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Select
                                value={team2Schedule?.turno || ''}
                                onValueChange={(value) => handleScheduleChange('team_2', week, value)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Mañana">
                                    <div className="flex items-center gap-2">
                                      <Sunrise className="w-4 h-4 text-amber-600" />
                                      Mañana (7:00-15:00)
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="Tarde">
                                    <div className="flex items-center gap-2">
                                      <Sunset className="w-4 h-4 text-indigo-600" />
                                      Tarde (14:00/15:00-22:00)
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members">
            <div className="mb-6">
              <Card className="bg-white/80 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Filter className="w-5 h-5 text-blue-600" />
                    <Label>Filtrar por Departamento:</Label>
                    <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                      <SelectTrigger className="w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los Departamentos</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Equipo 1 */}
              <Card className="shadow-lg border-2 border-purple-200 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-purple-100 bg-purple-50/50">
                  <CardTitle className="text-purple-900">
                    {teamFormData.team_1.team_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {(() => {
                    const teamEmployees = getTeamEmployees(teamFormData.team_1.team_name);
                    const grouped = groupByDepartmentAndPosition(teamEmployees);
                    const includedCount = teamEmployees.filter(emp => emp.incluir_en_planning !== false).length;
                    
                    if (teamEmployees.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-500">
                          No hay empleados asignados
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-6">
                        {Object.entries(grouped).map(([dept, positions]) => (
                          <div key={dept} className="border-2 border-purple-100 rounded-lg p-4 bg-purple-50/30">
                            <h4 className="font-bold text-purple-900 mb-3 text-lg">{dept}</h4>
                            {Object.entries(positions).map(([position, emps]) => (
                              <div key={position} className="mb-4 last:mb-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="bg-purple-100 text-purple-800">
                                    {position}
                                  </Badge>
                                  <span className="text-xs text-slate-500">({emps.length})</span>
                                </div>
                                <div className="space-y-2 ml-4">
                                  {emps.map(emp => {
                                    const isIncluded = emp.incluir_en_planning !== false;
                                    return (
                                      <div 
                                        key={emp.id} 
                                        className={`flex justify-between items-center p-3 border-2 rounded-lg transition-all ${
                                          isIncluded 
                                            ? 'bg-white border-slate-200 hover:border-purple-300 hover:shadow-md' 
                                            : 'bg-slate-50 border-slate-300 opacity-60'
                                        } cursor-pointer`}
                                        onClick={() => handleEditEmployee(emp)}
                                      >
                                        <div className="flex-1">
                                          <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                            {emp.nombre}
                                            {!isIncluded && (
                                              <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            {isIncluded && (
                                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            )}
                                          </div>
                                          <div className="text-xs text-slate-500">{emp.tipo_jornada} - {emp.tipo_turno}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="flex items-center gap-2 px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTogglePlanning(emp);
                                            }}
                                          >
                                            <Switch
                                              checked={isIncluded}
                                              onCheckedChange={() => handleTogglePlanning(emp)}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="text-xs text-purple-700 font-medium">
                                              {isIncluded ? 'En planning' : 'Excluido'}
                                            </span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditEmployee(emp);
                                            }}
                                            className="h-8 w-8"
                                          >
                                            <Edit className="w-4 h-4 text-purple-600" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                        <div className="pt-4 border-t border-purple-200">
                          <div className="text-sm text-slate-600 space-y-1">
                            <div>
                              Total: <span className="font-semibold text-purple-700">
                                {teamEmployees.length} empleados
                              </span>
                            </div>
                            <div>
                              En planning: <span className="font-semibold text-green-700">
                                {includedCount} empleados
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Equipo 2 */}
              <Card className="shadow-lg border-2 border-pink-200 bg-white/80 backdrop-blur-sm">
                <CardHeader className="border-b border-pink-100 bg-pink-50/50">
                  <CardTitle className="text-pink-900">
                    {teamFormData.team_2.team_name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {(() => {
                    const teamEmployees = getTeamEmployees(teamFormData.team_2.team_name);
                    const grouped = groupByDepartmentAndPosition(teamEmployees);
                    const includedCount = teamEmployees.filter(emp => emp.incluir_en_planning !== false).length;
                    
                    if (teamEmployees.length === 0) {
                      return (
                        <div className="text-center py-8 text-slate-500">
                          No hay empleados asignados
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-6">
                        {Object.entries(grouped).map(([dept, positions]) => (
                          <div key={dept} className="border-2 border-pink-100 rounded-lg p-4 bg-pink-50/30">
                            <h4 className="font-bold text-pink-900 mb-3 text-lg">{dept}</h4>
                            {Object.entries(positions).map(([position, emps]) => (
                              <div key={position} className="mb-4 last:mb-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="bg-pink-100 text-pink-800">
                                    {position}
                                  </Badge>
                                  <span className="text-xs text-slate-500">({emps.length})</span>
                                </div>
                                <div className="space-y-2 ml-4">
                                  {emps.map(emp => {
                                    const isIncluded = emp.incluir_en_planning !== false;
                                    return (
                                      <div 
                                        key={emp.id} 
                                        className={`flex justify-between items-center p-3 border-2 rounded-lg transition-all ${
                                          isIncluded 
                                            ? 'bg-white border-slate-200 hover:border-pink-300 hover:shadow-md' 
                                            : 'bg-slate-50 border-slate-300 opacity-60'
                                        } cursor-pointer`}
                                        onClick={() => handleEditEmployee(emp)}
                                      >
                                        <div className="flex-1">
                                          <div className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                                            {emp.nombre}
                                            {!isIncluded && (
                                              <XCircle className="w-4 h-4 text-red-500" />
                                            )}
                                            {isIncluded && (
                                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                                            )}
                                          </div>
                                          <div className="text-xs text-slate-500">{emp.tipo_jornada} - {emp.tipo_turno}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div 
                                            className="flex items-center gap-2 px-2 py-1 rounded bg-pink-50 hover:bg-pink-100 transition-colors"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleTogglePlanning(emp);
                                            }}
                                          >
                                            <Switch
                                              checked={isIncluded}
                                              onCheckedChange={() => handleTogglePlanning(emp)}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <span className="text-xs text-pink-700 font-medium">
                                              {isIncluded ? 'En planning' : 'Excluido'}
                                            </span>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleEditEmployee(emp);
                                            }}
                                            className="h-8 w-8"
                                          >
                                            <Edit className="w-4 h-4 text-pink-600" />
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                        <div className="pt-4 border-t border-pink-200">
                          <div className="text-sm text-slate-600 space-y-1">
                            <div>
                              Total: <span className="font-semibold text-pink-700">
                                {teamEmployees.length} empleados
                              </span>
                            </div>
                            <div>
                              En planning: <span className="font-semibold text-green-700">
                                {includedCount} empleados
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {showEmployeeForm && (
        <EmployeeForm
          employee={editingEmployee}
          machines={machines}
          onClose={handleCloseEmployeeForm}
        />
      )}
    </div>
  );
}
