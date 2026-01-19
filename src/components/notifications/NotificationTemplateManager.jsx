import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Mail, MessageSquare, Smartphone, Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const VARIABLES_DISPONIBLES = [
  '{{empleado}}', '{{tipo_ausencia}}', '{{fecha_inicio}}', '{{fecha_fin}}',
  '{{motivo}}', '{{supervisor}}', '{{empresa}}', '{{fecha_solicitud}}',
  '{{estado}}', '{{comentario}}'
];

export default function NotificationTemplateManager() {
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['notificationTemplates'],
    queryFn: () => base44.entities.NotificationTemplate.list(),
    initialData: [],
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingTemplate?.id) {
        return base44.entities.NotificationTemplate.update(editingTemplate.id, data);
      }
      return base44.entities.NotificationTemplate.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
      toast.success('Plantilla guardada correctamente');
      setShowDialog(false);
      setEditingTemplate(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificationTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationTemplates'] });
      toast.success('Plantilla eliminada');
    },
  });

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowDialog(true);
  };

  const handleNew = () => {
    setEditingTemplate({
      tipo_evento: 'Solicitud',
      canal: 'Email',
      destinatarios_tipo: 'Supervisor',
      asunto: '',
      plantilla_texto: '',
      enviar_automaticamente: true,
      es_critica: false,
      activo: true
    });
    setShowDialog(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    saveMutation.mutate({
      tipo_evento: formData.get('tipo_evento'),
      absence_type_id: formData.get('absence_type_id') || null,
      canal: formData.get('canal'),
      destinatarios_tipo: formData.get('destinatarios_tipo'),
      asunto: formData.get('asunto'),
      plantilla_texto: formData.get('plantilla_texto'),
      plantilla_html: formData.get('plantilla_html'),
      enviar_automaticamente: formData.get('enviar_automaticamente') === 'on',
      es_critica: formData.get('es_critica') === 'on',
      delay_minutos: parseInt(formData.get('delay_minutos')) || 0,
      activo: true
    });
  };

  const getCanalIcon = (canal) => {
    if (canal === 'Email') return <Mail className="w-4 h-4" />;
    if (canal === 'SMS') return <Smartphone className="w-4 h-4" />;
    return <MessageSquare className="w-4 h-4" />;
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            Plantillas de Notificación
          </CardTitle>
          <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Plantilla
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Evento</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Destinatarios</TableHead>
                <TableHead>Tipo Ausencia</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => {
                const absenceType = absenceTypes.find(t => t.id === template.absence_type_id);
                return (
                  <TableRow key={template.id}>
                    <TableCell className="font-semibold">{template.tipo_evento}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        {getCanalIcon(template.canal)}
                        {template.canal}
                      </Badge>
                    </TableCell>
                    <TableCell>{template.destinatarios_tipo}</TableCell>
                    <TableCell>
                      {absenceType?.nombre || 'General'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge className={template.activo ? 'bg-green-600' : 'bg-slate-600'}>
                          {template.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {template.es_critica && (
                          <Badge className="bg-red-600">Crítica</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(template)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (confirm('¿Eliminar esta plantilla?')) {
                              deleteMutation.mutate(template.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {showDialog && editingTemplate && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate.id ? 'Editar' : 'Nueva'} Plantilla de Notificación
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Evento *</Label>
                  <Select name="tipo_evento" defaultValue={editingTemplate.tipo_evento}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solicitud">Solicitud</SelectItem>
                      <SelectItem value="Aprobación">Aprobación</SelectItem>
                      <SelectItem value="Rechazo">Rechazo</SelectItem>
                      <SelectItem value="Finalización">Finalización</SelectItem>
                      <SelectItem value="Recordatorio">Recordatorio</SelectItem>
                      <SelectItem value="Cancelación">Cancelación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Canal *</Label>
                  <Select name="canal" defaultValue={editingTemplate.canal}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="InApp">Notificación In-App</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Destinatarios *</Label>
                  <Select name="destinatarios_tipo" defaultValue={editingTemplate.destinatarios_tipo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Empleado">Empleado</SelectItem>
                      <SelectItem value="Supervisor">Supervisor</SelectItem>
                      <SelectItem value="RRHH">RRHH</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Ausencia (opcional)</Label>
                  <Select name="absence_type_id" defaultValue={editingTemplate.absence_type_id || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="General (todos)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>General (todos)</SelectItem>
                      {absenceTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Asunto (Email/In-App) *</Label>
                <Input 
                  name="asunto" 
                  defaultValue={editingTemplate.asunto}
                  placeholder="Ej: Nueva solicitud de {{tipo_ausencia}}"
                />
              </div>

              <div className="space-y-2">
                <Label>Plantilla de Mensaje *</Label>
                <Textarea 
                  name="plantilla_texto" 
                  defaultValue={editingTemplate.plantilla_texto}
                  rows={5}
                  placeholder="Usa variables como {{empleado}}, {{tipo_ausencia}}, {{fecha_inicio}}, etc."
                />
                <div className="flex flex-wrap gap-1">
                  {VARIABLES_DISPONIBLES.map(v => (
                    <Badge key={v} variant="outline" className="text-xs cursor-pointer">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Plantilla HTML (solo Email, opcional)</Label>
                <Textarea 
                  name="plantilla_html" 
                  defaultValue={editingTemplate.plantilla_html || ''}
                  rows={3}
                  placeholder="<p>Hola {{empleado}},</p>..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <Label>Envío Automático</Label>
                  <Switch 
                    name="enviar_automaticamente" 
                    defaultChecked={editingTemplate.enviar_automaticamente}
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <Label>Ausencia Crítica (SMS)</Label>
                  <Switch 
                    name="es_critica" 
                    defaultChecked={editingTemplate.es_critica}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Retraso (minutos)</Label>
                <Input 
                  name="delay_minutos" 
                  type="number" 
                  defaultValue={editingTemplate.delay_minutos || 0}
                  min="0"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  Guardar Plantilla
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}