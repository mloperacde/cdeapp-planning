import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, ArrowLeft, Calendar, Briefcase, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProfileEditor from "../components/profile/ProfileEditor";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";

export default function MyProfilePage() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employee, isLoading } = useQuery({
    queryKey: ['myEmployee', currentUser?.email],
    queryFn: async () => {
      const employees = await base44.entities.EmployeeMasterDatabase.list();
      return employees.find(e => e.email === currentUser?.email);
    },
    enabled: !!currentUser?.email
  });

  if (isLoading) {
    return <div className="p-8 text-center">Cargando perfil...</div>;
  }

  if (!employee) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-600">No se encontró tu perfil de empleado.</p>
        <p className="text-sm text-slate-500 mt-2">Contacta con RRHH para más información.</p>
      </div>
    );
  }

  const yearsInCompany = employee.fecha_alta 
    ? differenceInYears(new Date(), new Date(employee.fecha_alta))
    : null;

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="ghost">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            Mi Perfil
          </h1>
          <p className="text-slate-600 mt-1">
            Actualiza tus datos personales - Los cambios requieren aprobación de RRHH
          </p>
        </div>

        {/* Información General */}
        <Card className="mb-6">
          <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-slate-500 mb-1">Nombre Completo</p>
                <p className="text-lg font-semibold text-slate-900">{employee.nombre}</p>
              </div>
              
              {employee.codigo_empleado && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Código Empleado</p>
                  <p className="font-mono font-medium text-slate-900">{employee.codigo_empleado}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-1">DNI/NIE</p>
                <p className="font-medium text-slate-900">{employee.dni || 'No especificado'}</p>
              </div>

              {employee.departamento && (
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600 mt-1" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Departamento</p>
                    <p className="font-medium text-slate-900">{employee.departamento}</p>
                  </div>
                </div>
              )}

              {employee.puesto && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-green-600 mt-1" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Puesto</p>
                    <p className="font-medium text-slate-900">{employee.puesto}</p>
                  </div>
                </div>
              )}

              {employee.fecha_alta && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-purple-600 mt-1" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Fecha de Alta</p>
                    <p className="font-medium text-slate-900">
                      {format(new Date(employee.fecha_alta), "dd/MM/yyyy", { locale: es })}
                      {yearsInCompany !== null && yearsInCompany > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {yearsInCompany} {yearsInCompany === 1 ? 'año' : 'años'}
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
              )}

              {employee.tipo_jornada && (
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 mt-1" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Jornada</p>
                    <p className="font-medium text-slate-900">{employee.tipo_jornada}</p>
                    {employee.num_horas_jornada && (
                      <p className="text-xs text-slate-600">{employee.num_horas_jornada}h semanales</p>
                    )}
                  </div>
                </div>
              )}

              {employee.tipo_turno && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Tipo de Turno</p>
                  <Badge>{employee.tipo_turno}</Badge>
                </div>
              )}

              {employee.equipo && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">Equipo</p>
                  <Badge variant="outline">{employee.equipo}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editor de Perfil */}
        <ProfileEditor employeeId={employee.id} mode="full" />
      </div>
    </div>
  );
}