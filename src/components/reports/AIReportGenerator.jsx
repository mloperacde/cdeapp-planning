import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function AIReportGenerator() {
  const [prompt, setPrompt] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async (userPrompt) => {
      setLoading(true);
      
      const systemPrompt = `Eres un asistente experto en generar informes de recursos humanos y planificación industrial.

El usuario solicitará información sobre:
- Ausencias de empleados (filtradas por departamento, tipo, fechas, etc.)
- Planificación de máquinas (estado, operadores asignados, mantenimientos)
- Estadísticas de turnos y equipos
- Análisis de absentismo
- Rendimiento y productividad

Debes:
1. Interpretar la solicitud del usuario en lenguaje natural
2. Generar un informe estructurado con:
   - Título del informe
   - Resumen ejecutivo
   - Datos y estadísticas relevantes
   - Análisis y conclusiones
   - Recomendaciones si aplica
3. Usar formato Markdown para mejor presentación
4. Incluir tablas, listas y énfasis cuando sea apropiado

Solicitud del usuario: ${userPrompt}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: systemPrompt,
        add_context_from_internet: false
      });

      setReport(result);
      return result;
    },
    onSuccess: () => {
      setLoading(false);
      toast.success("Informe generado");
    },
    onError: (error) => {
      setLoading(false);
      toast.error("Error al generar informe");
      console.error(error);
    }
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Escribe tu solicitud");
      return;
    }
    setReport(null);
    generateMutation.mutate(prompt);
  };

  const downloadReport = () => {
    if (!report) return;
    
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `informe_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const examplePrompts = [
    "Muéstrame las ausencias por departamento este mes",
    "Genera un informe de absentismo del último trimestre",
    "Análisis de turnos del equipo de producción",
    "Resumen de máquinas en mantenimiento esta semana",
    "Empleados con más ausencias en el último año"
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Generador de Informes con IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-700">
              Describe qué informe necesitas en lenguaje natural:
            </p>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ejemplo: 'Muéstrame un análisis de ausencias por departamento del último mes con gráficos y conclusiones'"
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <p className="text-xs text-slate-600 w-full mb-1">Ejemplos rápidos:</p>
            {examplePrompts.map((example, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="cursor-pointer hover:bg-purple-100"
                onClick={() => setPrompt(example)}
              >
                {example}
              </Badge>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generando informe...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generar Informe con IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {report && (
        <Card className="shadow-lg">
          <CardHeader className="border-b flex flex-row items-center justify-between">
            <CardTitle>Informe Generado</CardTitle>
            <Button onClick={downloadReport} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown>{report}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}