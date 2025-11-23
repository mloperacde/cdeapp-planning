import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import SearchableSelect from "../common/SearchableSelect";
import DocumentPermissions from "./DocumentPermissions";

export default function EnhancedDocumentForm({ document, onClose }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [tags, setTags] = useState(document?.etiquetas || []);
  const [tagInput, setTagInput] = useState("");
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    titulo: document?.titulo || "",
    descripcion: document?.descripcion || "",
    categoria: document?.categoria || "",
    tipo_entidad_asociada: document?.tipo_entidad_asociada || "General",
    entidad_asociada_id: document?.entidad_asociada_id || "",
    estado: document?.estado || "Vigente",
    version: document?.version || "1.0",
    fecha_vigencia: document?.fecha_vigencia || "",
    fecha_caducidad: document?.fecha_caducidad || "",
    cambios_recientes: "",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    initialData: []
  });

  const { data: machines = [] } = useQuery({
    queryKey: ['machines'],
    queryFn: () => base44.entities.Machine.list('nombre'),
    initialData: []
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
    initialData: []
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      let fileUrl = document?.archivo_url;

      if (file) {
        setUploading(true);
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        fileUrl = uploadResult.file_url;
        setUploading(false);
      }

      const documentData = {
        ...data,
        archivo_url: fileUrl,
        etiquetas: tags,
        tipo_archivo: file?.type || document?.tipo_archivo,
        tamano_bytes: file?.size || document?.tamano_bytes,
      };

      if (document?.id) {
        // Nueva versión
        const newVersion = parseFloat(document.version) + 0.1;
        const historial = document.historial_versiones || [];
        
        historial.push({
          version: document.version,
          fecha: document.ultima_modificacion || document.created_date,
          archivo_url: document.archivo_url,
          cambios: "Versión anterior",
          subido_por: document.modificado_por || document.created_by
        });

        return base44.entities.Document.update(document.id, {
          ...documentData,
          version: newVersion.toFixed(1),
          historial_versiones: historial,
          ultima_modificacion: new Date().toISOString(),
          modificado_por: currentUser?.email
        });
      } else {
        return base44.entities.Document.create({
          ...documentData,
          fecha_creacion: new Date().toISOString(),
          subido_por: currentUser?.email
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(document ? "Documento actualizado" : "Documento creado");
      onClose();
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
      setUploading(false);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!file && !document) {
      toast.error("Debes seleccionar un archivo");
      return;
    }

    saveMutation.mutate(formData);
  };

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput("");
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const categoryOptions = [
    "Manual de Máquina", "Política PRL", "Procedimiento de Ausencia", 
    "Política RRHH", "Certificado", "Contrato", "Formación", "Calidad", "Otro"
  ].map(c => ({ value: c, label: c }));

  const entityOptions = 
    formData.tipo_entidad_asociada === "Machine" 
      ? machines.map(m => ({ value: m.id, label: m.nombre }))
      : formData.tipo_entidad_asociada === "Employee"
      ? employees.map(e => ({ value: e.id, label: e.nombre }))
      : [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {document ? "Editar Documento" : "Subir Nuevo Documento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría *</Label>
              <SearchableSelect
                options={categoryOptions}
                value={formData.categoria}
                onValueChange={(value) => setFormData({...formData, categoria: value})}
                placeholder="Seleccionar categoría"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              rows={3}
              placeholder="Describe el contenido del documento..."
            />
          </div>

          <div className="space-y-2">
            <Label>Archivo {!document && "*"}</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              {file && (
                <div className="mt-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">{file.name}</span>
                  <Badge variant="outline">{(file.size / 1024).toFixed(2)} KB</Badge>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <SearchableSelect
                options={[
                  { value: "Borrador", label: "Borrador" },
                  { value: "Vigente", label: "Vigente" },
                  { value: "Obsoleto", label: "Obsoleto" },
                  { value: "Archivado", label: "Archivado" }
                ]}
                value={formData.estado}
                onValueChange={(value) => setFormData({...formData, estado: value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Versión</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
                placeholder="1.0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Agregar etiqueta..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" size="sm" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                  <Badge key={tag} className="bg-blue-100 text-blue-700">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 hover:text-blue-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {document && (
            <div className="space-y-2">
              <Label>Descripción de Cambios</Label>
              <Textarea
                value={formData.cambios_recientes}
                onChange={(e) => setFormData({...formData, cambios_recientes: e.target.value})}
                rows={2}
                placeholder="Describe qué cambios realizaste en esta versión..."
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha Vigencia</Label>
              <Input
                type="date"
                value={formData.fecha_vigencia}
                onChange={(e) => setFormData({...formData, fecha_vigencia: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Caducidad</Label>
              <Input
                type="date"
                value={formData.fecha_caducidad}
                onChange={(e) => setFormData({...formData, fecha_caducidad: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={uploading || saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {uploading ? "Subiendo..." : saveMutation.isPending ? "Guardando..." : document ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}