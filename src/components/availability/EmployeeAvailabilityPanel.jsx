import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { getAvailability } from "@/lib/domain/planning";

export default function EmployeeAvailabilityPanel({ 
  employees = [], 
  absences = [], 
  selectedDate,
  showDetails = true 
}) {
  const availability = useMemo(() => {
    const emps = employees.filter(emp => 
      emp.departamento === "FABRICACION" && 
      emp.estado_empleado === "Alta" && 
      emp.incluir_en_planning !== false
    );
    const r = getAvailability(emps, absences, selectedDate);
    return {
      total: r.totalEmpleados,
      ausentes: r.ausentes,
      disponibles: r.disponibles,
      porcentajeDisponible: r.porcentajeDisponible,
      empleadosAusentes: r.empleadosAusentes,
      ausenciasConfirmadas: absences.filter(abs => abs.estado_aprobacion === "Aprobada")
    };
  }, [employees, absences, selectedDate]);

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
      <CardHeader className="border-b border-blue-200 dark:border-blue-800">
        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <Users className="w-6 h-6 text-blue-600" />
          Panel de Disponibilidad - FABRICACIÓN
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400">Total Empleados</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{availability.total}</p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-50" />
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 dark:text-red-400">Ausentes</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">{availability.ausentes}</p>
                <p className="text-xs text-red-500 dark:text-red-400">
                  {availability.total > 0 ? ((availability.ausentes / availability.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <UserX className="w-10 h-10 text-red-500 opacity-50" />
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-xl text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-100">🟢 DISPONIBLES</p>
                <p className="text-4xl font-bold">{availability.disponibles}</p>
                <p className="text-xs text-green-100">
                  {availability.porcentajeDisponible.toFixed(1)}% operativos
                </p>
              </div>
              <UserCheck className="w-10 h-10 text-green-100 opacity-80" />
            </div>
          </div>
        </div>

        {/* Barra de disponibilidad */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 dark:text-slate-400">Disponibilidad</span>
            <span className="font-semibold text-green-700 dark:text-green-300">
              {availability.disponibles}/{availability.total}
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${availability.porcentajeDisponible}%` }}
            />
          </div>
        </div>

        {showDetails && availability.ausentes > 0 && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {availability.ausentes} empleado(s) ausente(s)
                </p>
                <div className="mt-2 space-y-1">
                  {availability.empleadosAusentes.slice(0, 5).map(emp => {
                    const ausencia = availability.ausenciasConfirmadas.find(a => a.employee_id === emp.id);
                    return (
                      <div key={emp.id} className="text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                        <span className="font-medium">{emp.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {ausencia?.tipo || 'Ausencia'}
                        </Badge>
                      </div>
                    );
                  })}
                  {availability.empleadosAusentes.length > 5 && (
                    <p className="text-xs text-red-600 dark:text-red-400 italic">
                      +{availability.empleadosAusentes.length - 5} más...
                    </p>
                  )}
                </div>
              </div>
            </div>
            <Link to={createPageUrl("AbsenceManagement")}>
              <Button size="sm" variant="outline" className="w-full mt-2 border-red-300 text-red-700 hover:bg-red-100">
                Ver Gestión de Ausencias
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
