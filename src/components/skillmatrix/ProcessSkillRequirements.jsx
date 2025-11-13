import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Target, Settings } from "lucide-react";
import { toast } from "sonner";

export default function ProcessSkillRequirements() {
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [skillConfig, setSkillConfig] = useState({});
  const queryClient = useQueryClient();

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list('nombre'),
    initialData: [],
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list('nombre'),
    initialData: [],
  });

  const { data: processSkillRequirements } = useQuery({
    queryKey: ['processSkillRequirements'],
    queryFn: () => base44.entities.ProcessSkillRequirement.list(),
    initialData: [],
  });

  const saveRequirementsMutation = useMutation({
    mutationFn: async (data) => {
      const { processId, requirements } = data;
      
      // Eliminar requisitos anteriores
      const existing = processSkillRequirements.filter(psr => psr.process_id === processId);
      await Promise.all(existing.map(psr => base44.entities.ProcessSkillRequirement.delete(psr.id)));
      
      // Crear nuevos
      const newReqs = Object.entries(requirements)
        .filter(([_, req]) => req.required)
        .map(([skillId, req]) => ({
          process_id: processId,
          skill_id: skillId,
          nivel_minimo_requerido: req.nivel || "Básico",
          obligatorio: req.obligatorio ?? true,
          prioridad: req.prioridad || 1
        }));

      if (newReqs.length > 0) {
        await base44.entities.ProcessSkillRequirement.bulkCreate(newReqs);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processSkillRequirements'] });
      setShowConfigDialog(false);
      setSkillConfig({});
      toast.success("Requisitos guardados correctamente");
    },
  });

  const handleOpenConfig = (process) => {
    setSelectedProcess(process);
    
    // Cargar requisitos existentes
    const existing = processSkillRequirements.filter(psr => psr.process_id === process.id);
    const config = {};
    
    skills.forEach(skill => {
      const requirement = existing.find(req => req.skill_id === skill.id);
      config[skill.id] = {
        required: !!requirement,
        nivel: requirement?.nivel_minimo_requerido || "Básico",
        obligatorio: requirement?.obligatorio ?? true,
        prioridad: requirement?.prioridad || 1
      };
    });
    
    setSkillConfig(config);
    setShowConfigDialog(true);
  };

  const handleToggleSkill = (skillId) => {
    setSkillConfig({
      ...skillConfig,
      [skillId]: {
        ...skillConfig[skillId],
        required: !skillConfig[skillId]?.required
      }
    });
  };

  const handleSave = () => {
    saveRequirementsMutation.mutate({
      processId: selectedProcess.id,
      requirements: skillConfig
    });
  };

  const getProcessRequirements = (processId) => {
    return processSkillRequirements.filter(psr => psr.process_id === processId);
  };

  const getSkillName = (skillId) => {
    return skills.find(s => s.id === skillId)?.nombre || "Desconocida";
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Habilidades Requeridas por Proceso
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processes.map((process) => {
              const requirements = getProcessRequirements(process.id);
              
              return (
                <Card key={process.id} className="bg-slate-50">
                  <CardHeader className="pb-3">
                    <div>
                      <div className="font-semibold">{process.nombre}</div>
                      <Badge variant="outline" className="text-xs mt-1">{process.codigo}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {requirements.length === 0 ? (
                      <p className="text-sm text-slate-400 text-center py-4">Sin requisitos</p>
                    ) : (
                      <div className="space-y-1">
                        {requirements.slice(0, 3).map((req) => (
                          <div key={req.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <span className="text-sm flex-1">{getSkillName(req.skill_id)}</span>
                            <Badge className="text-xs bg-blue-600">{req.nivel_minimo_requerido}</Badge>
                          </div>
                        ))}
                        {requirements.length > 3 && (
                          <p className="text-xs text-slate-500 text-center pt-1">
                            +{requirements.length - 3} más
                          </p>
                        )}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => handleOpenConfig(process)}
                    >
                      <Settings className="w-3 h-3 mr-2" />
                      Configurar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de configuración */}
      {showConfigDialog && selectedProcess && (
        <Dialog open={true} onOpenChange={() => setShowConfigDialog(false)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Habilidades - {selectedProcess.nombre}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {skills.filter(s => s.activo).map((skill) => (
                <Card key={skill.id} className={`border-2 ${
                  skillConfig[skill.id]?.required ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          id={`skill-${skill.id}`}
                          checked={skillConfig[skill.id]?.required || false}
                          onCheckedChange={() => handleToggleSkill(skill.id)}
                        />
                        <label htmlFor={`skill-${skill.id}`} className="flex-1 cursor-pointer">
                          <div>
                            <div className="font-medium">{skill.nombre}</div>
                            <div className="text-xs text-slate-500">{skill.categoria}</div>
                          </div>
                        </label>
                      </div>

                      {skillConfig[skill.id]?.required && (
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nivel Mínimo</Label>
                            <Select
                              value={skillConfig[skill.id]?.nivel || "Básico"}
                              onValueChange={(value) => setSkillConfig({
                                ...skillConfig,
                                [skill.id]: { ...skillConfig[skill.id], nivel: value }
                              })}
                            >
                              <SelectTrigger className="w-32">
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

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`obligatorio-${skill.id}`}
                              checked={skillConfig[skill.id]?.obligatorio ?? true}
                              onCheckedChange={(checked) => setSkillConfig({
                                ...skillConfig,
                                [skill.id]: { ...skillConfig[skill.id], obligatorio: checked }
                              })}
                            />
                            <label htmlFor={`obligatorio-${skill.id}`} className="text-xs">
                              Obligatorio
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={saveRequirementsMutation.isPending}
                >
                  {saveRequirementsMutation.isPending ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}