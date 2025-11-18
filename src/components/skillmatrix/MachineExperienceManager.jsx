import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Search, Save } from "lucide-react";
import { toast } from "sonner";

export default function MachineExperienceManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterPosition, setFilterPosition] = useState("all");
  const [filterTeam, setFilterTeam] = useState("all");
  const [machineConfigs, setMachineConfigs] = useState({});
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('orden'),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ employeeId, machineOrder }) => {
      // Crear el objeto con maquina_1 a maquina_10
      const machineData = {};
      machineOrder.forEach((machineId, index) => {
        if (machineId) {
          machineData[`maquina_${index + 1}`] = machineId;
        }
      });

      return base44.entities.Employee.update(employeeId, machineData);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      // Limpiar configuración guardada
      setMachineConfigs(prev => {
        const updated = { ...prev };
        delete updated[variables.employeeId];
        return updated;
      });
      toast.success("Experiencia en máquinas guardada");
    },
  });

  // Inicializar configuración de máquinas desde datos del empleado
  React.useEffect(() => {
    const configs = {};
    employees.forEach(emp => {
      const machineOrder = [];
      for (let i = 1; i <= 10; i++) {
        machineOrder.push(emp[`maquina_${i}`] || "");
      }
      configs[emp.id] = machineOrder;
    });
    setMachineConfigs(configs);
  }, [employees]);

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

          {/* Vista en Tarjetas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredEmployees.map(employee => {
              const currentConfig = machineConfigs[employee.id] || Array(10).fill("");
              
              return (
                <Card key={employee.id} className="bg-slate-50 border-slate-200">
                  <CardHeader className="pb-3 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-slate-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-slate-900 text-lg">{employee.nombre}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          {employee.puesto} • {employee.departamento}
                        </div>
                      </div>
                      {hasChanges(employee.id) && (
                        <Button
                          size="sm"
                          onClick={() => handleSave(employee.id)}
                          disabled={saveMutation.isPending}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Save className="w-3 h-3 mr-2" />
                          Guardar
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 gap-3">
                      {[...Array(10)].map((_, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
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
                                    {machine.nombre} ({machine.codigo})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
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