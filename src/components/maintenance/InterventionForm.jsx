import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAppData } from "@/components/data/DataProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, X, Upload, Image, Wrench, Users, MapPin, 
  Package, AlertTriangle, Save, Loader2
} from "lucide-react";
import { toast } from "sonner";

const TIPOS = ["Acción", "Modificación", "Mejora", "Resolución de Incidencia", "Mejora de Instalación", "Mejora de Máquina", "Otro"];
const PRIORIDADES = ["Baja", "Media", "Alta", "Crítica"];
const OBJETIVO_TIPOS = ["Global", "Área", "Sala", "Máquina", "Sala-Máquina", "Instalación", "Personalizado"];
const NECESIDAD_TIPOS = ["Herramienta", "Material", "Personal", "Tiempo", "Permiso", "Otro"];

export default function InterventionForm({ intervention, onSave, onCancel }) {
  const { user, machines, employees } = useAppData();
  const [form, setForm] = useState({
    titulo: "", tipo: "Acción", descripcion: "", prioridad: "Media",
    estado: "Pendiente", objetivo_tipo: "Personalizado",
    objetivo_maquina_id: "", objetivo_maquina_nombre: "",
    objetivo_area: "", objetivo_sala: "", objetivo_descripcion_manual: "",
    solicitante_nombre: user?.full_name || "",
    solicitante_email: user?.email || "",
    solicitante_departamento: "",
    fecha_inicio_prevista: "", fecha_fin_prevista: "",
    destinatarios: [], necesidades: [], imagenes_adjuntas: [],
    notas_adicionales: ""
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [newNecesidad, setNewNecesidad] = useState({ tipo: "Herramienta", descripcion: "", cantidad: "", disponible: false });
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (intervention) {
      setForm({ ...form, ...intervention });
    }
  }, [intervention]);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleMachineChange = (machineId) => {
    const machine = machines.find(m => m.id === machineId);
    update("objetivo_maquina_id", machineId);
    update("objetivo_maquina_nombre", machine?.nombre || machine?.alias || "");
  };

  const addDestinatario = (emp) => {
    if (!emp || form.destinatarios.find(d => d.email === emp.email)) return;
    update("destinatarios", [...form.destinatarios, {
      nombre: emp.nombre || emp.full_name || "",
      email: emp.email || "",
      rol: emp.puesto || emp.departamento || ""
    }]);
  };

  const removeDestinatario = (email) => {
    update("destinatarios", form.destinatarios.filter(d => d.email !== email));
  };

  const addNecesidad = () => {
    if (!newNecesidad.descripcion) return;
    update("necesidades", [...form.necesidades, { ...newNecesidad }]);
    setNewNecesidad({ tipo: "Herramienta", descripcion: "", cantidad: "", disponible: false });
  };

  const removeNecesidad = (i) => {
    update("necesidades", form.necesidades.filter((_, idx) => idx !== i));
  };

  const uploadFiles = async (files) => {
    if (!files.length) return;
    setUploadingImage(true);
    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setForm(prev => ({
          ...prev,
          imagenes_adjuntas: [
            ...prev.imagenes_adjuntas,
            {
              url: file_url,
              nombre: file.name,
              descripcion: ""
            }
          ]
        }));
      }
      toast.success("Imagen(es) subida(s) correctamente");
    } catch (err) {
      toast.error("Error al subir imagen: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    await uploadFiles(files);
    e.target.value = "";
  };

  const removeImage = (i) => {
    update("imagenes_adjuntas", form.imagenes_adjuntas.filter((_, idx) => idx !== i));
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Este dispositivo no permite abrir la cámara desde el navegador");
        setShowCamera(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast.error("No se pudo acceder a la cámara: " + err.message);
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("No se pudo capturar la imagen");
        return;
      }
      const file = new File([blob], `foto-intervencion-${Date.now()}.jpg`, { type: "image/jpeg" });
      await uploadFiles([file]);
      setShowCamera(false);
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [showCamera]);

  const handleSubmit = async () => {
    if (!form.titulo || !form.descripcion) {
      toast.error("Título y descripción son obligatorios");
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        ...form,
        fecha_solicitud: form.fecha_solicitud || now,
        numero_orden: form.numero_orden || `INT-${Date.now().toString(36).toUpperCase()}`
      };
      let saved;
      if (intervention?.id) {
        saved = await base44.entities.MaintenanceIntervention.update(intervention.id, payload);
      } else {
        saved = await base44.entities.MaintenanceIntervention.create(payload);
      }
      toast.success(intervention?.id ? "Intervención actualizada" : "Intervención creada correctamente");
      onSave(saved);
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* INFO GENERAL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" /> Información General
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label>Título *</Label>
            <Input value={form.titulo} onChange={e => update("titulo", e.target.value)} placeholder="Título descriptivo de la intervención" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Intervención</Label>
            <Select value={form.tipo} onValueChange={v => update("tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prioridad</Label>
            <Select value={form.prioridad} onValueChange={v => update("prioridad", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORIDADES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha Inicio Prevista</Label>
            <Input type="date" value={form.fecha_inicio_prevista} onChange={e => update("fecha_inicio_prevista", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fecha Fin Prevista</Label>
            <Input type="date" value={form.fecha_fin_prevista} onChange={e => update("fecha_fin_prevista", e.target.value)} />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Descripción Detallada *</Label>
            <Textarea value={form.descripcion} onChange={e => update("descripcion", e.target.value)} placeholder="Describe detalladamente la intervención a realizar, el problema a resolver o la mejora a implementar..." className="min-h-[100px]" />
          </div>
        </CardContent>
      </Card>

      {/* SOLICITANTE */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Solicitante
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={form.solicitante_nombre} onChange={e => update("solicitante_nombre", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.solicitante_email} onChange={e => update("solicitante_email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Departamento</Label>
            <Input value={form.solicitante_departamento} onChange={e => update("solicitante_departamento", e.target.value)} placeholder="Dpto. del solicitante" />
          </div>
        </CardContent>
      </Card>

      {/* OBJETIVO */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" /> Objetivo de la Intervención
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Objetivo</Label>
            <Select value={form.objetivo_tipo} onValueChange={v => update("objetivo_tipo", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OBJETIVO_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(form.objetivo_tipo === "Máquina" || form.objetivo_tipo === "Sala-Máquina") && (
              <div className="space-y-2">
                <Label>Máquina</Label>
                <Select value={form.objetivo_maquina_id} onValueChange={handleMachineChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar máquina..." /></SelectTrigger>
                  <SelectContent>
                    {machines.map(m => <SelectItem key={m.id} value={m.id}>{m.alias || m.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {(form.objetivo_tipo === "Área" || form.objetivo_tipo === "Sala-Máquina") && (
              <div className="space-y-2">
                <Label>Área</Label>
                <Input value={form.objetivo_area} onChange={e => update("objetivo_area", e.target.value)} placeholder="Nombre del área" />
              </div>
            )}
            {(form.objetivo_tipo === "Sala" || form.objetivo_tipo === "Sala-Máquina") && (
              <div className="space-y-2">
                <Label>Sala</Label>
                <Input value={form.objetivo_sala} onChange={e => update("objetivo_sala", e.target.value)} placeholder="Nombre de la sala" />
              </div>
            )}
            {(form.objetivo_tipo === "Personalizado" || form.objetivo_tipo === "Instalación" || form.objetivo_tipo === "Global") && (
              <div className="space-y-2 md:col-span-2">
                <Label>Descripción del Objetivo</Label>
                <Input value={form.objetivo_descripcion_manual} onChange={e => update("objetivo_descripcion_manual", e.target.value)} placeholder="Describe el objetivo o ubicación específica..." />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DESTINATARIOS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" /> Destinatarios / Responsables
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select onValueChange={v => addDestinatario(employees.find(e => e.email === v))}>
            <SelectTrigger><SelectValue placeholder="Añadir destinatario de la app..." /></SelectTrigger>
            <SelectContent>
              {employees.filter(e => e.email).map(e => (
                <SelectItem key={e.id} value={e.email}>{e.nombre || e.full_name} ({e.email})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.destinatarios.length > 0 && (
            <div className="space-y-2">
              {form.destinatarios.map((d, i) => (
                <div key={i} className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2">
                  <div>
                    <span className="font-medium text-sm">{d.nombre}</span>
                    <span className="text-xs text-slate-500 ml-2">{d.email}</span>
                    {d.rol && <Badge variant="outline" className="ml-2 text-xs">{d.rol}</Badge>}
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => removeDestinatario(d.email)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NECESIDADES */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" /> Recursos y Necesidades
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={newNecesidad.tipo} onValueChange={v => setNewNecesidad(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{NECESIDAD_TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Input className="h-8" value={newNecesidad.descripcion} onChange={e => setNewNecesidad(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej. Llave inglesa" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cantidad</Label>
              <Input className="h-8" value={newNecesidad.cantidad} onChange={e => setNewNecesidad(p => ({ ...p, cantidad: e.target.value }))} placeholder="Ej. 2 uds." />
            </div>
            <Button size="sm" onClick={addNecesidad} className="h-8"><Plus className="w-3 h-3 mr-1" />Añadir</Button>
          </div>
          {form.necesidades.length > 0 && (
            <div className="space-y-1.5">
              {form.necesidades.map((n, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-50 border rounded p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{n.tipo}</Badge>
                    <span>{n.descripcion}</span>
                    {n.cantidad && <span className="text-slate-500 text-xs">({n.cantidad})</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <Checkbox checked={n.disponible} onCheckedChange={v => {
                        const nec = [...form.necesidades];
                        nec[i] = { ...nec[i], disponible: v };
                        update("necesidades", nec);
                      }} />
                      Disponible
                    </label>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-red-400" onClick={() => removeNecesidad(i)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IMÁGENES */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Image className="w-4 h-4 text-blue-600" /> Imágenes Descriptivas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <label className="flex-1 flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-blue-400 transition-colors">
              {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Upload className="w-5 h-5 text-slate-400" />}
              <span className="text-sm text-slate-500">{uploadingImage ? "Subiendo..." : "Seleccionar imágenes del dispositivo..."}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
            </label>
            <button
              type="button"
              className="flex-1 flex items-center gap-2 cursor-pointer border-2 border-dashed border-slate-300 rounded-lg p-4 hover:border-blue-400 transition-colors bg-white"
              onClick={() => setShowCamera(true)}
              disabled={uploadingImage}
            >
              {uploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-blue-600" /> : <Upload className="w-5 h-5 text-slate-400" />}
              <span className="text-sm text-slate-500">{uploadingImage ? "Subiendo..." : "Tomar foto con la cámara"}</span>
            </button>
          </div>
          {form.imagenes_adjuntas.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {form.imagenes_adjuntas.map((img, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border">
                  <img src={img.url} alt={img.nombre} className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all" />
                  <Button 
                    variant="destructive" size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(i)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <Input 
                    className="absolute bottom-0 left-0 right-0 h-6 text-xs rounded-none border-0 bg-black bg-opacity-50 text-white placeholder:text-gray-300"
                    placeholder="Descripción de la imagen..."
                    value={img.descripcion}
                    onChange={e => {
                      const imgs = [...form.imagenes_adjuntas];
                      imgs[i] = { ...imgs[i], descripcion: e.target.value };
                      update("imagenes_adjuntas", imgs);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* NOTAS */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-600">Notas Adicionales</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea value={form.notas_adicionales} onChange={e => update("notas_adicionales", e.target.value)} placeholder="Notas o comentarios adicionales..." className="min-h-[80px]" />
        </CardContent>
      </Card>

      {/* ACTIONS */}
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {intervention?.id ? "Guardar Cambios" : "Crear Intervención"}
        </Button>
      </div>

      <Dialog open={showCamera} onOpenChange={v => setShowCamera(v)}>
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Image className="w-4 h-4 text-blue-600" />
              Tomar foto
            </DialogTitle>
            <DialogDescription className="text-xs">
              Permite capturar una imagen directamente desde la cámara del dispositivo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <video ref={videoRef} className="w-full rounded bg-black" autoPlay playsInline />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCamera(false)}>Cancelar</Button>
              <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700">
                Tomar foto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
