import React, { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export default function TimeSlot({ time, index, isFirst, isLast, totalIntervals }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Determinar el color del marcador
  const getMarkerColor = () => {
    if (isFirst) return "from-emerald-500 to-emerald-600";
    if (isLast) return "from-purple-500 to-purple-600";
    return "from-blue-500 to-blue-600";
  };

  const getMarkerSize = () => {
    if (isFirst || isLast) return "w-4 h-4";
    return "w-3 h-3";
  };

  // Mostrar etiqueta cada 6 intervalos (30 minutos) o en inicio/fin
  const showLabel = isFirst || isLast || index % 6 === 0;
  
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.5) }}
          className="flex flex-col items-center relative"
          style={{ minWidth: totalIntervals > 100 ? "40px" : "60px" }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Marcador */}
          <motion.div
            className={`${getMarkerSize()} rounded-full bg-gradient-to-br ${getMarkerColor()} shadow-lg z-10 cursor-pointer transition-all duration-300`}
            whileHover={{ scale: 1.3, y: -2 }}
            animate={{
              boxShadow: isHovered
                ? "0 10px 25px -5px rgba(59, 130, 246, 0.5)"
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />

          {/* Línea vertical */}
          <motion.div
            className={`w-0.5 bg-gradient-to-b ${getMarkerColor()} transition-all duration-300`}
            animate={{
              height: isHovered ? "32px" : "20px",
              opacity: showLabel || isHovered ? 1 : 0.3,
            }}
          />

          {/* Etiqueta de tiempo */}
          {showLabel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 text-center"
            >
              <div className={`text-xs font-semibold ${
                isFirst ? "text-emerald-700" : 
                isLast ? "text-purple-700" : 
                "text-slate-700"
              }`}>
                {format(time, "HH:mm")}
              </div>
              {(isFirst || isLast) && (
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {format(time, "d MMM", { locale: es })}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </HoverCardTrigger>
      
      <HoverCardContent className="w-56" side="top">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Intervalo #{index + 1}</span>
            {isFirst && (
              <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                Inicio
              </span>
            )}
            {isLast && (
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                Fin
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-lg font-bold text-slate-900">
              {format(time, "HH:mm:ss")}
            </div>
            <div className="text-sm text-slate-600">
              {format(time, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Duración del intervalo: <span className="font-semibold text-blue-600">5 minutos</span>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}