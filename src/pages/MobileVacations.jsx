import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sun, Calendar } from "lucide-react";
import VacationPendingBalancePanel from "../components/absences/VacationPendingBalancePanel";

export default function MobileVacationsPage() {
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: employee } = useQuery({
    queryKey: ['myEmployee', currentUser?.email],
    queryFn: async () => {
      const employees = await base44.entities.EmployeeMasterDatabase.list();
      return employees.find(e => e.email === currentUser?.email);
    },
    enabled: !!currentUser
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Sun className="w-6 h-6 text-orange-500" />
          Mis Vacaciones
        </h1>
        <p className="text-sm text-slate-500">Consulta tu saldo de días disponibles</p>
      </div>

      {employee ? (
        <VacationPendingBalancePanel 
          employees={[employee]} 
          compact={true} 
          hideHeader={true}
        />
      ) : (
        <div className="text-center py-8 text-slate-500">Cargando datos...</div>
      )}
    </div>
  );
}