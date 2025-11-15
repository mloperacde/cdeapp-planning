import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function LockerConfigForm({ vestuario, config, lockerRoomStats }) {
  const [numTaquillas, setNumTaquillas] = useState(config?.numero_taquillas_instaladas || 0);
  const [identificadores, setIdentificadores] = useState("");
  const [modoEntrada, setModoEntrada] = useState("auto");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (config) {
      setNumTaquillas(config.numero_taquillas_instaladas || 0);
      
      if (config.identificadores_taquillas && config.identificadores_taquillas.length > 0) {
        setIdentificadores(config.identificadores_taquillas.join(', '));
        setModoEntrada("manual");
      } else {
        setIdentificadores("");
        setModoEntrada("auto");
      }
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      let identificadoresArray = [];
      
      if (modoEntrada === "manual") {
        identificadoresArray = identificadores
          .split(',')
          .map(id => id.trim())
          .filter(id => id !== "");
        
        if (identificadoresArray.length !== numTaquillas) {
          throw new Error(`El número de identificadores (${identificadoresArray.length}) debe coincidir con el número de taquillas instaladas (${numTaquillas})`);
        }
        
        const duplicados = identificadoresArray.filter((item, index) => 
          identificadoresArray.indexOf(item) !== index
        );
        
        if (duplicados.length > 0) {
          throw new Error(`Identificadores duplicados encontrados: ${duplicados.join(', ')}`);
        }
      } else {
        identificadoresArray = Array.from({ length: numTaquillas }, (_, i) => (i + 1).toString());
      }

      const dataToSave = {
        vestuario,
        numero_taquillas_instaladas: parseInt(numTaquillas),
        identificadores_taquillas: identificadoresArray
      };

      if (config) {
        return base44.entities.LockerRoomConfig.update(config.id, dataToSave);
      }
      return base44.entities.LockerRoomConfig.create(dataToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerRoomConfigs'] });
      toast.success("Configuración guardada");
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleGenerateSequential = () => {
    const ids = Array.from({ length: numTaquillas }, (_, i) => i + 1).join(', ');
    setIdentificadores(ids);
  };

  const stat = lockerRoomStats?.find(s => s.vestuario === vestuario);

  return (
    <div className="border-2 border-slate-200 rounded-lg p-5 bg-slate-50">
      <h3 className="text-lg font-bold text-slate-900 mb-4">
        {vestuario}
      </h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor={`num-${vestuario}`}>Número Total de Taquillas Instaladas *</Label>
            <Input
              id={`num-${vestuario}`}
              type="number"
              min="0"
              value={numTaquillas}
              onChange={(e) => setNumTaquillas(parseInt(e.target.value) || 0)}
              required
              className="text-lg"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Estado Actual</Label>
            <div className="h-12 flex items-center gap-3">
              <Badge className="bg-green-600 text-white text-base px-3 py-1">
                {stat?.asignadas || 0} asignadas
              </Badge>
              <Badge variant="outline" className="text-base px-3 py-1">
                {stat?.libres || 0} libres
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Modo de Identificadores</Label>
          <div className="flex gap-4">
            <Button
              type="button"
              variant={modoEntrada === "auto" ? "default" : "outline"}
              onClick={() => setModoEntrada("auto")}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Automático (1, 2, 3...)
            </Button>
            <Button
              type="button"
              variant={modoEntrada === "manual" ? "default" : "outline"}
              onClick={() => setModoEntrada("manual")}
              className="flex-1"
            >
              Personalizado
            </Button>
          </div>
        </div>

        {modoEntrada === "manual" && (
          <div className="space-y-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor={`ids-${vestuario}`}>
                Identificadores de Taquillas (separados por comas)
              </Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleGenerateSequential}
              >
                Generar 1,2,3...
              </Button>
            </div>
            <Textarea
              id={`ids-${vestuario}`}
              placeholder="Ejemplo: 1, 2, 3, 4, 5, A1, A2, B1, B2..."
              value={identificadores}
              onChange={(e) => setIdentificadores(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <div className="flex items-start gap-2 text-xs">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-blue-800">
                <p>Ingresa los identificadores únicos de cada taquilla separados por comas.</p>
                <p className="mt-1">
                  Cantidad actual: <strong>{identificadores.split(',').filter(id => id.trim()).length}</strong> 
                  {' '}/ Requeridos: <strong>{numTaquillas}</strong>
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={() => saveConfigMutation.mutate()}
          disabled={saveConfigMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saveConfigMutation.isPending ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </div>
    </div>
  );
}