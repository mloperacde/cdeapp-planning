import { useState, useEffect } from "react";
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
      // Limitar el tamaño de datos para evitar payloads enormes
      const limitedData = {
        ...data,
        absences: data.absences?.slice(0, 50) || [],
        employees: data.employees?.slice(0, 50) || []
      };
      const contextData = JSON.stringify(limitedData, null, 2);
      
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
      // Si es rate limit, mostrar mensaje específico
      if (error?.message?.includes('429') || error?.message?.includes('Rate') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        setSummary("⏳ Límite de análisis IA alcanzado temporalmente. Los datos están disponibles en las gráficas y tablas.");
      } else {
        setSummary("ℹ️ Los datos están disponibles en las gráficas y tablas.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // No generar automáticamente para evitar rate limits
    // El usuario puede clickear el botón si lo desea
    return;
  }, []);

  // Mostrar card siempre para que el usuario pueda generar manualmente
  if (!summary && !loading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            Resumen Automático con IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSummary}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generar Resumen con IA
          </Button>
        </CardContent>
      </Card>
    );
  }

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