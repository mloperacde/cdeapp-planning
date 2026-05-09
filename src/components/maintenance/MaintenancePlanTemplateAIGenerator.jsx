import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, Loader2 } from 'lucide-react';

export default function MaintenancePlanTemplateAIGenerator({ onTemplateGenerated }) {
  const [machineType, setMachineType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateTemplate = async () => {
    if (!machineType.trim()) {
      setError('Especifica la tipología de máquina');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const prompt = `Crea un plan de mantenimiento preventivo detallado para una máquina de tipo "${machineType}". 
      
      Responde en JSON con esta estructura:
      {
        "nombre": "Nombre descriptivo del plan",
        "descripcion": "Descripción breve",
        "tipologia_maquina": "${machineType}",
        "tipo": "Preventivo",
        "periodicidad": "Mensual|Trimestral|Semestral|Anual",
        "dias_intervalo": número,
        "tareas": [
          {
            "titulo": "Nombre de la tarea",
            "descripcion": "Descripción detallada",
            "duracion_minutos": número,
            "subtareas": [
              {
                "titulo": "Nombre subtarea",
                "descripcion": "Descripción"
              }
            ]
          }
        ]
      }`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            nombre: { type: 'string' },
            descripcion: { type: 'string' },
            tipologia_maquina: { type: 'string' },
            tipo: { type: 'string' },
            periodicidad: { type: 'string' },
            dias_intervalo: { type: 'number' },
            tareas: { type: 'array' }
          }
        }
      });

      const template = response.data || response;
      
      // Crear la plantilla en la BD
      const created = await base44.entities.MaintenancePlanTemplate.create({
        nombre: template.nombre,
        descripcion: template.descripcion,
        tipologia_maquina: template.tipologia_maquina,
        tipo: template.tipo,
        periodicidad: template.periodicidad,
        dias_intervalo: template.dias_intervalo,
        tareas: template.tareas || [],
        activo: true
      });

      onTemplateGenerated(created);
      setMachineType('');
    } catch (err) {
      setError(`Error al generar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-purple-200 bg-purple-50/50 dark:border-purple-800/30 dark:bg-purple-900/10">
        <CardContent className="pt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipología de Máquina
            </label>
            <Input
              placeholder="Ej: Envasadora de líquidos, Máquina de sobres, Etiquetadora..."
              value={machineType}
              onChange={(e) => setMachineType(e.target.value)}
              disabled={loading}
              className="border-purple-200"
            />
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400">
            La IA generará un plan de mantenimiento preventivo completo con tareas, subtareas y periodicidad según el tipo de máquina.
          </p>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <Button
            onClick={handleGenerateTemplate}
            disabled={loading || !machineType.trim()}
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generando plantilla...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Generar con IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}