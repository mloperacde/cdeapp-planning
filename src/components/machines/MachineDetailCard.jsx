import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Upload, FileText, Image as ImageIcon, Wrench, TrendingUp, X, Download, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import MachineProcessesTab from "./MachineProcessesTab";

export default function MachineDetailCard({ machine, onClose, initialEditMode = false, isNew = false, canEdit = true }) {
  const [editMode, setEditMode] = useState(canEdit ? !!initialEditMode : false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre: machine.nombre || "",
    codigo: machine.codigo || "",
    marca: machine.marca || "",
    modelo: machine.modelo || "",
    numero_serie: machine.numero_serie || "",
    fecha_compra: machine.fecha_compra || "",
    tipo: machine.tipo || "",
    ubicacion: machine.ubicacion || "",
    estado: machine.estado || "Disponible",
    estado_produccion: machine.estado_produccion || "Sin Producción",
    estado_disponibilidad: machine.estado_disponibilidad || "Disponible",
    orden: machine.orden || 1,
    descripcion: machine.descripcion || "",
    programa_mantenimiento: machine.programa_mantenimiento || "",
    imagenes: machine.imagenes || [],
    archivos_adjuntos: machine.archivos_adjuntos || [],
  });

  // Actualizar descripción automáticamente cuando cambian los campos relacionados
  useEffect(() => {
    if (editMode) {
      const sala = formData.ubicacion || "";
      const codigo = formData.codigo || "";
      const nombre = formData.nombre || "";
      const newDescription = `${sala} ${codigo} - ${nombre}`.trim();
      
      // Solo actualizar si la descripción generada es diferente
      // y si queremos forzar el formato (o si el campo está vacío)
      if (formData.descripcion !== newDescription) {
        setFormData(prev => ({ ...prev, descripcion: newDescription }));
      }
    }
  }, [formData.ubicacion, formData.codigo, formData.nombre, editMode]);

  const { data: maintenances } = useQuery({
    queryKey: ['maintenances', machine.id],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ machine_id: machine.id }, '-fecha_programada'),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const sala = data.ubicacion || machine.ubicacion || "";
      const codigo = data.codigo || machine.codigo || "";
      const nombre = data.nombre || machine.nombre || "";
      const generatedDescription = `${sala} ${codigo} - ${nombre}`.trim();

      // Siempre actualizar en MachineMasterDatabase
      return base44.entities.MachineMasterDatabase.update(machine.id, {
        ...machine._raw,
        ...data,
        codigo_maquina: data.codigo || machine.codigo,
        estado_operativo: data.estado || machine.estado,
        estado_produccion: data.estado_produccion || machine.estado_produccion,
        estado_disponibilidad: data.estado_disponibilidad || machine.estado_disponibilidad,
        orden_visualizacion: data.orden || machine.orden,
        descripcion: generatedDescription
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setEditMode(false);
      toast.success("Máquina actualizada correctamente");
    },
  });

  const handleSave = () => {
    const desiredOrder = Math.max(1, Number(formData.orden || 1));
    if (!machine.id || isNew) {
      base44.entities.MachineMasterDatabase.create({
        nombre: formData.nombre,
        codigo_maquina: formData.codigo,
        marca: formData.marca || "",
        modelo: formData.modelo || "",
        numero_serie: formData.numero_serie || "",
        fecha_compra: formData.fecha_compra || "",
        tipo: formData.tipo || "",
        ubicacion: formData.ubicacion || "",
        estado_operativo: formData.estado || "Disponible",
        estado_produccion: formData.estado_produccion || "Sin Producción",
        estado_disponibilidad: formData.estado_disponibilidad || "Disponible",
        orden_visualizacion: desiredOrder
      }).then(async (created) => {
        const list = await base44.entities.MachineMasterDatabase.list(undefined, 500);
        const ordered = Array.isArray(list) ? list.sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999)) : [];
        const idx = ordered.findIndex(m => m.id === created.id);
        const newIndex = desiredOrder - 1;
        if (idx >= 0 && newIndex !== idx) {
          const [moved] = ordered.splice(idx, 1);
          ordered.splice(newIndex, 0, moved);
        }
        await Promise.all(ordered.map((m, i) => base44.entities.MachineMasterDatabase.update(m.id, { orden_visualizacion: i + 1 })));
        queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
        queryClient.invalidateQueries({ queryKey: ['machines'] });
        setEditMode(false);
        toast.success("Máquina creada correctamente");
        onClose && onClose();
      }).catch(err => toast.error("Error al crear: " + err.message));
      return;
    }
    if (Number(machine.orden || 1) !== desiredOrder) {
      base44.entities.MachineMasterDatabase.list(undefined, 500).then(async (list) => {
        const ordered = Array.isArray(list) ? list.sort((a, b) => (a.orden_visualizacion || 999) - (b.orden_visualizacion || 999)) : [];
        const idx = ordered.findIndex(m => m.id === machine.id);
        const newIndex = desiredOrder - 1;
        if (idx >= 0) {
          const [moved] = ordered.splice(idx, 1);
          moved.nombre = formData.nombre;
          moved.codigo_maquina = formData.codigo;
          moved.marca = formData.marca || "";
          moved.modelo = formData.modelo || "";
          moved.numero_serie = formData.numero_serie || "";
          moved.fecha_compra = formData.fecha_compra || "";
          moved.tipo = formData.tipo || "";
          moved.ubicacion = formData.ubicacion || "";
          moved.estado_operativo = formData.estado || "Disponible";
          moved.estado_produccion = formData.estado_produccion || "Sin Producción";
          moved.estado_disponibilidad = formData.estado_disponibilidad || "Disponible";
          ordered.splice(newIndex, 0, moved);
        }
        await Promise.all(ordered.map((m, i) => base44.entities.MachineMasterDatabase.update(m.id, { 
          orden_visualizacion: i + 1 
        })));
        await base44.entities.MachineMasterDatabase.update(machine.id, {
          nombre: formData.nombre,
          codigo_maquina: formData.codigo,
          marca: formData.marca || "",
          modelo: formData.modelo || "",
          numero_serie: formData.numero_serie || "",
          fecha_compra: formData.fecha_compra || "",
          tipo: formData.tipo || "",
          ubicacion: formData.ubicacion || "",
          estado_operativo: formData.estado || "Disponible",
          estado_produccion: formData.estado_produccion || "Sin Producción",
          estado_disponibilidad: formData.estado_disponibilidad || "Disponible",
        });
        queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
        queryClient.invalidateQueries({ queryKey: ['machines'] });
        setEditMode(false);
        toast.success("Máquina y orden actualizados");
        onClose && onClose();
      }).catch(err => toast.error("Error al actualizar orden: " + err.message));
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await base44.integrations.Core.UploadFile({ file });
      const newImagenes = [...formData.imagenes, response.file_url];
      
      setFormData({ ...formData, imagenes: newImagenes });
      await base44.entities.MachineMasterDatabase.update(machine.id, { imagenes: newImagenes });
      queryClient.invalidateQueries({ queryKey: ['machineMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success("Imagen subida correctamente");
    } catch (error) {
      toast.error("Error al subir la imagen");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      const newFile = {
        nombre: file.name,
        url: response.file_url,
        tipo: file.type,
        fecha_subida: new Date().toISOString()
      };
      
      const newArchivos = [...formData.archivos_adjuntos, newFile];
      setFormData({ ...formData, archivos_adjuntos: newArchivos });
      await base44.entities.Machine.update(machine.id, { archivos_adjuntos: newArchivos });
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success("Archivo subido correctamente");
    } catch (error) {
      toast.error("Error al subir el archivo");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveImage = async (index) => {
    const newImagenes = formData.imagenes.filter((_, i) => i !== index);
    setFormData({ ...formData, imagenes: newImagenes });
    await base44.entities.Machine.update(machine.id, { imagenes: newImagenes });
    queryClient.invalidateQueries({ queryKey: ['machines'] });
  };

  const handleRemoveFile = async (index) => {
    const newArchivos = formData.archivos_adjuntos.filter((_, i) => i !== index);
    setFormData({ ...formData, archivos_adjuntos: newArchivos });
    await base44.entities.Machine.update(machine.id, { archivos_adjuntos: newArchivos });
    queryClient.invalidateQueries({ queryKey: ['machines'] });
  };

  const proximosMantenimientos = maintenances.filter(m => 
    m.estado === "Pendiente" || m.estado === "Programado"
  ).slice(0, 5);

  const historialMantenimientos = maintenances.filter(m => 
    m.estado === "Completado"
  ).slice(0, 10);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate max-w-[70%]">
              {machine.descripcion || machine.nombre || "Ficha de Máquina"}
            </span>
            {canEdit && (
              <div className="flex gap-2">
                {!editMode ? (
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    Editar
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                      Guardar
                    </Button>
                  </>
                )}
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="processes">Procesos</TabsTrigger>
            <TabsTrigger value="files">Archivos</TabsTrigger>
            <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-6">
          {/* Información Básica */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Básica</CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Código</Label>
                    <Input
                      value={formData.codigo}
                      onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Serie</Label>
                    <Input
                      value={formData.numero_serie}
                      onChange={(e) => setFormData({ ...formData, numero_serie: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Compra</Label>
                    <Input
                      type="date"
                      value={formData.fecha_compra}
                      onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Input
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ubicación</Label>
                    <Input
                      value={formData.ubicacion}
                      onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ordenación</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.orden}
                      onChange={(e) => setFormData({ ...formData, orden: Number(e.target.value || 1) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado de Producción</Label>
                    <Select
                      value={formData.estado_produccion}
                      onValueChange={(v) => setFormData({ ...formData, estado_produccion: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="En cambio">En cambio</SelectItem>
                        <SelectItem value="En producción">En producción</SelectItem>
                        <SelectItem value="Pendiente de Inicio">Pendiente de Inicio</SelectItem>
                        <SelectItem value="Sin Producción">Sin Producción</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Disponibilidad</Label>
                    <Select
                      value={formData.estado_disponibilidad}
                      onValueChange={(v) => setFormData({ ...formData, estado_disponibilidad: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Disponible">Disponible</SelectItem>
                        <SelectItem value="No disponible">No disponible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Descripción (Auto-generada)</Label>
                    <Textarea
                      value={formData.descripcion}
                      readOnly
                      className="bg-slate-100 dark:bg-slate-800 text-slate-500"
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">
                      Formato: Sala Código - Nombre (Se actualiza automáticamente)
                    </p>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Programa de Mantenimiento</Label>
                    <Textarea
                      value={formData.programa_mantenimiento}
                      onChange={(e) => setFormData({ ...formData, programa_mantenimiento: e.target.value })}
                      rows={2}
                      placeholder="Descripción del programa de mantenimiento aplicable..."
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {machine.descripcion || machine.nombre}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {machine.codigo} - {machine.nombre}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="font-semibold">Marca:</span> {machine.marca || 'N/A'}</div>
                    <div><span className="font-semibold">Modelo:</span> {machine.modelo || 'N/A'}</div>
                  <div><span className="font-semibold">Número de Serie:</span> {machine.numero_serie || 'N/A'}</div>
                  <div>
                    <span className="font-semibold">Fecha de Compra:</span>{" "}
                    {machine.fecha_compra ? format(new Date(machine.fecha_compra), "dd/MM/yyyy", { locale: es }) : 'N/A'}
                  </div>
                  <div><span className="font-semibold">Tipo:</span> {machine.tipo || 'N/A'}</div>
                  <div><span className="font-semibold">Ubicación:</span> {machine.ubicacion || 'N/A'}</div>
                  <div className="col-span-2">
                    <span className="font-semibold">Estado:</span>{" "}
                    <Badge className={machine.estado === "Disponible" ? "bg-green-600" : "bg-red-600"}>
                      {machine.estado}
                    </Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">Estado de Producción:</span>{" "}
                    <Badge>{machine.estado_produccion || 'Sin Producción'}</Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="font-semibold">Disponibilidad:</span>{" "}
                    <Badge>{machine.estado_disponibilidad || 'Disponible'}</Badge>
                  </div>
                  {machine.programa_mantenimiento && (
                    <div className="col-span-2">
                      <span className="font-semibold">Programa de Mantenimiento:</span> {machine.programa_mantenimiento}
                    </div>
                  )}
                </div>
              </div>
            )}
            </CardContent>
          </Card>


          </TabsContent>

          <TabsContent value="processes">
            <MachineProcessesTab machine={machine} />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
          {/* Imágenes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                  Imágenes
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('image-upload').click()}
                  disabled={uploadingImage}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingImage ? "Subiendo..." : "Subir Imagen"}
                </Button>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadImage}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.imagenes.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay imágenes</p>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {formData.imagenes.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Imagen ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Archivos Adjuntos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Documentos y Archivos
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload').click()}
                  disabled={uploadingFile}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploadingFile ? "Subiendo..." : "Subir Archivo"}
                </Button>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleUploadFile}
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.archivos_adjuntos.length === 0 ? (
                <p className="text-center text-slate-400 py-8">No hay archivos adjuntos</p>
              ) : (
                <div className="space-y-2">
                  {formData.archivos_adjuntos.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-sm">{file.nombre}</div>
                          <div className="text-xs text-slate-500">
                            {file.fecha_subida ? format(new Date(file.fecha_subida), "dd/MM/yyyy HH:mm", { locale: es }) : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(file.url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
          {/* Próximos Mantenimientos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Próximos Mantenimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proximosMantenimientos.length === 0 ? (
                <p className="text-center text-slate-400 py-4">No hay mantenimientos programados</p>
              ) : (
                <div className="space-y-2">
                  {proximosMantenimientos.map((maint) => (
                    <div key={maint.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div>
                        <div className="font-medium text-sm">{maint.tipo}</div>
                        <div className="text-xs text-slate-600">
                          {format(new Date(maint.fecha_programada), "dd/MM/yyyy HH:mm", { locale: es })}
                        </div>
                      </div>
                      <Badge className="bg-orange-600">{maint.estado}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Historial de Mantenimientos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="w-5 h-5 text-green-600" />
                Historial de Mantenimientos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {historialMantenimientos.length === 0 ? (
                <p className="text-center text-slate-400 py-4">No hay historial</p>
              ) : (
                <div className="space-y-2">
                  {historialMantenimientos.map((maint) => (
                    <div key={maint.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                      <div>
                        <div className="font-medium text-sm">{maint.tipo}</div>
                        <div className="text-xs text-slate-600">
                          {maint.fecha_finalizacion 
                            ? format(new Date(maint.fecha_finalizacion), "dd/MM/yyyy", { locale: es })
                            : 'N/A'}
                        </div>
                      </div>
                      <Badge className="bg-green-600">Completado</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
