import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";

export default function WorkScheduleConfig() {
  const [config, setConfig] = useState({
    jornadaCompleta: {
      horas: 8,
      mananaInicio: '07:00',
      mananaFin: '15:00',
      tardeInicio: '14:00',
      tardeFin: '22:00'
    },
    jornadaParcialRotativo: {
      horas: 7.5,
      mananaInicio: '07:00',
      mananaFin: '15:00',
      tardeInicio: '15:00',
      tardeFin: '22:00'
    },
    jornadaParcialFijoTarde: {
      horas: 7,
      tardeInicio: '15:00',
      tardeFin: '22:00'
    }
  });

  const handleSave = () => {
    // Aquí guardaríamos en base de datos o localStorage
    alert('Configuración guardada correctamente');
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">Jornada Completa (8 horas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horas semanales</Label>
              <Input
                type="number"
                value={config.jornadaCompleta.horas}
                onChange={(e) => setConfig({
                  ...config,
                  jornadaCompleta: { ...config.jornadaCompleta, horas: parseFloat(e.target.value) }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Turno Mañana</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={config.jornadaCompleta.mananaInicio}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaCompleta: { ...config.jornadaCompleta, mananaInicio: e.target.value }
                  })}
                />
                <Input
                  type="time"
                  value={config.jornadaCompleta.mananaFin}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaCompleta: { ...config.jornadaCompleta, mananaFin: e.target.value }
                  })}
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Turno Tarde</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={config.jornadaCompleta.tardeInicio}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaCompleta: { ...config.jornadaCompleta, tardeInicio: e.target.value }
                  })}
                />
                <Input
                  type="time"
                  value={config.jornadaCompleta.tardeFin}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaCompleta: { ...config.jornadaCompleta, tardeFin: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-green-200">
        <CardHeader>
          <CardTitle className="text-base">Jornada Parcial - Rotativo (7.5 horas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horas semanales</Label>
              <Input
                type="number"
                step="0.5"
                value={config.jornadaParcialRotativo.horas}
                onChange={(e) => setConfig({
                  ...config,
                  jornadaParcialRotativo: { ...config.jornadaParcialRotativo, horas: parseFloat(e.target.value) }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Turno Mañana</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={config.jornadaParcialRotativo.mananaInicio}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaParcialRotativo: { ...config.jornadaParcialRotativo, mananaInicio: e.target.value }
                  })}
                />
                <Input
                  type="time"
                  value={config.jornadaParcialRotativo.mananaFin}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaParcialRotativo: { ...config.jornadaParcialRotativo, mananaFin: e.target.value }
                  })}
                />
              </div>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Turno Tarde</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={config.jornadaParcialRotativo.tardeInicio}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaParcialRotativo: { ...config.jornadaParcialRotativo, tardeInicio: e.target.value }
                  })}
                />
                <Input
                  type="time"
                  value={config.jornadaParcialRotativo.tardeFin}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaParcialRotativo: { ...config.jornadaParcialRotativo, tardeFin: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="text-base">Jornada Parcial - Fijo Tarde (7 horas)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horas semanales</Label>
              <Input
                type="number"
                step="0.5"
                value={config.jornadaParcialFijoTarde.horas}
                onChange={(e) => setConfig({
                  ...config,
                  jornadaParcialFijoTarde: { ...config.jornadaParcialFijoTarde, horas: parseFloat(e.target.value) }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label>Turno Tarde</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={config.jornadaParcialFijoTarde.tardeInicio}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaParcialFijoTarde: { ...config.jornadaParcialFijoTarde, tardeInicio: e.target.value }
                  })}
                />
                <Input
                  type="time"
                  value={config.jornadaParcialFijoTarde.tardeFin}
                  onChange={(e) => setConfig({
                    ...config,
                    jornadaParcialFijoTarde: { ...config.jornadaParcialFijoTarde, tardeFin: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full bg-green-600 hover:bg-green-700">
        <Save className="w-4 h-4 mr-2" />
        Guardar Configuración de Horarios
      </Button>
    </div>
  );
}