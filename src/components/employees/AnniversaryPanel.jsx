import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, TrendingUp } from "lucide-react";
import { format, differenceInYears, addDays } from "date-fns";
import { es } from "date-fns/locale";

export default function AnniversaryPanel({ employees }) {
  const upcomingAnniversaries = useMemo(() => {
    const today = new Date();
    const next60Days = addDays(today, 60);
    const milestones = [5, 10, 15, 20, 25, 30, 35, 40];
    
    return employees
      .filter(emp => emp.fecha_alta)
      .map(emp => {
        const hireDate = new Date(emp.fecha_alta);
        const yearsWorked = differenceInYears(today, hireDate);
        const thisYearAnniversary = new Date(today.getFullYear(), hireDate.getMonth(), hireDate.getDate());
        
        if (thisYearAnniversary < today) {
          thisYearAnniversary.setFullYear(today.getFullYear() + 1);
        }
        
        const nextMilestone = milestones.find(m => m > yearsWorked);
        if (!nextMilestone) return null;
        
        const milestoneDate = new Date(hireDate);
        milestoneDate.setFullYear(hireDate.getFullYear() + nextMilestone);
        
        const isUpcoming = milestoneDate <= next60Days && milestoneDate >= today;
        
        return {
          ...emp,
          yearsWorked,
          nextMilestone,
          milestoneDate,
          isUpcoming,
        };
      })
      .filter(emp => emp && emp.isUpcoming)
      .sort((a, b) => a.milestoneDate - b.milestoneDate);
  }, [employees]);

  // Estadísticas por tramo
  const employeesByTenure = useMemo(() => {
    const ranges = [
      { label: "0-2 años", min: 0, max: 2 },
      { label: "3-5 años", min: 3, max: 5 },
      { label: "6-10 años", min: 6, max: 10 },
      { label: "11-15 años", min: 11, max: 15 },
      { label: "16-20 años", min: 16, max: 20 },
      { label: "21-30 años", min: 21, max: 30 },
      { label: "+30 años", min: 31, max: 999 },
    ];
    
    return ranges.map(range => {
      const count = employees.filter(emp => {
        if (!emp.fecha_alta) return false;
        const years = differenceInYears(new Date(), new Date(emp.fecha_alta));
        return years >= range.min && years <= range.max;
      }).length;
      
      return { ...range, count };
    });
  }, [employees]);

  return (
    <div className="space-y-4">
      {/* Próximos Aniversarios */}
      {upcomingAnniversaries.length > 0 && (
        <Card className="shadow-lg border-0 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="border-b border-amber-200">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <Award className="w-5 h-5" />
              Próximos Aniversarios Importantes (60 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-2">
              {upcomingAnniversaries.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border-2 border-amber-200 hover:border-amber-400 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{emp.nombre}</p>
                      <p className="text-sm text-slate-600">
                        {format(emp.milestoneDate, "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-amber-600 text-white text-base px-3 py-1">
                    {emp.nextMilestone} años
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas por Antigüedad */}
      <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="border-b border-blue-200">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <TrendingUp className="w-5 h-5" />
            Empleados por Tramo de Antigüedad
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {employeesByTenure.map((range, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-white border border-blue-200 hover:shadow-md transition-shadow"
              >
                <p className="text-xs text-slate-600 mb-1">{range.label}</p>
                <p className="text-2xl font-bold text-blue-900">{range.count}</p>
                <p className="text-xs text-slate-500">empleados</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}