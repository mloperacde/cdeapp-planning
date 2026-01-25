import { useState, useEffect, useCallback } from "react";
// import axios from "axios"; // Removed axios
import { localDataService } from "./services/localDataService";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// Accordion removed - showing activities inline
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  Layers,
  Clock,
  RefreshCw,
  Trash2
} from "lucide-react";

// const API = `${import.meta.env.VITE_BACKEND_URL || ''}/api`; // Removed API constant

export default function DataManagement() {
  const [activities, setActivities] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activitiesData, processesData] = await Promise.all([
        localDataService.getActivities(),
        localDataService.getProcesses()
      ]);
      setActivities(Array.isArray(activitiesData) ? activitiesData : []);
      setProcesses(Array.isArray(processesData) ? processesData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncApi = async () => {
    setLoading(true);
    try {
      const activities = await localDataService.fetchApiActivities();
      const processes = await localDataService.fetchApiProcesses();
      
      toast.success(
        `Sincronización (API/Local): ${activities.length} actividades, ${processes.length} procesos`
      );
      fetchData();
    } catch (error) {
      toast.error("Error al sincronizar");
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    if (confirm("¿Estás seguro de borrar todos los datos locales? Esto eliminará actividades, procesos y artículos guardados en el navegador.")) {
        localDataService.clearAll();
        fetchData();
        toast.success("Datos locales eliminados correctamente");
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error("El archivo debe ser Excel (.xlsx o .xls)");
      return;
    }

    setUploading(true);
    // const formData = new FormData();
    // formData.append('file', file);

    try {
      const result = await localDataService.processExcel(file);
      
      toast.success(
        `Excel procesado: ${result.activities_count} actividades, ${result.processes_count} procesos`
      );
      fetchData();
    } catch (error) {
      console.error("Error uploading:", error);
      toast.error(error.message || "Error al procesar el archivo Excel");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0 seg";
    if (seconds < 60) return `${seconds.toFixed(1)} seg`;
    return `${(seconds / 60).toFixed(1)} min`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="data-loading">
        <div className="spinner h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="data-management-page">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Datos</h1>
          <p className="text-muted-foreground mt-1">
            Carga y gestiona los datos de procesos y actividades desde Excel
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleSyncApi}
            data-testid="sync-api-btn"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sincronizar API
          </Button>
          <Button 
            variant="outline" 
            onClick={fetchData}
            data-testid="refresh-btn"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Recargar Local
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleClearData}
            data-testid="clear-btn"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Borrar Datos
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <Card data-testid="upload-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cargar Archivo Excel
          </CardTitle>
          <CardDescription>
            Arrastra y suelta o haz clic para seleccionar tu archivo Excel con los procesos y actividades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`dropzone relative border-2 border-dashed rounded-sm p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="dropzone"
          >
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileInput}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
              data-testid="file-input"
            />
            
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="spinner h-10 w-10 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-muted-foreground">Procesando archivo...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="p-4 bg-muted rounded-full">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Arrastra tu archivo Excel aquí</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    o haz clic para seleccionar (.xlsx, .xls)
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card data-testid="activities-stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Actividades Cargadas</p>
                <p className="text-3xl font-bold mt-1">{activities.length}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-sm">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card data-testid="processes-stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Procesos Disponibles</p>
                <p className="text-3xl font-bold mt-1">{processes.length}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-sm">
                <Layers className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities Table */}
        <Card data-testid="activities-table-card">
          <CardHeader>
            <CardTitle className="text-lg">Actividades</CardTitle>
            <CardDescription>
              Lista de actividades extraídas del Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="empty-state py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No hay actividades cargadas
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Nº</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right w-[100px]">Tiempo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="font-mono text-muted-foreground">
                          {activity.number}
                        </TableCell>
                        <TableCell className="font-medium">
                          {activity.name}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {activity.time_seconds}s
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Processes List */}
        <Card data-testid="processes-list-card">
          <CardHeader>
            <CardTitle className="text-lg">Procesos</CardTitle>
            <CardDescription>
              Procesos predefinidos con sus actividades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processes.length === 0 ? (
              <div className="empty-state py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  No hay procesos cargados
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {processes.map((process) => {
                    // Map activity numbers to activity objects
                    const activityMap = {};
                    activities.forEach(a => { activityMap[a.number] = a; });
                    const processActivities = (process.activity_numbers || [])
                      .map(num => activityMap[num])
                      .filter(Boolean);
                    
                    return (
                      <div 
                        key={process.id} 
                        className="border rounded-sm p-4 bg-card"
                        data-testid={`process-${process.code}`}
                      >
                        {/* Process Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <Badge className="shrink-0 text-sm px-3 py-1">{process.code}</Badge>
                          <div>
                            <p className="font-semibold">{process.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {processActivities.length} actividades • {formatTime(process.total_time_seconds)}
                            </p>
                          </div>
                        </div>
                        
                        {/* Activities List */}
                        <div className="pl-2 space-y-1">
                          {processActivities.length > 0 ? (
                            processActivities.map((activity, idx) => (
                              <div 
                                key={`${process.id}-${activity.id}-${idx}`}
                                className="flex justify-between text-sm py-1.5 px-2 bg-muted/40 rounded-sm"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    {activity.number}
                                  </span>
                                  <span>{activity.name}</span>
                                </span>
                                <span className="font-mono text-muted-foreground text-xs">
                                  {activity.time_seconds}s
                                </span>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground py-2">
                              Sin actividades asignadas
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card className="bg-muted/30" data-testid="info-card">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="font-semibold">Formato esperado del Excel</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Columnas de actividades con: Número, Nombre, Tiempo (segundos)</li>
                <li>• Columnas de procesos con formato "PROCESO A", "PROCESO B", etc.</li>
                <li>• Referencias de actividades en cada proceso (ej: "1-3-5-9-18")</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}