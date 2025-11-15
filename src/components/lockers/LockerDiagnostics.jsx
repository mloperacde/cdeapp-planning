import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function LockerDiagnostics({ lockerAssignments, lockerRoomConfigs, employees }) {
  const queryClient = useQueryClient();

  const problematicAssignments = useMemo(() => {
    const problemas = [];

    lockerAssignments.forEach(la => {
      if (!la.numero_taquilla_actual || la.requiere_taquilla === false) return;

      const config = lockerRoomConfigs.find(c => c.vestuario === la.vestuario);
      if (!config) return;

      const identificadoresValidos = config.identificadores_taquillas || [];
      const numero = la.numero_taquilla_actual.toString();
      
      // Verificar si está fuera de rango o no es válido
      let esProblematico = false;
      let motivo = "";

      if (identificadoresValidos.length > 0) {
        if (!identificadoresValidos.includes(numero)) {
          esProblematico = true;
          motivo = "ID no existe en configuración";
        }
      } else {
        const numeroInt = parseInt(numero);
        if (!isNaN(numeroInt) && numeroInt > config.numero_taquillas_instaladas) {
          esProblematico = true;
          motivo = `Número ${numeroInt} > máximo ${config.numero_taquillas_instaladas}`;
        }
      }

      if (esProblematico) {
        const employee = employees.find(e => e.id === la.employee_id);
        problemas.push({
          assignment: la,
          employee,
          motivo,
          vestuario: la.vestuario
        });
      }
    });

    // Detectar duplicados
    const duplicados = new Map();
    lockerAssignments.forEach(la => {
      if (!la.numero_taquilla_actual || la.requiere_taquilla === false) return;
      
      const key = `${la.vestuario}-${la.numero_taquilla_actual}`;
      if (!duplicados.has(key)) {
        duplicados.set(key, []);
      }
      duplicados.get(key).push(la);
    });

    duplicados.forEach((assignments, key) => {
      if (assignments.length > 1) {
        const [vestuario, numero] = key.split('-');
        assignments.forEach(la => {
          const employee = employees.find(e => e.id === la.employee_id);
          problemas.push({
            assignment: la,
            employee,
            motivo: `Taquilla duplicada (${assignments.length} empleados)`,
            vestuario,
            isDuplicate: true
          });
        });
      }
    });

    return problemas;
  }, [lockerAssignments, lockerRoomConfigs, employees]);

  const fixAssignmentMutation = useMutation({
    mutationFn: async (assignmentId) => {
      return base44.entities.LockerAssignment.update(assignmentId, {
        numero_taquilla_actual: "",
        numero_taquilla_nuevo: "",
        notificacion_enviada: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      toast.success("Asignación corregida");
    },
  });

  if (problematicAssignments.length === 0) {
    return null;
  }

  return (
    <Card className="bg-red-50 border-2 border-red-300">
      <CardHeader className="border-b border-red-200">
        <CardTitle className="flex items-center gap-2 text-red-900">
          <AlertTriangle className="w-5 h-5" />
          Asignaciones Problemáticas Detectadas ({problematicAssignments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="bg-white rounded-lg p-4 mb-4">
          <p className="text-sm text-slate-700 mb-2">
            <strong>⚠️ Se detectaron asignaciones con errores:</strong>
          </p>
          <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
            <li>Taquillas con números fuera del rango configurado</li>
            <li>Identificadores que no existen en la configuración del vestuario</li>
            <li>Taquillas duplicadas (mismo número asignado a varios empleados)</li>
          </ul>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {problematicAssignments.map((problema) => (
            <div 
              key={problema.assignment.id} 
              className={`p-3 border-2 rounded-lg ${
                problema.isDuplicate ? 'bg-orange-50 border-orange-300' : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Link to={createPageUrl(`Employees?id=${problema.employee?.id}`)}>
                      <Badge className="bg-slate-800 hover:bg-slate-900 cursor-pointer">
                        {problema.employee?.nombre || "Empleado desconocido"}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Badge>
                    </Link>
                    <Badge variant="outline">
                      {problema.vestuario}
                    </Badge>
                    <Badge className={problema.isDuplicate ? "bg-orange-600" : "bg-red-600"}>
                      Taquilla: {problema.assignment.numero_taquilla_actual}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600">{problema.motivo}</p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar asignación de taquilla para ${problema.employee?.nombre}?`)) {
                      fixAssignmentMutation.mutate(problema.assignment.id);
                    }
                  }}
                  disabled={fixAssignmentMutation.isPending}
                  title="Limpiar asignación problemática"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>💡 Recomendación:</strong> Limpia estas asignaciones problemáticas y vuelve a asignar las taquillas correctamente desde el mapa interactivo o la pestaña de asignaciones.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}