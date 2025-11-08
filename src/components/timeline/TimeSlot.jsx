import React, { useState } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Users } from "lucide-react";

export default function TimeSlot({ 
  time, 
  availableEmployees,
  maxEmployees,
  index, 
  isFirst, 
  isLast, 
  totalIntervals,
  viewMode
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const getColor = () => {
    const ratio = availableEmployees / maxEmployees;
    if (ratio >= 0.8) return "from-green-500 to-green-600";
    if (ratio >= 0.5) return "from-yellow-500 to-yellow-600";
    if (ratio >= 0.3) return "from-orange-500 to-orange-600";
    return "from-red-500 to-red-600";
  };

  const getSize = () => {
    const ratio = availableEmployees / maxEmployees;
    if (isFirst || isLast) return "w-4 h-4";
    if (ratio >= 0.8) return "w-4 h-4";
    if (ratio >= 0.5) return "w-3.5 h-3.5";
    return "w-3 h-3";
  };

  const showLabel = isFirst || isLast || (viewMode === 'day' && index % 12 === 0) || (viewMode === 'week' && index % 36 === 0) || (viewMode === 'month' && index % 72 === 0);
  
  return (
    <HoverCard openDelay={100} closeDelay={100}>
      <HoverCardTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: Math.min(index * 0.01, 0.5) }}
          className="flex flex-col items-center relative"
          style={{ minWidth: totalIntervals > 200 ? "30px" : totalIntervals > 100 ? "40px" : "60px" }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.div
            className={`${getSize()} rounded-full bg-gradient-to-br ${getColor()} shadow-lg z-10 cursor-pointer transition-all duration-300 flex items-center justify-center`}
            whileHover={{ scale: 1.4, y: -2 }}
            animate={{
              boxShadow: isHovered
                ? `0 10px 25px -5px rgba(99, 102, 241, 0.5)`
                : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            {(isHovered || availableEmployees > 0) && (
              <span className="text-[8px] font-bold text-white">
                {availableEmployees}
              </span>
            )}
          </motion.div>

          <motion.div
            className={`w-0.5 bg-gradient-to-b ${getColor()} transition-all duration-300`}
            animate={{
              height: isHovered ? "32px" : "20px",
              opacity: showLabel || isHovered ? 1 : 0.3,
            }}
          />

          {showLabel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-1 text-center"
            >
              <div className="text-xs font-semibold text-slate-700">
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
      
      <HoverCardContent className="w-72" side="top">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Intervalo #{index + 1}</span>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-lg font-bold text-blue-600">
                {availableEmployees}
              </span>
            </div>
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
              <div className="flex justify-between">
                <span>Empleados disponibles:</span>
                <span className="font-semibold text-green-600">{availableEmployees}</span>
              </div>
              <div className="flex justify-between">
                <span>Disponibilidad:</span>
                <span className="font-semibold text-blue-600">
                  {maxEmployees > 0 ? Math.round((availableEmployees / maxEmployees) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}