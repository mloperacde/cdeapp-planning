import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Cog, Save, Filter, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function MachineExperienceConfig() {
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterEquipo, setFilterEquipo] = useState("all");
  const [filterPuesto, setFilterPuesto] = useState("all");
  const [machineConfigs, setMachineConfigs] = useState({});
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('nombre'),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const puestos = useMemo(() => {
    const pts = new Set();
    employees.forEach(emp => {
      if (emp.puesto) pts.add(emp.puesto);
    });
    return Array.from(pts).sort();
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesDepartment = filterDepartment === "all" || emp.departamento === filterDepartment;
      const matchesEquipo = filterEquipo === "all" || emp.equipo === filterEquipo;
      const matchesPuesto = filterPuesto === "all" || emp.puesto === filterPuesto;
      return matchesDepartment && matchesEquipo && matchesPuesto;
    });
  }, [employees, filterDepartment, filterEquipo, filterPuesto]);

  // Inicializar configuraciones de máquinas desde datos de empleados
  React.useEffect(() => {
    const configs = {};
    filteredEmployees.forEach(emp => {
      configs[emp.id] = [];
      for (let i = 1; i <= 10; i++) {
        if (emp[`maquina_${i}`]) {
          configs[emp.id].push(emp[`maquina_${i}`]);
        }
      }
    });
    setMachineConfigs(configs);
  }, [filteredEmployees]);

  const updateMachineMutation = useMutation({
    mutationFn: async ({ employeeId, machinesList }) => {
      const updateData = {};
      for (let i = 1; i <= 10; i++) {
        updateData[`maquina_${i}`] = machinesList[i - 1] || null;
      }
      return base44.entities.Employee.update(employeeId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success("Configuración guardada");
    }
  });

  const handleMachineChange = (employeeId, index, machineId) => {
    setMachineConfigs(prev => {
      const current = [...(prev[employeeId] || [])];
      current[index] = machineId;
      return { ...prev, [employeeId]: current };
    });
  };

  const handleSave = (employeeId) => {
    const machinesList = machineConfigs[employeeId] || [];
    updateMachineMutation.mutate({ employeeId, machinesList });
  };

  const handleSaveAll = () => {
    filteredEmployees.forEach(emp => {
      const machinesList = machineConfigs[emp.id] || [];
      updateMachineMutation.mutate({ employeeId: emp.id, machinesList });
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="w-4 h-4 text-blue-600" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              <Label>Equipo</Label>
              <Select value={filterEquipo} onValueChange={setFilterEquipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.team_name}>{team.team_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Puesto</Label>
              <Select value={filterPuesto} onValueChange={setFilterPuesto}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {puestos.map(puesto => (
                    <SelectItem key={puesto} value={puesto}>{puesto}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={handleSaveAll} className="w-full bg-green-600 hover:bg-green-700">
                <Save className="w-4 h-4 mr-2" />
                Guardar Todos
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-slate-600">
          Mostrando {filteredEmployees.length} empleados
        </p>
      </div>

      {filteredEmployees.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay empleados con estos filtros</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEmployees.map(employee => {
            const employeeMachines = machineConfigs[employee.id] || [];
            
            return (
              <Card key={employee.id} className="border-l-4 border-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">{employee.nombre}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{employee.puesto || "Sin puesto"}</Badge>
                        <Badge variant="outline" className="text-xs">{employee.departamento || "Sin dpto."}</Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSave(employee.id)}
                      disabled={updateMachineMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="w-3 h-3 mr-1" />
                      Guardar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[...Array(10)].map((_, index) => (
                    <div key={index} className="space-y-1">
                      <Label className="text-xs text-slate-600">
                        Máquina {index + 1} (Prioridad {index + 1})
                      </Label>
                      <Select
                        value={employeeMachines[index] || ""}
                        onValueChange={(value) => handleMachineChange(employee.id, index, value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Sin asignar" />
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
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}