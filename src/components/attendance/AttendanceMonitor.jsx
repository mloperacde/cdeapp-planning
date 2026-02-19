import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Users, UserCheck, UserX, Clock, Search } from "lucide-react";
import { format } from "date-fns";

// Horas de inicio por turno para calcular retrasos
const SHIFT_START = {
  "Mañana": "06:00",
  "Tarde": "14:00",
  "Noche": "22:00",
};

export default function AttendanceMonitor() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedShift, setSelectedShift] = useState("Mañana");
  const [consulted, setConsulted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: rawRecords = [], isLoading, refetch } = useQuery({
    queryKey: ["attendanceMonitor", selectedDate],
    queryFn: () =>
      base44.entities.AttendanceRecord.filter(
        { record_date: selectedDate },
        "record_time",
        2000
      ),
    staleTime: 0,
    enabled: false, // solo se lanza al pulsar el botón
  });

  const handleConsultar = async () => {
    setConsulted(false);
    await refetch();
    setConsulted(true);
  };

  // Agrupar por empleado y calcular métricas
  const employeeData = useMemo(() => {
    if (!rawRecords.length) return [];

    const map = {};
    for (const r of rawRecords) {
      if (!map[r.employee_id]) {
        map[r.employee_id] = {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          department: r.department || "—",
          registros: [],
        };
      }
      map[r.employee_id].registros.push(r);
    }

    const shiftStart = SHIFT_START[selectedShift] || "06:00";
    const [shiftH, shiftM] = shiftStart.split(":").map(Number);
    const shiftMinutes = shiftH * 60 + shiftM;

    return Object.values(map).map((emp) => {
      const sorted = [...emp.registros].sort((a, b) =>
        a.record_time.localeCompare(b.record_time)
      );
      const entrada = sorted.find((r) => r.direction === "E");
      const salida = [...sorted].reverse().find((r) => r.direction === "S");

      let retrasoMin = 0;
      if (entrada) {
        const [h, m] = entrada.record_time.split(":").map(Number);
        const entradaMin = h * 60 + m;
        retrasoMin = Math.max(0, entradaMin - shiftMinutes);
      }

      return {
        ...emp,
        entrada: entrada?.record_time || null,
        salida: salida?.record_time || null,
        totalMarcajes: sorted.length,
        retrasoMin,
      };
    });
  }, [rawRecords, selectedShift]);

  // Filtrar por búsqueda
  const filtered = useMemo(() => {
    return employeeData.filter((emp) =>
      !searchTerm ||
      emp.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employeeData, searchTerm]);

  // Estadísticas
  const stats = useMemo(() => {
    const presentes = employeeData.filter((e) => e.entrada !== null);
    const conSalida = employeeData.filter((e) => e.salida !== null);
    const conRetraso = presentes.filter((e) => e.retrasoMin > 0);
    return {
      total: employeeData.length,
      presentes: presentes.length,
      conSalida: conSalida.length,
      retrasos: conRetraso.length,
    };
  }, [employeeData]);

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader className="border-b pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-5 h-5 text-blue-600" />
            Monitor de Presencia en Tiempo Real
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {/* Controles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Fecha</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setConsulted(false); }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Turno</label>
              <Select value={selectedShift} onValueChange={(v) => { setSelectedShift(v); setConsulted(false); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mañana">Mañana (desde 06:00)</SelectItem>
                  <SelectItem value="Tarde">Tarde (desde 14:00)</SelectItem>
                  <SelectItem value="Noche">Noche (desde 22:00)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleConsultar}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Consultando..." : "Consultar Fichajes"}
              </Button>
            </div>
          </div>

          {/* Resultados */}
          {consulted && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-blue-700 font-medium uppercase">Empleados</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                    </div>
                    <Users className="w-6 h-6 text-blue-500" />
                  </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-green-700 font-medium uppercase">Con entrada</p>
                      <p className="text-2xl font-bold text-green-900">{stats.presentes}</p>
                    </div>
                    <UserCheck className="w-6 h-6 text-green-500" />
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-200">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-orange-700 font-medium uppercase">Con salida</p>
                      <p className="text-2xl font-bold text-orange-900">{stats.conSalida}</p>
                    </div>
                    <UserX className="w-6 h-6 text-orange-500" />
                  </CardContent>
                </Card>
                <Card className="bg-red-50 border-red-200">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-red-700 font-medium uppercase">Retrasos</p>
                      <p className="text-2xl font-bold text-red-900">{stats.retrasos}</p>
                    </div>
                    <Clock className="w-6 h-6 text-red-500" />
                  </CardContent>
                </Card>
              </div>

              {/* Buscador */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar empleado o departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Tabla */}
              {filtered.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No hay registros para esta fecha y turno.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">ID</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Empleado</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Departamento</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Entrada</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Salida</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Marcajes</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Retraso</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-600">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filtered.map((emp) => (
                        <tr key={emp.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2 text-xs text-slate-400">{emp.employee_id}</td>
                          <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-100">{emp.employee_name}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">{emp.department}</td>
                          <td className="px-4 py-2">
                            {emp.entrada
                              ? <Badge className="bg-green-100 text-green-800 text-xs">{emp.entrada}</Badge>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2">
                            {emp.salida
                              ? <Badge className="bg-orange-100 text-orange-800 text-xs">{emp.salida}</Badge>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 text-center">{emp.totalMarcajes}</td>
                          <td className="px-4 py-2">
                            {emp.retrasoMin > 0
                              ? <Badge className="bg-red-100 text-red-700 text-xs">+{emp.retrasoMin} min</Badge>
                              : emp.entrada
                                ? <Badge className="bg-green-100 text-green-700 text-xs">A tiempo</Badge>
                                : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-2">
                            {!emp.entrada && <Badge className="bg-red-100 text-red-700 text-xs">Sin entrada</Badge>}
                            {emp.entrada && !emp.salida && <Badge className="bg-blue-100 text-blue-700 text-xs">En planta</Badge>}
                            {emp.entrada && emp.salida && <Badge className="bg-slate-100 text-slate-600 text-xs">Salió</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}