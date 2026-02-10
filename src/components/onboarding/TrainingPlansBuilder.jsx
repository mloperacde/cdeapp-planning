import React, { useState, useRef } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Plus, Trash2, Upload, FileText, Edit } from "lucide-react";
import { toast } from "sonner";

export default function TrainingPlansBuilder({ trainingResources, trainingDocs, trainingPlans }) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    title: "",
    description: "",
    colectivo: "",
    duration: "",
    documents: [],
    files: []
  });
  const fileInputRef = useRef(null);

  const saveResourcesMutation = useMutation({
    mutationFn: async (updatedResources) => {
      const payload = {
        config_key: 'onboarding_training_resources',
        app_name: 'Training Resources',
        value: JSON.stringify(updatedResources),
        app_subtitle: JSON.stringify(updatedResources),
      };

      const existing = await base44.entities.AppConfig.filter({ config_key: 'onboarding_training_resources' });
      if (existing && existing.length > 0) {
        const mainRecord = existing[0];
        await base44.entities.AppConfig.update(mainRecord.id, payload);
        
        const obsoleteRecords = existing.slice(1);
        for (const obsolete of obsoleteRecords) {
          try {
            await base44.entities.AppConfig.delete(obsolete.id);
          } catch (err) {
            console.warn('No se pudo eliminar duplicado:', obsolete.id, err);
          }
        }
        return mainRecord;
      } else {
        return base44.entities.AppConfig.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingResources'] });
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      toast.info("Subiendo archivo...");
      if (base44.integrations?.Core?.UploadFile) {
        const result = await base44.integrations.Core.UploadFile({ file });
        if (result && result.file_url) {
          setPlanForm(prev => ({
            ...prev,
            files: [...prev.files, { name: file.name, url: result.file_url }]
          }));
          toast.success("Archivo subido correctamente");
        }
      } else {
        toast.error("La subida de archivos no está configurada");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Error al subir el archivo");
    }
  };

  const handleSavePlan = () => {
    if (!planForm.title) {
      toast.error("El título es obligatorio");
      return;
    }

    const newPlan = {
      id: editingPlan?.id || `plan-${Date.now()}`,
      type: "training_plan",
      createdAt: editingPlan?.createdAt || new Date().toISOString(),
      ...planForm
    };

    let updatedResources;
    if (editingPlan) {
      updatedResources = trainingResources.map(r => 
        r.id === editingPlan.id ? newPlan : r
      );
      toast.success("Plan actualizado correctamente");
    } else {
      updatedResources = [...trainingResources, newPlan];
      toast.success("Plan creado correctamente");
    }

    saveResourcesMutation.mutate(updatedResources);
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      title: plan.title || "",
      description: plan.description || "",
      colectivo: plan.colectivo || "",
      duration: plan.duration || "",
      documents: plan.documents || [],
      files: plan.files || []
    });
    setIsDialogOpen(true);
  };

  const handleDeletePlan = (planId) => {
    if (!window.confirm("¿Estás seguro de eliminar este plan de formación?")) return;
    
    const updatedResources = trainingResources.filter(r => r.id !== planId);
    saveResourcesMutation.mutate(updatedResources);
    toast.success("Plan eliminado correctamente");
  };

  const resetForm = () => {
    setEditingPlan(null);
    setPlanForm({
      title: "",
      description: "",
      colectivo: "",
      duration: "",
      documents: [],
      files: []
    });
  };

  const plans = trainingResources.filter(r => r.type === 'training_plan');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Catálogo de Planes de Formación
            </CardTitle>
            <CardDescription>
              Construye planes completos con documentos y materiales de formación
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Editar Plan de Formación" : "Nuevo Plan de Formación"}</DialogTitle>
                <DialogDescription>
                  Configura el plan y añade documentos de formación
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título del Plan *</Label>
                    <Input 
                      value={planForm.title}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="ej: Formación en Seguridad Laboral"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duración estimada</Label>
                    <Input 
                      value={planForm.duration}
                      onChange={(e) => setPlanForm(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="ej: 2 semanas"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Colectivo objetivo</Label>
                  <Input 
                    value={planForm.colectivo}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, colectivo: e.target.value }))}
                    placeholder="ej: Operarios de producción, Mandos intermedios..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea 
                    value={planForm.description}
                    onChange={(e) => setPlanForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe el contenido y objetivos del plan..."
                    className="min-h-[80px]"
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Documentos del Catálogo</Label>
                  <ScrollArea className="h-[150px] border rounded-md p-3">
                    <div className="space-y-2">
                      {trainingDocs.length > 0 ? trainingDocs.map(doc => (
                        <div key={doc.id} className="flex items-center gap-2">
                          <Checkbox 
                            checked={planForm.documents.includes(doc.id)}
                            onCheckedChange={(checked) => {
                              setPlanForm(prev => ({
                                ...prev,
                                documents: checked 
                                  ? [...prev.documents, doc.id]
                                  : prev.documents.filter(id => id !== doc.id)
                              }));
                            }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{doc.title}</p>
                            {doc.description && <p className="text-xs text-slate-500">{doc.description}</p>}
                          </div>
                        </div>
                      )) : (
                        <p className="text-sm text-slate-500 text-center">
                          No hay documentos en el catálogo. Ve a la pestaña "Formaciones" para añadir documentos.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label className="text-base font-semibold">Archivos Adicionales del Plan</Label>
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload}
                      multiple
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Subir Archivo al Plan
                    </Button>
                  </div>
                  
                  {planForm.files.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {planForm.files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded-md bg-slate-50">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                              Abrir
                            </a>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-700"
                              onClick={() => {
                                setPlanForm(prev => ({
                                  ...prev,
                                  files: prev.files.filter((_, i) => i !== idx)
                                }));
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlan} className="bg-green-600 hover:bg-green-700">
                  {editingPlan ? "Actualizar Plan" : "Crear Plan"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {plans.length > 0 ? (
          <div className="space-y-4">
            {plans.map((plan) => (
              <Card key={plan.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-lg">{plan.title}</h4>
                        {plan.duration && (
                          <Badge variant="outline" className="text-xs">
                            {plan.duration}
                          </Badge>
                        )}
                        {plan.colectivo && (
                          <Badge className="bg-purple-100 text-purple-800 text-xs">
                            {plan.colectivo}
                          </Badge>
                        )}
                      </div>
                      
                      {plan.description && (
                        <p className="text-sm text-slate-600 mb-3">{plan.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {plan.documents && plan.documents.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Documentos del Catálogo ({plan.documents.length})</p>
                            <ul className="space-y-1">
                              {plan.documents.map(docId => {
                                const doc = trainingDocs.find(d => d.id === docId);
                                return doc ? (
                                  <li key={docId} className="text-xs flex items-center gap-1">
                                    <FileText className="w-3 h-3 text-blue-600" />
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                      {doc.title}
                                    </a>
                                  </li>
                                ) : null;
                              })}
                            </ul>
                          </div>
                        )}

                        {plan.files && plan.files.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 mb-1">Archivos del Plan ({plan.files.length})</p>
                            <ul className="space-y-1">
                              {plan.files.map((file, idx) => (
                                <li key={idx} className="text-xs flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-green-600" />
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                                    {file.name}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 ml-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-700"
                        onClick={() => handleEditPlan(plan)}
                        title="Editar plan"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => handleDeletePlan(plan.id)}
                        title="Eliminar plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm mb-4">
              No hay planes de formación configurados
            </p>
            <Button 
              variant="outline"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear tu primer plan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}