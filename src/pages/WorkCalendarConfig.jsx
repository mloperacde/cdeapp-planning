import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import HolidayManager from "../components/timeline/HolidayManager";
import VacationManager from "../components/timeline/VacationManager";
import CalendarStyleConfig from "../components/absences/CalendarStyleConfig";
import WorkHoursCalculator from "../components/absences/WorkHoursCalculator";

export default function WorkCalendarConfig() {
  const [activeTab, setActiveTab] = useState("holidays");

  const { data: holidays = [], refetch: refetchHolidays } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
  });

  const { data: vacations = [], refetch: refetchVacations } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
  });

  return (
    <div className="h-full flex flex-col p-6 gap-6 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
      {/* Header Estándar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0 bg-white dark:bg-slate-900 p-2 px-3 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Configuración de Calendario Laboral
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestiona días festivos y períodos de vacaciones
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" size="sm" className="h-8 gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="holidays">Días Festivos</TabsTrigger>
            <TabsTrigger value="vacations">Períodos de Vacaciones</TabsTrigger>
            <TabsTrigger value="calculator">Horas Efectivas</TabsTrigger>
            <TabsTrigger value="styles">Estilos</TabsTrigger>
          </TabsList>

          <TabsContent value="holidays" className="mt-6">
            <HolidayManager 
              embedded={true} 
              holidays={holidays}
              onUpdate={refetchHolidays}
            />
          </TabsContent>

          <TabsContent value="vacations" className="mt-6">
            <VacationManager 
              embedded={true} 
              vacations={vacations}
              onUpdate={refetchVacations}
            />
          </TabsContent>

          <TabsContent value="calculator" className="mt-6">
            <WorkHoursCalculator 
              holidays={holidays}
              vacations={vacations}
            />
          </TabsContent>

          <TabsContent value="styles" className="mt-6">
            <CalendarStyleConfig />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
