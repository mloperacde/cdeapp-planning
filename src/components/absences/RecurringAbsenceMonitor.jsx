import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Calendar, TrendingUp, CheckCircle, Eye } from "lucide-react";
import { format, subMonths, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function RecurringAbsenceMonitor({ absences, employees }) {
  const [selectedPeriod, setSelectedPeriod] = useState("3");
  const [showDetail, setShowDetail] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const queryClient = useQueryClient();

  const { data: patterns = [] } = useQuery({
    queryKey: ['recurringPatterns', selectedPeriod],
    queryFn: async () => {
      const months = parseInt(selectedPeriod);
      const endDate = new Date();
      const startDate = subMonths(endDate, months);
      
      return base44.entities.RecurringAbsencePattern.filter({
        fecha_inicio_periodo: { $gte: startDate.toISOString() },
        activo: true
      });
    },
    initialData: [],
  });

  const analyzePatterns = async () => {
    const months = parseInt(selectedPeriod);
    const endDate = new Date();
    const startDate = subMonths(endDate, months);

    const relevantAbsences = absences.filter(abs => {
      const absDate = new Date(abs.fecha_inicio);
      return absDate >= startDate && absDate <= endDate;
    });

    const employeePatterns = {};

    relevantAbsences.forEach(abs => {
      const empId = abs.employee_id;
      const tipo = abs.tipo;
      const day = getDay(new Date(abs.fecha_inicio));

      if (!employeePatterns[empId]) {
        employeePatterns[empId] = {};
      }
      if (!employeePatterns[empId][tipo]) {
        employeePatterns[empId][tipo] = {
          count: 0,
          days: {},
          absenceIds: []
        };
      }

      employeePatterns[empId][tipo].count++;
      employeePatterns[empId][tipo].absenceIds.push(abs.id);
      employeePatterns[empId][tipo].days[day] = (employeePatterns[empId][tipo].days[day] || 0) + 1;
    });

    const detectedPatterns = [];

    for (const [empId, types] of Object.entries(employeePatterns)) {
      for (const [tipo, data] of Object.entries(types)) {
        if (data.count >= 3) {
          let patron = "Otro";
          
          if (data.days[1] >= 2) patron = "Lunes";
          else if (data.days[5] >= 2) patron = "Viernes";
          else if (data.days[1] >= 1 && data.days[5] >= 1) patron = "Lunes/Viernes";

          const nivelAlerta = data.count >= 6 ? "Alto" : data.count >= 4 ? "Medio" : "Bajo";

          const pattern = {
            employee_id: empId,
            tipo_ausencia: tipo,
            patron_detectado: patron,
            numero_repeticiones: data.count,
            periodo_analisis: `Últimos ${months} meses`,
            fecha_inicio_periodo: startDate.toISOString().split('T')[0],
            fecha_fin_periodo: endDate.toISOString().split('T')[0],
            ausencias_ids: data.absenceIds,
            nivel_alerta: nivelAlerta,
            requiere_revision: nivelAlerta === "Alto" || nivelAlerta === "Medio",
            activo: true
          };

          detectedPatterns.push(pattern);
        }
      }
    }

    for (const pattern of detectedPatterns) {
      const existing = patterns.find(p => 
        p.employee_id === pattern.employee_id && 
        p.tipo_ausencia === pattern.tipo_ausencia
      );

      if (existing) {
        await base44.entities.RecurringAbsencePattern.update(existing.id, pattern);
      } else {
        await base44.entities.RecurringAbsencePattern.create(pattern);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['recurringPatterns'] });
    toast.success(`${detectedPatterns.length} patrón(es) detectado(s)`);
  };

  const markAsReviewedMutation = useMutation({
    mutationFn: ({ id, notas }) => 
      base44.entities.RecurringAbsencePattern.update(id, {
        revisado_por: "RRHH",
        fecha_revision: new Date().toISOString(),
        notas_revision: notas,
        requiere_revision: false
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringPatterns'] });
      toast.success("Patrón marcado como revisado");
      setShowDetail(false);
    }
  });

  const patternsRequiringReview = patterns.filter(p => p.requiere_revision);

  return (
    <Card className="shadow-xl border-2 border-red-200">
      <CardHeader className="bg-red-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Ausencias Recurrentes
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Último mes</SelectItem>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Último año</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={analyzePatterns} variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Analizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {patternsRequiringReview.length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-300 rounded-lg">
            <p className="text-sm text-amber-900 font-semibold">
              ⚠️ {patternsRequiringReview.length} patrón(es) requieren revisión de RRHH
            </p>
          </div>
        )}

        {patterns.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 mb-4">No hay patrones de ausencias recurrentes detectados</p>
            <Button onClick={analyzePatterns} variant="outline">
              Ejecutar Análisis
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {patterns.map(pattern => {
              const employee = employees.find(e => e.id === pattern.employee_id);
              const levelColors = {
                Bajo: "bg-green-100 text-green-800",
                Medio: "bg-yellow-100 text-yellow-800",
                Alto: "bg-red-100 text-red-800"
              };

              return (
                <Card key={pattern.id} className={`border-2 ${
                  pattern.requiere_revision ? 'border-red-300 bg-red-50' : 'border-slate-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900">{employee?.nombre || "Desconocido"}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{pattern.tipo_ausencia}</Badge>
                          <Badge className={levelColors[pattern.nivel_alerta]}>
                            {pattern.nivel_alerta}
                          </Badge>
                          <Badge className="bg-purple-100 text-purple-800">
                            {pattern.patron_detectado}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-2">
                          {pattern.numero_repeticiones} repeticiones en {pattern.periodo_analisis}
                        </p>
                        {pattern.revisado_por && (
                          <div className="flex items-center gap-1 text-xs text-green-600 mt-2">
                            <CheckCircle className="w-3 h-3" />
                            Revisado por {pattern.revisado_por}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPattern(pattern);
                          setShowDetail(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>

      {showDetail && selectedPattern && (
        <PatternDetailDialog
          pattern={selectedPattern}
          employee={employees.find(e => e.id === selectedPattern.employee_id)}
          absences={absences.filter(a => selectedPattern.ausencias_ids?.includes(a.id))}
          onClose={() => {
            setShowDetail(false);
            setSelectedPattern(null);
          }}
          onMarkReviewed={(notas) => {
            markAsReviewedMutation.mutate({ id: selectedPattern.id, notas });
          }}
        />
      )}
    </Card>
  );
}

function PatternDetailDialog({ pattern, employee, absences, onClose, onMarkReviewed }) {
  const [notas, setNotas] = useState(pattern.notas_revision || "");

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalle de Patrón Recurrente</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-bold text-lg">{employee?.nombre}</h4>
            <div className="flex gap-2 mt-2">
              <Badge>{pattern.tipo_ausencia}</Badge>
              <Badge>{pattern.patron_detectado}</Badge>
              <Badge className="bg-red-600 text-white">{pattern.numero_repeticiones} repeticiones</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ausencias Detectadas:</Label>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {absences.map(abs => (
                <div key={abs.id} className="p-3 bg-slate-50 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{abs.motivo}</p>
                      <p className="text-xs text-slate-600">
                        {format(new Date(abs.fecha_inicio), "dd/MM/yyyy - EEEE", { locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {!pattern.revisado_por && (
            <div className="space-y-2 border-t pt-4">
              <Label>Notas de Revisión</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Añadir observaciones sobre la revisión..."
              />
              <Button
                onClick={() => onMarkReviewed(notas)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Revisado
              </Button>
            </div>
          )}

          {pattern.revisado_por && (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-sm text-green-900">
                <strong>Revisado por:</strong> {pattern.revisado_por}
              </p>
              {pattern.notas_revision && (
                <p className="text-sm text-green-800 mt-1">{pattern.notas_revision}</p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}