import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, AlertTriangle, UserX, Calendar } from "lucide-react";
import { format, differenceInDays, isPast, isFuture } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AbsenceNotifications({ absences, employees, absenceTypes }) {
  const notifications = useMemo(() => {
    const now = new Date();
    const alerts = [];

    absences.forEach(absence => {
      const employee = employees.find(e => e.id === absence.employee_id);
      if (!employee) return;

      const absenceType = absenceTypes?.find(t => t.nombre === absence.tipo);
      const startDate = new Date(absence.fecha_inicio);
      const endDate = new Date(absence.fecha_fin);
      const daysUntilStart = differenceInDays(startDate, now);
      const duration = differenceInDays(endDate, startDate) + 1;

      // Ausencia activa
      if (now >= startDate && now <= endDate) {
        alerts.push({
          id: `active-${absence.id}`,
          type: 'active',
          priority: absenceType?.es_critica ? 'critical' : 'high',
          employee: employee.nombre,
          absenceType: absence.tipo,
          message: `${employee.nombre} está actualmente ausente`,
          details: `${absence.tipo} - ${format(startDate, 'dd/MM/yyyy')} a ${format(endDate, 'dd/MM/yyyy')}`,
          duration: `${duration} días`,
          isCritical: absenceType?.es_critica || false,
          absenceId: absence.id,
        });
      }

      // Ausencia próxima a iniciar (según configuración del tipo)
      if (isFuture(startDate)) {
        const diasAviso = absenceType?.dias_aviso_previo || 0;
        if (diasAviso > 0 && daysUntilStart <= diasAviso && daysUntilStart > 0) {
          alerts.push({
            id: `upcoming-${absence.id}`,
            type: 'upcoming',
            priority: absenceType?.notificar_admin ? 'high' : 'medium',
            employee: employee.nombre,
            absenceType: absence.tipo,
            message: `${employee.nombre} iniciará ausencia en ${daysUntilStart} día${daysUntilStart !== 1 ? 's' : ''}`,
            details: `${absence.tipo} - Desde ${format(startDate, 'dd/MM/yyyy')}`,
            duration: `${duration} días`,
            isCritical: absenceType?.es_critica || false,
            daysUntil: daysUntilStart,
            absenceId: absence.id,
          });
        }
      }

      // Baja médica prolongada (más de 15 días)
      if (absence.tipo === "Baja médica" && duration > 15 && now >= startDate && now <= endDate) {
        alerts.push({
          id: `prolonged-${absence.id}`,
          type: 'prolonged',
          priority: 'critical',
          employee: employee.nombre,
          absenceType: absence.tipo,
          message: `Baja médica prolongada: ${employee.nombre}`,
          details: `${duration} días - Inicio: ${format(startDate, 'dd/MM/yyyy')}`,
          duration: `${duration} días`,
          isCritical: true,
          absenceId: absence.id,
        });
      }

      // Ausencia injustificada
      if (absence.tipo === "Ausencia injustificada" && now >= startDate && now <= endDate) {
        alerts.push({
          id: `unjustified-${absence.id}`,
          type: 'unjustified',
          priority: 'critical',
          employee: employee.nombre,
          absenceType: absence.tipo,
          message: `⚠️ Ausencia injustificada: ${employee.nombre}`,
          details: `Desde ${format(startDate, 'dd/MM/yyyy')}`,
          duration: `${duration} días`,
          isCritical: true,
          absenceId: absence.id,
        });
      }
    });

    // Ordenar por prioridad
    return alerts.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [absences, employees, absenceTypes]);

  const criticalCount = notifications.filter(n => n.priority === 'critical').length;
  const highCount = notifications.filter(n => n.priority === 'high').length;

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-lg border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50 h-full">
      <CardHeader className="border-b border-red-200 bg-red-100/50 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-red-900 text-sm">
            <Bell className="w-4 h-4 animate-pulse" />
            Notificaciones de Ausencias
          </CardTitle>
          <div className="flex gap-1">
            {criticalCount > 0 && (
              <Badge className="bg-red-600 text-white text-xs">
                {criticalCount}
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-orange-600 text-white text-xs">
                {highCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border transition-all ${
                notification.priority === 'critical'
                  ? 'bg-red-50 border-red-300 hover:border-red-400'
                  : notification.priority === 'high'
                  ? 'bg-orange-50 border-orange-300 hover:border-orange-400'
                  : 'bg-yellow-50 border-yellow-300 hover:border-yellow-400'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  {notification.priority === 'critical' ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <UserX className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-xs ${
                      notification.priority === 'critical' ? 'text-red-900' : 'text-orange-900'
                    } truncate`}>
                      {notification.employee}
                    </p>
                    <p className="text-xs text-slate-600 truncate">{notification.absenceType}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-red-600 text-white text-xs">{notification.duration}</Badge>
                      {notification.isCritical && (
                        <Badge className="bg-red-600 text-white text-xs">!</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {notifications.length > 3 && (
          <Link to={createPageUrl("AbsenceManagement")}>
            <Button size="sm" variant="outline" className="w-full mt-2 text-xs">
              Ver {notifications.length - 3} más
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}