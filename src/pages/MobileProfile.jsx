import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Clock, Shield } from "lucide-react";
import ProfileEditor from "../components/profile/ProfileEditor";
import { differenceInYears } from "date-fns";

export default function MobileProfilePage() {
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 flex items-center justify-center">
        <div className="text-center text-slate-600">Cargando perfil...</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md mx-auto mt-12">
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">No se encontró tu perfil de empleado.</p>
            <p className="text-sm text-slate-500 mt-2">Contacta con RRHH para más información.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const yearsInCompany = employee.fecha_alta 
    ? differenceInYears(new Date(), new Date(employee.fecha_alta))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        <Card className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">{employee.nombre}</h2>
                <div className="flex flex-wrap gap-2 mb-3">
                  {employee.puesto && <Badge className="bg-white/20 text-white border-white/30">{employee.puesto}</Badge>}
                  {employee.departamento && <Badge className="bg-white/20 text-white border-white/30">{employee.departamento}</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <ProfileEditor employeeId={employee.id} mode="full" />
      </div>
    </div>
  );
}