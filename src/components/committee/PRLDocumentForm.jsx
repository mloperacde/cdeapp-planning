import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { toast } from "sonner";

export default function PRLDocumentForm({ document, onClose }) {
  const [formData, setFormData] = useState(document || {
    titulo: "",
    tipo_documento: "",
    categoria: "General",
    descripcion: "",
    fecha_documento: "",
    fecha_caducidad: "",
    departamento_afectado: "",
    estado: "Vigente",
    version: "1.0",
    requiere_accion: false,
    accion_requerida: "",
    fecha_limite_accion: "",
    notas: ""
  });
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(document?.archivo_url || "");
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (document?.id) {
        return await base44.entities.PRLDocument.update(document.id, data);
      }
      return await base44.entities.PRLDocument.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prlDocuments'] });
      toast.success(document ? "Documento actualizado" : "Documento subido correctamente");
      onClose();
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(result.file_url);
      toast.success("Archivo subido correctamente");
    } catch (error) {
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.tipo_documento || !fileUrl || !formData.fecha_documento) {
      toast.error("Completa todos los campos requeridos");
      return;
    }
    
    saveMutation.mutate({
      ...formData,
      archivo_url: fileUrl,
      fecha_subida: new Date().toISOString()
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {document ? 'Editar Documento' : 'Subir Nuevo Documento PRL'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label>Título del Documento *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título descriptivo del documento"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Documento *</Label>
              <Select
                value={formData.tipo_documento}
                onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Evaluación de Riesgos">Evaluación de Riesgos</SelectItem>
                  <SelectItem value="Política de Prevención">Política de Prevención</SelectItem>
                  <SelectItem value="Evaluación Solicitada">Evaluación Solicitada</SelectItem>
                  <SelectItem value="Evaluación Pendiente">Evaluación Pendiente</SelectItem>
                  <SelectItem value="Riesgo Comunicado">Riesgo Comunicado</SelectItem>
                  <SelectItem value="Riesgo Pendiente">Riesgo Pendiente</SelectItem>
                  <SelectItem value="Documentación de Formación">Documentación de Formación</SelectItem>
                  <SelectItem value="Plan de Emergencia">Plan de Emergencia</SelectItem>
                  <SelectItem value="Procedimiento de Trabajo">Procedimiento de Trabajo</SelectItem>
                  <SelectItem value="Informe de Investigación">Informe de Investigación</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
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
                  <SelectItem value="Seguridad en el Trabajo">Seguridad en el Trabajo</SelectItem>
                  <SelectItem value="Higiene Industrial">Higiene Industrial</SelectItem>
                  <SelectItem value="Ergonomía">Ergonomía</SelectItem>
                  <SelectItem value="Psicosociología">Psicosociología</SelectItem>
                  <SelectItem value="Medicina del Trabajo">Medicina del Trabajo</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha del Documento *</Label>
              <Input
                type="date"
                value={formData.fecha_documento}
                onChange={(e) => setFormData({ ...formData, fecha_documento: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Caducidad</Label>
              <Input
                type="date"
                value={formData.fecha_caducidad || ""}
                onChange={(e) => setFormData({ ...formData, fecha_caducidad: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Departamento Afectado</Label>
              <Input
                value={formData.departamento_afectado || ""}
                onChange={(e) => setFormData({ ...formData, departamento_afectado: e.target.value })}
                placeholder="Departamento"
              />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Pendiente Revisión">Pendiente Revisión</SelectItem>
                  <SelectItem value="Caducado">Caducado</SelectItem>
                  <SelectItem value="Archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Versión</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Archivo *</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1"
                />
                {fileUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(fileUrl, '_blank')}
                  >
                    Ver Archivo
                  </Button>
                )}
              </div>
              {uploading && <p className="text-xs text-blue-600">Subiendo archivo...</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                placeholder="Descripción del documento"
              />
            </div>

            <div className="space-y-2 col-span-2 flex items-center gap-2">
              <Checkbox
                checked={formData.requiere_accion}
                onCheckedChange={(checked) => setFormData({ ...formData, requiere_accion: checked })}
              />
              <Label>Requiere Acción</Label>
            </div>

            {formData.requiere_accion && (
              <>
                <div className="space-y-2">
                  <Label>Descripción de la Acción</Label>
                  <Input
                    value={formData.accion_requerida || ""}
                    onChange={(e) => setFormData({ ...formData, accion_requerida: e.target.value })}
                    placeholder="Descripción"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fecha Límite</Label>
                  <Input
                    type="date"
                    value={formData.fecha_limite_accion || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_limite_accion: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2 col-span-2">
              <Label>Notas</Label>
              <Textarea
                value={formData.notas || ""}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}