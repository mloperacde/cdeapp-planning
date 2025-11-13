import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  PlayCircle,
  CheckCircle2,
  Clock,
  FileText,
  Video,
  Link as LinkIcon,
  Award,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

export default function TrainingAssignment({ 
  employeeId, 
  onboardingId,
  onComplete 
}) {
  const [selectedModule, setSelectedModule] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const queryClient = useQueryClient();

  const { data: trainingModules } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list('orden'),
    initialData: [],
  });

  const { data: employeeTrainings } = useQuery({
    queryKey: ['employeeTrainings', employeeId],
    queryFn: () => base44.entities.EmployeeTraining.filter({ employee_id: employeeId }),
    initialData: [],
    enabled: !!employeeId,
  });

  const { data: employee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      const employees = await base44.entities.Employee.list();
      return employees.find(e => e.id === employeeId);
    },
    enabled: !!employeeId,
  });

  const assignMutation = useMutation({
    mutationFn: (moduleId) => base44.entities.EmployeeTraining.create({
      employee_id: employeeId,
      training_module_id: moduleId,
      onboarding_id: onboardingId,
      estado: "Pendiente",
      fecha_asignacion: new Date().toISOString(),
      progreso: 0,
      intentos_cuestionario: 0,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeTrainings', employeeId] });
      toast.success("Módulo asignado correctamente");
    },
  });

  const updateTrainingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.EmployeeTraining.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeTrainings', employeeId] });
    },
  });

  const getModuleStatus = (moduleId) => {
    return employeeTrainings.find(t => t.training_module_id === moduleId);
  };

  const handleStartModule = async (module) => {
    let training = getModuleStatus(module.id);
    
    if (!training) {
      await assignMutation.mutateAsync(module.id);
      training = getModuleStatus(module.id);
    }

    if (training && training.estado === "Pendiente") {
      await updateTrainingMutation.mutateAsync({
        id: training.id,
        data: {
          estado: "En Curso",
          fecha_inicio: new Date().toISOString(),
          progreso: 10,
        }
      });
    }

    setSelectedModule(module);
  };

  const handleCompleteModule = async (module) => {
    const training = getModuleStatus(module.id);
    if (!training) return;

    if (module.tiene_cuestionario) {
      setShowQuiz(true);
    } else {
      await updateTrainingMutation.mutateAsync({
        id: training.id,
        data: {
          estado: "Completado",
          fecha_completado: new Date().toISOString(),
          progreso: 100,
        }
      });
      toast.success("Módulo completado");
      setSelectedModule(null);
    }
  };

  const handleSubmitQuiz = async () => {
    const module = selectedModule;
    const training = getModuleStatus(module.id);
    if (!training) return;

    // Calcular nota
    const preguntas = module.cuestionario.preguntas;
    let correctas = 0;
    
    const respuestasDetalladas = quizAnswers.map((respuesta, index) => {
      const esCorrecta = respuesta === preguntas[index].respuesta_correcta;
      if (esCorrecta) correctas++;
      return {
        pregunta_index: index,
        respuesta_seleccionada: respuesta,
        correcta: esCorrecta
      };
    });

    const nota = Math.round((correctas / preguntas.length) * 100);
    const aprobado = nota >= module.cuestionario.nota_minima;

    await updateTrainingMutation.mutateAsync({
      id: training.id,
      data: {
        estado: aprobado ? "Aprobado" : "No Aprobado",
        fecha_completado: aprobado ? new Date().toISOString() : null,
        progreso: aprobado ? 100 : 90,
        intentos_cuestionario: (training.intentos_cuestionario || 0) + 1,
        respuestas_cuestionario: respuestasDetalladas,
        nota_cuestionario: nota,
      }
    });

    if (aprobado) {
      toast.success(`¡Aprobado! Nota: ${nota}%`);
      setSelectedModule(null);
      setShowQuiz(false);
      setQuizAnswers([]);
    } else {
      toast.error(`No aprobado. Nota: ${nota}%. Nota mínima: ${module.cuestionario.nota_minima}%`);
    }
  };

  const getIcon = (type) => {
    const icons = {
      Video: Video,
      Documento: FileText,
      "Enlace Externo": LinkIcon,
    };
    return icons[type] || FileText;
  };

  const obligatorios = trainingModules.filter(m => m.obligatorio && m.activo);
  const opcionales = trainingModules.filter(m => !m.obligatorio && m.activo);

  const completedCount = obligatorios.filter(m => {
    const status = getModuleStatus(m.id);
    return status && (status.estado === "Completado" || status.estado === "Aprobado");
  }).length;

  const progressPercentage = obligatorios.length > 0 
    ? Math.round((completedCount / obligatorios.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Progreso de Formación</h3>
              <p className="text-sm text-blue-700">
                {completedCount} de {obligatorios.length} módulos obligatorios completados
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-900">{progressPercentage}%</div>
              <div className="text-xs text-blue-700">Completado</div>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Módulos Obligatorios */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-red-600" />
          Módulos Obligatorios
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {obligatorios.map((module) => {
            const status = getModuleStatus(module.id);
            const Icon = getIcon(module.tipo);
            const isCompleted = status && (status.estado === "Completado" || status.estado === "Aprobado");
            const isInProgress = status && status.estado === "En Curso";
            
            return (
              <Card key={module.id} className={`hover:shadow-lg transition-shadow ${
                isCompleted ? 'border-2 border-green-400 bg-green-50' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-green-200' : 'bg-blue-100'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-green-700" />
                        ) : (
                          <Icon className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{module.titulo}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{module.tipo}</Badge>
                          <span className="text-xs text-slate-500">⏱️ {module.duracion_minutos} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-3">{module.descripcion}</p>
                  
                  {isCompleted ? (
                    <Badge className="bg-green-600 w-full justify-center py-2">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Completado
                      {status.nota_cuestionario && ` - ${status.nota_cuestionario}%`}
                    </Badge>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleStartModule(module)}
                      variant={isInProgress ? "default" : "outline"}
                    >
                      {isInProgress ? (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Continuar
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Comenzar
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Módulos Opcionales */}
      {opcionales.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Formación Adicional (Opcional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opcionales.map((module) => {
              const status = getModuleStatus(module.id);
              const Icon = getIcon(module.tipo);
              const isCompleted = status && (status.estado === "Completado" || status.estado === "Aprobado");
              
              return (
                <Card key={module.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{module.titulo}</h4>
                        <Badge variant="outline" className="text-xs mt-1">{module.tipo}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-3">{module.descripcion}</p>
                    {!isCompleted && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => handleStartModule(module)}
                      >
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Comenzar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal de Módulo */}
      {selectedModule && !showQuiz && (
        <Dialog open={true} onOpenChange={() => setSelectedModule(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedModule.titulo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-slate-100 rounded-lg p-6 min-h-[300px] flex items-center justify-center">
                {selectedModule.contenido_url ? (
                  <div className="text-center">
                    <p className="text-sm text-slate-600 mb-4">Contenido del módulo:</p>
                    <a
                      href={selectedModule.contenido_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Abrir contenido →
                    </a>
                  </div>
                ) : (
                  <div className="text-center text-slate-500">
                    <PlayCircle className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <p>Contenido del módulo aquí</p>
                    <p className="text-sm mt-2">Duración: {selectedModule.duracion_minutos} minutos</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setSelectedModule(null)}>
                  Cerrar
                </Button>
                <Button onClick={() => handleCompleteModule(selectedModule)}>
                  {selectedModule.tiene_cuestionario ? "Realizar Cuestionario" : "Marcar como Completado"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Cuestionario */}
      {showQuiz && selectedModule && (
        <Dialog open={true} onOpenChange={() => { setShowQuiz(false); setQuizAnswers([]); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cuestionario: {selectedModule.titulo}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {selectedModule.cuestionario.preguntas.map((pregunta, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <p className="font-semibold text-slate-900 mb-3">
                      {index + 1}. {pregunta.pregunta}
                    </p>
                    <div className="space-y-2">
                      {pregunta.opciones.map((opcion, opIndex) => (
                        <label
                          key={opIndex}
                          className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50"
                        >
                          <input
                            type="radio"
                            name={`question-${index}`}
                            checked={quizAnswers[index] === opIndex}
                            onChange={() => {
                              const newAnswers = [...quizAnswers];
                              newAnswers[index] = opIndex;
                              setQuizAnswers(newAnswers);
                            }}
                          />
                          <span className="text-sm">{opcion}</span>
                        </label>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Nota mínima para aprobar:</strong> {selectedModule.cuestionario.nota_minima}%
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => { setShowQuiz(false); setQuizAnswers([]); }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitQuiz}
                  disabled={quizAnswers.length !== selectedModule.cuestionario.preguntas.length}
                >
                  Enviar Respuestas
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}