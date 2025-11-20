import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SyncParametersConfig() {
  const [config, setConfig] = useState({
    autoSync: false,
    syncInterval: 300,
    delayBetweenRecords: 800,
    maxRetries: 3,
    onConflictPreferMaster: true,
    syncOnImport: true,
    validateBeforeSync: true
  });

  const handleSave = () => {
    alert('Parámetros de sincronización guardados');
  };

  return (
    <div className="space-y-6">
      <Alert className="border-purple-200 bg-purple-50">
        <AlertDescription className="text-purple-900 text-sm">
          Estos parámetros controlan cómo se sincronizan los datos entre la Base de Datos Maestra y el sistema operativo.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Sincronización Automática</Label>
              <p className="text-xs text-slate-600 mt-1">
                Sincroniza automáticamente cuando se detectan cambios en BD Maestra
              </p>
            </div>
            <Switch
              checked={config.autoSync}
              onCheckedChange={(checked) => setConfig({ ...config, autoSync: checked })}
            />
          </div>

          {config.autoSync && (
            <div className="space-y-2 pl-4 border-l-2 border-purple-200">
              <Label>Intervalo de sincronización (segundos)</Label>
              <Input
                type="number"
                value={config.syncInterval}
                onChange={(e) => setConfig({ ...config, syncInterval: parseInt(e.target.value) })}
              />
              <p className="text-xs text-slate-500">
                Cada cuántos segundos se verifican cambios para sincronizar
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Delay entre registros (ms)</Label>
            <Input
              type="number"
              value={config.delayBetweenRecords}
              onChange={(e) => setConfig({ ...config, delayBetweenRecords: parseInt(e.target.value) })}
            />
            <p className="text-xs text-slate-500">
              Tiempo de espera entre cada sincronización de empleado para evitar rate limits
            </p>
          </div>

          <div className="space-y-2">
            <Label>Número máximo de reintentos</Label>
            <Input
              type="number"
              value={config.maxRetries}
              onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) })}
            />
            <p className="text-xs text-slate-500">
              Cuántas veces reintentar una operación fallida antes de marcarla como error
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Preferir datos de BD Maestra en conflicto</Label>
              <p className="text-xs text-slate-600 mt-1">
                Al detectar conflictos, siempre usar los datos de la BD Maestra
              </p>
            </div>
            <Switch
              checked={config.onConflictPreferMaster}
              onCheckedChange={(checked) => setConfig({ ...config, onConflictPreferMaster: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Sincronizar al importar CSV</Label>
              <p className="text-xs text-slate-600 mt-1">
                Sincronizar automáticamente después de cada importación masiva
              </p>
            </div>
            <Switch
              checked={config.syncOnImport}
              onCheckedChange={(checked) => setConfig({ ...config, syncOnImport: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">Validar antes de sincronizar</Label>
              <p className="text-xs text-slate-600 mt-1">
                Validar campos obligatorios antes de sincronizar cada empleado
              </p>
            </div>
            <Switch
              checked={config.validateBeforeSync}
              onCheckedChange={(checked) => setConfig({ ...config, validateBeforeSync: checked })}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full bg-purple-600 hover:bg-purple-700">
        <Save className="w-4 h-4 mr-2" />
        Guardar Parámetros
      </Button>
    </div>
  );
}