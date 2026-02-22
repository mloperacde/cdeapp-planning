import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useAppData } from "../data/DataProvider";
import TimelineControls from "../timeline/TimelineControls";
import TimelineView from "../timeline/TimelineView";
import { startOfWeek, endOfWeek } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function TimelineSection() {
  const { employees = [], teams = [], holidays = [], vacations = [] } = useAppData();
  const [viewMode, setViewMode] = useState('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedDepartment, setSelectedDepartment] = useState('all');

  const { data: teamSchedules = [] } = useQuery({
    queryKey: ['teamWeekSchedules'],
    queryFn: () => base44.entities.TeamWeekSchedule.list(undefined, 500),
    initialData: [],
    staleTime: 5 * 60 * 1000,
  });

  const { start: startDate, end: endDate } = useMemo(() => {
    const d = new Date(selectedDate);
    if (viewMode === 'day') {
      return {
        start: new Date(new Date(d).setHours(7, 0, 0, 0)),
        end:   new Date(new Date(d).setHours(22, 0, 0, 0)),
      };
    }
    const weekStart = startOfWeek(d, { weekStartsOn: 1 });
    const weekEnd   = endOfWeek(d,   { weekStartsOn: 1 });
    weekStart.setHours(7, 0, 0, 0);
    weekEnd.setHours(22, 0, 0, 0);
    return { start: weekStart, end: weekEnd };
  }, [viewMode, selectedDate]);

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => { if (emp?.departamento) depts.add(emp.departamento); });
    return Array.from(depts).sort();
  }, [employees]);

  return (
    <section aria-label="Planning / Línea de Tiempo" className="mb-8">
      <h2 className="text-base md:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">Planning / Línea de Tiempo</h2>
      <Card className="bg-white/80 dark:bg-slate-800 backdrop-blur-sm shadow-xl border-0">
        <TimelineControls
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          selectedTeam={selectedTeam}
          onSelectedTeamChange={setSelectedTeam}
          teams={teams || []}
          selectedDepartment={selectedDepartment}
          onSelectedDepartmentChange={setSelectedDepartment}
          departments={departments}
        />
      </Card>
      <Card className="bg-white/80 dark:bg-slate-800 backdrop-blur-sm shadow-xl border-0 overflow-hidden mt-4">
        <TimelineView
          startDate={startDate}
          endDate={endDate}
          holidays={holidays}
          vacations={vacations}
          selectedTeam={selectedTeam}
          employees={employees}
          teams={teams}
          teamSchedules={teamSchedules}
          viewMode={viewMode}
          selectedDepartment={selectedDepartment}
        />
      </Card>
    </section>
  );
}