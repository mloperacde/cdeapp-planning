import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_STYLES = {
  festivo_bg: "#fecaca",
  festivo_text: "#7f1d1d",
  festivo_border: "#fca5a5",
  vacaciones_bg: "#bfdbfe",
  vacaciones_text: "#1e3a8a",
  vacaciones_border: "#93c5fd",
  fin_semana_bg: "#e2e8f0",
  fin_semana_text: "#475569",
  fin_semana_border: "#cbd5e1",
  habil_bg: "#ffffff",
  habil_text: "#334155",
  habil_border: "#cbd5e1"
};

export default function CalendarStyleConfig() {
  const queryClient = useQueryClient();

  const { data: styleConfig } = useQuery({
    queryKey: ['calendarStyleConfig'],
    queryFn: async () => {
      const configs = await base44.entities.CalendarStyleConfig.list();
      return configs.length > 0 ? configs[0] : null;
    },
  });

  const [styles, setStyles] = useState(styleConfig?.styles || DEFAULT_STYLES);

  const saveStylesMutation = useMutation({
    mutationFn: async (newStyles) => {
      if (styleConfig?.id) {
        return base44.entities.CalendarStyleConfig.update(styleConfig.id, {
          styles: newStyles
        });
      } else {
        return base44.entities.CalendarStyleConfig.create({
          styles: newStyles
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarStyleConfig'] });
      toast.success("Estilos guardados correctamente");
    },
  });

  const handleStyleChange = (key, value) => {
    setStyles({ ...styles, [key]: value });
  };

  const handleSave = () => {
    saveStylesMutation.mutate(styles);
  };

  const handleReset = () => {
    setStyles(DEFAULT_STYLES);
    saveStylesMutation.mutate(DEFAULT_STYLES);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-blue-600" />
          Personalización de Estilos del Calendario
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-900">Días Festivos</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Color de Fondo</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.festivo_bg}
                  onChange={(e) => handleStyleChange('festivo_bg', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.festivo_bg}
                  onChange={(e) => handleStyleChange('festivo_bg', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de Texto</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.festivo_text}
                  onChange={(e) => handleStyleChange('festivo_text', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.festivo_text}
                  onChange={(e) => handleStyleChange('festivo_text', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de Borde</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.festivo_border}
                  onChange={(e) => handleStyleChange('festivo_border', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.festivo_border}
                  onChange={(e) => handleStyleChange('festivo_border', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-slate-900">Períodos de Vacaciones</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Color de Fondo</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.vacaciones_bg}
                  onChange={(e) => handleStyleChange('vacaciones_bg', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.vacaciones_bg}
                  onChange={(e) => handleStyleChange('vacaciones_bg', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de Texto</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.vacaciones_text}
                  onChange={(e) => handleStyleChange('vacaciones_text', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.vacaciones_text}
                  onChange={(e) => handleStyleChange('vacaciones_text', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de Borde</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.vacaciones_border}
                  onChange={(e) => handleStyleChange('vacaciones_border', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.vacaciones_border}
                  onChange={(e) => handleStyleChange('vacaciones_border', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-slate-900">Fines de Semana</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Color de Fondo</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.fin_semana_bg}
                  onChange={(e) => handleStyleChange('fin_semana_bg', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.fin_semana_bg}
                  onChange={(e) => handleStyleChange('fin_semana_bg', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de Texto</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.fin_semana_text}
                  onChange={(e) => handleStyleChange('fin_semana_text', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.fin_semana_text}
                  onChange={(e) => handleStyleChange('fin_semana_text', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de Borde</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.fin_semana_border}
                  onChange={(e) => handleStyleChange('fin_semana_border', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.fin_semana_border}
                  onChange={(e) => handleStyleChange('fin_semana_border', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-4">
          <h3 className="font-semibold text-slate-900">Días Hábiles</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Color de Fondo</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.habil_bg}
                  onChange={(e) => handleStyleChange('habil_bg', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.habil_bg}
                  onChange={(e) => handleStyleChange('habil_bg', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de Texto</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.habil_text}
                  onChange={(e) => handleStyleChange('habil_text', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.habil_text}
                  onChange={(e) => handleStyleChange('habil_text', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de Borde</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={styles.habil_border}
                  onChange={(e) => handleStyleChange('habil_border', e.target.value)}
                  className="w-16 h-10"
                />
                <Input
                  type="text"
                  value={styles.habil_border}
                  onChange={(e) => handleStyleChange('habil_border', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-slate-900 mb-3">Vista Previa</h3>
          <div className="flex gap-4">
            <div
              className="w-16 h-16 rounded flex items-center justify-center font-bold text-sm border-2"
              style={{
                backgroundColor: styles.festivo_bg,
                color: styles.festivo_text,
                borderColor: styles.festivo_border
              }}
            >
              1
            </div>
            <div
              className="w-16 h-16 rounded flex items-center justify-center font-bold text-sm border-2"
              style={{
                backgroundColor: styles.vacaciones_bg,
                color: styles.vacaciones_text,
                borderColor: styles.vacaciones_border
              }}
            >
              2
            </div>
            <div
              className="w-16 h-16 rounded flex items-center justify-center font-bold text-sm border-2"
              style={{
                backgroundColor: styles.fin_semana_bg,
                color: styles.fin_semana_text,
                borderColor: styles.fin_semana_border
              }}
            >
              3
            </div>
            <div
              className="w-16 h-16 rounded flex items-center justify-center font-bold text-sm border-2"
              style={{
                backgroundColor: styles.habil_bg,
                color: styles.habil_text,
                borderColor: styles.habil_border
              }}
            >
              4
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar por Defecto
          </Button>
          <Button onClick={handleSave} disabled={saveStylesMutation.isPending} className="bg-blue-600">
            {saveStylesMutation.isPending ? "Guardando..." : "Guardar Estilos"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}