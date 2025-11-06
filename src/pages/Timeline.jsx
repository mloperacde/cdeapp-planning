import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import TimelineControls from "../components/timeline/TimelineControls";
import TimelineView from "../components/timeline/TimelineView";

export default function Timeline() {
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(now);
  const [endDate, setEndDate] = useState(twoHoursLater);

  const { data: holidays, isLoading: isLoadingHolidays, refetch: refetchHolidays } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    initialData: [],
  });

  const { data: vacations, isLoading: isLoadingVacations, refetch: refetchVacations } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
    initialData: [],
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-3">
            Línea de Tiempo
          </h1>
          <p className="text-slate-600 text-lg">
            Visualiza intervalos de 5 minutos con precisión
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 mb-6">
            <TimelineControls
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              holidays={holidays}
              isLoadingHolidays={isLoadingHolidays}
              onHolidaysUpdate={refetchHolidays}
              vacations={vacations}
              isLoadingVacations={isLoadingVacations}
              onVacationsUpdate={refetchVacations}
            />
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm shadow-xl border-0 overflow-hidden">
            <TimelineView 
              startDate={startDate} 
              endDate={endDate}
              holidays={holidays}
              vacations={vacations}
            />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}