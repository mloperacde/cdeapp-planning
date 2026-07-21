import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { localDataService } from "./services/localDataService";
import ArticleComponentsPanel from "./ArticleComponentsPanel";
import ProcessBuilder from "./ProcessBuilder";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Clock, 
  Users, 
  Layers,
  CheckCircle2,
  AlertCircle,
  FileDown,
  Trash2,
  AlertTriangle,
  Building2,
  Sparkles,
  Brain,
  Loader2,
  TrendingUp,
  X,
  Info,
  Plus,
  Minus,
  MessageSquarePlus,
  Search,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function Configurator() {
  const { articleId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(articleId);

  const [activities, setActivities] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [needsProcess, setNeedsProcess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    client: "",
    reference: "",
    type: "",
    process_code: null,
    selected_activities: [],
    operators_required: 1,
    // Nuevos campos
    active: true,
    status_article: "PENDIENTE",
    injet: false,
    laser: false,
    etiquetado: false,
    celo: false,
    unid_box: 0,
    unid_pallet: 0,
    multi_unid: 1
  });

  // Calculated values
  const [calculatedTime, setCalculatedTime] = useState(0);
  const [selectedActivitiesDetail, setSelectedActivitiesDetail] = useState([]);
  const [articleCdeId, setArticleCdeId] = useState(null);
  const [articleComponents, setArticleComponents] = useState([]);
  const [currentArticle, setCurrentArticle] = useState(null);

  // Estado para sugerencias IA en el panel de actividades
  const [aiSuggestedIds, setAiSuggestedIds] = useState([]);
  const [aiEditedIds, setAiEditedIds] = useState([]); // edición interactiva antes de aceptar
  const [aiDetecting, setAiDetecting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [learningInstructions, setLearningInstructions] = useState("");
  const [showLearningInput, setShowLearningInput] = useState(false);
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  // Catálogo de actividades de la BD (para mostrar sugerencias IA)
  const [catalogActivities, setCatalogActivities] = useState([]);

  useEffect(() => {
    fetchData();
    // Cargar catálogo BD para mostrar sugerencias IA
    base44.entities.Activity.filter({ active: true })
      .then(data => setCatalogActivities(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [articleId]);

  const fetchData = async () => {
    try {
      const [activitiesData, processesData] = await Promise.all([
        localDataService.getActivities(),
        localDataService.getProcesses()
      ]);
      
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      setProcesses(Array.isArray(processesData) ? processesData : []);

      if (articleId) {
        const article = await localDataService.getArticle(articleId);
        if (article) {
          setFormData({
            code: article.code || "",
            name: article.name || "",
            description: article.description || "",
            client: article.client || "",
            reference: article.reference || "",
            type: article.type || "",
            process_code: article.process_code || null,
            selected_activities: article.selected_activities || [],
            operators_required: article.operators_required || 1,
            // Nuevos campos mapeados
            active: article.active !== undefined ? article.active : true,
            status_article: article.status_article || "PENDIENTE",
            injet: !!article.injet,
            laser: !!article.laser,
            etiquetado: !!article.etiquetado,
            celo: !!article.celo,
            unid_box: article.unid_box || 0,
            unid_pallet: article.unid_pallet || 0,
            multi_unid: article.multi_unid || 1
          });
          setCalculatedTime(article.total_time_seconds || 0);
          setSelectedActivitiesDetail(article.activities_detail || []);
          setCurrentArticle(article);
          // El ID de CDEApp se guarda en cde_id (campo directo) o en raw_data.id (sincronización CDEApp)
          const cdeId = article.cde_id || article.raw_data?.id || null;
          console.log('[Configurator] articleId:', articleId, '| cde_id:', article.cde_id, '| raw_data.id:', article.raw_data?.id, '| resolved cdeId:', cdeId);
          setArticleCdeId(cdeId ? Number(cdeId) : null);
          // Cargar componentes para el detector
          try {
            const comps = await base44.entities.ArticleComponent.filter({ article_cde_id: cdeId ? Number(cdeId) : -1 });
            setArticleComponents(Array.isArray(comps) ? comps : []);
          } catch (_) { setArticleComponents([]); }
          
          // Check if article needs process assignment
          if (!article.process_code && (!article.selected_activities || article.selected_activities.length === 0)) {
            setNeedsProcess(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const calculateTime = useCallback(async (activityIds) => {
    if (activityIds.length === 0) {
      setCalculatedTime(0);
      setSelectedActivitiesDetail([]);
      return;
    }

    try {
      const result = await localDataService.calculateTime(activityIds);
      setCalculatedTime(result.total_time_seconds);
      setSelectedActivitiesDetail(result.activities);
    } catch (error) {
      console.error("Error calculating time:", error);
    }
  }, []);

  const handleActivityToggle = (activityId) => {
    const newSelected = formData.selected_activities.includes(activityId)
      ? formData.selected_activities.filter(id => id !== activityId)
      : [...formData.selected_activities, activityId];
    
    setFormData(prev => ({
      ...prev,
      selected_activities: newSelected
      // Don't clear process_code, allow "Process + Extra"
    }));
    
    calculateTime(newSelected);
    setNeedsProcess(false);
  };

  const handleProcessSelect = async (processCode) => {
    if (processCode === "manual") {
      setFormData(prev => ({
        ...prev,
        process_code: null,
        selected_activities: []
      }));
      setCalculatedTime(0);
      setSelectedActivitiesDetail([]);
      return;
    }

    try {
      const process = await localDataService.getProcess(processCode);
      
      setFormData(prev => ({
        ...prev,
        process_code: processCode,
        selected_activities: process.activity_ids || []
      }));
      
      setCalculatedTime(process.total_time_seconds || 0);
      setSelectedActivitiesDetail(process.activities || []);
      setNeedsProcess(false);
    } catch (error) {
      console.error("Error loading process:", error);
      toast.error("Error al cargar el proceso");
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre del artículo es obligatorio");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await localDataService.updateArticle(articleId, formData);
        toast.success("Artículo actualizado correctamente");
        // Guardar corrección para aprendizaje si hubo cambios en actividades
        if (currentArticle) {
          const prevActivities = currentArticle.selected_activities || [];
          const newActivities = formData.selected_activities || [];
          const hasChanges = JSON.stringify([...prevActivities].sort()) !== JSON.stringify([...newActivities].sort());
          if (hasChanges) {
            base44.functions.invoke('detectActivitySuggestions', {
              action: 'save_correction',
              article_id: articleId,
              article_code: formData.code,
              article_name: formData.name,
              article_type: formData.type,
              suggested_activities: currentArticle.selected_activities || [],
              final_activities: newActivities,
              components_snapshot: articleComponents,
              process_code: formData.process_code,
              total_time_seconds: calculatedTime
            }).catch(e => console.warn('Learning log save failed:', e));
          }
        }
      } else {
        const newArticle = await localDataService.createArticle(formData);
        toast.success("Artículo creado correctamente");
        navigate(`/NewProcessConfigurator/configurator/${newArticle.id}`);
      }
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error("Error al guardar el artículo");
    } finally {
      setSaving(false);
    }
  };

  // Detección IA integrada en el panel de actividades
  const handleAiDetect = async () => {
    if (!currentArticle?.id) {
      toast.error("Guarda el artículo primero");
      return;
    }
    if (!articleComponents?.length) {
      toast.warning("Sincroniza los componentes desde CDEApp primero.");
      return;
    }
    setAiDetecting(true);
    setAiResult(null);
    setAiSuggestedIds([]);
    try {
      const res = await base44.functions.invoke("detectActivitySuggestions", {
        article_id: currentArticle.id,
        article_code: formData.code,
        article_name: formData.name,
        article_type: formData.type,
        article_cde_id: currentArticle.cde_id,
        components: articleComponents,
        learning_instructions: learningInstructions || undefined
      });
      const data = res.data;
      setAiResult(data);
      const suggested = data?.suggested_activity_ids || [];
      setAiSuggestedIds(suggested);
      setAiEditedIds([...suggested]); // copia editable
      setShowAiPanel(true);
      toast.success(`IA: ${suggested.length} actividades sugeridas`);
    } catch (err) {
      toast.error("Error en el análisis de actividades");
    } finally {
      setAiDetecting(false);
    }
  };

  // Toggle de una actividad en la lista editable del panel IA
  const handleAiEditToggle = (actId) => {
    setAiEditedIds(prev =>
      prev.includes(actId) ? prev.filter(id => id !== actId) : [...prev, actId]
    );
  };

  // Aceptar sugerencias IA (posiblemente editadas) → guardar en selected_activities
  const handleAcceptAiSuggestions = () => {
    const finalIds = aiEditedIds; // usa la lista editada por el usuario
    const merged = [...new Set([...formData.selected_activities, ...finalIds])];
    setFormData(prev => ({ ...prev, selected_activities: merged }));
    // Calcular tiempo usando actividades del catálogo BD
    const totalTime = merged.reduce((sum, id) => {
      const act = catalogActivities.find(a => a.id === id);
      return sum + (act?.time_seconds || (act?.interactions_per_minute ? 60 / act.interactions_per_minute : 0));
    }, 0);
    setCalculatedTime(totalTime);
    // Hidratar detalle para el panel resumen
    const detail = merged.map(id => {
      const act = catalogActivities.find(a => a.id === id);
      return act ? { id: act.id, name: act.name, time_seconds: act.time_seconds || 0, number: act.priority || '' } : null;
    }).filter(Boolean);
    setSelectedActivitiesDetail(detail);
    setNeedsProcess(false);
    // Guardar aprendizaje con correcciones e instrucciones
    if (currentArticle?.id) {
      base44.functions.invoke("detectActivitySuggestions", {
        action: "save_correction",
        article_id: currentArticle.id,
        article_code: formData.code,
        article_name: formData.name,
        article_type: formData.type,
        suggested_activities: aiSuggestedIds,
        final_activities: merged,
        components_snapshot: articleComponents || [],
        learning_instructions: learningInstructions || undefined
      }).catch(e => console.warn("Learning log save failed:", e));
    }
    setShowAiPanel(false);
    setShowLearningInput(false);
    setShowCatalogSearch(false);
    const added = finalIds.filter(id => !aiSuggestedIds.includes(id)).length;
    const removed = aiSuggestedIds.filter(id => !finalIds.includes(id)).length;
    toast.success(`${finalIds.length} actividades aplicadas${added || removed ? ` (${added ? `+${added}` : ''}${removed ? ` -${removed}` : ''} vs. IA)` : ''}`);
  };

  // Aplicar sugerencias de la IA (desde AIActivityConfigurator - panel lateral)
  const handleApplySuggestions = (suggestedIds) => {
    setFormData(prev => ({ ...prev, selected_activities: suggestedIds }));
    calculateTime(suggestedIds);
    setNeedsProcess(false);
    toast.success(`${suggestedIds.length} actividades aplicadas desde la detección IA`);
  };

  // Copiar proceso de artículo similar
  const handleApplySimilarArticle = async (similar) => {
    try {
      const art = await base44.entities.Article.filter({ id: similar.article_id });
      if (art?.length > 0 && art[0].selected_activities?.length > 0) {
        const ids = art[0].selected_activities;
        setFormData(prev => ({ ...prev, selected_activities: ids, process_code: art[0].process_code || null }));
        calculateTime(ids);
        setNeedsProcess(false);
        toast.success(`Proceso copiado de ${similar.article_code} (${Math.round(similar.similarity_score * 100)}% similar)`);
      }
    } catch (e) {
      toast.error("Error al copiar el proceso");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Estás seguro de eliminar este artículo?")) return;
    
    try {
      await localDataService.deleteArticle(articleId);
      toast.success("Artículo eliminado");
      navigate("/NewProcessConfigurator/articles");
    } catch (error) {
      console.error("Error deleting article:", error);
      toast.error("Error al eliminar el artículo");
    }
  };

  const handleExport = async (format) => {
    toast.info("La exportación no está disponible en modo local");
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds.toFixed(1)} seg`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="configurator-loading">
        <div className="spinner h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="configurator">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditing ? "Editar Artículo" : "Nuevo Artículo"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {needsProcess 
              ? "Este artículo necesita un proceso asignado" 
              : "Configura el proceso de fabricación para un artículo"
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && formData.process_code && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport('excel')}
                data-testid="export-excel-btn"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Excel
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleExport('pdf')}
                data-testid="export-pdf-btn"
              >
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
            </>
          )}
          {isEditing && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleDelete}
              data-testid="delete-article-btn"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Warning for articles needing process */}
      {needsProcess && (
        <Card className="border-orange-200 bg-orange-50" data-testid="needs-process-alert">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">
                  Este artículo no tiene proceso asignado
                </p>
                <p className="text-sm text-orange-600">
                  Selecciona un proceso predefinido o configura las actividades manualmente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="configurator-grid">
        {/* Main Form */}
        <div className="space-y-6">
          {/* Article Info */}
          <Card data-testid="article-info-card">
            <CardHeader>
              <CardTitle className="text-lg">Información del Artículo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código del Artículo</Label>
                  <Input
                    id="code"
                    placeholder="Ej: FR2927AV1"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    data-testid="article-code-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre / Abreviación *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: FRASCO AB HER SECRT PINK"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="article-name-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Input
                    id="client"
                    placeholder="Ej: ANTONIO PUIG, S.A"
                    value={formData.client}
                    onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
                    data-testid="article-client-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Referencia</Label>
                  <Input
                    id="reference"
                    placeholder="Ej: 65227506"
                    value={formData.reference}
                    onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                    data-testid="article-reference-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Input
                    id="type"
                    placeholder="Ej: Sobres, Frascos..."
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    data-testid="article-type-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Descripción opcional del artículo..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  data-testid="article-description-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="operators">Operarios Requeridos</Label>
                <Input
                  id="operators"
                  type="number"
                  min="1"
                  value={formData.operators_required}
                  onChange={(e) => setFormData(prev => ({ ...prev, operators_required: parseInt(e.target.value) || 1 }))}
                  className="w-32"
                  data-testid="operators-input"
                />
              </div>

              {/* Nuevos campos de características */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3">Características de Producción</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="injet" 
                      checked={formData.injet}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, injet: checked }))}
                    />
                    <Label htmlFor="injet" className="cursor-pointer">Injet</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="laser" 
                      checked={formData.laser}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, laser: checked }))}
                    />
                    <Label htmlFor="laser" className="cursor-pointer">Laser</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="etiquetado" 
                      checked={formData.etiquetado}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, etiquetado: checked }))}
                    />
                    <Label htmlFor="etiquetado" className="cursor-pointer">Etiquetado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="celo" 
                      checked={formData.celo}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, celo: checked }))}
                    />
                    <Label htmlFor="celo" className="cursor-pointer">Celo</Label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unid_box">Unidades / Caja</Label>
                    <Input
                      id="unid_box"
                      type="number"
                      value={formData.unid_box}
                      onChange={(e) => setFormData(prev => ({ ...prev, unid_box: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unid_pallet">Unidades / Pallet</Label>
                    <Input
                      id="unid_pallet"
                      type="number"
                      value={formData.unid_pallet}
                      onChange={(e) => setFormData(prev => ({ ...prev, unid_pallet: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="multi_unid">Multi Unid</Label>
                    <Input
                      id="multi_unid"
                      type="number"
                      value={formData.multi_unid}
                      onChange={(e) => setFormData(prev => ({ ...prev, multi_unid: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Estado del Artículo</Label>
                    <Select
                      value={formData.status_article}
                      onValueChange={(val) => setFormData(prev => ({ ...prev, status_article: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                        <SelectItem value="AUTORIZADO">AUTORIZADO</SelectItem>
                        <SelectItem value="OBSOLETO">OBSOLETO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 h-full pt-6">
                    <Checkbox 
                      id="active" 
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    />
                    <Label htmlFor="active" className="cursor-pointer font-medium">Artículo Activo</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Selection */}
          <Card data-testid="activity-selection-card">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Selección de Proceso / Actividades
                    {needsProcess && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Requerido
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Compón el proceso eligiendo actividades del catálogo o creando nuevas con su capacidad (uds/min)
                  </CardDescription>
                </div>
                {/* Botón IA integrado */}
                {isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAiDetect}
                    disabled={aiDetecting || !articleComponents?.length}
                    className="shrink-0 gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                    title={!articleComponents?.length ? "Sincroniza componentes para activar el análisis IA" : "Analizar con IA"}
                  >
                    {aiDetecting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Analizando...</>
                    ) : (
                      <><Brain className="h-4 w-4" /> Sugerir con IA</>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">

                {/* Panel de sugerencias IA - aparece después del análisis */}
                {showAiPanel && aiSuggestedIds.length > 0 && (
                  <div className="border border-violet-200 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 p-4 space-y-3">
                    {/* Cabecera */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles className="h-4 w-4 text-violet-600" />
                        <span className="text-sm font-semibold text-violet-800 dark:text-violet-300">
                          Sugerencias IA — {aiEditedIds.length} actividades
                          {aiEditedIds.length !== aiSuggestedIds.length && (
                            <span className="text-violet-500 font-normal ml-1">
                              (modificadas desde {aiSuggestedIds.length})
                            </span>
                          )}
                        </span>
                        {aiResult?.confidence && (
                          <Badge className={`text-[10px] px-1.5 ${
                            aiResult.confidence >= 0.8 ? 'bg-green-100 text-green-700 border-green-200' :
                            aiResult.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                            'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {Math.round(aiResult.confidence * 100)}% confianza
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => { setShowAiPanel(false); setShowLearningInput(false); setShowCatalogSearch(false); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {aiResult?.reasoning && (
                      <p className="text-xs text-violet-700 dark:text-violet-400 bg-violet-100/60 dark:bg-violet-900/20 rounded px-2 py-1.5 flex gap-1.5">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-violet-500" />
                        {aiResult.reasoning}
                      </p>
                    )}

                    {aiResult?.speed_estimation?.uds_per_minute > 0 && (
                      <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 rounded px-2 py-1.5">
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span>Velocidad estimada: <strong>~{aiResult.speed_estimation.uds_per_minute} uds/min</strong></span>
                        {aiResult.speed_estimation.bottleneck && (
                          <span className="text-blue-500">· Cuello de botella: <strong>{aiResult.speed_estimation.bottleneck.name}</strong></span>
                        )}
                      </div>
                    )}

                    {/* Lista editable de actividades sugeridas */}
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                      {aiEditedIds.map((id, idx) => {
                        const act = catalogActivities.find(a => a.id === id);
                        const wasOriginal = aiSuggestedIds.includes(id);
                        return (
                          <div key={id} className={`flex items-center justify-between px-2 py-1.5 rounded border text-xs ${
                            wasOriginal ? 'bg-white dark:bg-slate-800 border-violet-100' : 'bg-green-50 dark:bg-green-950/20 border-green-200'
                          }`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-muted-foreground shrink-0 w-4">{idx + 1}.</span>
                              <div className="min-w-0">
                                <span className="font-medium">{act ? act.name : <span className="text-muted-foreground italic">ID: {id.slice(-6)}</span>}</span>
                                {act && (
                                  <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                                    {act.type && <span className="text-[10px] px-1 rounded border bg-muted">{act.type}</span>}
                                    {act.interactions_per_minute && <span className="text-[10px]">{act.interactions_per_minute} uds/min</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {!wasOriginal && <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5">Añadida</Badge>}
                              <button
                                onClick={() => handleAiEditToggle(id)}
                                className="h-5 w-5 flex items-center justify-center rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Quitar esta actividad"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {/* Actividades sugeridas que el usuario ha quitado */}
                      {aiSuggestedIds.filter(id => !aiEditedIds.includes(id)).map(id => {
                        const act = catalogActivities.find(a => a.id === id);
                        return (
                          <div key={`removed-${id}`} className="flex items-center justify-between px-2 py-1.5 rounded border text-xs bg-slate-50 dark:bg-slate-900/30 border-slate-200 opacity-60">
                            <div className="flex items-center gap-2 min-w-0">
                              <Minus className="h-3 w-3 text-red-400 shrink-0" />
                              <span className="line-through text-muted-foreground">{act ? act.name : id.slice(-6)}</span>
                            </div>
                            <button
                              onClick={() => handleAiEditToggle(id)}
                              className="h-5 w-5 flex items-center justify-center rounded text-green-500 hover:bg-green-50 hover:text-green-700 transition-colors"
                              title="Restaurar esta actividad"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Añadir actividad del catálogo */}
                    <div>
                      <button
                        onClick={() => setShowCatalogSearch(s => !s)}
                        className="flex items-center gap-1.5 text-xs text-violet-700 hover:text-violet-900 font-medium"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Añadir actividad del catálogo
                        {showCatalogSearch ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {showCatalogSearch && (
                        <div className="mt-2 space-y-1.5">
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                            <input
                              className="w-full text-xs pl-6 pr-2 py-1.5 rounded border border-slate-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                              placeholder="Buscar actividad..."
                              value={catalogSearch}
                              onChange={e => setCatalogSearch(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div className="max-h-36 overflow-y-auto space-y-0.5">
                            {catalogActivities
                              .filter(a => !aiEditedIds.includes(a.id) && a.name.toLowerCase().includes(catalogSearch.toLowerCase()))
                              .slice(0, 12)
                              .map(act => (
                                <button
                                  key={act.id}
                                  onClick={() => { setAiEditedIds(prev => [...prev, act.id]); setCatalogSearch(""); }}
                                  className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-violet-100 dark:hover:bg-violet-900/30 flex items-center justify-between gap-2"
                                >
                                  <span className="font-medium">{act.name}</span>
                                  <span className="text-muted-foreground text-[10px] shrink-0">{act.type}</span>
                                </button>
                              ))
                            }
                            {catalogActivities.filter(a => !aiEditedIds.includes(a.id) && a.name.toLowerCase().includes(catalogSearch.toLowerCase())).length === 0 && (
                              <p className="text-xs text-muted-foreground text-center py-2">Sin resultados</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Instrucciones de aprendizaje */}
                    <div className="border-t border-violet-200 pt-3">
                      <button
                        onClick={() => setShowLearningInput(s => !s)}
                        className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium"
                      >
                        <MessageSquarePlus className="h-3.5 w-3.5" />
                        Enseñar algo a la IA sobre este artículo
                        {showLearningInput ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {showLearningInput && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            Describe aquí aspectos específicos que la IA no tiene en cuenta. Ej: "lleva una rejilla separadora que hay que montar e insertar en la caja". Se guardará y se usará en próximos análisis.
                          </p>
                          <textarea
                            className="w-full text-xs px-2 py-1.5 rounded border border-amber-200 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                            rows={3}
                            placeholder="Ej: Este artículo lleva una rejilla separadora que requiere ser montada e insertada en la caja antes del sellado..."
                            value={learningInstructions}
                            onChange={e => setLearningInstructions(e.target.value)}
                          />
                          <p className="text-[10px] text-muted-foreground">Se guardará al aceptar las sugerencias y mejorará los próximos análisis de este artículo.</p>
                        </div>
                      )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 bg-violet-600 hover:bg-violet-700 text-white gap-2"
                        onClick={handleAcceptAiSuggestions}
                        disabled={aiEditedIds.length === 0}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aplicar {aiEditedIds.length} actividades
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-300 text-slate-600"
                        onClick={() => { setShowAiPanel(false); setShowLearningInput(false); setShowCatalogSearch(false); }}
                      >
                        Descartar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Process Selector */}
                <div className="space-y-2">
                  <Label>Proceso Base</Label>
                  <Select
                    value={formData.process_code || "manual"}
                    onValueChange={handleProcessSelect}
                  >
                    <SelectTrigger data-testid="process-select">
                      <SelectValue placeholder="Selecciona un proceso base" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">-- Sin Proceso Base (Manual) --</SelectItem>
                      {processes.filter(p => p.code).map((process) => (
                        <SelectItem key={process.id} value={process.code}>
                          <span className="flex items-center gap-2">
                            <span className="font-mono font-bold">{process.code}</span>
                            <span className="text-muted-foreground">
                              ({process.activities_count || process.activity_numbers?.length || 0} actividades)
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {formData.process_code && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Proceso <strong>{formData.process_code}</strong> seleccionado como base. Puedes añadir o quitar actividades libremente.</span>
                    </div>
                  )}
                </div>

                {/* Activity List — Herramienta completa de composición del proceso */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Actividades del Proceso</Label>
                    <Badge variant="outline">
                      {formData.selected_activities.length} seleccionadas
                    </Badge>
                  </div>
                  <ProcessBuilder
                    selectedIds={formData.selected_activities}
                    onChange={(ids) => {
                      setFormData(prev => ({ ...prev, selected_activities: ids }));
                      setNeedsProcess(false);
                    }}
                    onDetailsChange={({ totalTime, activities }) => {
                      setCalculatedTime(totalTime);
                      setSelectedActivitiesDetail(activities);
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Componentes del artículo */}
        {isEditing && (
          <div className="space-y-4">
            <ArticleComponentsPanel 
              articleCdeId={articleCdeId} 
              articleCode={!articleCdeId ? formData.code : undefined}
            />
          </div>
        )}

        {/* Summary Panel */}
        <div className="space-y-4">
          <Card className="sticky top-4" data-testid="summary-card">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-sm">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Resumen
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Article info summary */}
              {(formData.code || formData.client) && (
                <div className="space-y-2 pb-4 border-b">
                  {formData.code && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Código:</span>{" "}
                      <span className="font-mono font-medium">{formData.code}</span>
                    </p>
                  )}
                  {formData.client && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{formData.client}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Time */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Tiempo Total</span>
                </div>
                <p className="time-display" data-testid="total-time">
                  {formatTime(calculatedTime)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ({(calculatedTime / 60).toFixed(2)} minutos)
                </p>
              </div>

              {/* Operators */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Operarios</span>
                </div>
                <p className="text-2xl font-bold" data-testid="operators-count">
                  {formData.operators_required}
                </p>
              </div>

              {/* Activities Count */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                  <Layers className="h-4 w-4" />
                  <span className="text-sm">Actividades</span>
                </div>
                <p className="text-2xl font-bold" data-testid="activities-count">
                  {formData.selected_activities.length}
                </p>
              </div>

              {/* Process */}
              {formData.process_code ? (
                <div className="text-center p-3 bg-green-50 border border-green-200 rounded-sm">
                  <p className="text-xs text-green-600">Proceso</p>
                  <p className="font-semibold text-green-800">{formData.process_code}</p>
                </div>
              ) : formData.selected_activities.length > 0 ? (
                <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-xs text-blue-600">Modo</p>
                  <p className="font-semibold text-blue-800">Configuración Manual</p>
                </div>
              ) : (
                <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-sm">
                  <p className="text-xs text-orange-600">Estado</p>
                  <p className="font-semibold text-orange-800">Sin proceso</p>
                </div>
              )}

              {/* Selected Activities List */}
              {selectedActivitiesDetail.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Actividades seleccionadas:</p>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {selectedActivitiesDetail.map((activity) => (
                        <div 
                          key={activity.id}
                          className="flex justify-between text-xs p-2 bg-muted/50 rounded-sm"
                        >
                          <span className="truncate flex-1">
                            <span className="font-mono text-primary mr-1">{activity.number}</span>
                            {activity.name}
                          </span>
                          <span className="font-mono ml-2">{activity.time_seconds}s</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Save Button */}
              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                data-testid="save-article-btn"
              >
                {saving ? (
                  <>
                    <div className="spinner h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {isEditing ? "Actualizar" : "Guardar"} Artículo
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}