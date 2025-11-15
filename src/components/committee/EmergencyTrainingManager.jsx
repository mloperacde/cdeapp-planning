import React, { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Upload } from "lucide-react";
import { format, differenceInDays, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function EmergencyTrainingManager({ employees = [] }) {
  const queryClient = useQueryClient();

  const { data: emergencyMembers } = useQuery({
    queryKey: ['emergencyTeamMembers'],
    queryFn: () => base44.entities.EmergencyTeamMember.list(),
    initialData: [],
  });

  const trainingStatus = useMemo(() => {
    const today = new Date();
    const caducadas = [];
    const proximasCaducar = [];

    if (!emergencyMembers || !Array.isArray(emergencyMembers)) {
      return { caducadas, proximasCaducar };
    }

    emergencyMembers.forEach(member => {
      if (!employees || !Array.isArray(employees)) return;
      const employee = employees.find(e => e.id === member.employee_id);
      if (!employee) return;

      (member.formacion_recibida || []).forEach(formacion => {
        if (!formacion.fecha_caducidad) return;

        const fechaCaducidad = new Date(formacion.fecha_caducidad);
        const diasRestantes = differenceInDays(fechaCaducidad, today);

        if (isBefore(fechaCaducidad, today)) {
          caducadas.push({
            member,
            employee,
            formacion,
            diasRestantes: Math.abs(diasRestantes)
          });
        } else if (diasRestantes <= 60) {
          proximasCaducar.push({
            member,
            employee,
            formacion,
            diasRestantes
          });
        }
      });
    });

    return { caducadas, proximasCaducar };
  }, [emergencyMembers, employees]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={`border-2 ${
          trainingStatus.caducadas.length > 0 ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                trainingStatus.caducadas.length > 0 ? 'text-red-600' : 'text-green-600'
              }`} />
              Formaciones Caducadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingStatus.caducadas.length === 0 ? (
              <p className="text-sm text-green-700">✅ No hay formaciones caducadas</p>
            ) : (
              <div className="space-y-2">
                {trainingStatus.caducadas.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-red-200">
                    <div className="font-semibold text-sm text-red-900">{item.employee?.nombre || "Desconocido"}</div>
                    <div className="text-xs text-slate-600">{item.member?.rol_emergencia || ""}</div>
                    <div className="text-xs text-red-700 mt-1">
                      <strong>{item.formacion?.nombre_curso || ""}</strong>
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      ⚠️ Caducada hace {item.diasRestantes} días
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`border-2 ${
          trainingStatus.proximasCaducar.length > 0 ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className={`w-5 h-5 ${
                trainingStatus.proximasCaducar.length > 0 ? 'text-amber-600' : 'text-green-600'
              }`} />
              Próximas a Caducar (60 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trainingStatus.proximasCaducar.length === 0 ? (
              <p className="text-sm text-green-700">✅ No hay formaciones próximas a caducar</p>
            ) : (
              <div className="space-y-2">
                {trainingStatus.proximasCaducar.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded border border-amber-200">
                    <div className="font-semibold text-sm text-amber-900">{item.employee?.nombre || "Desconocido"}</div>
                    <div className="text-xs text-slate-600">{item.member?.rol_emergencia || ""}</div>
                    <div className="text-xs text-amber-700 mt-1">
                      <strong>{item.formacion?.nombre_curso || ""}</strong>
                    </div>
                    <div className="text-xs text-amber-600 mt-1">
                      ⏰ Caduca en {item.diasRestantes} días
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}