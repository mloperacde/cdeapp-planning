import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tantml:react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Upload, FileText, X, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function MobileAbsencesPage() {
  const [showForm, setShowForm] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [formData, setFormData] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    absence_type_id: "",
    motivo: "",
    notas: "",
    documentos_adjuntos: []
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employee } = useQuery({
    queryKey: ['currentEmployee', currentUser?.email],
    queryFn: () => currentUser?.email 
      ? base44.entities.Employee.filter({ email: currentUser.email }).then(r => r[0])
      : null,
    enabled: !!currentUser?.email,
  });

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.filter({ activo: true, visible_empleados: true }),
    initialData: [],
  });

  const { data: absences = [] } = useQuery({
    queryKey: ['myAbsences', employee?.id],
    queryFn: () => employee?.id 
      ? base44.entities.Absence.filter({ employee_id: employee.id }, '-fecha_inicio')
      : [],
    initialData: [],
    enabled: !!employee?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      if (!employee?.id) throw new Error("No employee found");
      
      return base44.entities.Absence.create({
        ...data,
        employee_id: employee.id,
        estado_aprobacion: "Pendiente",
        solicitado_por: currentUser?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAbsences'] });
      toast.success("Solicitud enviada correctamente");
      setShowForm(false);
      setFormData({
        fecha_inicio: "",
        fecha_fin: "",
        absence_type_id: "",
        motivo: "",
        notas: "",
        documentos_adjuntos: []
      });
    },
    onError: () => {
      toast.error("Error al enviar solicitud");
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingFiles(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      
      const documentos = results.map((result, idx) => ({
        nombre: files[idx].name,
        url: result.file_url,
        tipo: files[idx].type,
        fecha_subida: new Date().toISOString()
      }));

      setFormData(prev => ({
        ...prev,
        documentos_adjuntos: [...(prev.documentos_adjuntos || []), ...documentos]
      }));

      toast.success(`${files.length} archivo(s) subido(s)`);
      e.target.value = null;
    } catch (error) {
      toast.error("Error al subir archivos");
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documentos_adjuntos: prev.documentos_adjuntos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const selectedType = absenceTypes.find(at => at.id === formData.absence_type_id);
    
    createMutation.mutate({
      ...formData,
      tipo: selectedType?.nombre,
      remunerada: selectedType?.remunerada || false
    });
  };

  const getEstadoBadge = (estado) => {
    switch(estado) {
      case "Aprobada": return <Badge className="bg-green-600 text-white">Aprobada</Badge>;
      case "Rechazada": return <Badge className="bg-red-600 text-white">Rechazada</Badge>;
      case "Pendiente": return <Badge className="bg-amber-600 text-white">Pendiente</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-slate-600">Cargando información...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 pb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          Mis Ausencias
        </h1>
        <p className="text-blue-100 text-sm mt-1">Solicita y consulta tus permisos</p>
      </div>

      <div className="px-4 -mt-4">
        <Button 
          onClick={() => setShowForm(true)}
          className="w-full bg-white text-blue-600 hover:bg-blue-50 shadow-lg"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Solicitud
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {absences.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No tienes ausencias registradas</p>
            </CardContent>
          </Card>
        ) : (
          absences.map(absence => (
            <Card key={absence.id} className="shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-slate-900">{absence.tipo}</h3>
                    <p className="text-sm text-slate-600">{absence.motivo}</p>
                  </div>
                  {getEstadoBadge(absence.estado_aprobacion)}
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Inicio: {format(new Date(absence.fecha_inicio), "dd/MM/yyyy HH:mm", { locale: es })}
                  </div>
                  {!absence.fecha_fin_desconocida && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Fin: {format(new Date(absence.fecha_fin), "dd/MM/yyyy HH:mm", { locale: es })}
                    </div>
                  )}
                </div>

                {absence.documentos_adjuntos?.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-slate-600 mb-1">Justificantes:</p>
                    <div className="flex flex-wrap gap-1">
                      {absence.documentos_adjuntos.map((doc, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          <FileText className="w-3 h-3 mr-1" />
                          {doc.nombre}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {absence.comentario_aprobacion && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-xs text-slate-600 font-semibold">Comentario:</p>
                    <p className="text-xs text-slate-700">{absence.comentario_aprobacion}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto">
          <div className="min-h-screen p-4 flex items-start justify-center pt-12">
            <Card className="w-full max-w-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center justify-between">
                  <span>Nueva Solicitud</span>
                  <button onClick={() => setShowForm(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Ausencia *</Label>
                    <Select
                      value={formData.absence_type_id}
                      onValueChange={(value) => {
                        const type = absenceTypes.find(at => at.id === value);
                        setFormData({
                          ...formData,
                          absence_type_id: value,
                          motivo: type?.nombre || ""
                        });
                      }}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {absenceTypes.map(type => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Fecha Inicio *</Label>
                      <Input
                        type="datetime-local"
                        value={formData.fecha_inicio}
                        onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Fin *</Label>
                      <Input
                        type="datetime-local"
                        value={formData.fecha_fin}
                        onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Motivo Detallado</Label>
                    <Textarea
                      value={formData.motivo}
                      onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                      rows={2}
                      placeholder="Describe el motivo..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notas Adicionales</Label>
                    <Textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      rows={2}
                      placeholder="Notas opcionales..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Justificantes</Label>
                    <input
                      type="file"
                      id="files"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('files').click()}
                      disabled={uploadingFiles}
                      className="w-full"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploadingFiles ? "Subiendo..." : "Adjuntar Archivos"}
                    </Button>

                    {formData.documentos_adjuntos?.length > 0 && (
                      <div className="space-y-1">
                        {formData.documentos_adjuntos.map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs">
                            <span className="truncate flex-1">{doc.nombre}</span>
                            <button type="button" onClick={() => removeDocument(idx)}>
                              <X className="w-3 h-3 text-red-600" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="flex-1 bg-blue-600"
                    >
                      {createMutation.isPending ? "Enviando..." : "Enviar Solicitud"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}