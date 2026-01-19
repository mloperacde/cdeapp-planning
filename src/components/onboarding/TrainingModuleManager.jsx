import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Video,
  FileText,
  ClipboardCheck,
  Link as LinkIcon,
  Presentation,
  Star
} from "lucide-react";
import { toast } from "sonner";

export default function TrainingModuleManager({ onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    tipo: "Video",
    categoria: "Otro",
    contenido_url: "",
    duracion_minutos: 30,
    obligatorio: false,
    tiene_cuestionario: false,
    cuestionario: {
      preguntas: [],
      nota_minima: 70
    },
    orden: 0,
    activo: true,
    departamentos_aplicables: []
  });

  const queryClient = useQueryClient();

  const { data: modules } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list('orden'),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingModule) {
        return base44.entities.TrainingModule.update(editingModule.id, data);
      }
      return base44.entities.TrainingModule.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      toast.success("Módulo guardado correctamente");
      handleCloseForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrainingModule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingModules'] });
      toast.success("Módulo eliminado");
    },
  });

  const handleEdit = (module) => {
    setEditingModule(module);
    setFormData({
      ...module,
      cuestionario: module.cuestionario || { preguntas: [], nota_minima: 70 },
      departamentos_aplicables: module.departamentos_aplicables || []
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este módulo de formación?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingModule(null);
    setFormData({
      titulo: "",
      descripcion: "",
      tipo: "Video",
      categoria: "Otro",
      contenido_url: "",
      duracion_minutos: 30,
      obligatorio: false,
      tiene_cuestionario: false,
      cuestionario: {
        preguntas: [],
        nota_minima: 70
      },
      orden: 0,
      activo: true,
      departamentos_aplicables: []
    });
  };

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      cuestionario: {
        ...formData.cuestionario,
        preguntas: [
          ...(formData.cuestionario.preguntas || []),
          {
            pregunta: "",
            opciones: ["", "", "", ""],
            respuesta_correcta: 0
          }
        ]
      }
    });
  };

  const handleQuestionChange = (index, field, value) => {
    const newPreguntas = [...formData.cuestionario.preguntas];
    newPreguntas[index] = {
      ...newPreguntas[index],
      [field]: value
    };
    setFormData({
      ...formData,
      cuestionario: {
        ...formData.cuestionario,
        preguntas: newPreguntas
      }
    });
  };

  const handleRemoveQuestion = (index) => {
    const newPreguntas = formData.cuestionario.preguntas.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      cuestionario: {
        ...formData.cuestionario,
        preguntas: newPreguntas
      }
    });
  };

  const getIcon = (type) => {
    const icons = {
      Video: Video,
      Documento: FileText,
      Cuestionario: ClipboardCheck,
      "Enlace Externo": LinkIcon,
      Presentación: Presentation
    };
    return icons[type] || FileText;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              Gestión de Módulos de Formación
            </DialogTitle>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Módulo
            </Button>
          </div>
        </DialogHeader>

        {!showForm ? (
          <div className="space-y-4">
            {modules.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No hay módulos de formación creados
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((module) => {
                  const Icon = getIcon(module.tipo);
                  return (
                    <Card key={module.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                              <Icon className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{module.titulo}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">{module.tipo}</Badge>
                                <Badge className="bg-purple-100 text-purple-800">
                                  {module.categoria}
                                </Badge>
                                {module.obligatorio && (
                                  <Badge className="bg-red-100 text-red-800">
                                    <Star className="w-3 h-3 mr-1" />
                                    Obligatorio
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(module)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(module.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-600 mb-3">{module.descripcion}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>⏱️ {module.duracion_minutos} min</span>
                          {module.tiene_cuestionario && (
                            <span>📝 Con cuestionario</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Contenido *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Video">Video</SelectItem>
                    <SelectItem value="Documento">Documento</SelectItem>
                    <SelectItem value="Cuestionario">Cuestionario</SelectItem>
                    <SelectItem value="Enlace Externo">Enlace Externo</SelectItem>
                    <SelectItem value="Presentación">Presentación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRL">PRL</SelectItem>
                    <SelectItem value="Normativa Interna">Normativa Interna</SelectItem>
                    <SelectItem value="Procedimientos">Procedimientos</SelectItem>
                    <SelectItem value="Sistemas">Sistemas</SelectItem>
                    <SelectItem value="Cultura Empresarial">Cultura Empresarial</SelectItem>
                    <SelectItem value="Técnico">Técnico</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duración (minutos)</Label>
                <Input
                  type="number"
                  value={formData.duracion_minutos}
                  onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>URL del Contenido</Label>
              <Input
                type="url"
                value={formData.contenido_url}
                onChange={(e) => setFormData({ ...formData, contenido_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="obligatorio"
                  checked={formData.obligatorio}
                  onCheckedChange={(checked) => setFormData({ ...formData, obligatorio: checked })}
                />
                <label htmlFor="obligatorio" className="text-sm font-medium">
                  Módulo Obligatorio
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cuestionario"
                  checked={formData.tiene_cuestionario}
                  onCheckedChange={(checked) => setFormData({ ...formData, tiene_cuestionario: checked })}
                />
                <label htmlFor="cuestionario" className="text-sm font-medium">
                  Incluye Cuestionario
                </label>
              </div>
            </div>

            {formData.tiene_cuestionario && (
              <Card className="bg-slate-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Cuestionario de Evaluación</CardTitle>
                    <Button type="button" size="sm" onClick={handleAddQuestion}>
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Pregunta
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nota Mínima para Aprobar (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.cuestionario.nota_minima}
                      onChange={(e) => setFormData({
                        ...formData,
                        cuestionario: {
                          ...formData.cuestionario,
                          nota_minima: parseInt(e.target.value)
                        }
                      })}
                    />
                  </div>

                  {formData.cuestionario.preguntas?.map((pregunta, index) => (
                    <Card key={index}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <Label>Pregunta {index + 1}</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveQuestion(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Escribe la pregunta..."
                          value={pregunta.pregunta}
                          onChange={(e) => handleQuestionChange(index, 'pregunta', e.target.value)}
                        />
                        
                        <div className="space-y-2">
                          <Label className="text-xs">Opciones de Respuesta</Label>
                          {pregunta.opciones.map((opcion, opIndex) => (
                            <div key={opIndex} className="flex items-center gap-2">
                              <input
                                type="radio"
                                name={`correct-${index}`}
                                checked={pregunta.respuesta_correcta === opIndex}
                                onChange={() => handleQuestionChange(index, 'respuesta_correcta', opIndex)}
                              />
                              <Input
                                placeholder={`Opción ${opIndex + 1}`}
                                value={opcion}
                                onChange={(e) => {
                                  const newOpciones = [...pregunta.opciones];
                                  newOpciones[opIndex] = e.target.value;
                                  handleQuestionChange(index, 'opciones', newOpciones);
                                }}
                              />
                            </div>
                          ))}
                          <p className="text-xs text-slate-500">Selecciona la respuesta correcta</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Guardando..." : "Guardar Módulo"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
