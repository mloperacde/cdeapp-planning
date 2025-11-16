import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function PayrollExportButton({ absences = [], employees = [] }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [includeNonRemunerated, setIncludeNonRemunerated] = useState(false);
  const [includeVacationDays, setIncludeVacationDays] = useState(true);
  const [includeHolidays, setIncludeHolidays] = useState(true);

  const { data: absenceTypes = [] } = useQuery({
    queryKey: ['absenceTypes'],
    queryFn: () => base44.entities.AbsenceType.list(),
    initialData: [],
  });

  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => base44.entities.Holiday.list(),
    initialData: [],
  });

  const { data: vacations = [] } = useQuery({
    queryKey: ['vacations'],
    queryFn: () => base44.entities.Vacation.list(),
    initialData: [],
  });

  const handleExport = () => {
    try {
      const [year, month] = selectedMonth.split("-");
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // Filtrar ausencias del mes seleccionado
      const monthAbsences = absences.filter(abs => {
        if (!abs?.fecha_inicio || !abs?.fecha_fin) return false;
        if (abs.estado_aprobacion !== "Aprobada") return false;
        
        const start = new Date(abs.fecha_inicio);
        const end = new Date(abs.fecha_fin);
        
        return (start <= endDate && end >= startDate);
      });

      // Filtrar según configuración
      const filteredAbsences = monthAbsences.filter(abs => {
        const type = absenceTypes.find(t => t?.id === abs.absence_type_id);
        if (!type) return false;
        
        // Si no incluir no remuneradas, filtrar
        if (!includeNonRemunerated && !type.remunerada) return false;
        
        return true;
      });

      // Preparar datos para CSV
      const csvRows = [];
      
      // Encabezado
      csvRows.push([
        "Código Empleado",
        "Nombre Empleado",
        "DNI",
        "Tipo Ausencia",
        "Código Ausencia",
        "Fecha Inicio",
        "Fecha Fin",
        "Días Totales",
        "Días Laborables",
        "Remunerada",
        "Motivo",
        "Observaciones"
      ].join(","));

      // Datos de ausencias
      filteredAbsences.forEach(abs => {
        const employee = employees.find(e => e?.id === abs.employee_id);
        const type = absenceTypes.find(t => t?.id === abs.absence_type_id);
        
        if (!employee || !type) return;

        const start = new Date(abs.fecha_inicio);
        const end = new Date(abs.fecha_fin);
        
        // Calcular días laborables
        const allDays = eachDayOfInterval({ start, end });
        const laborableDays = allDays.filter(day => {
          const dayOfWeek = getDay(day);
          if (dayOfWeek === 0 || dayOfWeek === 6) return false;
          
          // Verificar si es festivo
          if (includeHolidays) {
            const dateStr = format(day, "yyyy-MM-dd");
            if (holidays.some(h => format(new Date(h.date), "yyyy-MM-dd") === dateStr)) {
              return false;
            }
          }
          
          return true;
        }).length;

        const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        csvRows.push([
          employee.codigo_empleado || "",
          `"${employee.nombre}"`,
          employee.dni || "",
          `"${type.nombre}"`,
          type.codigo || "",
          format(start, "dd/MM/yyyy"),
          format(end, "dd/MM/yyyy"),
          totalDays,
          laborableDays,
          type.remunerada ? "SI" : "NO",
          `"${abs.motivo || ""}"`,
          `"${abs.notas || ""}"`
        ].join(","));
      });

      // Añadir días no laborables si está habilitado
      if (includeVacationDays || includeHolidays) {
        csvRows.push([]);
        csvRows.push(["DÍAS NO LABORABLES"]);
        csvRows.push([
          "Fecha",
          "Tipo",
          "Descripción",
          "Aplica a Todos"
        ].join(","));

        if (includeHolidays) {
          holidays.forEach(h => {
            if (!h?.date) return;
            const holidayDate = new Date(h.date);
            if (holidayDate >= startDate && holidayDate <= endDate) {
              csvRows.push([
                format(holidayDate, "dd/MM/yyyy"),
                "Festivo",
                `"${h.name || ""}"`,
                "SI"
              ].join(","));
            }
          });
        }

        if (includeVacationDays) {
          vacations.forEach(v => {
            if (!v?.start_date || !v?.end_date) return;
            const vStart = new Date(v.start_date);
            const vEnd = new Date(v.end_date);
            
            if ((vStart >= startDate && vStart <= endDate) || (vEnd >= startDate && vEnd <= endDate)) {
              const allDays = eachDayOfInterval({ start: vStart, end: vEnd });
              const laborableDays = allDays.filter(d => {
                const day = getDay(d);
                return day !== 0 && day !== 6;
              }).length;

              csvRows.push([
                format(vStart, "dd/MM/yyyy"),
                "Vacaciones Colectivas",
                `"${v.name || ""} (${laborableDays} días laborables)"`,
                v.aplica_todos ? "SI" : "NO"
              ].join(","));
            }
          });
        }
      }

      // Crear y descargar CSV
      const csvContent = csvRows.join("\n");
      const BOM = "\uFEFF"; // UTF-8 BOM para Excel
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `nomina_ausencias_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exportados ${filteredAbsences.length} registros para nómina`);
      setShowDialog(false);
    } catch (error) {
      toast.error("Error al exportar: " + error.message);
    }
  };

  const getPreviewStats = () => {
    if (!selectedMonth) return { total: 0, remunerated: 0, nonRemunerated: 0 };

    const [year, month] = selectedMonth.split("-");
    const startDate = startOfMonth(new Date(year, month - 1));
    const endDate = endOfMonth(new Date(year, month - 1));

    const monthAbsences = absences.filter(abs => {
      if (!abs?.fecha_inicio || !abs?.fecha_fin) return false;
      if (abs.estado_aprobacion !== "Aprobada") return false;
      
      const start = new Date(abs.fecha_inicio);
      const end = new Date(abs.fecha_fin);
      
      return (start <= endDate && end >= startDate);
    });

    const remunerated = monthAbsences.filter(abs => {
      const type = absenceTypes.find(t => t?.id === abs.absence_type_id);
      return type?.remunerada;
    }).length;

    const nonRemunerated = monthAbsences.length - remunerated;

    return { 
      total: monthAbsences.length, 
      remunerated, 
      nonRemunerated 
    };
  };

  const stats = getPreviewStats();

  return (
    <>
      <Button onClick={() => setShowDialog(true)} className="bg-green-600 hover:bg-green-700">
        <DollarSign className="w-4 h-4 mr-2" />
        Exportar para Nómina
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Exportar Datos para Nómina
            </DialogTitle>
            <DialogDescription>
              Genera un archivo CSV con ausencias aprobadas y días no laborables para el sistema de nómina
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selección de mes */}
            <div className="space-y-2">
              <Label htmlFor="month">Mes a Exportar</Label>
              <Input
                id="month"
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                max={format(new Date(), "yyyy-MM")}
              />
            </div>

            {/* Resumen previo */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Resumen del Período
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{stats.total}</div>
                  <div className="text-xs text-blue-700">Total Ausencias</div>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{stats.remunerated}</div>
                  <div className="text-xs text-green-700">Remuneradas</div>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <div className="text-2xl font-bold text-orange-900">{stats.nonRemunerated}</div>
                  <div className="text-xs text-orange-700">No Remuneradas</div>
                </div>
              </div>
            </div>

            {/* Opciones de exportación */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-slate-900">Opciones de Exportación</h4>
              
              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeNonRemunerated"
                  checked={includeNonRemunerated}
                  onCheckedChange={setIncludeNonRemunerated}
                />
                <Label htmlFor="includeNonRemunerated" className="cursor-pointer text-sm">
                  Incluir ausencias no remuneradas
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeVacationDays"
                  checked={includeVacationDays}
                  onCheckedChange={setIncludeVacationDays}
                />
                <Label htmlFor="includeVacationDays" className="cursor-pointer text-sm">
                  Incluir días de vacaciones colectivas
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="includeHolidays"
                  checked={includeHolidays}
                  onCheckedChange={setIncludeHolidays}
                />
                <Label htmlFor="includeHolidays" className="cursor-pointer text-sm">
                  Incluir festivos (excluir de días laborables)
                </Label>
              </div>
            </div>

            {/* Información importante */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold mb-1">Información del archivo CSV:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Solo se exportan ausencias <strong>APROBADAS</strong></li>
                    <li>Los días laborables excluyen fines de semana y festivos</li>
                    <li>El archivo es compatible con Excel y sistemas de nómina estándar</li>
                    <li>Se incluye sección separada con días no laborables del período</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleExport} className="flex-1 bg-green-600 hover:bg-green-700">
                <Download className="w-4 h-4 mr-2" />
                Descargar CSV
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}