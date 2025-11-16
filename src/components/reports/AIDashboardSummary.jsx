import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function AIDashboardSummary({ data, type = "absences" }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const contextData = JSON.stringify(data, null, 2);
      
      let promptContent = "";
      if (type === "absences") {
        promptContent = `Analiza los siguientes datos de ausencias de empleados y genera un resumen ejecutivo conciso (máximo 150 palabras) destacando:
- Tendencias principales
- Departamentos o tipos de ausencia más frecuentes
- Alertas o puntos de atención
- Recomendaciones breves

Datos: ${contextData}`;
      } else if (type === "machines") {
        promptContent = `Analiza los siguientes datos de planificación de máquinas y genera un resumen ejecutivo conciso (máximo 150 palabras) destacando:
- Estado general de las máquinas
- Máquinas críticas o con problemas
- Planificación de mantenimientos
- Recomendaciones operativas

Datos: ${contextData}`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: promptContent,
        add_context_from_internet: false
      });

      setSummary(result);
    } catch (error) {
      console.error("Error generating summary:", error);
      setSummary("Error al generar resumen automático.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      generateSummary();
    }
  }, [data, type]);

  if (!summary && !loading) return null;

  return (
    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Resumen Automático con IA
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateSummary}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-indigo-700">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analizando datos...
          </div>
        ) : (
          <div className="text-sm text-slate-700 prose prose-sm max-w-none">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}