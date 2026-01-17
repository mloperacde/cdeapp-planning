import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
    puestos_afectados: [],
    roles_afectados: [],
    estado: "Vigente",
    version: "1.0",
    requiere_accion: false,
    accion_requerida: "",
    fecha_limite_accion: "",
    recordatorio_dias_antes: 30,
    notas: ""
  });
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState(document?.archivo_url || "");
  const [cambiosVersion, setCambiosVersion] = useState("");
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const puestos = useMemo(() => {
    if (!employees || !Array.isArray(employees)) return [];
    const psts = new Set();
    employees.forEach(emp => {
      if (emp.puesto) psts.add(emp.puesto);
    });
    return Array.from(psts).sort();
  }, [employees]);

  const [puestoInput, setPuestoInput] = useState("");
  const [rolInput, setRolInput] = useState("");

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const dataToSave = { ...data };
      
      if (document?.id && fileUrl !== document.archivo_url) {
        const historial = document.historial_versiones || [];
        historial.push({
          version: document.version,
          fecha: new Date().toISOString(),
          archivo_url: document.archivo_url,
          cambios: cambiosVersion || "Nueva versión",
          subido_por: data.subido_por
        });
        dataToSave.historial_versiones = historial;
      }
      
      if (document?.id) {
        return await base44.entities.PRLDocument.update(document.id, dataToSave);
      }
      return await base44.entities.PRLDocument.create(dataToSave);
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

  const addPuesto = () => {
    if (puestoInput && !(formData.puestos_afectados || []).includes(puestoInput)) {
      setFormData({
        ...formData,
        puestos_afectados: [...(formData.puestos_afectados || []), puestoInput]
      });
      setPuestoInput("");
    }
  };

  const removePuesto = (puesto) => {
    setFormData({
      ...formData,
      puestos_afectados: (formData.puestos_afectados || []).filter(p => p !== puesto)
    });
  };

  const addRol = () => {
    if (rolInput && !(formData.roles_afectados || []).includes(rolInput)) {
      setFormData({
        ...formData,
        roles_afectados: [...(formData.roles_afectados || []), rolInput]
      });
      setRolInput("");
    }
  };

  const removeRol = (rol) => {
    setFormData({
      ...formData,
      roles_afectados: (formData.roles_afectados || []).filter(r => r !== rol)
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-slate-900 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="dark:text-slate-100">
            {document ? 'Editar Documento' : 'Subir Nuevo Documento PRL'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label className="dark:text-slate-200">Título del Documento *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título descriptivo del documento"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-200">Tipo de Documento *</Label>
              <Select
                value={formData.tipo_documento}
                onValueChange={(value) => setFormData({ ...formData, tipo_documento: value })}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
              <Label className="dark:text-slate-200">Categoría</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value })}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
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
              <Label className="dark:text-slate-200">Fecha del Documento *</Label>
              <Input
                type="date"
                value={formData.fecha_documento}
                onChange={(e) => setFormData({ ...formData, fecha_documento: e.target.value })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-200">Fecha de Caducidad</Label>
              <Input
                type="date"
                value={formData.fecha_caducidad || ""}
                onChange={(e) => setFormData({ ...formData, fecha_caducidad: e.target.value })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-200">Departamento Afectado</Label>
              <Input
                value={formData.departamento_afectado || ""}
                onChange={(e) => setFormData({ ...formData, departamento_afectado: e.target.value })}
                placeholder="Departamento"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-200">Días para Recordatorio</Label>
              <Input
                type="number"
                value={formData.recordatorio_dias_antes || 30}
                onChange={(e) => setFormData({ ...formData, recordatorio_dias_antes: parseInt(e.target.value) })}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="dark:text-slate-200">Puestos Afectados</Label>
              <div className="flex gap-2">
                <Select value={puestoInput} onValueChange={setPuestoInput}>
                  <SelectTrigger className="flex-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                    <SelectValue placeholder="Seleccionar puesto" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                    {puestos.map((puesto) => (
                      <SelectItem key={puesto} value={puesto}>
                        {puesto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" onClick={addPuesto} size="sm" className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100">
                  Añadir
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(formData.puestos_afectados || []).map((puesto, idx) => (
                  <Badge key={idx} variant="outline" className="cursor-pointer dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800" onClick={() => removePuesto(puesto)}>
                    {puesto} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="dark:text-slate-200">Roles/Categorías Afectados</Label>
              <div className="flex gap-2">
                <Input
                  value={rolInput}
                  onChange={(e) => setRolInput(e.target.value)}
                  placeholder="Rol o categoría..."
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRol();
                    }
                  }}
                />
                <Button type="button" onClick={addRol} size="sm" className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100">
                  Añadir
                </Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(formData.roles_afectados || []).map((rol, idx) => (
                  <Badge key={idx} className="bg-blue-100 text-blue-700 cursor-pointer dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50" onClick={() => removeRol(rol)}>
                    {rol} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-200">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value })}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Pendiente Revisión">Pendiente Revisión</SelectItem>
                  <SelectItem value="Caducado">Caducado</SelectItem>
                  <SelectItem value="Archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="dark:text-slate-200">Versión</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="1.0"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="dark:text-slate-200">Archivo *</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="flex-1 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
                {fileUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.open(fileUrl, '_blank')}
                    className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Ver Archivo
                  </Button>
                )}
              </div>
              {uploading && <p className="text-xs text-blue-600 dark:text-blue-400">Subiendo archivo...</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label className="dark:text-slate-200">Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                placeholder="Descripción del documento"
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
            
            {document && fileUrl !== document.archivo_url && (
              <div className="space-y-2 col-span-2">
                <Label className="dark:text-slate-200">Descripción de Cambios (Nueva Versión)</Label>
                <Textarea
                  value={cambiosVersion}
                  onChange={(e) => setCambiosVersion(e.target.value)}
                  placeholder="Describe los cambios realizados en esta versión..."
                  rows={2}
                  className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>
            )}

            <div className="space-y-2 col-span-2 flex items-center gap-2">
              <Checkbox
                checked={formData.requiere_accion}
                onCheckedChange={(checked) => setFormData({ ...formData, requiere_accion: checked })}
                className="dark:border-slate-600 dark:data-[state=checked]:bg-blue-600 dark:data-[state=checked]:border-blue-600"
              />
              <Label className="dark:text-slate-200">Requiere Acción</Label>
            </div>

            {formData.requiere_accion && (
              <>
                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Descripción de la Acción</Label>
                  <Input
                    value={formData.accion_requerida || ""}
                    onChange={(e) => setFormData({ ...formData, accion_requerida: e.target.value })}
                    placeholder="Descripción"
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="dark:text-slate-200">Fecha Límite</Label>
                  <Input
                    type="date"
                    value={formData.fecha_limite_accion || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_limite_accion: e.target.value })}
                    className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>
              </>
            )}

            <div className="space-y-2 col-span-2">
              <Label className="dark:text-slate-200">Notas</Label>
              <Textarea
                value={formData.notas || ""}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                rows={2}
                className="dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
              Cancelar
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || uploading} className="dark:bg-blue-700 dark:hover:bg-blue-800 dark:text-white">
              {saveMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
