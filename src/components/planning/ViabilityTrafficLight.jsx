import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp } from "lucide-react";

const MARGEN_SEGURIDAD = 2;

export default function ViabilityTrafficLight({ 
  totalRequeridos = 0, 
  totalDisponibles = 0 
}) {
  const analysis = useMemo(() => {
    const margen = totalDisponibles - totalRequeridos;
    
    let estado = "VERDE";
    let color = "green";
    let icon = CheckCircle2;
    let mensaje = "Planificación viable";
    let descripcion = `Hay suficiente personal disponible con ${margen} empleados de margen`;
    
    if (totalRequeridos > totalDisponibles) {
      estado = "ROJO";
      color = "red";
      icon = XCircle;
      mensaje = "⚠️ PLANIFICACIÓN INVIABLE";
      descripcion = `Faltan ${Math.abs(margen)} empleados. Debes ajustar la planificación o revisar ausencias`;
    } else if (margen < MARGEN_SEGURIDAD) {
      estado = "AMARILLO";
      color = "yellow";
      icon = AlertTriangle;
      mensaje = "Planificación ajustada";
      descripcion = `Margen muy justo (${margen} empleados). Considera reducir máquinas o verificar disponibilidad`;
    }

    return { estado, color, icon, mensaje, descripcion, margen };
  }, [totalRequeridos, totalDisponibles]);

  const Icon = analysis.icon;

  const backgroundColors = {
    green: "from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950",
    yellow: "from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950",
    red: "from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950"
  };

  const borderColors = {
    green: "border-green-300 dark:border-green-700",
    yellow: "border-yellow-300 dark:border-yellow-700",
    red: "border-red-300 dark:border-red-700"
  };

  const textColors = {
    green: "text-green-900 dark:text-green-100",
    yellow: "text-yellow-900 dark:text-yellow-100",
    red: "text-red-900 dark:text-red-100"
  };

  const iconColors = {
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 dark:text-red-400"
  };

  return (
    <Card className={`shadow-lg border-2 bg-gradient-to-br ${backgroundColors[analysis.color]} ${borderColors[analysis.color]}`}>
      <CardHeader className="border-b border-opacity-20 pb-3">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className={`w-5 h-5 ${iconColors[analysis.color]}`} />
          <span className={textColors[analysis.color]}>Semáforo de Viabilidad</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-center mb-6">
          <div className={`w-24 h-24 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center border-4 ${borderColors[analysis.color]}`}>
            <Icon className={`w-14 h-14 ${iconColors[analysis.color]}`} />
          </div>
        </div>

        <div className="text-center space-y-3">
          <h3 className={`text-2xl font-bold ${textColors[analysis.color]}`}>
            {analysis.mensaje}
          </h3>
          <p className={`text-sm ${textColors[analysis.color]} opacity-80`}>
            {analysis.descripcion}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-opacity-20">
          <div className="text-center p-3 bg-white/70 dark:bg-slate-800/70 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Requeridos</p>
            <p className={`text-3xl font-bold ${textColors[analysis.color]}`}>
              {totalRequeridos}
            </p>
          </div>
          <div className="text-center p-3 bg-white/70 dark:bg-slate-800/70 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Disponibles</p>
            <p className={`text-3xl font-bold ${textColors[analysis.color]}`}>
              {totalDisponibles}
            </p>
          </div>
        </div>

        {analysis.margen > 0 && (
          <div className="mt-4 text-center">
            <Badge 
              variant="outline" 
              className={`${
                analysis.color === 'green' ? 'bg-green-100 text-green-800 border-green-300' : 
                'bg-yellow-100 text-yellow-800 border-yellow-300'
              }`}
            >
              Margen: +{analysis.margen} empleados
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}