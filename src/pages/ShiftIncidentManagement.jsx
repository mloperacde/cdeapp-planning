import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import IncidentManager from "@/components/committee/IncidentManager";
import { AlertTriangle } from "lucide-react";

export default function ShiftIncidentManagement() {
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      try {
        return await base44.entities.EmployeeMasterDatabase.list("nombre", 5000);
      } catch (err) {
        console.warn("Error loading employees for shift incidents:", err);
        return [];
      }
    },
    initialData: [],
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["workIncidentsShift"],
    queryFn: async () => {
      try {
        return await base44.entities.WorkIncident.list("-fecha_hora");
      } catch (err) {
        console.warn("Error loading work incidents for shift incidents:", err);
        return [];
      }
    },
    initialData: [],
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Incidencias de turno
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Comunicación, registro y seguimiento de incidencias de máquinas, instalaciones, técnicas y operarios
            </p>
          </div>
        </div>
      </div>

      <IncidentManager incidents={incidents} employees={employees} />
    </div>
  );
}

