import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Clock, Sunrise, Sun, Sunset } from "lucide-react";

const SHIFTS = [
  {
    id: 'shift1',
    name: 'Turno 1',
    hours: '7:00 - 15:00',
    icon: Sunrise,
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'shift2',
    name: 'Turno 2',
    hours: '15:00 - 22:00',
    icon: Sunset,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    bgColor: 'bg-indigo-50',
  },
  {
    id: 'shift3',
    name: 'Turno 3',
    hours: '14:00 - 22:00',
    icon: Sun,
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    bgColor: 'bg-purple-50',
  },
];

export default function ShiftFilter({ selectedShifts, onSelectedShiftsChange }) {
  const toggleShift = (shiftId) => {
    if (selectedShifts.includes(shiftId)) {
      // No permitir deseleccionar todos los turnos
      if (selectedShifts.length > 1) {
        onSelectedShiftsChange(selectedShifts.filter(id => id !== shiftId));
      }
    } else {
      onSelectedShiftsChange([...selectedShifts, shiftId]);
    }
  };

  const selectAllShifts = () => {
    onSelectedShiftsChange(SHIFTS.map(s => s.id));
  };

  const clearAllShifts = () => {
    onSelectedShiftsChange([SHIFTS[0].id]); // Mantener al menos uno
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" />
          Filtrar por Turnos de Trabajo
        </Label>
        <div className="flex gap-2">
          <button
            onClick={selectAllShifts}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Todos
          </button>
          <span className="text-xs text-slate-300">|</span>
          <button
            onClick={clearAllShifts}
            className="text-xs text-slate-600 hover:text-slate-800 font-medium"
          >
            Ninguno
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SHIFTS.map((shift) => {
          const Icon = shift.icon;
          const isSelected = selectedShifts.includes(shift.id);
          
          return (
            <div
              key={shift.id}
              onClick={() => toggleShift(shift.id)}
              className={`
                relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                ${isSelected 
                  ? `${shift.bgColor} border-current ${shift.color.split(' ')[1]}` 
                  : 'bg-white border-slate-200 hover:border-slate-300'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleShift(shift.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? shift.color.split(' ')[1] : 'text-slate-400'}`} />
                    <span className="font-semibold text-sm">{shift.name}</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${isSelected ? shift.color : 'bg-slate-50 text-slate-600'}`}
                  >
                    {shift.hours}
                  </Badge>
                </div>
              </div>
              
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className={`w-2 h-2 rounded-full ${shift.color.split(' ')[1].replace('text-', 'bg-')}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-xs text-slate-500 mt-2">
        {selectedShifts.length === SHIFTS.length ? (
          <span>Mostrando todos los turnos</span>
        ) : (
          <span>
            Mostrando {selectedShifts.length} de {SHIFTS.length} turnos
          </span>
        )}
      </div>
    </div>
  );
}