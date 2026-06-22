import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PERIODICITIES = [
  { value: 'Diaria', days: 1 },
  { value: 'Semanal', days: 7 },
  { value: 'Quincenal', days: 15 },
  { value: 'Mensual', days: 30 },
  { value: 'Trimestral', days: 90 },
  { value: 'Semestral', days: 180 },
  { value: 'Anual', days: 365 },
];

export default function MaintenancePlanTemplateAIGenerator({ onTemplateGenerated, machines = [] }) {
  const [machineDescription, setMachineDescription] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [periodicidad, setPeriodicidad] = useState('Mensual');
  const [selectedMachineIds, setSelectedMachineIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateTemplate = async () => {
    if (!machineDescription.trim()) {
      setError('Describe la tipología y características de la máquina');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const periodicityData = PERIODICITIES.find(p => p.value === periodicidad);
      
      const manualSection = manualContent.trim() ? `

**RECOMENDACIONES DEL FABRICANTE (Manual de la Máquina):**
${manualContent}

Basándote en estas recomendaciones específicas del fabricante, generador un plan de mantenimiento que respete exactamente las instrucciones del manual.` : '';

      const prompt = `Crea un plan de mantenimiento PREVENTIVO detallado y profesional para: "${machineDescription}"${manualSection}

**IMPORTANTE - Instrucciones de respuesta JSON:**
Debes responder ÚNICAMENTE con un objeto JSON válido, sin explicaciones previas ni posteriores.

La estructura EXACTA debe ser:
{
  "nombre": "Nombre descriptivo del plan",
  "descripcion": "Descripción breve del plan de mantenimiento",
  "tareas": [
    {
      "id": "tarea_1",
      "titulo": "Nombre de la tarea (máximo 50 caracteres)",
      "duracion_minutos": número_entero,
      "observaciones": "Observaciones o notas especiales del fabricante",
      "subtareas": [
        {
          "id": "subtarea_1_1",
          "titulo": "Nombre de subtarea",
          "duracion_minutos": número_entero,
          "herramientas": "Lista de herramientas específicas requeridas",
          "observaciones": "Recomendaciones especiales o precauciones del manual del fabricante"
        }
      ]
    }
  ]
}

**Requisitos CRÍTICOS:**
1. Crea entre 3 y 6 tareas principales
2. Cada tarea debe tener 2-4 subtareas
3. CADA TAREA y CADA SUBTAREA debe incluir duracion_minutos (10-120 minutos realistas)
4. CADA SUBTAREA debe listar herramientas específicas necesarias
5. CADA SUBTAREA debe incluir observaciones con recomendaciones del fabricante o precauciones
6. Si hay manual del fabricante, cita exactamente sus recomendaciones de mantenimiento
7. Las tareas deben ser progresivas: inspección, limpieza, lubricación, ajustes, pruebas
8. Incluye solo herramientas y lubricantes homologados y seguros para el tipo de máquina`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            descripcion: { type: 'string' },
            tareas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  titulo: { type: 'string' },
                  duracion_minutos: { type: 'number' },
                  observaciones: { type: 'string' },
                  subtareas: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        titulo: { type: 'string' },
                        duracion_minutos: { type: 'number' },
                        herramientas: { type: 'string' },
                        observaciones: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      // InvokeLLM con response_json_schema devuelve el objeto directamente
      let template = response;
      // Por si viene envuelto en .data (compatibilidad)
      if (response && typeof response === 'object' && response.data && typeof response.data === 'object') {
        template = response.data;
      }

      if (!template || !template.nombre) {
        throw new Error(`La IA no devolvió un plan válido. Respuesta: ${JSON.stringify(response).substring(0, 200)}`);
      }
      
      // Transformar las tareas a formato MaintenanceType
      const maintenanceTypeData = {
        nombre: template.nombre,
        descripcion: template.descripcion,
        machine_ids: selectedMachineIds,
        activo: true
      };

      // Mapear tareas generadas al formato tarea_N
      if (template.tareas && Array.isArray(template.tareas)) {
        template.tareas.forEach((tarea, index) => {
          if (index < 6) { // Max 6 tareas
            const taskKey = `tarea_${index + 1}`;
            maintenanceTypeData[taskKey] = {
              nombre: tarea.titulo || '',
              duracion_minutos: tarea.duracion_minutos || 0,
              observaciones: tarea.observaciones || '',
              subtarea_1: tarea.subtareas?.[0] ? {
                titulo: tarea.subtareas[0].titulo || '',
                duracion_minutos: tarea.subtareas[0].duracion_minutos || 0,
                herramientas: tarea.subtareas[0].herramientas || '',
                observaciones: tarea.subtareas[0].observaciones || ''
              } : { titulo: '', duracion_minutos: 0, herramientas: '', observaciones: '' },
              subtarea_2: tarea.subtareas?.[1] ? {
                titulo: tarea.subtareas[1].titulo || '',
                duracion_minutos: tarea.subtareas[1].duracion_minutos || 0,
                herramientas: tarea.subtareas[1].herramientas || '',
                observaciones: tarea.subtareas[1].observaciones || ''
              } : { titulo: '', duracion_minutos: 0, herramientas: '', observaciones: '' },
              subtarea_3: tarea.subtareas?.[2] ? {
                titulo: tarea.subtareas[2].titulo || '',
                duracion_minutos: tarea.subtareas[2].duracion_minutos || 0,
                herramientas: tarea.subtareas[2].herramientas || '',
                observaciones: tarea.subtareas[2].observaciones || ''
              } : { titulo: '', duracion_minutos: 0, herramientas: '', observaciones: '' },
              subtarea_4: tarea.subtareas?.[3] ? {
                titulo: tarea.subtareas[3].titulo || '',
                duracion_minutos: tarea.subtareas[3].duracion_minutos || 0,
                herramientas: tarea.subtareas[3].herramientas || '',
                observaciones: tarea.subtareas[3].observaciones || ''
              } : { titulo: '', duracion_minutos: 0, herramientas: '', observaciones: '' },
              subtarea_5: { titulo: '', duracion_minutos: 0, herramientas: '', observaciones: '' },
              subtarea_6: { titulo: '', duracion_minutos: 0, herramientas: '', observaciones: '' },
              subtarea_7: { titulo: '', duracion_minutos: 0, herramientas: '', observaciones: '' },
              subtarea_8: { titulo: '', duracion_minutos: 0, herramientas: '', observaciones: '' }
            };
          }
        });
      }

      // Crear el MaintenanceType
      const created = await base44.entities.MaintenanceType.create(maintenanceTypeData);

      toast({ title: '✅ Plan generado', description: `"${created.nombre}" creado correctamente con ${template.tareas?.length || 0} tareas.` });
      onTemplateGenerated(created);
      setMachineDescription('');
      setManualContent('');
      setSelectedMachineIds([]);
    } catch (err) {
      console.error('[AI Generator] Error:', err);
      setError(`Error al generar el plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800/30 dark:bg-purple-900/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Generador de Plans de Mantenimiento con IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="machine-desc">Descripción Detallada de la Máquina *</Label>
            <Textarea
              id="machine-desc"
              placeholder="Ejemplo: PERFECT PACK BETA 360 máquina de envasado de sachets con toallita impregnada de producto sanitario oftálmico. Incluye sistema de llenado volumétrico, roscado automático y etiquetado. En el mantenimiento se emplean grasas o lubricantes de uso alimentario homologados."
              value={machineDescription}
              onChange={(e) => setMachineDescription(e.target.value)}
              disabled={loading}
              className="min-h-24 border-purple-200"
              rows={4}
            />
            <p className="text-xs text-slate-500">
              Incluye: tipo de máquina, función, sistemas principales, materiales especiales y requisitos regulatorios
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodicidad">Periodicidad del Mantenimiento *</Label>
            <Select value={periodicidad} onValueChange={setPeriodicidad} disabled={loading}>
              <SelectTrigger id="periodicidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODICITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.value} (cada {p.days} días)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual">Recomendaciones del Manual del Fabricante (Opcional)</Label>
            <Textarea
              id="manual"
              placeholder="Pega aquí las recomendaciones de mantenimiento del manual del fabricante, especificaciones técnicas, lubricantes recomendados, frecuencias, etc."
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              disabled={loading}
              className="min-h-20 border-blue-200"
              rows={3}
            />
            <p className="text-xs text-slate-500">
              La IA usará estas recomendaciones para generar un plan alineado con las instrucciones del fabricante
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerateTemplate}
            disabled={loading || !machineDescription.trim()}
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando plan de mantenimiento...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Generar Plan con IA
              </>
            )}
          </Button>

          <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/20 p-3 rounded">
             ✨ La IA generará un plan detallado con:
             <ul className="list-disc list-inside mt-2 space-y-1">
               <li>Tareas y subtareas específicas</li>
               <li>Tiempos de ejecución realistas para cada paso</li>
               <li>Herramientas necesarias exactas</li>
               <li>Observaciones y recomendaciones del fabricante</li>
             </ul>
           </p>
        </CardContent>
      </Card>
    </div>
  );
}