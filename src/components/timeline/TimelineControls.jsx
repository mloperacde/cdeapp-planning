import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RotateCcw } from "lucide-react";
import { format } from "date-fns";

export default function TimelineControls({
  viewMode,
  onViewModeChange,
  selectedDate,
  onSelectedDateChange,
  selectedTeam,
  onSelectedTeamChange,
  teams = [],
  selectedDepartment,
  onSelectedDepartmentChange,
  departments = [],
}) {

  const handleReset = () => {
    onViewModeChange('day');
    onSelectedDateChange(new Date());
    onSelectedTeamChange('all');
    onSelectedDepartmentChange('all');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Departamento</Label>
          <Select value={selectedDepartment} onValueChange={onSelectedDepartmentChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Departamentos</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Equipo</Label>
          <Select value={selectedTeam} onValueChange={onSelectedTeamChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Equipos</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.team_key} value={team.team_key}>
                  {team.team_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Vista</Label>
          <Select value={viewMode} onValueChange={onViewModeChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Día</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Fecha</Label>
          <Input
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(e) => onSelectedDateChange(new Date(e.target.value))}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleReset} variant="outline" size="sm">
          <RotateCcw className="w-4 h-4 mr-2" />
          Resetear Filtros
        </Button>
      </div>
    </div>
  );
}