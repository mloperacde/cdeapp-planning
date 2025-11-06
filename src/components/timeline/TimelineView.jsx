import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import TimeSlot from "./TimeSlot";
import { AlertCircle } from "lucide-react";

export default function TimelineView({ startDate, endDate }) {
  const intervals = useMemo(() => {
    const result = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    // Redondear al intervalo de 5 minutos más cercano
    current.setMinutes(Math.floor(current.getMinutes() / 5) * 5);
    current.setSeconds(0);
    current.setMilliseconds(0);
    
    let index = 0;
    while (current <= end && index < 500) { // Límite de seguridad
      result.push(new Date(current));
      current.setMinutes(current.getMinutes() + 5);
      index++;
    }
    
    return result;
  }, [startDate, endDate]);

  // Verificar si el rango es demasiado grande
  const isTooLarge = intervals.length > 288; // Más de 24 horas
  
  if (intervals.length === 0) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-600">
          Por favor, selecciona un rango de fechas válido
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Visualización de Intervalos
        </h3>
        <p className="text-sm text-slate-600">
          Cada segmento representa 5 minutos
        </p>
      </div>

      {isTooLarge && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            El rango seleccionado es muy amplio. Para una mejor visualización, considera usar un período más corto.
          </p>
        </div>
      )}

      <div className="relative">
        {/* Línea principal */}
        <div className="absolute top-8 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />

        {/* Contenedor con scroll horizontal */}
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-0 min-w-max">
            {intervals.map((interval, index) => (
              <TimeSlot
                key={index}
                time={interval}
                index={index}
                isFirst={index === 0}
                isLast={index === intervals.length - 1}
                totalIntervals={intervals.length}
              />
            ))}
          </div>
        </div>

        {/* Leyenda */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" />
              <span className="text-slate-600">Intervalo de 5 minutos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600" />
              <span className="text-slate-600">Inicio del período</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-600" />
              <span className="text-slate-600">Fin del período</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}