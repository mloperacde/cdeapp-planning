import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function TrainingNeedsView() {
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: () => base44.entities.Skill.list(),
    initialData: [],
  });

  const { data: employeeSkills } = useQuery({
    queryKey: ['employeeSkills'],
    queryFn: () => base44.entities.EmployeeSkill.list(),
    initialData: [],
  });

  const { data: processes } = useQuery({
    queryKey: ['processes'],
    queryFn: () => base44.entities.Process.list(),
    initialData: [],
  });

  const { data: processSkillRequirements } = useQuery({
    queryKey: ['processSkillRequirements'],
    queryFn: () => base44.entities.ProcessSkillRequirement.list(),
    initialData: [],
  });

  const { data: trainingNeeds } = useQuery({
    queryKey: ['trainingNeeds'],
    queryFn: () => base44.entities.TrainingNeed.list('-fecha_identificacion'),
    initialData: [],
  });

  const { data: trainingModules } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list(),
    initialData: [],
  });

  const updateNeedMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TrainingNeed.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingNeeds'] });
      toast.success("Estado actualizado");
    },
  });

  const generateNeedsMutation = useMutation({
    mutationFn: async () => {
      const newNeeds = [];

      employees.forEach(emp => {
        if (emp.disponibilidad !== "Disponible") return;
        
        const empSkills = employeeSkills.filter(es => es.employee_id === emp.id);
        
        processSkillRequirements.forEach(req => {
          const hasSkill = empSkills.find(es => es.skill_id === req.skill_id);
          
          if (!hasSkill || getLevelValue(hasSkill.nivel_competencia) < getLevelValue(req.nivel_minimo_requerido)) {
            const existingNeed = trainingNeeds.find(
              tn => tn.employee_id === emp.id && 
                    tn.skill_id === req.skill_id && 
                    tn.estado !== "Completada"
            );

            if (!existingNeed) {
              const process = processes.find(p => p.id === req.process_id);
              
              newNeeds.push({
                employee_id: emp.id,
                skill_id: req.skill_id,
                nivel_actual: hasSkill?.nivel_competencia || "Ninguno",
                nivel_objetivo: req.nivel_minimo_requerido,
                prioridad: req.obligatorio ? "Alta" : "Media",
                razon: `Requerido para proceso: ${process?.nombre || 'Desconocido'}`,
                proceso_relacionado_id: req.process_id,
                fecha_identificacion: new Date().toISOString(),
                estado: "Pendiente"
              });
            }
          }
        });
      });

      if (newNeeds.length > 0) {
        await base44.entities.TrainingNeed.bulkCreate(newNeeds);
      }

      return newNeeds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['trainingNeeds'] });
      toast.success(`Se identificaron ${count} nuevas necesidades de formación`);
      setIsGenerating(false);
    },
  });

  const handleGenerateNeeds = () => {
    setIsGenerating(true);
    generateNeedsMutation.mutate();
  };

  const getLevelValue = (level) => {
    switch (level) {
      case "Experto": return 4;
      case "Avanzado": return 3;
      case "Intermedio": return 2;
      case "Básico": return 1;
      default: return 0;
    }
  };

  const getEmployeeName = (id) => employees.find(e => e.id === id)?.nombre || "Desconocido";
  const getSkillName = (id) => skills.find(s => s.id === id)?.nombre || "Desconocida";
  const getProcessName = (id) => processes.find(p => p.id === id)?.nombre || "Desconocido";

  const pendingNeeds = trainingNeeds.filter(tn => tn.estado === "Pendiente");
  const inProgressNeeds = trainingNeeds.filter(tn => tn.estado === "En Progreso");
  const completedNeeds = trainingNeeds.filter(tn => tn.estado === "Completada");

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="border-b border-purple-100">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <Sparkles className="w-5 h-5" />
              Generación Automática de Necesidades
            </CardTitle>
            <Button
              onClick={handleGenerateNeeds}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isGenerating ? "Analizando..." : "Identificar Necesidades"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-purple-800">
            El sistema analizará automáticamente las brechas entre las habilidades actuales de los empleados 
            y los requisitos de los procesos, generando un plan de formación personalizado.
          </p>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-700 font-medium">Formación Pendiente</p>
                <p className="text-2xl font-bold text-orange-900">{pendingNeeds.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-700 font-medium">En Progreso</p>
                <p className="text-2xl font-bold text-blue-900">{inProgressNeeds.length}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">Completadas</p>
                <p className="text-2xl font-bold text-green-900">{completedNeeds.length}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Necesidades */}
      <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle>Necesidades de Formación Identificadas</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {trainingNeeds.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <p>No se han identificado necesidades de formación</p>
              <p className="text-sm mt-2">Haz clic en "Identificar Necesidades" para generar el análisis</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trainingNeeds.map((need) => (
                <Card key={need.id} className={`border-2 ${
                  need.prioridad === "Urgente" ? "border-red-300 bg-red-50" :
                  need.prioridad === "Alta" ? "border-orange-300 bg-orange-50" :
                  need.estado === "Completada" ? "border-green-300 bg-green-50" :
                  "border-slate-200"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{getEmployeeName(need.employee_id)}</span>
                          <Badge className={
                            need.prioridad === "Urgente" ? "bg-red-600" :
                            need.prioridad === "Alta" ? "bg-orange-600" :
                            need.prioridad === "Media" ? "bg-blue-600" :
                            "bg-slate-600"
                          }>
                            {need.prioridad}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600">{getSkillName(need.skill_id)}</div>
                        <div className="text-xs text-slate-500 mt-1">{need.razon}</div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {need.nivel_actual} → {need.nivel_objetivo}
                        </Badge>
                        <div className="text-xs text-slate-500">
                          {need.fecha_objetivo && `Objetivo: ${need.fecha_objetivo}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <Badge className={
                        need.estado === "Completada" ? "bg-green-100 text-green-800" :
                        need.estado === "En Progreso" ? "bg-blue-100 text-blue-800" :
                        need.estado === "Cancelada" ? "bg-slate-100 text-slate-600" :
                        "bg-orange-100 text-orange-800"
                      }>
                        {need.estado}
                      </Badge>

                      {need.estado === "Pendiente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateNeedMutation.mutate({
                            id: need.id,
                            data: { estado: "En Progreso" }
                          })}
                        >
                          Iniciar Formación
                        </Button>
                      )}

                      {need.estado === "En Progreso" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => updateNeedMutation.mutate({
                            id: need.id,
                            data: { estado: "Completada" }
                          })}
                        >
                          Marcar Completada
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}