import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, Loader2, CheckCircle2, AlertTriangle, 
  Zap, ArrowRight, Copy, TrendingUp, Brain
} from "lucide-react";
import { toast } from "sonner";

/**
 * Panel inteligente de detección de actividades basado en componentes.
 * Usa IA + historial de aprendizaje para sugerir actividades y detectar
 * artículos similares ya configurados.
 */
export default function ActivityDetector({
  article,
  components,
  allActivities,
  currentSelectedIds,
  onApplySuggestions,
  onApplySimilarArticle
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleDetect = async () => {
    if (!article?.id) {
      toast.error("Guarda el artículo primero para poder analizar sus componentes");
      return;
    }
    if (!components?.length) {
      toast.warning("No hay componentes disponibles para analizar. Sincroniza los componentes desde CDEApp primero.");
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke("detectActivitySuggestions", {
        article_id: article.id,
        article_code: article.code,
        article_name: article.name,
        article_type: article.type,
        article_cde_id: article.cde_id,
        components: components
      });
      setResult(res.data);
      toast.success(`Análisis completado. ${res.data?.suggested_activity_ids?.length || 0} actividades sugeridas.`);
    } catch (err) {
      console.error(err);
      toast.error("Error en el análisis de actividades");
    } finally {
      setLoading(false);
    }
  };

  const getActivityById = (id) => allActivities.find(a => a.id === id);

  const confidenceColor = (score) => {
    if (score >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 0.5) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const confidenceLabel = (score) => {
    if (score >= 0.8) return "Alta confianza";
    if (score >= 0.5) return "Confianza media";
    return "Baja confianza";
  };

  return (
    <Card className="border-violet-200 bg-violet-50/30 dark:bg-violet-950/20 dark:border-violet-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-violet-800 dark:text-violet-300">
          <Brain className="h-4 w-4" />
          Detección Inteligente de Actividades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botón analizar */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleDetect}
            disabled={loading || !components?.length}
            variant="default"
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analizando...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Analizar Componentes con IA</>
            )}
          </Button>
          {components?.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {components.length} componentes disponibles
            </span>
          )}
          {!components?.length && (
            <span className="text-xs text-amber-600">
              ⚠ Sincroniza componentes para activar el análisis
            </span>
          )}
        </div>

        {/* Resultados */}
        {result && (
          <div className="space-y-4">
            {/* Confianza */}
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border ${confidenceColor(result.confidence)}`}>
              <Zap className="h-3.5 w-3.5" />
              <span className="font-medium">{confidenceLabel(result.confidence)}</span>
              <span>({Math.round((result.confidence || 0) * 100)}%)</span>
              {result.process_pattern && (
                <span className="ml-2 text-muted-foreground">· {result.process_pattern}</span>
              )}
            </div>

            {/* Velocidad estimada */}
            {result.speed_estimation?.uds_per_minute > 0 && (
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
                <TrendingUp className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <span className="font-semibold text-blue-800 dark:text-blue-300">
                    ~{result.speed_estimation.uds_per_minute} uds/min
                  </span>
                  <span className="text-blue-600 dark:text-blue-400 ml-2">velocidad estimada</span>
                  {result.speed_estimation.bottleneck && (
                    <p className="text-xs text-blue-500 mt-0.5">
                      Cuello de botella: <strong>{result.speed_estimation.bottleneck.name}</strong>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Razonamiento de la IA */}
            {result.reasoning && (
              <Alert className="py-2">
                <AlertDescription className="text-xs text-muted-foreground">
                  <strong>IA:</strong> {result.reasoning}
                </AlertDescription>
              </Alert>
            )}

            {/* Artículos similares */}
            {result.similar_articles?.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Artículos con proceso similar
                </p>
                {result.similar_articles.map((sim, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border rounded-md text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-primary">{sim.article_code}</span>
                      <span className="text-muted-foreground ml-2 truncate">{sim.article_name}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(sim.similarity_score * 100)}% similar
                      </Badge>
                      {onApplySimilarArticle && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs gap-1 px-2"
                          onClick={() => onApplySimilarArticle(sim)}
                        >
                          <Copy className="h-3 w-3" />
                          Copiar proceso
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Actividades sugeridas */}
            {result.suggested_activity_ids?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actividades Sugeridas ({result.suggested_activity_ids.length})
                  </p>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1 bg-violet-600 hover:bg-violet-700"
                    onClick={() => onApplySuggestions(result.suggested_activity_ids)}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Aplicar todas
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {result.suggested_activity_ids.map(id => {
                    const act = getActivityById(id);
                    if (!act) return null;
                    const already = currentSelectedIds?.includes(id);
                    return (
                      <div key={id} className={`flex items-center justify-between text-xs p-2 rounded border ${already ? 'bg-green-50 border-green-200 dark:bg-green-950/20' : 'bg-white dark:bg-slate-900 border-slate-200'}`}>
                        <div className="flex items-center gap-2">
                          {already && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                          <span className="font-medium">{act.name}</span>
                          <Badge variant="outline" className="text-[10px] py-0">{act.type}</Badge>
                        </div>
                        <span className="text-muted-foreground font-mono">{act.interactions_per_minute} uds/min</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.suggested_activity_ids?.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p>No se detectaron actividades. Define palabras clave en las actividades del sistema.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}