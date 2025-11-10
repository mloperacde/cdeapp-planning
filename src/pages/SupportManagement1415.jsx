import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function SupportManagement1415Page() {
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  // Empleados de FABRICACION con Jornada Completa
  const supportEmployees = useMemo(() => {
    return employees.filter(emp => 
      emp.departamento === "FABRICACION" && 
      emp.tipo_jornada === "Jornada Completa" &&
      emp.disponibilidad === "Disponible"
    );
  }, [employees]);

  // Agrupar por equipo
  const employeesByTeam = useMemo(() => {
    const grouped = {};
    supportEmployees.forEach(emp => {
      if (!grouped[emp.equipo]) {
        grouped[emp.equipo] = [];
      }
      grouped[emp.equipo].push(emp);
    });
    return grouped;
  }, [supportEmployees]);

  const getTeamColor = (teamName) => {
    const team = teams.find(t => t.team_name === teamName);
    return team?.color || '#3B82F6';
  };

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Clock className="w-8 h-8 text-blue-600" />
            Gestión Apoyos 14-15h
          </h1>
          <p className="text-slate-600 mt-1">
            Personal de FABRICACION con jornada completa disponible para tareas especiales 14:00-15:00h
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 font-medium">Total Empleados</p>
                  <p className="text-2xl font-bold text-blue-900">{supportEmployees.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 font-medium">Equipos Activos</p>
                  <p className="text-2xl font-bold text-green-900">
                    {Object.keys(employeesByTeam).length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-700 font-medium">Franja Horaria</p>
                  <p className="text-2xl font-bold text-orange-900">14:00-15:00</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {supportEmployees.length === 0 ? (
          <Card className="bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">
                    No hay empleados disponibles
                  </p>
                  <p className="text-sm text-amber-800">
                    No se encontraron empleados del departamento FABRICACION con jornada completa.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(employeesByTeam).map(([teamName, teamEmployees]) => (
              <Card key={teamName} className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader 
                  className="border-b border-slate-100"
                  style={{ borderLeftWidth: '4px', borderLeftColor: getTeamColor(teamName) }}
                >
                  <CardTitle className="flex items-center justify-between">
                    <span>{teamName}</span>
                    <Badge 
                      style={{ backgroundColor: getTeamColor(teamName) }}
                      className="text-white"
                    >
                      {teamEmployees.length} empleados
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead>Código</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Puesto</TableHead>
                        <TableHead>Tipo Turno</TableHead>
                        <TableHead>Horas Jornada</TableHead>
                        <TableHead>Disponibilidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {teamEmployees.map((emp) => (
                        <TableRow key={emp.id} className="hover:bg-slate-50">
                          <TableCell>
                            <span className="font-mono text-sm">{emp.codigo_empleado || '-'}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-semibold text-slate-900">{emp.nombre}</span>
                          </TableCell>
                          <TableCell>{emp.puesto || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{emp.tipo_turno}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-800">
                              {emp.num_horas_jornada || 40}h
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800">
                              Disponible 14:00-15:00
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Información */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Información sobre Apoyos 14-15h</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• Empleados del departamento FABRICACION con jornada completa</p>
            <p>• Disponibles en la franja horaria de 14:00 a 15:00h</p>
            <p>• Pueden realizar tareas especiales de apoyo entre turnos</p>
            <p>• Este listado se actualiza automáticamente según configuración de empleados</p>
          </div>
        </div>
      </div>
    </div>
  );
}