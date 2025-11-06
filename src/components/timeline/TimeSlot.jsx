import React, { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const SHIFT_COLORS = {
  shift1: {
    gradient: "from-amber-500 to-amber-600",
    bg: "bg-amber-500",
    text: "text-amber-700",
    name: "Turno 1",
    hours: "7:00-15:00"
  },
  shift2: {
    gradient: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-500",
    text: "text-indigo-700",
    name: "Turno 2",
    hours: "15:00-22:00"
  },
  shift3: {
    gradient: "from-purple-500 to-purple-600",
    bg: "bg-purple-500",
    text: "text-purple-700",
    name: "Turno 3",
    hours: "14:00-22:00"
  },
};

export default function TimeSlot({ time, shift, index, isFirst, isLast, totalIntervals }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const shiftColor = SHIFT_COLORS[shift] || SHIFT_COLORS.shift1;
  
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
            className={`${getMarkerSize()} rounded-full bg-gradient-to-br ${shiftColor.gradient} shadow-lg z-10 cursor-pointer transition-all duration-300`}
            whileHover={{ scale: 1.3, y: -2 }}
            animate={{
              boxShadow: isHovered
                ? `0 10px 25px -5px rgba(99, 102, 241, 0.5)`
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          />

          {/* Línea vertical */}
          <motion.div
            className={`w-0.5 bg-gradient-to-b ${shiftColor.gradient} transition-all duration-300`}
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
              <div className={`text-xs font-semibold ${shiftColor.text}`}>
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
      
      <HoverCardContent className="w-64" side="top">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Intervalo #{index + 1}</span>
            <span className={`text-xs px-2 py-0.5 ${shiftColor.bg} bg-opacity-10 ${shiftColor.text} rounded-full font-medium border border-current`}>
              {shiftColor.name}
            </span>
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
            <div className="text-xs text-slate-500 space-y-1">
              <div>
                Turno: <span className={`font-semibold ${shiftColor.text}`}>{shiftColor.name} ({shiftColor.hours})</span>
              </div>
              <div>
                Duración: <span className="font-semibold text-blue-600">5 minutos</span>
              </div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}