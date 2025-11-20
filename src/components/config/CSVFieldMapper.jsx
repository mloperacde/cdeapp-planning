import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CSVFieldMapper() {
  const [templates, setTemplates] = useState([
    {
      id: '1',
      name: 'Plantilla Estándar',
      mappings: [
        { csvField: 'Nombre', systemField: 'nombre' },
        { csvField: 'Email', systemField: 'email' },
        { csvField: 'Departamento', systemField: 'departamento' }
      ]
    }
  ]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState(null);

  const systemFields = [
    'nombre', 'codigo_empleado', 'estado_empleado', 'fecha_baja', 'motivo_baja',
    'fecha_nacimiento', 'dni', 'nuss', 'sexo', 'nacionalidad', 'direccion',
    'formacion', 'email', 'telefono_movil', 'departamento', 'puesto',
    'categoria', 'tipo_jornada', 'num_horas_jornada', 'tipo_turno', 'equipo',
    'fecha_alta', 'tipo_contrato', 'empresa_ett'
  ];

  const createTemplate = () => {
    if (!newTemplateName.trim()) return;
    
    setTemplates([...templates, {
      id: Date.now().toString(),
      name: newTemplateName,
      mappings: []
    }]);
    setNewTemplateName('');
  };

  const deleteTemplate = (templateId) => {
    if (confirm('¿Eliminar esta plantilla?')) {
      setTemplates(templates.filter(t => t.id !== templateId));
    }
  };

  const exportTemplate = (template) => {
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plantilla-${template.name}.json`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <Alert className="border-orange-200 bg-orange-50">
        <AlertDescription className="text-orange-900 text-sm">
          Las plantillas de mapeo te permiten guardar configuraciones de mapeo de campos para reutilizarlas en futuras importaciones.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Input
          placeholder="Nombre de la nueva plantilla..."
          value={newTemplateName}
          onChange={(e) => setNewTemplateName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createTemplate()}
        />
        <Button onClick={createTemplate} className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {templates.map(template => (
          <Card key={template.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-slate-900">{template.name}</h3>
                  <p className="text-xs text-slate-500">{template.mappings.length} campos mapeados</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportTemplate(template)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteTemplate(template.id)}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-600">Mapeos configurados:</Label>
                {template.mappings.length === 0 ? (
                  <p className="text-xs text-slate-400">No hay mapeos configurados</p>
                ) : (
                  <div className="space-y-1">
                    {template.mappings.map((mapping, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded">
                        <Badge variant="outline" className="font-mono">{mapping.csvField}</Badge>
                        <span className="text-slate-400">→</span>
                        <Badge className="bg-orange-600">{mapping.systemField}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No hay plantillas configuradas. Crea la primera arriba.
        </div>
      )}

      <Alert className="border-slate-200 bg-slate-50">
        <AlertDescription className="text-slate-700 text-xs">
          <strong>Nota:</strong> Las plantillas se guardarán localmente y podrás exportarlas e importarlas en otros sistemas.
        </AlertDescription>
      </Alert>
    </div>
  );
}