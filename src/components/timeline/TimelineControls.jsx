import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";

export default function TimelineControls({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) {
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleReset = () => {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    onStartDateChange(now);
    onEndDateChange(twoHoursLater);
  };

  const handleStartChange = (e) => {
    const newStart = new Date(e.target.value);
    onStartDateChange(newStart);
    
    // Si la fecha de inicio es posterior a la de fin, ajustar la de fin
    if (newStart >= endDate) {
      const newEnd = new Date(newStart.getTime() + 60 * 60 * 1000);
      onEndDateChange(newEnd);
    }
  };

  const handleEndChange = (e) => {
    const newEnd = new Date(e.target.value);
    
    // Si la fecha de fin es anterior a la de inicio, ajustar la de inicio
    if (newEnd <= startDate) {
      const newStart = new Date(newEnd.getTime() - 60 * 60 * 1000);
      onStartDateChange(newStart);
    }
    onEndDateChange(newEnd);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
        <div className="space-y-3">
          <Label
            htmlFor="start-date"
            className="text-sm font-semibold text-slate-700 flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            Fecha y Hora de Inicio
          </Label>
          <Input
            id="start-date"
            type="datetime-local"
            value={formatDateTimeLocal(startDate)}
            onChange={handleStartChange}
            className="text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500">
            {format(startDate, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm")}
          </p>
        </div>

        <div className="space-y-3">
          <Label
            htmlFor="end-date"
            className="text-sm font-semibold text-slate-700 flex items-center gap-2"
          >
            <Clock className="w-4 h-4 text-blue-600" />
            Fecha y Hora de Fin
          </Label>
          <Input
            id="end-date"
            type="datetime-local"
            value={formatDateTimeLocal(endDate)}
            onChange={handleEndChange}
            className="text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="text-xs text-slate-500">
            {format(endDate, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm")}
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-slate-100">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-blue-600">
            {Math.round((endDate - startDate) / (1000 * 60))}
          </span>{" "}
          minutos de duración •{" "}
          <span className="font-semibold text-blue-600">
            {Math.round((endDate - startDate) / (1000 * 60 * 5))}
          </span>{" "}
          intervalos
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
        >
          <RotateCcw className="w-4 h-4" />
          Restablecer
        </Button>
      </div>
    </div>
  );
}