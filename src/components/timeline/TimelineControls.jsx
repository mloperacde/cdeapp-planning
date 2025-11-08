import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, RotateCcw, CalendarOff, Plane, CalendarDays, CalendarRange } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import HolidayManager from "./HolidayManager";
import VacationManager from "./VacationManager";
import ShiftFilter from "./ShiftFilter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TimelineControls({
  viewMode,
  onViewModeChange,
  selectedDate,
  onSelectedDateChange,
  holidays,
  isLoadingHolidays,
  onHolidaysUpdate,
  vacations,
  isLoadingVacations,
  onVacationsUpdate,
  selectedShifts,
  onSelectedShiftsChange
}) {
  const [showHolidayManager, setShowHolidayManager] = useState(false);
  const [showVacationManager, setShowVacationManager] = useState(false);

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleReset = () => {
    const now = new Date();
    onSelectedDateChange(now);
    onViewModeChange('day');
  };

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    onSelectedDateChange(newDate);
  };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="space-y-6">
          {/* Vista Mode Selector */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-blue-600" />
              Modo de Vista
            </Label>
            <Tabs value={viewMode} onValueChange={onViewModeChange}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="day" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Día
                </TabsTrigger>
                <TabsTrigger value="week" className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  Semana
                </TabsTrigger>
                <TabsTrigger value="month" className="flex items-center gap-2">
                  <CalendarRange className="w-4 h-4" />
                  Mes
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Date Selector */}
          <div className="space-y-3">
            <Label
              htmlFor="selected-date"
              className="text-sm font-semibold text-slate-700 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4 text-blue-600" />
              Fecha Seleccionada
            </Label>
            <Input
              id="selected-date"
              type="date"
              value={formatDateForInput(selectedDate)}
              onChange={handleDateChange}
              className="text-base border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500">
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </p>
          </div>

          {/* Shift Filter */}
          <div className="pb-4 border-b border-slate-100">
            <ShiftFilter 
              selectedShifts={selectedShifts}
              onSelectedShiftsChange={onSelectedShiftsChange}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-blue-600">
                {viewMode === 'day' ? 'Vista de Día' : viewMode === 'week' ? 'Vista de Semana' : 'Vista de Mes'}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHolidayManager(true)}
                className="gap-2 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
              >
                <CalendarOff className="w-4 h-4" />
                Festivos ({holidays.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVacationManager(true)}
                className="gap-2 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300"
              >
                <Plane className="w-4 h-4" />
                Vacaciones ({vacations.length})
              </Button>
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
        </div>
      </div>

      <HolidayManager
        open={showHolidayManager}
        onOpenChange={setShowHolidayManager}
        holidays={holidays}
        onUpdate={onHolidaysUpdate}
      />

      <VacationManager
        open={showVacationManager}
        onOpenChange={setShowVacationManager}
        vacations={vacations}
        onUpdate={onVacationsUpdate}
      />
    </>
  );
}