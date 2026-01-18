import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Mail, Plus, Edit, Trash2, Smartphone } from "lucide-react";

const NOTIFICATION_TYPES = [
  "Operadores Insuficientes",
  "Mantenimiento Próximo",
  "Mantenimiento Vencido",
  "Tarea Vencida",
  "Ausencia Solicitada",
  "Ausencia Aprobada",
  "Ausencia Rechazada",
  "Ausencia Finalizada",
  "Contrato Próximo Vencer",
  "Máquina No Disponible",
  "Alerta Mantenimiento Predictivo"
];

export default function EmailNotificationsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    tipo_notificacion: "",
    enviar_email: true,
    enviar_sms: false,
    destinatarios: [],
    asunto_email: "",
    plantilla_email: "",
    activo: true,
  });

  const [newDestinatario, setNewDestinatario] = useState({
    tipo: "Rol",
    valor: "",
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ['emailNotificationConfigs'],
    queryFn: () => base44.entities.EmailNotificationConfig.list(),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingConfig?.id) {
        return base44.entities.EmailNotificationConfig.update(editingConfig.id, data);
      }
      return base44.entities.EmailNotificationConfig.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailNotificationConfigs'] });
      handleClose();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmailNotificationConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailNotificationConfigs'] });
    },
  });

  const handleEdit = (config) => {
    setEditingConfig(config);
    setFormData(config);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setEditingConfig(null);
    setFormData({
      tipo_notificacion: "",
      enviar_email: true,
      enviar_sms: false,
      destinatarios: [],
      asunto_email: "",
      plantilla_email: "",
      activo: true,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta configuración?')) {
      deleteMutation.mutate(id);
    }
  };

  const addDestinatario = () => {
    if (newDestinatario.valor) {
      setFormData({
        ...formData,
        destinatarios: [...formData.destinatarios, { ...newDestinatario }],
      });
      setNewDestinatario({ tipo: "Rol", valor: "" });
    }
  };

  const removeDestinatario = (index) => {
    setFormData({
      ...formData,
      destinatarios: formData.destinatarios.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Mail className="w-8 h-8 text-blue-600" />
              Configuración de Notificaciones por Email/SMS
            </h1>
            <p className="text-slate-600 mt-1">
              Configura qué notificaciones enviar, a quién y por qué canal
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Configuración
          </Button>
        </div>

        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Configuraciones Activas ({configs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando...</div>
            ) : configs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay configuraciones de notificaciones
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Tipo de Notificación</TableHead>
                      <TableHead>Canales</TableHead>
                      <TableHead>Destinatarios</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {configs.map((config) => (
                      <TableRow key={config.id} className="hover:bg-slate-50">
                        <TableCell>
                          <span className="font-semibold text-slate-900">
                            {config.tipo_notificacion}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {config.enviar_email && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <Mail className="w-3 h-3 mr-1" />
                                Email
                              </Badge>
                            )}
                            {config.enviar_sms && (
                              <Badge className="bg-green-100 text-green-800">
                                <Smartphone className="w-3 h-3 mr-1" />
                                SMS
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {config.destinatarios?.length || 0} configurados
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            config.activo
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-600"
                          }>
                            {config.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(config)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(config.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Dialog open={true} onOpenChange={handleClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Notificación *</Label>
                <Select
                  value={formData.tipo_notificacion}
                  onValueChange={(value) => setFormData({ ...formData, tipo_notificacion: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <Label>Enviar por Email</Label>
                  </div>
                  <Switch
                    checked={formData.enviar_email}
                    onCheckedChange={(checked) => setFormData({ ...formData, enviar_email: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-600" />
                    <Label>Enviar por SMS</Label>
                  </div>
                  <Switch
                    checked={formData.enviar_sms}
                    onCheckedChange={(checked) => setFormData({ ...formData, enviar_sms: checked })}
                  />
                </div>
              </div>

              {formData.enviar_email && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="asunto">Asunto del Email</Label>
                    <Input
                      id="asunto"
                      value={formData.asunto_email || ""}
                      onChange={(e) => setFormData({ ...formData, asunto_email: e.target.value })}
                      placeholder="Ejemplo: [CDE PlanApp] Alerta de Mantenimiento"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plantilla">Plantilla del Email</Label>
                    <Textarea
                      id="plantilla"
                      value={formData.plantilla_email || ""}
                      onChange={(e) => setFormData({ ...formData, plantilla_email: e.target.value })}
                      rows={6}
                      placeholder="Usa variables como {nombre_empleado}, {nombre_maquina}, {fecha}, etc."
                    />
                    <p className="text-xs text-slate-500">
                      Variables disponibles: {"{nombre_empleado}"}, {"{nombre_maquina}"}, {"{fecha}"}, {"{hora}"}, {"{motivo}"}
                    </p>
                  </div>
                </>
              )}

              <div className="border-t pt-6">
                <Label className="text-base font-semibold mb-4 block">Destinatarios</Label>
                
                <div className="space-y-4">
                  {formData.destinatarios.map((dest, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                      <Badge variant="outline">{dest.tipo}</Badge>
                      <span className="flex-1">{dest.valor}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeDestinatario(index)}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Select
                      value={newDestinatario.tipo}
                      onValueChange={(value) => setNewDestinatario({ ...newDestinatario, tipo: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rol">Rol</SelectItem>
                        <SelectItem value="Email">Email</SelectItem>
                      </SelectContent>
                    </Select>

                    {newDestinatario.tipo === "Rol" ? (
                      <Select
                        value={newDestinatario.valor}
                        onValueChange={(value) => setNewDestinatario({ ...newDestinatario, valor: value })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Supervisor">Supervisor</SelectItem>
                          <SelectItem value="Técnico">Técnico</SelectItem>
                          <SelectItem value="Operario">Operario</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="flex-1"
                        placeholder="email@ejemplo.com"
                        value={newDestinatario.valor}
                        onChange={(e) => setNewDestinatario({ ...newDestinatario, valor: e.target.value })}
                      />
                    )}

                    <Button type="button" onClick={addDestinatario} variant="outline">
                      Añadir
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <Label>Configuración Activa</Label>
                <Switch
                  checked={formData.activo}
                  onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

