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
import { Calendar, Upload, FileText, Image as ImageIcon, Wrench, TrendingUp, X, Download, Settings2, Copy } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { getMachineAlias } from "@/utils/machineAlias";
import MachineProcessesTab from "./MachineProcessesTab";

export default function MachineDetailCard({ machine, onClose, initialEditMode = false, isNew = false, canEdit = true }) {
  const [editMode, setEditMode] = useState(canEdit ? !!initialEditMode : false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nombre_maquina: machine.nombre_maquina || (machine.nombre && !machine.nombre.includes('(') ? machine.nombre : "") || "",
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
    programa_mantenimiento: machine.programa_mantenimiento || "",
    imagenes: machine.imagenes || [],
    archivos_adjuntos: machine.archivos_adjuntos || [],
  });

  const getCanonicalName = (data) => {
    return getMachineAlias({
      ...data,
      nombre_maquina: data.nombre_maquina,
      nombre: data.nombre_maquina, // Fallback if nombre_maquina is empty
      ubicacion: data.ubicacion,
      codigo: data.codigo
    });
  };

  const { data: maintenances } = useQuery({
    queryKey: ['maintenances', machine.id],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ machine_id: machine.id }, '-fecha_programada'),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      const canonicalName = getCanonicalName(data);
      
      // Siempre actualizar en MachineMasterDatabase
      return base44.entities.MachineMasterDatabase.update(machine.id, {
        ...machine._raw,
        ...data,
        nombre_maquina: data.nombre_maquina, // Nuevo campo corto
        nombre: canonicalName, // Campo largo compuesto calculado
        codigo_maquina: data.codigo || machine.codigo,
        estado_operativo: data.estado || machine.estado,
        estado_produccion: data.estado_produccion || machine.estado_produccion,
        estado_disponibilidad: data.estado_disponibilidad || machine.estado_disponibilidad,
        orden_visualizacion: data.orden || machine.orden,
        descripcion: canonicalName // Campo largo compuesto calculado
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
    const canonicalName = getCanonicalName(formData);

    if (!machine.id || isNew) {
      base44.entities.MachineMasterDatabase.create({
        nombre_maquina: formData.nombre_maquina,
        nombre: canonicalName,
        descripcion: canonicalName,
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
          moved.nombre_maquina = formData.nombre_maquina;
          moved.nombre = canonicalName;
          moved.descripcion = formData.descripcion;
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
          nombre_maquina: formData.nombre_maquina,
          nombre: canonicalName,
          descripcion: formData.descripcion,
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
            <div className="flex flex-col overflow-hidden max-w-[70%]">
              <span className="truncate text-lg">
                {getMachineAlias(machine)}
              </span>
            </div>
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
                <div className="space-y-6">
                  {/* Identificador Principal - Full Width */}
                  <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                    <Label className="text-base font-semibold text-blue-600 dark:text-blue-400">
                      Descripción (Identificador Único)
                    </Label>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                      Este campo es el identificador principal del sistema y se genera automáticamente: [Ubicación] [Código] - [Nombre Máquina]
                    </p>
                    <Input
                      value={getCanonicalName(formData)}
                      readOnly
                      className="bg-white dark:bg-slate-900 font-medium text-lg border-blue-200 dark:border-blue-800 text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre Máquina</Label>
                      <Input
                        value={formData.nombre_maquina}
                        onChange={(e) => setFormData({ ...formData, nombre_maquina: e.target.value })}
                        placeholder="Ej: Torno CNC 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input
                        value={formData.codigo}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                        placeholder="Ej: M001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sala / Ubicación</Label>
                      <Input
                        value={formData.ubicacion}
                        onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                        placeholder="Ej: Sala 1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Input
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                        placeholder="Ej: Torno"
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
                    <div className="space-y-2">
                      <Label>Ordenación</Label>
                      <Input
                        type="number"
                        min={1}
                        value={formData.orden}
                        onChange={(e) => setFormData({ ...formData, orden: Number(e.target.value || 1) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
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
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-lg border border-blue-100 dark:bg-slate-800/50 dark:border-slate-700">
                    <Label className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 block">
                      Información de la Máquina
                    </Label>
                    <div className="flex flex-col gap-1">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {getMachineAlias(machine)}
                      </h3>
                    </div>
                  </div>

                  {(machine.id_base44 || machine.estado_sincronizacion === 'Sincronizado') && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 dark:bg-orange-900/10 dark:border-orange-900/50">
                      <Label className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1 block">
                        Sincronización Externa
                      </Label>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono text-slate-700 dark:text-slate-300 bg-white dark:bg-black/20 px-2 py-1 rounded border border-orange-200 dark:border-orange-800">
                            {machine.id_base44 || machine.codigo || 'N/A'}
                          </code>
                          <span className="text-[10px] text-orange-600/70 dark:text-orange-400/70">
                            {machine.id_base44 ? 'ID Externo (Vinculado)' : 'Vinculado por Código'}
                          </span>
                        </div>
                        {machine.ultimo_sincronizado && (
                           <span className="text-[10px] text-slate-400">
                             Última act: {new Date(machine.ultimo_sincronizado).toLocaleString()}
                           </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase font-semibold">ID Sistema</span>
                      <div className="flex items-center gap-1">
                          <p className="font-medium font-mono text-xs truncate max-w-[120px]" title={machine.id}>{machine.id}</p>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(machine.id); toast.success("ID copiado"); }}>
                              <Copy className="h-3 w-3" />
                          </Button>
                      </div>
                    </div>
                    {machine.cde_machine_id && (
                        <div className="space-y-1">
                            <span className="text-xs text-slate-500 uppercase font-semibold">ID Externo (CDE)</span>
                            <div className="flex items-center gap-1">
                                <p className="font-medium font-mono text-xs truncate max-w-[120px]" title={machine.cde_machine_id}>{machine.cde_machine_id}</p>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { navigator.clipboard.writeText(machine.cde_machine_id); toast.success("ID Externo copiado"); }}>
                                    <Copy className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Tipo</span>
                      <p className="font-medium">{machine.tipo || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Marca / Modelo</span>
                      <p className="font-medium">{machine.marca || "-"} {machine.modelo ? `/ ${machine.modelo}` : ""}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Nº Serie</span>
                      <p className="font-medium font-mono">{machine.numero_serie || "-"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Fecha Compra</span>
                      <p className="font-medium">
                        {machine.fecha_compra ? format(new Date(machine.fecha_compra), "dd/MM/yyyy", { locale: es }) : '-'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Estado Producción</span>
                      <div><Badge variant="outline">{machine.estado_produccion || 'Sin Producción'}</Badge></div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-500 uppercase font-semibold">Disponibilidad</span>
                      <div>
                        <Badge variant={machine.estado_disponibilidad === 'Disponible' ? 'default' : 'destructive'}>
                          {machine.estado_disponibilidad || 'Disponible'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {machine.programa_mantenimiento && (
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-slate-500 uppercase font-semibold block mb-1">Programa de Mantenimiento</span>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{machine.programa_mantenimiento}</p>
                    </div>
                  )}
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
