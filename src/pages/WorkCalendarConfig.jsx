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
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("Configuration")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Configuración
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <CalendarDays className="w-8 h-8 text-blue-600" />
            Configuración de Calendario Laboral
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona días festivos y períodos de vacaciones
          </p>
        </div>

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
