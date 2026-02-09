
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Save, Trash2, ArrowLeftRight, Mic, Square } from "lucide-react";
import { format } from "date-fns";
import { getMachineAlias } from "@/utils/machineAlias";

export default function ShiftHandoverPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [turnoSaliente, setTurnoSaliente] = useState("Mañana");
  const [turnoEntrante, setTurnoEntrante] = useState("Tarde");
  const [observaciones, setObservaciones] = useState({});
  const [otrasIndicaciones, setOtrasIndicaciones] = useState("");
  const [isRecording, setIsRecording] = useState({});
  const [recognition, setRecognition] = useState(null);
  const queryClient = useQueryClient();

  const { data: machines, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: async () => {
      const data = await base44.entities.MachineMasterDatabase.list(undefined, 1000);
      return (Array.isArray(data) ? data : [])
        .map(m => ({
          id: m.id,
          nombre: m.nombre || '',
          alias: getMachineAlias(m),
          codigo: m.codigo_maquina || m.codigo || '',
          estado: m.estado_operativo || 'Disponible',
          orden: m.orden_visualizacion || 999
        }))
        .sort((a, b) => (a.orden || 999) - (b.orden || 999));
    },
    initialData: [],
  });

  const { data: handovers } = useQuery({
    queryKey: ['shiftHandovers', selectedDate, turnoSaliente, turnoEntrante],
    queryFn: () => base44.entities.ShiftHandover.list(),
    initialData: [],
  });


  const saveHandoverMutation = useMutation({
    mutationFn: async (data) => {
      const existing = handovers.find(
        h => h.fecha === data.fecha &&
        h.turno_saliente === data.turno_saliente &&
        h.turno_entrante === data.turno_entrante
      );

      if (existing) {
        return base44.entities.ShiftHandover.update(existing.id, data);
      }
      return base44.entities.ShiftHandover.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftHandovers'] });
    },
  });

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'es-ES';
      setRecognition(recognitionInstance);
    }
  }, []);

  // Cargar datos existentes cuando cambia la fecha o los turnos
  useEffect(() => {
    const existing = handovers.find(
      h => h.fecha === selectedDate &&
      h.turno_saliente === turnoSaliente &&
      h.turno_entrante === turnoEntrante
    );

    if (existing) {
      setObservaciones(existing.observaciones_maquinas || {});
      setOtrasIndicaciones(existing.otras_indicaciones || "");
    } else {
      setObservaciones({});
      setOtrasIndicaciones("");
    }
  }, [selectedDate, turnoSaliente, turnoEntrante, handovers]);

  const handleObservacionChange = (machineId, value) => {
    setObservaciones(prev => ({
      ...prev,
      [machineId]: value
    }));
  };

  const handleVoiceInput = (fieldId, fieldType = 'machine') => {
    if (!recognition) {
      alert('Tu navegador no soporta reconocimiento de voz. Por favor usa Chrome, Edge o Safari.');
      return;
    }

    const recordingKey = `${fieldType}-${fieldId}`;

    if (isRecording[recordingKey]) {
      // Detener grabación
      recognition.stop();
      setIsRecording(prev => ({ ...prev, [recordingKey]: false }));
    } else {
      // Iniciar grabación
      setIsRecording(prev => ({ ...prev, [recordingKey]: true }));

      recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript;

        if (fieldType === 'machine') {
          setObservaciones(prev => ({
            ...prev,
            [fieldId]: (prev[fieldId] ? prev[fieldId].trim() + ' ' : '') + transcript.trim()
          }));
        } else if (fieldType === 'general') {
          setOtrasIndicaciones(prev => (prev ? prev.trim() + ' ' : '') + transcript.trim());
        }
      };

      recognition.onerror = (event) => {
        console.error('Error de reconocimiento de voz:', event.error);
        setIsRecording(prev => ({ ...prev, [recordingKey]: false }));
        // alert(`Error en el reconocimiento de voz: ${event.error}`); // Optional: provide user feedback
      };

      recognition.onend = () => {
        // Recognition ended, ensure recording state is off
        setIsRecording(prev => ({ ...prev, [recordingKey]: false }));
      };

      recognition.start();
    }
  };


  const handleSave = () => {
    const data = {
      fecha: selectedDate,
      turno_saliente: turnoSaliente,
      turno_entrante: turnoEntrante,
      observaciones_maquinas: observaciones,
      otras_indicaciones: otrasIndicaciones,
    };

    saveHandoverMutation.mutate(data);
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar todas las observaciones?')) {
      setObservaciones({});
      setOtrasIndicaciones("");
    }
  };

  const getTurnoColor = (turno) => {
    switch (turno) {
      case "Mañana": return "bg-amber-100 text-amber-800";
      case "Tarde": return "bg-blue-100 text-blue-800";
      case "Noche": return "bg-indigo-100 text-indigo-800";
      default: return "bg-slate-100 text-slate-800";
    }
  };

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Standard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <ArrowLeftRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Información Traspaso de Turno
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Registra observaciones y información relevante en el cambio de turno
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleClear}
            size="sm"
            variant="outline"
            className="h-8 gap-2 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
            <Button
              onClick={handleSave}
              disabled={saveHandoverMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveHandoverMutation.isPending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        {/* Configuración de Traspaso */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Configuración del Traspaso</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="turno_saliente">Turno Saliente</Label>
                <Select value={turnoSaliente} onValueChange={setTurnoSaliente}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mañana">Mañana</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noche">Noche</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="turno_entrante">Turno Entrante</Label>
                <Select value={turnoEntrante} onValueChange={setTurnoEntrante}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mañana">Mañana</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noche">Noche</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <Badge className={getTurnoColor(turnoSaliente)}>
                {turnoSaliente} (Saliente)
              </Badge>
              <RefreshCw className="w-5 h-5 text-blue-600" />
              <Badge className={getTurnoColor(turnoEntrante)}>
                {turnoEntrante} (Entrante)
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Estado de Máquinas */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Estado de las Máquinas</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500">Cargando máquinas...</div>
            ) : machines.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No hay máquinas registradas
              </div>
            ) : (
              <div className="space-y-4">
                {machines.map((machine) => {
                  const recordingKey = `machine-${machine.id}`;
                  const isCurrentlyRecording = isRecording[recordingKey];

                  return (
                    <div key={machine.id} className="border rounded-lg p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-lg">
                            {getMachineAlias(machine)}
                          </h3>
                        </div>
                        <Badge className={
                          machine.estado === "Disponible"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }>
                          {machine.estado}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor={`obs-${machine.id}`} className="text-sm font-medium text-slate-700">
                            Observaciones del Jefe de Turno Saliente
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant={isCurrentlyRecording ? "destructive" : "outline"}
                            onClick={() => handleVoiceInput(machine.id, 'machine')}
                            className="ml-2"
                          >
                            {isCurrentlyRecording ? (
                              <>
                                <Square className="w-4 h-4 mr-1" />
                                Detener
                              </>
                            ) : (
                              <>
                                <Mic className="w-4 h-4 mr-1" />
                                Grabar
                              </>
                            )}
                          </Button>
                        </div>
                        <Textarea
                          id={`obs-${machine.id}`}
                          value={observaciones[machine.id] || ""}
                          onChange={(e) => handleObservacionChange(machine.id, e.target.value)}
                          placeholder="Escribe o graba el estado de la máquina, incidencias, trabajos pendientes, etc..."
                          rows={3}
                          className={`resize-none ${isCurrentlyRecording ? 'border-red-500 bg-red-50' : ''}`}
                        />
                        {isCurrentlyRecording && (
                          <p className="text-xs text-red-600 animate-pulse">
                            🔴 Grabando... Habla ahora
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Otras Indicaciones */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle>Otras Indicaciones Generales</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="otras_indicaciones" className="text-sm font-medium text-slate-700">
                  Información adicional relevante para el turno entrante
                </Label>
                <Button
                  type="button"
                  size="sm"
                  variant={isRecording['general-general'] ? "destructive" : "outline"}
                  onClick={() => handleVoiceInput('general', 'general')}
                >
                  {isRecording['general-general'] ? (
                    <>
                      <Square className="w-4 h-4 mr-1" />
                      Detener
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 mr-1" />
                      Grabar
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                id="otras_indicaciones"
                value={otrasIndicaciones}
                onChange={(e) => setOtrasIndicaciones(e.target.value)}
                placeholder="Incidencias generales, avisos importantes, personal ausente, reuniones programadas, etc..."
                rows={6}
                className={`resize-none ${isRecording['general-general'] ? 'border-red-500 bg-red-50' : ''}`}
              />
              {isRecording['general-general'] && (
                <p className="text-xs text-red-600 animate-pulse">
                  🔴 Grabando... Habla ahora
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {saveHandoverMutation.isSuccess && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              ✓ Información del cambio de turno guardada correctamente
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
