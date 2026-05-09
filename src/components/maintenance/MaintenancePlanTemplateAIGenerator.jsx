import { useState } from 'react';
import { base44 } from '@/api/base44Client';
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
      
      const prompt = `Crea un plan de mantenimiento PREVENTIVO detallado y profesional para: "${machineDescription}"

**IMPORTANTE - Instrucciones de respuesta JSON:**
Debes responder ÚNICAMENTE con un objeto JSON válido, sin explicaciones previas ni posteriores.

La estructura EXACTA debe ser:
{
  "nombre": "Nombre descriptivo del plan",
  "descripcion": "Descripción breve del plan de mantenimiento",
  "periodicidad": "${periodicidad}",
  "dias_intervalo": ${periodicityData.days},
  "tareas": [
    {
      "id": "tarea_1",
      "titulo": "Nombre de la tarea (máximo 50 caracteres)",
      "descripcion": "Descripción detallada de qué se debe hacer",
      "duracion_minutos": número_entero,
      "subtareas": [
        {
          "id": "subtarea_1_1",
          "titulo": "Nombre de subtarea",
          "descripcion": "Detalles específicos",
          "herraminetas_requeridas": ["herramienta1", "herramienta2"],
          "materiales_requeridos": ["material1", "material2"]
        }
      ]
    }
  ]
}

**Requisitos:**
1. Crea entre 3 y 6 tareas principales
2. Cada tarea debe tener 2-4 subtareas
3. Incluye duración_minutos realista para cada tarea (10-120 minutos)
4. Para materiales y herramientas, usa solo items homologados y seguros según el tipo de máquina
5. Sé específico: si es máquina de sanitarios, usa lubricantes alimentarios homologados
6. Las tareas deben ser progresivas: inspección, limpieza, lubricación, ajustes, pruebas`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            descripcion: { type: 'string' },
            periodicidad: { type: 'string' },
            dias_intervalo: { type: 'number' },
            tareas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  titulo: { type: 'string' },
                  descripcion: { type: 'string' },
                  duracion_minutos: { type: 'number' },
                  subtareas: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        titulo: { type: 'string' },
                        descripcion: { type: 'string' },
                        herraminetas_requeridas: {
                          type: 'array',
                          items: { type: 'string' }
                        },
                        materiales_requeridos: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const template = response.data || response;
      
      // Crear la plantilla en la BD
      const created = await base44.entities.MaintenancePlanTemplate.create({
        nombre: template.nombre,
        descripcion: template.descripcion,
        tipologia_maquina: machineDescription,
        tipo: 'Preventivo',
        periodicidad: template.periodicidad,
        dias_intervalo: template.dias_intervalo,
        tareas: template.tareas || [],
        activo: true
      });

      onTemplateGenerated(created);
      setMachineDescription('');
      setSelectedMachineIds([]);
    } catch (err) {
      setError(`Error al generar: ${err.message}`);
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
            ✨ La IA generará tareas completas con subtareas, materiales, herramientas y tiempos de ejecución según la máquina descrita.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}