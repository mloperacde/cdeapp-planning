import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Users, UserCheck, UserX, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function AttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedShift, setSelectedShift] = useState('Mañana');
  const queryClient = useQueryClient();

  const fetchAttendanceMutation = useMutation({
    mutationFn: async ({ date, shift }) => {
      const response = await base44.functions.invoke('fetchAttendanceData', { date, shift });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      toast.success(`Datos de presencia actualizados: ${data.summary.present} presentes, ${data.summary.absent} ausentes`);
    },
    onError: (error) => {
      toast.error(`Error al obtener datos: ${error.message}`);
    }
  });

  const { data: lastAnalysis } = useQuery({
    queryKey: ['lastAttendanceAnalysis', selectedDate, selectedShift],
    queryFn: () => null,
    enabled: false,
  });

  const handleRefresh = () => {
    fetchAttendanceMutation.mutate({
      date: selectedDate,
      shift: selectedShift
    });
  };

  const analysisData = fetchAttendanceMutation.data || lastAnalysis;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Monitor de Presencia en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Turno</label>
              <Select value={selectedShift} onValueChange={setSelectedShift}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mañana">Mañana</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleRefresh}
                disabled={fetchAttendanceMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${fetchAttendanceMutation.isPending ? 'animate-spin' : ''}`} />
                {fetchAttendanceMutation.isPending ? 'Consultando...' : 'Consultar Fichajes'}
              </Button>
            </div>
          </div>

          {analysisData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-blue-700">Total</p>
                        <p className="text-2xl font-bold text-blue-900">{analysisData.summary?.total_employees || 0}</p>
                      </div>
                      <Users className="w-8 h-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-green-700">Presentes</p>
                        <p className="text-2xl font-bold text-green-900">{analysisData.summary?.present || 0}</p>
                      </div>
                      <UserCheck className="w-8 h-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-red-700">Ausentes</p>
                        <p className="text-2xl font-bold text-red-900">{analysisData.summary?.absent || 0}</p>
                      </div>
                      <UserX className="w-8 h-8 text-red-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-orange-700">Retrasos</p>
                        <p className="text-2xl font-bold text-orange-900">{analysisData.summary?.late || 0}</p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Conflictos de ausencia */}
              {analysisData.analysis?.absenceConflicts?.length > 0 && (
                <Card className="mb-6 bg-amber-50 border-amber-300">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Conflictos Detectados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysisData.analysis.absenceConflicts.map((conflict, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-amber-200">
                          <p className="font-semibold text-sm text-amber-900">{conflict.employee_name}</p>
                          <p className="text-xs text-amber-700">
                            Tenía ausencia programada pero fichó entrada a las {conflict.actual_entry}
                          </p>
                          <p className="text-xs text-amber-600 mt-1">
                            Motivo ausencia: {conflict.scheduled_absence?.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Empleados con retraso */}
              {analysisData.analysis?.late?.length > 0 && (
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Retrasos Detectados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analysisData.analysis.late.map((late, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-orange-50 rounded-lg">
                          <span className="font-medium text-sm">{late.employee_name}</span>
                          <div className="text-right">
                            <Badge className="bg-orange-600">{late.delay_minutes} min</Badge>
                            <p className="text-xs text-slate-600 mt-1">
                              Esperado: {late.expected} | Real: {late.actual}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ausentes */}
              {analysisData.analysis?.absent?.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Empleados Ausentes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {analysisData.analysis.absent.map((absent, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                          <span className="font-medium text-sm">{absent.employee_name}</span>
                          <Badge variant={absent.has_scheduled_absence ? "outline" : "destructive"}>
                            {absent.has_scheduled_absence ? "Programada" : "Sin justificar"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}