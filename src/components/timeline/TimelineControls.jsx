
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, RotateCcw, CalendarOff, Plane, CalendarDays, CalendarRange, Users, Building2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import HolidayManager from "./HolidayManager";
import VacationManager from "./VacationManager";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function TimelineControls({
  viewMode,
  onViewModeChange,
  selectedDate,
  onSelectedDateChange,
  holidays = [],
  isLoadingHolidays,
  onHolidaysUpdate,
  vacations = [],
  isLoadingVacations,
  onVacationsUpdate,
  selectedTeam,
  onSelectedTeamChange,
  teams = [],
  selectedDepartment,
  onSelectedDepartmentChange,
  departments = []
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
    onSelectedTeamChange('all');
    onSelectedDepartmentChange('all');
  };

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    onSelectedDateChange(newDate);
  };

  const getTeamConfig = (teamKey) => {
    return teams.find(t => t.team_key === teamKey);
  };

  const team1Config = getTeamConfig('team_1') || { team_name: 'Equipo 1', color: '#8B5CF6' };
  const team2Config = getTeamConfig('team_2') || { team_name: 'Equipo 2', color: '#EC4899' };

  return (
    <>
      <div className="p-6 md:p-8">
        <div className="space-y-6">
          {/* Department Filter - NEW */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              Filtrar por Departamento
            </Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedDepartment === 'all' ? 'default' : 'outline'}
                onClick={() => onSelectedDepartmentChange('all')}
                className={`${selectedDepartment === 'all' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                Todos
              </Button>
              {departments.map(dept => (
                <Button
                  key={dept}
                  variant={selectedDepartment === dept ? 'default' : 'outline'}
                  onClick={() => onSelectedDepartmentChange(dept)}
                  className={`${selectedDepartment === dept ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                >
                  {dept}
                </Button>
              ))}
            </div>
          </div>

          {/* Team Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Filtrar por Equipo
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant={selectedTeam === 'all' ? 'default' : 'outline'}
                onClick={() => onSelectedTeamChange('all')}
                className={`h-auto py-3 ${selectedTeam === 'all' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">Todos los Equipos</span>
                </div>
              </Button>
              
              <Button
                variant={selectedTeam === 'team_1' ? 'default' : 'outline'}
                onClick={() => onSelectedTeamChange('team_1')}
                className="h-auto py-3"
                style={{
                  backgroundColor: selectedTeam === 'team_1' ? team1Config.color : 'transparent',
                  borderColor: team1Config.color,
                  color: selectedTeam === 'team_1' ? 'white' : team1Config.color
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">{team1Config.team_name}</span>
                </div>
              </Button>
              
              <Button
                variant={selectedTeam === 'team_2' ? 'default' : 'outline'}
                onClick={() => onSelectedTeamChange('team_2')}
                className="h-auto py-3"
                style={{
                  backgroundColor: selectedTeam === 'team_2' ? team2Config.color : 'transparent',
                  borderColor: team2Config.color,
                  color: selectedTeam === 'team_2' ? 'white' : team2Config.color
                }}
              >
                <div className="flex flex-col items-center gap-1">
                  <Users className="w-5 h-5" />
                  <span className="font-semibold">{team2Config.team_name}</span>
                </div>
              </Button>
            </div>
          </div>

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

          {/* Actions */}
          <div className="flex flex-wrap justify-between items-center pt-4 border-t border-slate-100 gap-4">
            <div className="text-sm text-slate-600">
              <span className="font-semibold text-blue-600">
                {viewMode === 'day' ? 'Vista de Día' : viewMode === 'week' ? 'Vista de Semana' : 'Vista de Mes'}
              </span>
              {selectedDepartment !== 'all' && (
                <>
                  {' • '}
                  <span className="font-semibold text-orange-600">
                    {selectedDepartment}
                  </span>
                </>
              )}
              {selectedTeam !== 'all' && (
                <>
                  {' • '}
                  <span className="font-semibold" style={{ color: selectedTeam === 'team_1' ? team1Config.color : team2Config.color }}>
                    {selectedTeam === 'team_1' ? team1Config.team_name : team2Config.team_name}
                  </span>
                </>
              )}
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
