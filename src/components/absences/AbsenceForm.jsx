import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Trash2, Infinity, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Sugerencias de motivos frecuentes por tipo
const SUGGESTED_REASONS = {
  "Baja médica": [
    "Gripe / Resfriado común",
    "Gastroenteritis",
    "Lesión muscular",
    "Dolor de espalda / Lumbalgia",
    "Cirugía programada",
    "Recuperación post-operatoria",
    "Estrés / Ansiedad",
    "Migraña",
    "Tratamiento médico",
    "Enfermedad crónica",
    "Otra enfermedad"
  ],
  "Indisposición": [
    "Malestar general",
    "Dolor de cabeza intenso",
    "Mareo / Vértigo",
    "Problemas digestivos",
    "Fatiga extrema",
    "Reacción alérgica",
    "Otra indisposición"
  ],
  "Accidente laboral": [
    "Caída en el lugar de trabajo",
    "Golpe con maquinaria",
    "Corte / Herida",
    "Quemadura",
    "Esguince / Torcedura",
    "Lesión por movimiento repetitivo",
    "Exposición a sustancias nocivas",
    "Otro accidente laboral"
  ],
  "Fuerza mayor": [
    "Emergencia familiar grave",
    "Hospitalización de familiar directo",
    "Fallecimiento de familiar",
    "Desastre natural",
    "Problema de transporte grave",
    "Incendio en domicilio",
    "Inundación",
    "Otra causa de fuerza mayor"
  ],
  "Permiso no remunerado": [
    "Asuntos personales",
    "Cuidado de familiar",
    "Trámites legales",
    "Mudanza",
    "Viaje personal",
    "Formación no laboral",
    "Otro motivo personal"
  ]
};

