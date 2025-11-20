import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, FileCode, Edit, Save, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CustomFieldTemplates() {
  const [templates, setTemplates] = useState([
    {
      id: "1",
      nombre: "Empleado Producción",
      descripcion: "Plantilla para operarios de producción",
      campos: [
        { id: "c1", nombre: "Nivel de Experiencia", tipo: "select", opciones: ["Junior", "Senior", "Experto"], obligatorio: true },
        { id: "c2", nombre: "Máquina Principal", tipo: "text", obligatorio: true },
        { id: "c3", nombre: "Turnos Disponibles", tipo: "multiselect", opciones: ["Mañana", "Tarde", "Noche"], obligatorio: false },
        { id: "c4", nombre: "Certificado de Seguridad", tipo: "boolean", obligatorio: true }
      ]
    },
    {
      id: "2",
      nombre: "Empleado Temporal ETT",
      descripcion: "Plantilla para trabajadores temporales",
      campos: [
        { id: "c1", nombre: "Empresa ETT", tipo: "text", obligatorio: true },
        { id: "c2", nombre: "Fecha Fin Contrato", tipo: "date", obligatorio: true },
        { id: "c3", nombre: "Renovable", tipo: "boolean", obligatorio: false },
        { id: "c4", nombre: "Coste Hora", tipo: "number", obligatorio: true }
      ]
    }
  ]);

  const [editingTemplate, setEditingTemplate] = useState(null);
  const [newTemplate, setNewTemplate] = useState({ nombre: "", descripcion: "", campos: [] });
  const [newField, setNewField] = useState({ nombre: "", tipo: "text", obligatorio: false, opciones: [] });

  const fieldTypes = [
    { value: "text", label: "Texto" },
    { value: "number", label: "Número" },
    { value: "date", label: "Fecha" },
    { value: "boolean", label: "Sí/No" },
    { value: "select", label: "Lista Desplegable" },
    { value: "multiselect", label: "Selección Múltiple" },
    { value: "textarea", label: "Texto Largo" }
  ];

  const addTemplate = () => {
    if (!newTemplate.nombre) return;
    setTemplates([...templates, { ...newTemplate, id: Date.now().toString() }]);
    setNewTemplate({ nombre: "", descripcion: "", campos: [] });
  };

  const deleteTemplate = (id) => {
    setTemplates(templates.filter(t => t.id !== id));
  };

  const addFieldToTemplate = (templateId) => {
    if (!newField.nombre) return;
    
    if (editingTemplate?.id === templateId) {
      const updatedTemplate = {
        ...editingTemplate,
        campos: [...editingTemplate.campos, { ...newField, id: Date.now().toString() }]
      };
      setEditingTemplate(updatedTemplate);
    }
    setNewField({ nombre: "", tipo: "text", obligatorio: false, opciones: [] });
  };

  const removeFieldFromTemplate = (templateId, fieldId) => {
    if (editingTemplate?.id === templateId) {
      setEditingTemplate({
        ...editingTemplate,
        campos: editingTemplate.campos.filter(c => c.id !== fieldId)
      });
    }
  };

  const saveTemplate = () => {
    if (editingTemplate) {
      setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t));
      setEditingTemplate(null);
    }
  };

  const startEdit = (template) => {
    setEditingTemplate({ ...template });
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setNewField({ nombre: "", tipo: "text", obligatorio: false, opciones: [] });
  };

  return (
    <div className="space-y-6">
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-900 text-sm">
          Las plantillas permiten crear campos personalizados para diferentes tipos de empleados. Cada plantilla puede tener tantos campos como necesites.
        </AlertDescription>
      </Alert>

      {/* Plantillas Existentes */}
      <div className="space-y-4">
        {templates.map((template) => (
          <Card key={template.id} className="border-2 border-slate-200">
            <CardHeader className="pb-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCode className="w-5 h-5 text-pink-600" />
                    {template.nombre}
                  </CardTitle>
                  <p className="text-xs text-slate-600 mt-1">{template.descripcion}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-pink-600">{template.campos.length} campos</Badge>
                  {editingTemplate?.id === template.id ? (
                    <>
                      <Button size="sm" onClick={saveTemplate} className="bg-green-600 hover:bg-green-700">
                        <Save className="w-3 h-3 mr-1" />
                        Guardar
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        <X className="w-3 h-3 mr-1" />
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => startEdit(template)}>
                        <Edit className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {editingTemplate?.id === template.id ? (
                <>
                  {/* Campos de la Plantilla */}
                  <div className="space-y-2 mb-4">
                    {editingTemplate.campos.map((field, idx) => (
                      <div key={field.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border">
                        <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded">{idx + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900">{field.nombre}</span>
                            <Badge variant="outline" className="text-xs">{fieldTypes.find(t => t.value === field.tipo)?.label}</Badge>
                            {field.obligatorio && <Badge className="bg-red-600 text-xs">Obligatorio</Badge>}
                          </div>
                          {(field.tipo === 'select' || field.tipo === 'multiselect') && field.opciones?.length > 0 && (
                            <p className="text-xs text-slate-500 mt-1">Opciones: {field.opciones.join(', ')}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFieldFromTemplate(template.id, field.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Añadir Nuevo Campo */}
                  <div className="border-t pt-4 mt-4 bg-purple-50 p-4 rounded-lg">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3">Añadir Nuevo Campo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre del Campo</Label>
                        <Input
                          placeholder="Ej: Nivel de Inglés"
                          value={newField.nombre}
                          onChange={(e) => setNewField({...newField, nombre: e.target.value})}
                          className="text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Tipo de Dato</Label>
                        <Select 
                          value={newField.tipo} 
                          onValueChange={(value) => setNewField({...newField, tipo: value, opciones: []})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {fieldTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1 flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newField.obligatorio}
                            onChange={(e) => setNewField({...newField, obligatorio: e.target.checked})}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">Campo Obligatorio</span>
                        </label>
                      </div>
                    </div>

                    {(newField.tipo === 'select' || newField.tipo === 'multiselect') && (
                      <div className="space-y-1 mb-3">
                        <Label className="text-xs">Opciones (separadas por comas)</Label>
                        <Input
                          placeholder="Ej: Opción 1, Opción 2, Opción 3"
                          onChange={(e) => setNewField({...newField, opciones: e.target.value.split(',').map(o => o.trim())})}
                          className="text-sm"
                        />
                      </div>
                    )}

                    <Button 
                      onClick={() => addFieldToTemplate(template.id)} 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="sm"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Añadir Campo
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {template.campos.map((field, idx) => (
                    <div key={field.id} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                      <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded">{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900">{field.nombre}</span>
                          <Badge variant="outline" className="text-xs">{fieldTypes.find(t => t.value === field.tipo)?.label}</Badge>
                          {field.obligatorio && <Badge className="bg-red-600 text-xs">Obligatorio</Badge>}
                        </div>
                        {(field.tipo === 'select' || field.tipo === 'multiselect') && field.opciones?.length > 0 && (
                          <p className="text-xs text-slate-500 mt-1">Opciones: {field.opciones.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Crear Nueva Plantilla */}
      <Card className="border-2 border-dashed border-green-300 bg-green-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-600" />
            Crear Nueva Plantilla
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre de la Plantilla</Label>
              <Input
                placeholder="Ej: Empleado de Almacén"
                value={newTemplate.nombre}
                onChange={(e) => setNewTemplate({...newTemplate, nombre: e.target.value})}
                className="text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Input
                placeholder="Describe el tipo de empleado"
                value={newTemplate.descripcion}
                onChange={(e) => setNewTemplate({...newTemplate, descripcion: e.target.value})}
                className="text-sm"
              />
            </div>
          </div>
          <Button onClick={addTemplate} className="w-full bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Crear Plantilla (luego añade campos editándola)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}