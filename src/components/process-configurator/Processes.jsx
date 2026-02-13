import { useState, useEffect } from "react";
import { localDataService } from "./services/localDataService";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Layers, Clock, Edit, Save, Plus } from "lucide-react";

export default function Processes() {
  const [processes, setProcesses] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProcess, setEditedProcess] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [procData, actData] = await Promise.all([
        localDataService.getProcesses(),
        localDataService.getActivities()
      ]);
      setProcesses(Array.isArray(procData) ? procData : []);
      setActivities(Array.isArray(actData) ? actData : []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (process) => {
    setSelectedProcess(process);
    setEditedProcess({
      ...process,
      activity_numbers: [...(process.activity_numbers || [])]
    });
    setIsEditing(true);
  };

  const handleSaveProcess = async () => {
    try {
      // Recalculate time and count
      const activityMap = new Map(activities.map(a => [a.number, a]));
      let totalTime = 0;
      const validActivities = [];
      
      editedProcess.activity_numbers.sort((a, b) => a - b).forEach(num => {
        const act = activityMap.get(num);
        if (act) {
          totalTime += act.time_seconds;
          validActivities.push(num);
        }
      });

      const updatedProcess = {
        ...editedProcess,
        activity_numbers: validActivities,
        activities_count: validActivities.length,
        total_time_seconds: totalTime
      };

      // Save using service (which syncs to API)
      await localDataService.saveProcesses([updatedProcess]);
      
      // Update local state
      setProcesses(prev => prev.map(p => p.id === updatedProcess.id ? updatedProcess : p));
      
      toast.success("Proceso actualizado correctamente");
      setIsEditing(false);
      setSelectedProcess(null);
    } catch (error) {
      console.error("Error saving process:", error);
      toast.error("Error al guardar el proceso");
    }
  };

  const toggleActivity = (number) => {
    setEditedProcess(prev => {
      const current = prev.activity_numbers || [];
      if (current.includes(number)) {
        return { ...prev, activity_numbers: current.filter(n => n !== number) };
      } else {
        return { ...prev, activity_numbers: [...current, number] };
      }
    });
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0s";
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
  };

  const filteredProcesses = processes.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Procesos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los procesos y sus actividades asociadas
          </p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar proceso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full sm:w-[300px]"
          />
        </div>
      </div>

      {/* Processes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProcesses.map(process => (
          <Card key={process.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleEditClick(process)}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{process.code}</Badge>
                </div>
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(process.total_time_seconds)}
                </Badge>
              </div>
              <CardTitle className="text-lg mt-2">{process.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">
                <span className="font-medium text-foreground">{process.activities_count}</span> actividades
              </div>
              <div className="flex flex-wrap gap-1">
                {(process.activity_numbers || []).slice(0, 5).map(num => (
                  <Badge key={num} variant="secondary" className="text-[10px] px-1 h-5">
                    {num}
                  </Badge>
                ))}
                {(process.activity_numbers || []).length > 5 && (
                  <Badge variant="secondary" className="text-[10px] px-1 h-5">
                    +{(process.activity_numbers || []).length - 5}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Proceso: {selectedProcess?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Código</label>
                <Input value={editedProcess?.code || ''} disabled />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Nombre</label>
                <Input 
                  value={editedProcess?.name || ''} 
                  onChange={(e) => setEditedProcess({...editedProcess, name: e.target.value})}
                />
              </div>
            </div>

            <div className="border rounded-md flex-1 overflow-hidden flex flex-col">
              <div className="p-2 bg-muted border-b font-medium text-sm flex justify-between items-center">
                <span>Seleccionar Actividades</span>
                <span className="text-muted-foreground">
                  {editedProcess?.activity_numbers?.length || 0} seleccionadas
                </span>
              </div>
              <ScrollArea className="flex-1 p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activities.map(activity => {
                    const isSelected = editedProcess?.activity_numbers?.includes(activity.number);
                    return (
                      <div 
                        key={activity.id} 
                        className={`flex items-center space-x-2 p-2 rounded hover:bg-muted/50 ${isSelected ? 'bg-primary/5' : ''}`}
                      >
                        <Checkbox 
                          id={`act-${activity.id}`} 
                          checked={isSelected}
                          onCheckedChange={() => toggleActivity(activity.number)}
                        />
                        <label 
                          htmlFor={`act-${activity.id}`} 
                          className="text-sm flex-1 cursor-pointer select-none grid grid-cols-[30px_1fr_auto] gap-2"
                        >
                          <span className="font-mono font-bold text-muted-foreground">{activity.number}</span>
                          <span className="truncate" title={activity.name}>{activity.name}</span>
                          <span className="text-xs text-muted-foreground">{activity.time_seconds}s</span>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
            <Button onClick={handleSaveProcess}>
              <Save className="h-4 w-4 mr-2" />
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
