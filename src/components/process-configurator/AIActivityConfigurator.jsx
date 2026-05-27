import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Sparkles, Loader2, CheckCircle2, AlertTriangle,
  Zap, Brain, Plus, X, ArrowRight, TrendingUp, Copy,
  Search, RotateCcw, Save, Info
} from "lucide-react";
import { toast } from "sonner";

const TYPE_COLORS = {
  "Máquina": "bg-blue-100 text-blue-700 border-blue-200",
  "Manual": "bg-green-100 text-green-700 border-green-200",
  "Acondicionamiento Secundario": "bg-orange-100 text-orange-700 border-orange-200",
  "Logística": "bg-purple-100 text-purple-700 border-purple-200"
};

/**
 * Vista tipo configurador para la detección inteligente de actividades.
 * Panel izquierdo: catálogo completo de actividades de la BD.
 * Panel derecho: actividades seleccionadas (sugeridas por IA + correcciones manuales).
 * Al aplicar, registra la corrección como aprendizaje.
 */
export default function AIActivityConfigurator({
  article,
  components,
  currentSelectedIds = [],
  onApply,
  onApplySimilarArticle
}) {
  const [catalogActivities, setCatalogActivities] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState(null);

  // Actividades en el panel derecho (sesión de configuración)
  const [sessionIds, setSessionIds] = useState([]);
  const [originalSuggestedIds, setOriginalSuggestedIds] = useState([]);

  const [searchCatalog, setSearchCatalog] = useState("");
  const [saving, setSaving] = useState(false);

  // Cargar catálogo de actividades desde la BD
  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const data = await base44.entities.Activity.filter({ active: true });
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => (a.priority || 5) - (b.priority || 5));
      setCatalogActivities(sorted);
    } catch (e) {
      toast.error("Error al cargar el catálogo de actividades");
    } finally {
      setLoadingCatalog(false);
    }
  };

  const handleDetect = async () => {
    if (!article?.id) {
      toast.error("Guarda el artículo primero para poder analizar sus componentes");
      return;
    }
    if (!components?.length) {
      toast.warning("No hay componentes disponibles. Sincroniza los componentes desde CDEApp primero.");
      return;
    }

    setDetecting(true);
    setDetectionResult(null);
    try {
      const res = await base44.functions.invoke("detectActivitySuggestions", {
        article_id: article.id,
        article_code: article.code,
        article_name: article.name,
        article_type: article.type,
        article_cde_id: article.cde_id,
        components
      });
      const data = res.data;
      setDetectionResult(data);

      // Poblar panel derecho con las sugerencias de la IA
      const suggested = data?.suggested_activity_ids || [];
      setSessionIds(suggested);
      setOriginalSuggestedIds(suggested);

      toast.success(`Análisis IA completado: ${suggested.length} actividades sugeridas`);
    } catch (err) {
      console.error(err);
      toast.error("Error en el análisis de actividades");
    } finally {
      setDetecting(false);
    }
  };

  const getActivity = (id) => catalogActivities.find(a => a.id === id);

  // Añadir actividad al panel derecho
  const addToSession = (actId) => {
    if (!sessionIds.includes(actId)) {
      setSessionIds(prev => [...prev, actId]);
    }
  };

  // Quitar actividad del panel derecho
  const removeFromSession = (actId) => {
    setSessionIds(prev => prev.filter(id => id !== actId));
  };

  // Limpiar panel derecho
  const clearSession = () => {
    setSessionIds([]);
  };

  // Restaurar sugerencias originales de la IA
  const resetToSuggested = () => {
    setSessionIds([...originalSuggestedIds]);
    toast.info("Restaurado a la sugerencia original de la IA");
  };

  // Aplicar al configurador y guardar corrección para aprendizaje
  const handleApply = async () => {
    if (sessionIds.length === 0) {
      toast.warning("No hay actividades seleccionadas para aplicar");
      return;
    }

    setSaving(true);
    try {
      // Guardar corrección para aprendizaje si hay diferencia con la sugerencia IA
      if (article?.id && originalSuggestedIds.length > 0) {
        const suggestedSet = new Set(originalSuggestedIds);
        const finalSet = new Set(sessionIds);
        const isDifferent =
          originalSuggestedIds.length !== sessionIds.length ||
          sessionIds.some(id => !suggestedSet.has(id));

        if (isDifferent) {
          base44.functions.invoke("detectActivitySuggestions", {
            action: "save_correction",
            article_id: article.id,
            article_code: article.code,
            article_name: article.name,
            article_type: article.type,
            suggested_activities: originalSuggestedIds,
            final_activities: sessionIds,
            components_snapshot: components || []
          }).catch(e => console.warn("Learning log save failed:", e));

          toast.success(`Configuración aplicada y ${sessionIds.length} actividades aprendidas`);
        } else {
          toast.success(`${sessionIds.length} actividades aplicadas`);
        }
      } else {
        toast.success(`${sessionIds.length} actividades aplicadas`);
      }

      if (onApply) onApply(sessionIds);
    } finally {
      setSaving(false);
    }
  };

  // Filtrar catálogo
  const filteredCatalog = catalogActivities.filter(a => {
    if (!searchCatalog) return true;
    const q = searchCatalog.toLowerCase();
    return (
      a.name?.toLowerCase().includes(q) ||
      a.type?.toLowerCase().includes(q) ||
      a.component_keywords?.some(kw => kw.toLowerCase().includes(q))
    );
  });

  const confidenceColor = (score) => {
    if (score >= 0.8) return "text-green-700 bg-green-50 border-green-200";
    if (score >= 0.5) return "text-yellow-700 bg-yellow-50 border-yellow-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const hasChanges = JSON.stringify([...sessionIds].sort()) !== JSON.stringify([...originalSuggestedIds].sort());

  return (
    <Card className="border-violet-200 bg-violet-50/20 dark:bg-violet-950/10 dark:border-violet-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-violet-800 dark:text-violet-300">
          <Brain className="h-4 w-4" />
          Detección Inteligente de Actividades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Botón analizar + info componentes */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleDetect}
            disabled={detecting || !components?.length}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 text-white gap-2"
          >
            {detecting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analizando...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Analizar con IA</>
            )}
          </Button>
          {components?.length > 0 ? (
            <span className="text-xs text-muted-foreground">{components.length} componentes disponibles</span>
          ) : (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Sincroniza componentes para activar el análisis
            </span>
          )}
        </div>

        {/* Resultado análisis IA: confianza + razonamiento */}
        {detectionResult && (
          <div className="space-y-2">
            <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-md border ${confidenceColor(detectionResult.confidence)}`}>
              <Zap className="h-3.5 w-3.5 shrink-0" />
              <span className="font-semibold">
                Confianza: {Math.round((detectionResult.confidence || 0) * 100)}%
              </span>
              {detectionResult.process_pattern && (
                <span className="text-muted-foreground ml-1">· {detectionResult.process_pattern}</span>
              )}
            </div>
            {detectionResult.reasoning && (
              <Alert className="py-2 border-violet-200 bg-violet-50 dark:bg-violet-950/20">
                <Info className="h-3.5 w-3.5 text-violet-600" />
                <AlertDescription className="text-xs text-muted-foreground ml-1">
                  {detectionResult.reasoning}
                </AlertDescription>
              </Alert>
            )}
            {detectionResult.speed_estimation?.uds_per_minute > 0 && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded-md text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-blue-800 dark:text-blue-300">
                  ~{detectionResult.speed_estimation.uds_per_minute} uds/min
                </span>
                {detectionResult.speed_estimation.bottleneck && (
                  <span className="text-blue-600">
                    · Cuello de botella: <strong>{detectionResult.speed_estimation.bottleneck.name}</strong>
                  </span>
                )}
              </div>
            )}

            {/* Artículos similares */}
            {detectionResult.similar_articles?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Artículos similares</p>
                {detectionResult.similar_articles.map((sim, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 border rounded text-xs">
                    <span>
                      <span className="font-mono text-primary">{sim.article_code}</span>
                      <span className="text-muted-foreground ml-1 truncate">{sim.article_name}</span>
                    </span>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{Math.round(sim.similarity_score * 100)}%</Badge>
                      {onApplySimilarArticle && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2"
                          onClick={() => onApplySimilarArticle(sim)}>
                          <Copy className="h-2.5 w-2.5" /> Copiar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Configurador dual: catálogo + seleccionadas */}
        <div className="grid grid-cols-1 gap-3">

          {/* Panel derecho: actividades seleccionadas para este artículo */}
          <div className="border rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-950/30 border-b">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">
                  Actividades configuradas
                </span>
                <Badge className="bg-violet-600 text-white text-[10px] px-1.5">{sessionIds.length}</Badge>
              </div>
              <div className="flex gap-1">
                {originalSuggestedIds.length > 0 && hasChanges && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-violet-600"
                    onClick={resetToSuggested}>
                    <RotateCcw className="h-3 w-3" /> Restaurar IA
                  </Button>
                )}
                {sessionIds.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-red-500"
                    onClick={clearSession}>
                    <X className="h-3 w-3" /> Limpiar
                  </Button>
                )}
              </div>
            </div>

            {sessionIds.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>Analiza con IA o añade actividades del catálogo</p>
              </div>
            ) : (
              <ScrollArea className="h-[220px]">
                <div className="p-2 space-y-1">
                  {sessionIds.map((id, idx) => {
                    const act = getActivity(id);
                    if (!act) return null;
                    const isFromAI = originalSuggestedIds.includes(id);
                    return (
                      <div key={id}
                        className="flex items-center justify-between p-2 rounded border bg-white dark:bg-slate-800 hover:shadow-sm transition-shadow group">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0">{idx + 1}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-medium truncate">{act.name}</span>
                              {isFromAI && (
                                <Badge className="bg-violet-100 text-violet-700 text-[9px] px-1 py-0 border-violet-200">
                                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />IA
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0 rounded border ${TYPE_COLORS[act.type] || 'bg-muted text-muted-foreground border-muted'}`}>
                                {act.type}
                              </span>
                              <span className="text-[10px] text-muted-foreground">{act.interactions_per_minute} uds/min</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost" size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 shrink-0"
                          onClick={() => removeFromSession(id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Panel izquierdo: catálogo completo para añadir */}
          <div className="border rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 border-b">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Catálogo de actividades</span>
            </div>
            <div className="px-3 pt-2 pb-1">
              <Input
                placeholder="Buscar actividad..."
                value={searchCatalog}
                onChange={e => setSearchCatalog(e.target.value)}
                className="h-7 text-xs"
              />
            </div>
            {loadingCatalog ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                {catalogActivities.length === 0
                  ? "No hay actividades en el catálogo. Crea actividades en Datos Excel."
                  : "Sin resultados para la búsqueda"}
              </div>
            ) : (
              <ScrollArea className="h-[220px]">
                <div className="p-2 space-y-1">
                  {filteredCatalog.map(act => {
                    const inSession = sessionIds.includes(act.id);
                    return (
                      <div key={act.id}
                        className={`flex items-center justify-between p-2 rounded border transition-colors ${
                          inSession
                            ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800'
                            : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                        }`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-medium">{act.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] px-1.5 py-0 rounded border ${TYPE_COLORS[act.type] || 'bg-muted text-muted-foreground border-muted'}`}>
                              {act.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{act.interactions_per_minute} uds/min</span>
                          </div>
                          {act.component_keywords?.length > 0 && (
                            <div className="flex flex-wrap gap-0.5 mt-1">
                              {act.component_keywords.slice(0, 4).map(kw => (
                                <span key={kw} className="text-[9px] bg-violet-50 text-violet-600 border border-violet-200 rounded px-1">{kw}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <Button
                          variant={inSession ? "outline" : "ghost"}
                          size="sm"
                          className={`h-6 w-6 p-0 shrink-0 ml-2 ${inSession ? 'text-red-500 hover:text-red-600 border-red-200' : 'text-violet-600 hover:text-violet-800 hover:bg-violet-50'}`}
                          onClick={() => inSession ? removeFromSession(act.id) : addToSession(act.id)}
                        >
                          {inSession ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Botón Aplicar */}
        {sessionIds.length > 0 && (
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2"
            onClick={handleApply}
            disabled={saving}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Aplicar {sessionIds.length} actividades al configurador
                {hasChanges && originalSuggestedIds.length > 0 && (
                  <Badge className="bg-white/20 text-white text-[10px] ml-1">+ aprendizaje</Badge>
                )}
                <ArrowRight className="h-4 w-4 ml-auto" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}