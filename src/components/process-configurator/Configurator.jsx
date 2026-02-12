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
              <div className="space-y-6">
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

                {/* Activity List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Actividades del Proceso</Label>
                    <Badge variant="outline">
                      {formData.selected_activities.length} seleccionadas
                    </Badge>
                  </div>
                  
                  {activities.length === 0 ? (
                    <div className="empty-state py-8 border-2 border-dashed rounded-lg text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground">
                        No hay actividades cargadas. Sube un archivo Excel primero.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] border rounded-md p-4">
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
                              className="flex-1 cursor-pointer select-none"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded mr-2">
                                    {activity.number}
                                  </span>
                                  <span className="font-medium text-sm">{activity.name}</span>
                                </div>
                                <Badge variant="outline" className="ml-2 shrink-0">
                                  {activity.time_seconds}s
                                </Badge>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </div>
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