import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Search } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeSkillsMatrix() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddSkillDialog, setShowAddSkillDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const queryClient = useQueryClient();

  const [newSkill, setNewSkill] = useState({
    skill_id: "",
    machine_id: "",
    nivel_competencia: "Básico",
    experiencia_meses: 0,
    fecha_adquisicion: new Date().toISOString().split('T')[0],
    certificado: false,
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list('nombre'),
    initialData: [],
  });

  const { data: employeeSkills } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
    initialData: [],
  });

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('nombre'),
    initialData: [],
  });

  const addSkillMutation = useMutation({
    mutationFn: (data) => base44.entities.EmployeeSkill.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
      setShowAddSkillDialog(false);
      setNewSkill({ 
        skill_id: "", 
        machine_id: "",
        nivel_competencia: "Básico", 
        experiencia_meses: 0,
        fecha_adquisicion: new Date().toISOString().split('T')[0], 
        certificado: false 
      });
      toast.success("Habilidad añadida correctamente");
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeSkill.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeSkills'] });
      toast.success("Habilidad eliminada");
    },
  });

  const departments = useMemo(() => [...new Set(employees.map(e => e.departamento).filter(Boolean))], [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = filterDepartment === "all" || emp.departamento === filterDepartment;
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, filterDepartment]);

  const getEmployeeSkills = (employeeId) => {
    return employeeSkills.filter(es => es.employee_id === employeeId);
  };

  const getSkillName = (skillId) => {
    return skills.find(s => s.id === skillId)?.nombre || "Desconocida";
  };

  const getLevelColor = (level) => {
    switch (level) {
      case "Experto": return "bg-purple-600";
      case "Avanzado": return "bg-green-600";
      case "Intermedio": return "bg-blue-600";
      case "Básico": return "bg-slate-600";
      default: return "bg-slate-400";
    }
  };

  const handleAddSkill = () => {
    if (!selectedEmployee || !newSkill.skill_id) {
      toast.error("Selecciona una habilidad");
      return;
    }

    const exists = employeeSkills.find(
      es => es.employee_id === selectedEmployee.id && es.skill_id === newSkill.skill_id
    );

    if (exists) {
      toast.error("El empleado ya tiene esta habilidad");
      return;
    }

    const skillData = {
      employee_id: selectedEmployee.id,
      ...newSkill
    };
    
    if (!skillData.machine_id) {
      delete skillData.machine_id;
    }
    
    addSkillMutation.mutate(skillData);
  };

  const handleOpenAddSkill = (employee) => {
    setSelectedEmployee(employee);
    setShowAddSkillDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Matriz de Habilidades por Empleado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              <Label>Filtrar por Departamento</Label>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEmployees.map((employee) => {
              const empSkills = getEmployeeSkills(employee.id);
              
              return (
                <Card key={employee.id} className="bg-slate-50 border-slate-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-slate-900">{employee.nombre}</div>
                        <div className="text-xs text-slate-600">{employee.departamento} - {employee.puesto}</div>
                      </div>
                      <Badge className="bg-blue-600">{empSkills.length}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {empSkills.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Sin habilidades</p>
                    ) : (
                      <div className="space-y-1">
                        {empSkills.slice(0, 3).map((es) => (
                          <div key={es.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm flex-1">{getSkillName(es.skill_id)}</span>
                            <Badge className={`text-xs ${getLevelColor(es.nivel_competencia)}`}>
                              {es.nivel_competencia}
                            </Badge>
                          </div>
                        ))}
                        {empSkills.length > 3 && (
                          <p className="text-xs text-slate-500 text-center pt-1">
                            +{empSkills.length - 3} más
                          </p>
                        )}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => handleOpenAddSkill(employee)}
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      Gestionar Habilidades
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {showAddSkillDialog && selectedEmployee && (
        <Dialog open={true} onOpenChange={() => setShowAddSkillDialog(false)}>
          <DialogContent 
            className="max-w-3xl max-h-[80vh] overflow-y-auto"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Habilidades de {selectedEmployee.nombre}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Habilidades Actuales</h3>
                {getEmployeeSkills(selectedEmployee.id).length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4 bg-slate-50 rounded">
                    No tiene habilidades registradas
                  </p>
                ) : (
                  <div className="space-y-2">
                    {getEmployeeSkills(selectedEmployee.id).map((es) => {
                      const machine = machines.find(m => m.id === es.machine_id);
                      return (
                     <div key={es.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                       <div className="flex-1">
                         <div className="font-medium">{getSkillName(es.skill_id)}</div>
                         {machine && (
                           <div className="text-xs text-blue-600 font-medium mt-0.5">
                             📍 {machine.nombre}
                           </div>
                         )}
                         <div className="text-xs text-slate-500 mt-1">
                           Adquirida: {es.fecha_adquisicion || 'N/A'}
                           {es.experiencia_meses > 0 && ` • ${es.experiencia_meses} meses exp.`}
                           {es.certificado && " • Certificada"}
                         </div>
                       </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getLevelColor(es.nivel_competencia)}>
                            {es.nivel_competencia}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('¿Eliminar esta habilidad?')) {
                                deleteSkillMutation.mutate(es.id);
                              }
                            }}
                            className="text-red-600 hover:bg-red-50"
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    );
                     })}
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-3">Añadir Nueva Habilidad</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Habilidad</Label>
                    <Select value={newSkill.skill_id} onValueChange={(value) => setNewSkill({ ...newSkill, skill_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {skills.filter(s => s.activo).map(skill => (
                          <SelectItem key={skill.id} value={skill.id}>{skill.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Nivel de Competencia</Label>
                    <Select value={newSkill.nivel_competencia} onValueChange={(value) => setNewSkill({ ...newSkill, nivel_competencia: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Básico">Básico</SelectItem>
                        <SelectItem value="Intermedio">Intermedio</SelectItem>
                        <SelectItem value="Avanzado">Avanzado</SelectItem>
                        <SelectItem value="Experto">Experto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Adquisición</Label>
                    <Input
                      type="date"
                      value={newSkill.fecha_adquisicion}
                      onChange={(e) => setNewSkill({ ...newSkill, fecha_adquisicion: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Máquina (Opcional)</Label>
                    <Select value={newSkill.machine_id} onValueChange={(value) => setNewSkill({ ...newSkill, machine_id: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin máquina específica" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Sin máquina</SelectItem>
                        {machines.map(machine => (
                          <SelectItem key={machine.id} value={machine.id}>
                            {machine.nombre} ({machine.codigo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Experiencia (meses)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newSkill.experiencia_meses}
                      onChange={(e) => setNewSkill({ ...newSkill, experiencia_meses: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddSkill}
                  className="bg-blue-600 hover:bg-blue-700 mt-4 w-full"
                  disabled={addSkillMutation.isPending || !newSkill.skill_id}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {addSkillMutation.isPending ? "Añadiendo..." : "Añadir Habilidad"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}