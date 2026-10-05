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
import {
  Bell, Plus, Edit, Trash2, Play, Loader2, Mail, MessageSquare,
  AlertCircle, CheckCircle2, X, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Tipos de evento soportados por el backend
const EVENT_TYPES = [
  {
    value: "missing_employee_data",
    label: "Datos Faltantes en Ficha de Empleado",
    categoria: "Integridad de Datos",
    descripcion: "Detecta empleados con campos obligatorios sin completar según la configuración de Integridad de Datos.",
    variables: ["{{empleados_afectados}}", "{{total_revisados}}", "{{lista_empleados}}", "{{fecha}}"],
    enlace_sugerido: "/EmployeeDataIntegrity",
  },
  {
    value: "chronological_date_inconsistency",
    label: "Inconsistencia Cronológica de Fechas",
    categoria: "Integridad de Datos",
    descripcion: "Detecta empleados con fechas de alta/baja/contrato/excedencia inconsistentes.",
    variables: ["{{empleados_afectados}}", "{{total_revisados}}", "{{lista_empleados}}", "{{fecha}}"],
    enlace_sugerido: "/EmployeeDataIntegrity",
  },
  {
    value: "stale_baja_data",
    label: "Fechas de Baja Obsoletas",
    categoria: "Integridad de Datos",
    descripcion: "Detecta empleados en estado Alta/Excedencia que conservan fecha de baja de contratos anteriores.",
    variables: ["{{empleados_afectados}}", "{{lista_empleados}}", "{{fecha}}"],
    enlace_sugerido: "/EmployeeDataIntegrity",
  },
  {
    value: "contract_expiring",
    label: "Contratos Próximos a Vencer",
    categoria: "Contratos",
    descripcion: "Detecta contratos que vencen dentro de un umbral de días configurable.",
    variables: ["{{empleados_afectados}}", "{{dias_umbral}}", "{{lista_empleados}}", "{{fecha}}"],
    condicion_fields: [{ key: "dias_umbral", label: "Días de antelación", type: "number", default: 30 }],
    enlace_sugerido: "/MasterEmployeeDatabase",
  },
];

const ROLES = [
  { value: "admin", label: "Administradores" },
  { value: "rrhh", label: "RRHH (Recursos Humanos)" },
  { value: "supervisor", label: "Supervisores" },
];

export default function NotificationRuleManager() {
  const [editingRule, setEditingRule] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [testing, setTesting] = useState(null);
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ["notificationRules"],
    queryFn: () => base44.entities.NotificationRule.list(undefined, 500),
    initialData: [],
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (editingRule?.id) {
        return base44.entities.NotificationRule.update(editingRule.id, data);
      }
      return base44.entities.NotificationRule.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationRules"] });
      toast.success("Regla guardada correctamente");
      setShowDialog(false);
      setEditingRule(null);
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NotificationRule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationRules"] });
      toast.success("Regla eliminada");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, activo }) => base44.entities.NotificationRule.update(id, { activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notificationRules"] }),
  });

  const handleTest = async (rule) => {
    setTesting(rule.id);
    try {
      const res = await base44.functions.invoke("evaluateNotificationRules", { rule_id: rule.id });
      const result = res.data?.results?.[0];
      if (result?.triggered) {
        toast.success(`Regla activada: ${result.resumen}. Notificaciones enviadas: InApp ${result.enviados?.inapp || 0}, Email ${result.enviados?.email || 0}`);
      } else if (result) {
        toast.info(`Regla evaluada, sin incidencias: ${result.resumen}`);
      } else {
        toast.info("Regla evaluada");
      }
      queryClient.invalidateQueries({ queryKey: ["notificationRules"] });
    } catch (error) {
      toast.error(`Error al evaluar: ${error.message}`);
    } finally {
      setTesting(null);
    }
  };

  const handleNew = () => {
    setEditingRule(null);
    setShowDialog(true);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Reglas de Notificación ({rules.length})
          </CardTitle>
          <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Regla
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Configura notificaciones automáticas para cualquier tipo de evento del sistema. Las reglas se evalúan periódicamente y envían alertas a los destinatarios configurados.
        </p>
      </CardHeader>
      <CardContent className="p-6">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-700">No hay reglas de notificación configuradas</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Crea una regla para recibir alertas automáticas sobre eventos del sistema.</p>
            <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Crear primera regla
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Regla</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Canales</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Última Ejecución</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => {
                  const result = rule.resultado_ultima_ejecucion;
                  return (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm">{rule.nombre}</p>
                          <p className="text-xs text-slate-500">{rule.descripcion || "—"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{rule.categoria || "General"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(rule.canales || []).includes("Email") && (
                            <Badge variant="outline" className="text-xs"><Mail className="w-3 h-3 mr-1" />Email</Badge>
                          )}
                          {(rule.canales || []).includes("InApp") && (
                            <Badge variant="outline" className="text-xs"><MessageSquare className="w-3 h-3 mr-1" />InApp</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {(rule.destinatarios || []).map((d, i) => (
                          <Badge key={i} variant="secondary" className="mr-1 mb-1 text-xs">
                            {d.tipo}: {d.valor}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell className="text-xs">{rule.frecuencia || "Diario"}</TableCell>
                      <TableCell className="text-xs">
                        {rule.ultima_ejecucion ? (
                          <div>
                            <p>{format(new Date(rule.ultima_ejecucion), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                            {result && (
                              <p className={result.triggered ? "text-amber-600" : "text-green-600"}>
                                {result.triggered ? "⚠ Activada" : "✓ Sin incidencias"}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">Nunca</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.activo !== false}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: rule.id, activo: checked })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleTest(rule)}
                            disabled={testing === rule.id}
                            title="Evaluar ahora"
                          >
                            {testing === rule.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 text-green-600" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              if (confirm("¿Eliminar esta regla?")) deleteMutation.mutate(rule.id);
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
        )}
      </CardContent>

      {showDialog && (
        <RuleEditDialog
          rule={editingRule}
          open={showDialog}
          onClose={() => setShowDialog(false)}
          onSave={(data) => saveMutation.mutate(data)}
          saving={saveMutation.isPending}
        />
      )}
    </Card>
  );
}

// ─── Diálogo de edición ───

function RuleEditDialog({ rule, open, onClose, onSave, saving }) {
  const [formData, setFormData] = useState({
    nombre: rule?.nombre || "",
    descripcion: rule?.descripcion || "",
    categoria: rule?.categoria || "",
    tipo_evento: rule?.tipo_evento || "missing_employee_data",
    condicion: rule?.condicion || {},
    canales: rule?.canales || ["InApp"],
    destinatarios: rule?.destinatarios || [{ tipo: "Rol", valor: "rrhh" }],
    asunto: rule?.asunto || "",
    plantilla_mensaje: rule?.plantilla_mensaje || "",
    enlace: rule?.enlace || "",
    frecuencia: rule?.frecuencia || "Diario",
    activo: rule?.activo !== false,
  });

  const eventType = EVENT_TYPES.find((e) => e.value === formData.tipo_evento);

  const update = (patch) => setFormData({ ...formData, ...patch });

  const handleAddDestinatario = () => {
    update({ destinatarios: [...formData.destinatarios, { tipo: "Rol", valor: "admin" }] });
  };

  const handleRemoveDestinatario = (idx) => {
    update({ destinatarios: formData.destinatarios.filter((_, i) => i !== idx) });
  };

  const handleUpdateDestinatario = (idx, field, value) => {
    const nuevos = formData.destinatarios.map((d, i) => i === idx ? { ...d, [field]: value } : d);
    update({ destinatarios: nuevos });
  };

  const handleCanalToggle = (canal) => {
    const canales = formData.canales.includes(canal)
      ? formData.canales.filter((c) => c !== canal)
      : [...formData.canales, canal];
    update({ canales });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (formData.canales.length === 0) { toast.error("Selecciona al menos un canal"); return; }
    if (formData.destinatarios.length === 0) { toast.error("Añade al menos un destinatario"); return; }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule?.id ? "Editar" : "Nueva"} Regla de Notificación</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de evento */}
          <div className="space-y-2">
            <Label>Tipo de Evento *</Label>
            <Select value={formData.tipo_evento} onValueChange={(v) => {
              const evt = EVENT_TYPES.find((e) => e.value === v);
              update({
                tipo_evento: v,
                categoria: evt?.categoria || formData.categoria,
                enlace: formData.enlace || evt?.enlace_sugerido || "",
                asunto: formData.asunto || evt?.label || "",
                descripcion: formData.descripcion || evt?.descripcion || "",
                condicion: evt?.condicion_fields
                  ? Object.fromEntries(evt.condicion_fields.map((f) => [f.key, f.default]))
                  : {},
              });
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((e) => (
                  <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {eventType && (
              <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded">{eventType.descripcion}</p>
            )}
          </div>

          {/* Nombre y descripción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre de la Regla *</Label>
              <Input value={formData.nombre} onChange={(e) => update({ nombre: e.target.value })} placeholder="Ej: Alerta datos faltantes RRHH" />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Input value={formData.categoria} onChange={(e) => update({ categoria: e.target.value })} placeholder="Ej: Integridad de Datos" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea value={formData.descripcion} onChange={(e) => update({ descripcion: e.target.value })} rows={2} placeholder="Describe qué hace esta regla..." />
          </div>

          {/* Condición dinámica */}
          {eventType?.condicion_fields && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm font-semibold mb-3">Configuración de la condición</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {eventType.condicion_fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label>{field.label}</Label>
                    <Input
                      type={field.type}
                      value={formData.condicion?.[field.key] ?? field.default}
                      onChange={(e) =>
                        update({ condicion: { ...formData.condicion, [field.key]: field.type === "number" ? parseInt(e.target.value) || 0 : e.target.value } })
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canales */}
          <div className="space-y-2">
            <Label>Canales de Notificación *</Label>
            <div className="flex gap-3">
              {["InApp", "Email"].map((canal) => (
                <button
                  key={canal}
                  type="button"
                  onClick={() => handleCanalToggle(canal)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.canales.includes(canal)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {canal === "Email" ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                  {canal === "InApp" ? "Notificación In-App" : "Email"}
                </button>
              ))}
            </div>
          </div>

          {/* Destinatarios */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Destinatarios *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddDestinatario}>
                <Plus className="w-3 h-3 mr-1" /> Añadir
              </Button>
            </div>
            <div className="space-y-2">
              {formData.destinatarios.map((dest, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Select
                    value={dest.tipo}
                    onValueChange={(v) => handleUpdateDestinatario(idx, "tipo", v)}
                  >
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Rol">Rol</SelectItem>
                      <SelectItem value="Usuario">Usuario</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                  {dest.tipo === "Rol" ? (
                    <Select
                      value={dest.valor}
                      onValueChange={(v) => handleUpdateDestinatario(idx, "valor", v)}
                    >
                      <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="flex-1"
                      value={dest.valor || ""}
                      onChange={(e) => handleUpdateDestinatario(idx, "valor", e.target.value)}
                      placeholder={dest.tipo === "Email" ? "email@ejemplo.com" : "usuario@ejemplo.com"}
                    />
                  )}
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveDestinatario(idx)}>
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Asunto y plantilla */}
          <div className="space-y-2">
            <Label>Asunto *</Label>
            <Input value={formData.asunto} onChange={(e) => update({ asunto: e.target.value })} placeholder="Ej: Alerta: {{empleados_afectados}} empleados con datos faltantes" />
          </div>

          <div className="space-y-2">
            <Label>Plantilla del Mensaje</Label>
            <Textarea
              value={formData.plantilla_mensaje}
              onChange={(e) => update({ plantilla_mensaje: e.target.value })}
              rows={4}
              placeholder="Se han detectado {{empleados_afectados}} empleado(s) con datos faltantes de un total de {{total_revisados}}. Revisa el informe en el módulo de Integridad de Datos."
            />
            {eventType?.variables && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-slate-400">Variables:</span>
                {eventType.variables.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs font-mono">{v}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Enlace de Acción</Label>
              <Input value={formData.enlace} onChange={(e) => update({ enlace: e.target.value })} placeholder="/EmployeeDataIntegrity" />
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Select value={formData.frecuencia} onValueChange={(v) => update({ frecuencia: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diario">Diario</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Inmediato">Inmediato</SelectItem>
                  <SelectItem value="Bajo Demanda">Bajo Demanda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <Label>Regla activa</Label>
            <Switch checked={formData.activo} onCheckedChange={(checked) => update({ activo: checked })} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Guardar Regla
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}