export default function AbsenceForm({ 
  initialData, 
  employees = [], 
  absenceTypes = [], 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}) {
  const [formData, setFormData] = useState({
    employee_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    fecha_fin_desconocida: false,
    motivo: "",
    tipo: "",
    absence_type_id: "",
    remunerada: true,
    notas: "",
    documentos_adjuntos: [],
  });
  
  const [fullDay, setFullDay] = useState(false);
  const [unknownEndDate, setUnknownEndDate] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isGeneratingReasons, setIsGeneratingReasons] = useState(false);
  const [aiReasons, setAiReasons] = useState([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        remunerada: initialData.remunerada ?? true,
        fecha_fin_desconocida: initialData.fecha_fin_desconocida || false,
        documentos_adjuntos: initialData.documentos_adjuntos || []
      });
      setUnknownEndDate(initialData.fecha_fin_desconocida || false);
      
      if (initialData.fecha_inicio && initialData.fecha_fin && !initialData.fecha_fin_desconocida) {
        const start = new Date(initialData.fecha_inicio);
        const end = new Date(initialData.fecha_fin);
        if (start.getHours() === 0 && start.getMinutes() === 0 &&
            end.getHours() === 23 && end.getMinutes() === 59) {
          setFullDay(true);
        } else {
          setFullDay(false);
        }
      }
    } else {
      // Reset form if no initial data
      setFormData({
        employee_id: "",
        fecha_inicio: "",
        fecha_fin: "",
        fecha_fin_desconocida: false,
        motivo: "",
        tipo: "",
        absence_type_id: "",
        remunerada: true,
        notas: "",
        documentos_adjuntos: [],
      });
      setFullDay(false);
      setUnknownEndDate(false);
    }
  }, [initialData]);

  const employeesForSelect = React.useMemo(() => {
    return employees.filter(emp => 
      !searchTerm || emp.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  const suggestedReasons = React.useMemo(() => {
    if (aiReasons.length > 0) return aiReasons; // Prefer AI reasons if available

    const selectedType = absenceTypes.find(at => at.id === formData.absence_type_id);
    if (!selectedType) return [];
    
    const typeName = selectedType.nombre?.toLowerCase();
    for (const [key, suggestions] of Object.entries(SUGGESTED_REASONS)) {
      if (typeName.includes(key.toLowerCase())) {
        return suggestions;
      }
    }
    return [];
  }, [formData.absence_type_id, absenceTypes, aiReasons]);

  const handleGenerateReasons = async () => {
    const selectedType = absenceTypes.find(at => at.id === formData.absence_type_id);
    if (!selectedType) {
      toast.error("Seleccione un tipo de ausencia primero");
      return;
    }

    setIsGeneratingReasons(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 5 common and specific reasons for an employee absence of type "${selectedType.nombre}". 
        Also, suggest a short standard note for administrative records for each reason.
        Return as JSON array of objects with 'reason' and 'suggested_note'. Language: Spanish.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: { 
              type: "array", 
              items: { 
                type: "object", 
                properties: {
                  reason: { type: "string" },
                  suggested_note: { type: "string" }
                }
              } 
            }
          }
        }
      });
      
      if (response && response.suggestions && Array.isArray(response.suggestions)) {
        setAiReasons(response.suggestions.map(s => s.reason));
        // Optionally store notes map if needed, but for now just reasons for dropdown
        toast.success("Motivos sugeridos por IA generados");
      }
    } catch (error) {
      console.error("Error generating reasons:", error);
      toast.error("Error al generar sugerencias");
    } finally {
      setIsGeneratingReasons(false);
    }
  };

  const handleAbsenceTypeChange = (absenceTypeId) => {
    const selectedType = absenceTypes.find(at => at.id === absenceTypeId);
    if (selectedType) {
      setFormData({
        ...formData,
        absence_type_id: absenceTypeId,
        tipo: selectedType.nombre,
        remunerada: selectedType.remunerada || false,
        motivo: ""
      });
    }
  };

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

      setFormData({
        ...formData,
        documentos_adjuntos: [...(formData.documentos_adjuntos || []), ...documentos]
      });

      toast.success(`${files.length} archivo(s) subido(s)`);
      e.target.value = null;
    } catch (error) {
      toast.error("Error al subir archivos");
      console.error("Error uploading files:", error);
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeDocument = (index) => {
    const updated = formData.documentos_adjuntos.filter((_, i) => i !== index);
    setFormData({ ...formData, documentos_adjuntos: updated });
    toast.info("Documento eliminado.");
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let finalData = { ...formData };

    if (unknownEndDate) {
      finalData.fecha_fin_desconocida = true;
      finalData.fecha_fin = new Date('2099-12-31').toISOString();
    } else {
      finalData.fecha_fin_desconocida = false;
      if (fullDay && formData.fecha_inicio && formData.fecha_fin) {
        const startDate = new Date(formData.fecha_inicio);
        const endDate = new Date(formData.fecha_fin);
        
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        finalData.fecha_inicio = startDate.toISOString();
        finalData.fecha_fin = endDate.toISOString();
      }
    }

    onSubmit(finalData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="employee_id">Empleado *</Label>
        <Select
          value={formData.employee_id}
          onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Buscar y seleccionar empleado" />
          </SelectTrigger>
          <SelectContent>
            <div className="p-2">
              <Input
                placeholder="Buscar empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mb-2"
              />
            </div>
            {employeesForSelect.slice(0, 50).map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.nombre} {emp.disponibilidad === "Ausente" && "(Ya ausente)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="absence_type_id">Tipo de Ausencia *</Label>
          <Select
            value={formData.absence_type_id}
            onValueChange={handleAbsenceTypeChange}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent>
              {absenceTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.nombre}
                  {type.remunerada && " (Remunerada)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="motivo">Motivo *</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={handleGenerateReasons}
              disabled={isGeneratingReasons || !formData.absence_type_id}
            >
              {isGeneratingReasons ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
              Sugerir con IA
            </Button>
          </div>
          {suggestedReasons.length > 0 ? (
            <Select
              value={formData.motivo}
              onValueChange={(value) => setFormData({ ...formData, motivo: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {suggestedReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {reason}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              id="motivo"
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              placeholder="Especificar motivo"
              required
            />
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 rounded-lg p-3">
        <Checkbox
          id="remunerada"
          checked={formData.remunerada}
          onCheckedChange={(checked) => setFormData({ ...formData, remunerada: checked })}
        />
        <label htmlFor="remunerada" className="text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer">
          Ausencia Remunerada (con pago de salario)
        </label>
      </div>

      <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 rounded-lg p-3">
        <Checkbox
          id="fullDay"
          checked={fullDay}
          onCheckedChange={setFullDay}
          disabled={unknownEndDate}
        />
        <label htmlFor="fullDay" className="text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer">
          Ausencia de horario completo (00:00 - 23:59)
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fecha_inicio">Fecha {!fullDay && "y Hora"} Inicio *</Label>
          <Input
            id="fecha_inicio"
            type={fullDay ? "date" : "datetime-local"}
            value={formData.fecha_inicio}
            onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fecha_fin">Fecha {!fullDay && "y Hora"} Fin</Label>
          <Input
            id="fecha_fin"
            type={fullDay ? "date" : "datetime-local"}
            value={formData.fecha_fin}
            onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
            required={!unknownEndDate}
            disabled={unknownEndDate}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2 bg-purple-50 border-2 border-purple-300 rounded-lg p-3">
        <Checkbox
          id="unknownEndDate"
          checked={unknownEndDate}
          onCheckedChange={(checked) => {
            setUnknownEndDate(checked);
            if (checked) {
              setFullDay(false);
            }
          }}
        />
        <label htmlFor="unknownEndDate" className="text-sm font-medium text-purple-900 cursor-pointer flex items-center gap-2">
          <Infinity className="w-4 h-4" />
          Fecha de fin desconocida (empleado ausente hasta finalizar manualmente)
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notas">Notas Adicionales</Label>
        <Textarea
          id="notas"
          value={formData.notas}
          onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
          rows={3}
        />
      </div>

      <div className="space-y-2 border-t pt-4">
        <Label className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Documentos Adjuntos (Justificantes, Certificados, etc.)
        </Label>
        <input
          type="file"
          id="documents-upload"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('documents-upload').click()}
          disabled={uploadingFiles}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploadingFiles ? "Subiendo..." : "Adjuntar Documentos"}
        </Button>
        
        {formData.documentos_adjuntos?.length > 0 && (
          <div className="mt-2 space-y-2">
            {formData.documentos_adjuntos.map((doc, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-2 rounded border">
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm truncate flex-1 text-blue-600 hover:underline">
                  {doc.nombre}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDocument(idx)}
                >
                  <Trash2 className="w-3 h-3 text-red-600" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="space-y-2">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Flujo de Aprobación:</strong>
          </p>
          <ul className="text-sm text-blue-700 dark:text-blue-200 dark:text-blue-300 list-disc list-inside space-y-1">
            <li>La solicitud se creará con estado "Pendiente"</li>
            <li>Se notificará automáticamente a los responsables configurados</li>
            <li>El empleado recibirá notificación del estado de su solicitud</li>
          </ul>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar"}
        </Button>
      </div>
    </form>
  );
}