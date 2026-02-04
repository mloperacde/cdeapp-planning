import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { getMachineAlias } from "@/utils/machineAlias";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Search, Save } from "lucide-react";
import { toast } from "sonner";

export default function MachineExperienceManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterPosition, setFilterPosition] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [machineConfigs, setMachineConfigs] = useState({});
  const [expandedEmployee, setExpandedEmployee] = useState(null); // Solo mostrar uno a la vez
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      const list = Array.isArray(data) ? data : [];
      return list.map(m => {
        const alias = getMachineAlias(m);
        const sala = (m.ubicacion || '').trim();
        
        return {
          id: m.id,
          nombre: m.nombre || '',
          alias: alias,
          descripcion: m.descripcion || '',
          codigo: (m.codigo_maquina || m.codigo || '').trim(),
          orden: m.orden_visualizacion || 999,
          tipo: m.tipo || '',
          ubicacion: sala
        };
      }).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
    },
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: employeeSkills = [] } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeMachineSkill.list(undefined, 2000),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ employeeId, machineOrder }) => {
      // 1. Update EmployeeMachineSkill (The new source of truth)
      const currentSkills = employeeSkills.filter(s => s.employee_id === employeeId);
      
      for (let i = 0; i < 10; i++) {
        const machineId = machineOrder[i];
        const orden = i + 1;
        const existingSkill = currentSkills.find(s => s.orden_preferencia === orden);

        if (machineId) {
          if (!existingSkill) {
            // Create new skill
            await base44.entities.EmployeeMachineSkill.create({
              employee_id: employeeId,
              machine_id: machineId,
              orden_preferencia: orden,
              nivel_competencia: 'Intermedio' // Default
            });
          } else if (existingSkill.machine_id !== machineId) {
            // Update existing skill
            await base44.entities.EmployeeMachineSkill.update(existingSkill.id, {
              machine_id: machineId
            });
          }
        } else if (existingSkill) {
          // Remove skill if slot is cleared
          await base44.entities.EmployeeMachineSkill.delete(existingSkill.id);
        }
      }

      // 2. Update Legacy Fields (for backwards compatibility)
      // TODO: Remove this once all components read from EmployeeMachineSkill
      const machineData = {};
      machineOrder.forEach((machineId, index) => {
        machineData[`maquina_${index + 1}`] = machineId || null;
      });

      return base44.entities.EmployeeMasterDatabase.update(employeeId, machineData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
      // Limpiar configuración guardada
      setMachineConfigs(prev => {
        const updated = { ...prev };
        delete updated[variables.employeeId];
        return updated;
      });
      toast.success("Experiencia en máquinas guardada");
    },
  });

  // Inicializar configuración de máquinas desde EmployeeMachineSkill (Prioridad)
  // Fallback a legacy fields si no hay skills (durante transición)
  React.useEffect(() => {
    const configs = {};
    employees.forEach(emp => {
      const empSkills = employeeSkills.filter(s => s.employee_id === emp.id);
      
      const machineOrder = Array(10).fill("");
      
      if (empSkills.length > 0) {
        // Load from Skills
        empSkills.forEach(skill => {
          if (skill.orden_preferencia >= 1 && skill.orden_preferencia <= 10) {
            machineOrder[skill.orden_preferencia - 1] = skill.machine_id;
          }
        });
      } else {
        // Fallback to Legacy
        for (let i = 1; i <= 10; i++) {
          machineOrder[i - 1] = emp[`maquina_${i}`] || "";
        }
      }
      
      configs[emp.id] = machineOrder;
    });
    setMachineConfigs(configs);
  }, [employees, employeeSkills]);

  const fabricacionMantenimientoEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.departamento === "FABRICACION" || emp.departamento === "MANTENIMIENTO"
    );
  }, [employees]);

  const departments = useMemo(() => 
    [...new Set(fabricacionMantenimientoEmployees.map(e => e.departamento).filter(Boolean))],
    [fabricacionMantenimientoEmployees]
  );

  const positions = useMemo(() => 
    [...new Set(fabricacionMantenimientoEmployees.map(e => e.puesto).filter(Boolean))],
    [fabricacionMantenimientoEmployees]
  );

  const filteredEmployees = useMemo(() => {
    return fabricacionMantenimientoEmployees.filter(emp => {
      const matchesSearch = emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = filterDepartment === "all" || emp.departamento === filterDepartment;
      const matchesPosition = filterPosition === "all" || emp.puesto === filterPosition;
      const matchesTeam = filterTeam === "all" || emp.equipo === filterTeam;
      return matchesSearch && matchesDepartment && matchesPosition && matchesTeam;
    });
  }, [fabricacionMantenimientoEmployees, searchTerm, filterDepartment, filterPosition, filterTeam]);

  const updateMachineConfig = (employeeId, position, machineId) => {
    setMachineConfigs(prev => {
      const current = prev[employeeId] || Array(10).fill("");
      const updated = [...current];
      updated[position] = machineId;
      return { ...prev, [employeeId]: updated };
    });
  };

  const handleSave = (employeeId) => {
    const machineOrder = machineConfigs[employeeId] || [];
    saveMutation.mutate({ employeeId, machineOrder });
  };

  const hasChanges = (employeeId) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return false;
    
    const current = machineConfigs[employeeId] || [];
    for (let i = 0; i < 10; i++) {
      if (current[i] !== (emp[`maquina_${i + 1}`] || "")) {
        return true;
      }
    }
    return false;
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Gestión de Experiencia en Máquinas
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Configuración de experiencia y orden de prioridad en máquinas para empleados de Fabricación y Mantenimiento
          </p>
        </CardHeader>
        <CardContent className="p-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <Label>Buscar Empleado</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Puesto</Label>
              <Select value={filterPosition} onValueChange={setFilterPosition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {positions.map(pos => (
                    <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Equipo</Label>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.team_name}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista simplificada con expansión */}
          <div className="space-y-3">
            {filteredEmployees.map(employee => {
              const currentConfig = machineConfigs[employee.id] || Array(10).fill("");
              const isExpanded = expandedEmployee === employee.id;
              const assignedCount = currentConfig.filter(m => m).length;
              
              return (
                <Card key={employee.id} className={`${employee.disponibilidad === "Ausente" ? "bg-red-50 border-red-200" : "bg-slate-50 border-slate-200"}`}>
                  <CardHeader className={`pb-3 cursor-pointer transition-colors ${employee.disponibilidad === "Ausente" ? "hover:bg-red-100" : "hover:bg-slate-100"}`}>
                    <div 
                      className="flex justify-between items-center"
                      onClick={() => setExpandedEmployee(isExpanded ? null : employee.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                             <span className={employee.disponibilidad === "Ausente" ? "text-red-700" : ""}>{employee.nombre}</span>
                             {employee.disponibilidad === "Ausente" && <Badge variant="destructive" className="text-[10px] h-5 bg-red-600">Ausente</Badge>}
                          </div>
                          <div className="text-sm text-slate-600">
                            {employee.puesto} • {employee.departamento}
                          </div>
                        </div>
                        <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {assignedCount}/10 máquinas
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {hasChanges(employee.id) && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSave(employee.id);
                            }}
                            disabled={saveMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <Save className="w-3 h-3 mr-2" />
                            Guardar
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          {isExpanded ? "Cerrar" : "Editar"}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {isExpanded && (
                    <CardContent className="p-4 border-t">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[...Array(10)].map((_, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <Select
                                value={currentConfig[index]}
                                onValueChange={(value) => updateMachineConfig(employee.id, index, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar máquina..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={null}>Sin asignar</SelectItem>
                                  {machines.map(machine => (
                                    <SelectItem key={machine.id} value={machine.id}>
                                        {getMachineAlias(machine)}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {filteredEmployees.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-500">No se encontraron empleados con los filtros aplicados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
