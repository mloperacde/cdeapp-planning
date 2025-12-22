import React, { useState } from "react";
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
import { Calendar, Upload, FileText, Image as ImageIcon, Wrench, TrendingUp, X, Download, Settings2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import MachineProcessesTab from "./MachineProcessesTab";

export default function MachineDetailCard({ machine, onClose }) {
  const [editMode, setEditMode] = useState(false);
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
    descripcion: machine.descripcion || "",
    programa_mantenimiento: machine.programa_mantenimiento || "",
    imagenes: machine.imagenes || [],
    archivos_adjuntos: machine.archivos_adjuntos || [],
  });

  const { data: maintenances } = useQuery({
    queryKey: ['maintenances', machine.id],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ machine_id: machine.id }, '-fecha_programada'),
    initialData: [],
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Machine.update(machine.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setEditMode(false);
      toast.success("Máquina actualizada correctamente");
    },
  });

  const handleSave = () => {
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
      await base44.entities.Machine.update(machine.id, { imagenes: newImagenes });
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
            <span>Ficha Completa de Máquina</span>
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
                  <div className="col-span-2 space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={3}
                    />
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
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="font-semibold">Nombre:</span> {machine.nombre}</div>
                  <div><span className="font-semibold">Código:</span> {machine.codigo}</div>
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
                  {machine.descripcion && (
                    <div className="col-span-2">
                      <span className="font-semibold">Descripción:</span> {machine.descripcion}
                    </div>
                  )}
                  {machine.programa_mantenimiento && (
                    <div className="col-span-2">
                      <span className="font-semibold">Programa de Mantenimiento:</span> {machine.programa_mantenimiento}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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

          <TabsContent value="processes">
            <MachineProcessesTab machine={machine} />
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
          {/* Imágenes */}
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

          </TabsContent>

          <TabsContent value="maintenance" className="space-y-6">
          {/* Próximos Mantenimientos */}
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