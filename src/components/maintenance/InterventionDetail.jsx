import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAppData } from "@/components/data/DataProvider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileDown, Mail, Pencil, Plus, CheckCircle2, Clock, 
  AlertCircle, MapPin, Users, Package, Image, ArrowUpCircle,
  Loader2, ChevronDown, ChevronUp, Send, Trash2
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  "Pendiente": { color: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
  "En Progreso": { color: "bg-blue-100 text-blue-800 border-blue-200", icon: ArrowUpCircle },
  "En Revisión": { color: "bg-purple-100 text-purple-800 border-purple-200", icon: AlertCircle },
  "Completada": { color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  "Cancelada": { color: "bg-red-100 text-red-800 border-red-200", icon: AlertCircle },
};

const PRIORIDAD_CONFIG = {
  "Baja": "bg-green-100 text-green-700",
  "Media": "bg-yellow-100 text-yellow-700",
  "Alta": "bg-orange-100 text-orange-700",
  "Crítica": "bg-red-100 text-red-700"
};

export default function InterventionDetail({ intervention, onEdit, onRefresh }) {
  const { user } = useAppData();
  const [isAddingProgress, setIsAddingProgress] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(null);
  const [selectedRecipients, setSelectedRecipients] = useState(
    intervention.destinatarios?.map(d => d.email) || []
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const [progressForm, setProgressForm] = useState({
    descripcion: "", porcentaje: intervention.progreso?.slice(-1)[0]?.porcentaje || 0, estado: intervention.estado
  });
  const [closingForm, setClosingForm] = useState({
    descripcion: "", satisfactorio: true
  });

  const StatusIcon = STATUS_CONFIG[intervention.estado]?.icon || Clock;

  const handleAddProgress = async () => {
    if (!progressForm.descripcion) {
      toast.error("Añade una descripción del progreso");
      return;
    }
    try {
      const newProgress = {
        fecha: new Date().toISOString(),
        descripcion: progressForm.descripcion,
        estado: progressForm.estado,
        porcentaje: progressForm.porcentaje,
        registrado_por: user?.email,
        registrado_por_nombre: user?.full_name
      };
      const updatedProgreso = [...(intervention.progreso || []), newProgress];
      await base44.entities.MaintenanceIntervention.update(intervention.id, {
        progreso: updatedProgreso,
        estado: progressForm.estado
      });
      toast.success("Progreso registrado");
      setIsAddingProgress(false);
      setProgressForm({ descripcion: "", porcentaje: progressForm.porcentaje, estado: progressForm.estado });
      onRefresh();
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleClose = async () => {
    if (!closingForm.descripcion) {
      toast.error("Añade los detalles de la resolución");
      return;
    }
    try {
      await base44.entities.MaintenanceIntervention.update(intervention.id, {
        estado: "Completada",
        fecha_completada: new Date().toISOString(),
        resolucion: {
          descripcion: closingForm.descripcion,
          fecha: new Date().toISOString(),
          firmado_por: user?.email,
          firmado_por_nombre: user?.full_name,
          satisfactorio: closingForm.satisfactorio
        }
      });
      toast.success("Intervención marcada como completada");
      setIsClosing(false);
      onRefresh();
    } catch (err) {
      toast.error("Error: " + err.message);
    }
  };

  const handleDelete = async () => {
    if (!intervention?.id) return;
    if (!window.confirm("¿Eliminar esta intervención? Esta acción no se puede deshacer.")) return;
    try {
      setIsDeleting(true);
      await base44.entities.MaintenanceIntervention.delete(intervention.id);
      toast.success("Intervención eliminada");
      onRefresh();
    } catch (err) {
      toast.error("Error eliminando intervención: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGeneratePdf = async (withEmail = false) => {
    if (withEmail) {
      setShowEmailDialog(true);
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const response = await base44.functions.invoke('generateInterventionPdf', {
        intervention,
        sendEmail: false
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OT-${intervention.numero_orden || intervention.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      toast.success("PDF descargado correctamente");
    } catch (err) {
      toast.error("Error generando PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const recipients = intervention.destinatarios?.filter(d => selectedRecipients.includes(d.email)) || [];
      const response = await base44.functions.invoke('generateInterventionPdf', {
        intervention,
        sendEmail: true,
        recipients
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OT-${intervention.numero_orden || intervention.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      toast.success(`PDF enviado a ${recipients.length} destinatario(s) y descargado`);
      setShowEmailDialog(false);
    } catch (err) {
      toast.error("Error: " + err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const latestProgress = intervention.progreso?.slice(-1)[0];
  const porcentajeActual = latestProgress?.porcentaje || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={STATUS_CONFIG[intervention.estado]?.color + " border flex items-center gap-1"}>
              <StatusIcon className="w-3 h-3" />
              {intervention.estado}
            </Badge>
            <Badge className={PRIORIDAD_CONFIG[intervention.prioridad] || "bg-slate-100"}>{intervention.prioridad}</Badge>
            <Badge variant="outline" className="text-slate-500">{intervention.tipo}</Badge>
            {intervention.numero_orden && (
              <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{intervention.numero_orden}</code>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-2">{intervention.titulo}</h2>
          <p className="text-sm text-slate-500 mt-1">
            Solicitado por <strong>{intervention.solicitante_nombre}</strong>
            {intervention.fecha_solicitud && ` · ${new Date(intervention.fecha_solicitud).toLocaleDateString('es-ES')}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-1" /> Editar
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleGeneratePdf(false)} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
            Descargar PDF
          </Button>
          <Button size="sm" onClick={() => handleGeneratePdf(true)} className="bg-blue-600 hover:bg-blue-700">
            <Mail className="w-4 h-4 mr-1" /> Enviar por Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-1" />
            )}
            Eliminar
          </Button>
        </div>
      </div>

      {/* Barra de progreso */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Progreso General</span>
            <span className="text-sm font-bold text-blue-600">{porcentajeActual}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${porcentajeActual}%` }}
            />
          </div>
          {intervention.fecha_inicio_prevista && (
            <div className="flex gap-4 mt-3 text-xs text-slate-500">
              <span>Inicio: <strong>{new Date(intervention.fecha_inicio_prevista).toLocaleDateString('es-ES')}</strong></span>
              {intervention.fecha_fin_prevista && <span>Fin previsto: <strong>{new Date(intervention.fecha_fin_prevista).toLocaleDateString('es-ES')}</strong></span>}
              {intervention.fecha_completada && <span className="text-green-600">Completada: <strong>{new Date(intervention.fecha_completada).toLocaleDateString('es-ES')}</strong></span>}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Descripción */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-slate-700">Descripción</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{intervention.descripcion}</p>
          </CardContent>
        </Card>

        {/* Objetivo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Objetivo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><span className="text-slate-500">Tipo:</span> <strong>{intervention.objetivo_tipo}</strong></div>
            {intervention.objetivo_maquina_nombre && <div><span className="text-slate-500">Máquina:</span> {intervention.objetivo_maquina_nombre}</div>}
            {intervention.objetivo_area && <div><span className="text-slate-500">Área:</span> {intervention.objetivo_area}</div>}
            {intervention.objetivo_sala && <div><span className="text-slate-500">Sala:</span> {intervention.objetivo_sala}</div>}
            {intervention.objetivo_descripcion_manual && <div className="text-slate-600">{intervention.objetivo_descripcion_manual}</div>}
          </CardContent>
        </Card>

        {/* Destinatarios */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Destinatarios</CardTitle>
          </CardHeader>
          <CardContent>
            {intervention.destinatarios?.length > 0 ? (
              <div className="space-y-1.5">
                {intervention.destinatarios.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(d.nombre || "?")[0]}
                    </div>
                    <div>
                      <div className="font-medium">{d.nombre}</div>
                      <div className="text-xs text-slate-500">{d.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400">Sin destinatarios asignados</p>}
          </CardContent>
        </Card>

        {/* Necesidades */}
        {intervention.necesidades?.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Recursos y Necesidades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {intervention.necesidades.map((n, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-slate-50 border rounded p-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{n.tipo}</Badge>
                      <span>{n.descripcion}</span>
                      {n.cantidad && <span className="text-slate-500 text-xs">({n.cantidad})</span>}
                    </div>
                    <Badge className={n.disponible ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                      {n.disponible ? "✓ Disponible" : "✗ No disp."}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Imágenes */}
        {intervention.imagenes_adjuntas?.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-1"><Image className="w-3.5 h-3.5" /> Imágenes Adjuntas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {intervention.imagenes_adjuntas.map((img, i) => (
                  <div key={i} className="cursor-pointer group relative rounded-lg overflow-hidden border hover:border-blue-400 transition-colors" onClick={() => setShowImageGallery(i)}>
                    <img src={img.url} alt={img.nombre} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-200" />
                    {img.descripcion && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 text-center truncate">
                        {img.descripcion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Historial de Progreso */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">Historial de Progreso y Seguimiento</CardTitle>
          {intervention.estado !== "Completada" && intervention.estado !== "Cancelada" && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsAddingProgress(p => !p)}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Añadir Progreso
              </Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setIsClosing(p => !p)}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Cerrar Intervención
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Add Progress Form */}
          {isAddingProgress && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-blue-800">Registrar Progreso</h4>
              <div className="space-y-1">
                <Label className="text-xs">Descripción del progreso *</Label>
                <Textarea
                  value={progressForm.descripcion}
                  onChange={e => setProgressForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Describe las acciones realizadas..."
                  className="min-h-[80px] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">% Completado: {progressForm.porcentaje}%</Label>
                  <Slider
                    value={[progressForm.porcentaje]}
                    onValueChange={([v]) => setProgressForm(p => ({ ...p, porcentaje: v }))}
                    max={100} step={5}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nuevo Estado</Label>
                  <Select value={progressForm.estado} onValueChange={v => setProgressForm(p => ({ ...p, estado: v }))}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Pendiente", "En Progreso", "En Revisión"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setIsAddingProgress(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAddProgress} className="bg-blue-600 hover:bg-blue-700">Guardar Progreso</Button>
              </div>
            </div>
          )}

          {/* Close Form */}
          {isClosing && (
            <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-sm text-green-800">Cerrar Intervención</h4>
              <div className="space-y-1">
                <Label className="text-xs">Descripción de la Resolución *</Label>
                <Textarea
                  value={closingForm.descripcion}
                  onChange={e => setClosingForm(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Describe cómo se resolvió la intervención..."
                  className="min-h-[80px] text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={closingForm.satisfactorio} onCheckedChange={v => setClosingForm(p => ({ ...p, satisfactorio: v }))} />
                Resultado Satisfactorio
              </label>
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setIsClosing(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleClose} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirmar Cierre
                </Button>
              </div>
            </div>
          )}

          {/* Progress Timeline */}
          {intervention.progreso?.length > 0 ? (
            <div className="relative pl-6">
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />
              {[...intervention.progreso].reverse().map((p, i) => (
                <div key={i} className="relative mb-4">
                  <div className="absolute -left-3.5 w-5 h-5 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="bg-white border rounded-lg p-3 ml-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-blue-600">{p.registrado_por_nombre || p.registrado_por}</span>
                      <div className="flex items-center gap-2">
                        {p.porcentaje != null && <Badge variant="outline" className="text-xs">{p.porcentaje}%</Badge>}
                        {p.estado && <Badge className={STATUS_CONFIG[p.estado]?.color + " border text-xs"}>{p.estado}</Badge>}
                        <span className="text-xs text-slate-400">{new Date(p.fecha).toLocaleDateString('es-ES')} {new Date(p.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700">{p.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Sin registros de progreso aún</p>
          )}

          {/* Resolución */}
          {intervention.resolucion?.descripcion && (
            <div className="border-2 border-green-300 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Resolución Confirmada
                </h4>
                <Badge className={intervention.resolucion.satisfactorio ? "bg-green-600 text-white" : "bg-red-100 text-red-700"}>
                  {intervention.resolucion.satisfactorio ? "✓ Satisfactorio" : "✗ No Satisfactorio"}
                </Badge>
              </div>
              <p className="text-sm text-green-700">{intervention.resolucion.descripcion}</p>
              <p className="text-xs text-green-600 mt-2">
                Firmado por: <strong>{intervention.resolucion.firmado_por_nombre}</strong> · {new Date(intervention.resolucion.fecha).toLocaleDateString('es-ES')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Gallery Modal */}
      {showImageGallery !== null && (
        <Dialog open={true} onOpenChange={() => setShowImageGallery(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>{intervention.imagenes_adjuntas[showImageGallery]?.nombre}</DialogTitle>
            </DialogHeader>
            <img src={intervention.imagenes_adjuntas[showImageGallery]?.url} alt="" className="w-full rounded-lg" />
            {intervention.imagenes_adjuntas[showImageGallery]?.descripcion && (
              <p className="text-sm text-slate-600 text-center">{intervention.imagenes_adjuntas[showImageGallery].descripcion}</p>
            )}
            <div className="flex justify-center gap-2">
              {intervention.imagenes_adjuntas.map((_, i) => (
                <button key={i} onClick={() => setShowImageGallery(i)} className={`w-2.5 h-2.5 rounded-full ${i === showImageGallery ? 'bg-blue-600' : 'bg-slate-300'}`} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" /> Enviar Orden de Trabajo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Selecciona los destinatarios que recibirán la orden de trabajo por email junto con el PDF adjunto.</p>
            {intervention.destinatarios?.length > 0 ? (
              <div className="space-y-2">
                {intervention.destinatarios.map((d, i) => (
                  <label key={i} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-slate-50 cursor-pointer">
                    <Checkbox
                      checked={selectedRecipients.includes(d.email)}
                      onCheckedChange={v => {
                        setSelectedRecipients(prev =>
                          v ? [...prev, d.email] : prev.filter(e => e !== d.email)
                        );
                      }}
                    />
                    <div>
                      <div className="font-medium text-sm">{d.nombre}</div>
                      <div className="text-xs text-slate-500">{d.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                No hay destinatarios definidos. Añade destinatarios en la edición de la intervención.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>Cancelar</Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail || selectedRecipients.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Enviar y Descargar PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
