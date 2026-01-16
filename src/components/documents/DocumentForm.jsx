import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns'; // Import format for date utility

export default function DocumentForm({ document, onClose }) {
  const [formData, setFormData] = useState(document || {
    titulo: "",
    descripcion: "",
    categoria: "",
    tipo_entidad_asociada: "General",
    entidad_asociada_id: "",
    archivo_url: "",
    version: "1.0",
    estado: "Vigente",
    fecha_vigencia: "",
    fecha_caducidad: "",
    roles_acceso: [],
    departamentos_acceso: [],
    es_publico: false,
    etiquetas: []
  });
  const [uploading, setUploading] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [cambiosVersion, setCambiosVersion] = useState("");
  const queryClient = useQueryClient();

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return (Array.isArray(data) ? data : [])
        .map(m => ({
          id: m.id,
          nombre: m.nombre || '',
          codigo: m.codigo_maquina || m.codigo || '',
          orden: m.orden_visualizacion || 999
        }))
        .sort((a, b) => (a.orden || 999) - (b.orden || 999));
    },
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(),
    initialData: [],
  });

  const { data: roles } = useQuery({
    queryKey: ['userRoles'],
    queryFn: () => base44.entities.UserRole.list(),
    initialData: [],
  });

  const departments = ["FABRICACION", "MANTENIMIENTO", "ALMACEN", "CALIDAD", "RRHH", "ADMINISTRACION"];

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const now = new Date().toISOString();
      
      if (document?.id) {
        const isNewVersion = data.archivo_url !== document.archivo_url;
        
        if (isNewVersion) {
          const historial = document.historial_versiones || [];
          historial.push({
            version: document.version,
            fecha: document.fecha_creacion || document.created_date, // Use existing document's creation date for its version history
            archivo_url: document.archivo_url,
            cambios: cambiosVersion,
            subido_por: document.subido_por // Assuming this field exists on the document
          });
          
          data.historial_versiones = historial;
          data.ultima_modificacion = now;

          // Notify affected users about new version
          if (data.roles_acceso?.length > 0 || data.departamentos_acceso?.length > 0 || data.es_publico) {
            const employeesData = await base44.entities.EmployeeMasterDatabase.list();
            const notificationPromises = employeesData
              .filter(emp => {
                if (data.es_publico) return true; // If public, all employees are affected.
                // If specific departments are set AND the employee's department is NOT in the list, then exclude.
                if (data.departamentos_acceso?.length > 0 && !data.departamentos_acceso.includes(emp.departamento)) {
                    return false;
                }
                // The outline does not include filtering by roles_acceso for the employees here.
                // It's assumed access is handled by department or public status for notification targeting.
                return true; // Otherwise, include.
              })
              .map(emp => 
                base44.entities.PushNotification.create({
                  destinatario_id: emp.id,
                  tipo: "documento",
                  titulo: "Documento Actualizado",
                  mensaje: `${data.titulo} - Nueva versión ${data.version}`,
                  prioridad: "media",
                  referencia_tipo: "Document",
                  referencia_id: document.id,
                  enviada_push: true,
                  fecha_envio_push: now
                })
              );
            await Promise.all(notificationPromises);
          }
        }
        
        return base44.entities.Document.update(document.id, data);
      }
      
      data.fecha_creacion = now;
      const newDoc = await base44.entities.Document.create(data);

      // Notify about new document expiry if applicable
      if (data.fecha_caducidad) {
        const caducidadDate = new Date(data.fecha_caducidad);
        const notifyDate = new Date(caducidadDate);
        notifyDate.setDate(notifyDate.getDate() - 30); // 30 days before expiry

        // Only schedule if the notification date is in the future
        if (notifyDate.getTime() > new Date().getTime()) {
          const employeesData = await base44.entities.EmployeeMasterDatabase.list(); // Get all employees for expiry notification
          const notificationPromises = employeesData.map(emp => 
            base44.entities.PushNotification.create({
              destinatario_id: emp.id,
              tipo: "documento",
              titulo: "Documento Próximo a Caducar",
              mensaje: `${data.titulo} caduca el ${format(caducidadDate, "dd/MM/yyyy")}`,
              prioridad: "alta",
              referencia_tipo: "Document",
              referencia_id: newDoc.id,
              enviada_push: false, // This notification will be sent later by a scheduler
              fecha_programada_envio: notifyDate.toISOString() // Store when it should be sent
            })
          );
          await Promise.all(notificationPromises);
        }
      }

      return newDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(document ? "Documento actualizado" : "Documento creado");
      onClose();
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({
        ...formData,
        archivo_url: file_url,
        tipo_archivo: file.name.split('.').pop(),
        tamano_bytes: file.size
      });
      toast.success("Archivo subido correctamente");
    } catch (error) {
      toast.error("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    setFormData({
      ...formData,
      etiquetas: [...(formData.etiquetas || []), newTag.trim()]
    });
    setNewTag("");
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      etiquetas: formData.etiquetas.filter(tag => tag !== tagToRemove)
    });
  };

  const toggleRole = (roleId) => {
    const current = formData.roles_acceso || [];
    const updated = current.includes(roleId)
      ? current.filter(r => r !== roleId)
      : [...current, roleId];
    setFormData({ ...formData, roles_acceso: updated });
  };

  const toggleDepartment = (dept) => {
    const current = formData.departamentos_acceso || [];
    const updated = current.includes(dept)
      ? current.filter(d => d !== dept)
      : [...current, dept];
    setFormData({ ...formData, departamentos_acceso: updated });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.archivo_url) {
      toast.error("Debes subir un archivo");
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{document ? "Editar Documento" : "Subir Nuevo Documento"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Select value={formData.categoria} onValueChange={(value) => setFormData({...formData, categoria: value})} required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manual de Máquina">Manual de Máquina</SelectItem>
                  <SelectItem value="Política PRL">Política PRL</SelectItem>
                  <SelectItem value="Procedimiento de Ausencia">Procedimiento de Ausencia</SelectItem>
                  <SelectItem value="Política RRHH">Política RRHH</SelectItem>
                  <SelectItem value="Certificado">Certificado</SelectItem>
                  <SelectItem value="Contrato">Contrato</SelectItem>
                  <SelectItem value="Formación">Formación</SelectItem>
                  <SelectItem value="Calidad">Calidad</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Versión</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({...formData, version: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={formData.estado} onValueChange={(value) => setFormData({...formData, estado: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Borrador">Borrador</SelectItem>
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Obsoleto">Obsoleto</SelectItem>
                  <SelectItem value="Archivado">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Caducidad</Label>
              <Input
                type="date"
                value={(() => {
                  if (!formData.fecha_caducidad) return '';
                  const date = new Date(formData.fecha_caducidad);
                  return isNaN(date.getTime()) ? '' : format(date, 'yyyy-MM-dd');
                })()}
                onChange={(e) => setFormData({...formData, fecha_caducidad: e.target.value})}
              />
            </div>
          </div>

          {document?.id && document.archivo_url !== formData.archivo_url && (
            <div className="space-y-2">
              <Label>Cambios en esta versión</Label>
              <Textarea
                value={cambiosVersion}
                onChange={(e) => setCambiosVersion(e.target.value)}
                placeholder="Describe los cambios realizados..."
                rows={2}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Entidad</Label>
              <Select value={formData.tipo_entidad_asociada} onValueChange={(value) => {
                setFormData({...formData, tipo_entidad_asociada: value, entidad_asociada_id: ""});
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General (sin asociar)</SelectItem>
                  <SelectItem value="Machine">Máquina</SelectItem>
                  <SelectItem value="Employee">Empleado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.tipo_entidad_asociada !== "General" && (
              <div className="space-y-2">
                <Label>Entidad Asociada</Label>
                <Select value={formData.entidad_asociada_id} onValueChange={(value) => setFormData({...formData, entidad_asociada_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.tipo_entidad_asociada === "Machine" && machines.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nombre}</SelectItem>
                    ))}
                    {formData.tipo_entidad_asociada === "Employee" && employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Archivo *</Label>
            <input
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('file-upload').click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : formData.archivo_url ? (
                "Cambiar Archivo"
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar Archivo
                </>
              )}
            </Button>
            {formData.archivo_url && (
              <p className="text-xs text-green-600">✓ Archivo cargado</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Nueva etiqueta"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Añadir
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {formData.etiquetas?.map((tag, idx) => (
                <Badge key={idx} className="bg-blue-600 cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.es_publico}
                onCheckedChange={(checked) => setFormData({...formData, es_publico: checked})}
              />
              <Label>Documento público (visible para todos)</Label>
            </div>
          </div>

          {!formData.es_publico && (
            <>
              <div className="space-y-2">
                <Label>Roles con Acceso</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded max-h-32 overflow-y-auto">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={(formData.roles_acceso || []).includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => toggleRole(role.id)}>
                        {role.role_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Departamentos con Acceso (vacío = todos)</Label>
                <div className="grid grid-cols-2 gap-2 p-3 border rounded">
                  {departments.map(dept => (
                    <div key={dept} className="flex items-center gap-2">
                      <Checkbox
                        checked={(formData.departamentos_acceso || []).includes(dept)}
                        onCheckedChange={() => toggleDepartment(dept)}
                      />
                      <label className="text-sm cursor-pointer" onClick={() => toggleDepartment(dept)}>
                        {dept}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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
