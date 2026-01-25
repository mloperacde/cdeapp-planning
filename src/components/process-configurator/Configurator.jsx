import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { localDataService } from "./services/localDataService";
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
  Building2
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
    process_code: null,
    selected_activities: [],
    operators_required: 1
  });

  // Calculated values
  const [calculatedTime, setCalculatedTime] = useState(0);
  const [selectedActivitiesDetail, setSelectedActivitiesDetail] = useState([]);

  useEffect(() => {
    fetchData();
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
            process_code: article.process_code || null,
            selected_activities: article.selected_activities || [],
            operators_required: article.operators_required || 1
          });
          setCalculatedTime(article.total_time_seconds || 0);
          setSelectedActivitiesDetail(article.activities_detail || []);
          
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
      selected_activities: newSelected,
      process_code: null // Clear process when manually selecting
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
            </CardContent>
          </Card>

          {/* Activity Selection */}
          <Card data-testid="activity-selection-card">
            <CardHeader>
              <CardTitle className="text-lg">
                Selección de Proceso / Actividades
                {needsProcess && (
                  <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">
                    Requerido
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Selecciona un proceso predefinido o elige las actividades manualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="process" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="process" data-testid="tab-process">
                    Proceso Predefinido
                  </TabsTrigger>
                  <TabsTrigger value="manual" data-testid="tab-manual">
                    Selección Manual
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="process" className="space-y-4">
                  <Select
                    value={formData.process_code || "manual"}
                    onValueChange={handleProcessSelect}
                  >
                    <SelectTrigger data-testid="process-select">
                      <SelectValue placeholder="Selecciona un proceso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">-- Selección Manual --</SelectItem>
                      {processes.map((process) => (
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
                    <div className="p-4 bg-green-50 border border-green-200 rounded-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-sm font-medium text-green-800">
                          Proceso {formData.process_code} seleccionado
                        </p>
                      </div>
                      <p className="text-sm text-green-700">
                        {formData.selected_activities.length} actividades incluidas
                      </p>
                    </div>
                  )}

                  {/* Quick process list */}
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Procesos disponibles:</p>
                    <ScrollArea className="h-[200px]">
                      <div className="flex flex-wrap gap-2">
                        {processes.slice(0, 50).map((process) => (
                          <Button
                            key={process.id}
                            variant={formData.process_code === process.code ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleProcessSelect(process.code)}
                            className="font-mono"
                            data-testid={`quick-process-${process.code}`}
                          >
                            {process.code}
                          </Button>
                        ))}
                        {processes.length > 50 && (
                          <span className="text-sm text-muted-foreground self-center">
                            +{processes.length - 50} más
                          </span>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="manual" className="space-y-4">
                  {activities.length === 0 ? (
                    <div className="empty-state py-8">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground">
                        No hay actividades cargadas. Sube un archivo Excel primero.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-2">
                        {activities.map((activity) => (
                          <div
                            key={activity.id}
                            className={`flex items-center gap-3 p-3 rounded-sm border transition-colors ${
                              formData.selected_activities.includes(activity.id)
                                ? 'border-primary bg-primary/5'
                                : 'hover:bg-accent'
                            }`}
                            data-testid={`activity-${activity.id}`}
                          >
                            <Checkbox
                              id={activity.id}
                              checked={formData.selected_activities.includes(activity.id)}
                              onCheckedChange={() => handleActivityToggle(activity.id)}
                              data-testid={`activity-checkbox-${activity.id}`}
                            />
                            <label
                              htmlFor={activity.id}
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded mr-2">
                                    {activity.number}
                                  </span>
                                  <span className="font-medium">{activity.name}</span>
                                </div>
                                <Badge variant="outline" className="ml-2">
                                  {activity.time_seconds}s
                                </Badge>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

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