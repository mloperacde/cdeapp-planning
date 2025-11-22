import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function HRReportExporter() {
  const [reportType, setReportType] = useState('absences');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  const { data: absences = [] } = useQuery({
    queryKey: ['absences'],
    queryFn: () => base44.entities.Absence.list(),
    initialData: [],
  });

  const { data: syncHistory = [] } = useQuery({
    queryKey: ['syncHistoryAll'],
    queryFn: () => base44.entities.EmployeeSyncHistory.list(),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const exportToCSV = (data, headers, filename) => {
    const csvContent = [
      headers.join(';'),
      ...data.map(row => headers.map(h => row[h] || '').join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportToPDF = async (data, title) => {
    toast.info('Exportación PDF en desarrollo - Próximamente disponible');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');

      if (reportType === 'absences') {
        const absencesData = absences.map(a => {
          const employee = employees.find(e => e.id === a.employee_id);
          return {
            'Empleado': employee?.nombre || '',
            'Tipo': a.tipo_ausencia || '',
            'Fecha Inicio': a.fecha_inicio || '',
            'Fecha Fin': a.fecha_fin || '',
            'Estado': a.estado || '',
            'Motivo': a.motivo || '',
            'Remunerada': a.remunerada ? 'Sí' : 'No',
            'Fecha Solicitud': a.created_date ? format(new Date(a.created_date), 'dd/MM/yyyy') : '',
          };
        });

        if (exportFormat === 'csv') {
          exportToCSV(
            absencesData,
            ['Empleado', 'Tipo', 'Fecha Inicio', 'Fecha Fin', 'Estado', 'Motivo', 'Remunerada', 'Fecha Solicitud'],
            `ausencias_${timestamp}.csv`
          );
        } else {
          exportToPDF(absencesData, 'Informe de Ausencias');
        }
      } else if (reportType === 'sync') {
        const syncData = syncHistory.map(s => ({
          'Fecha': s.sync_date ? format(new Date(s.sync_date), 'dd/MM/yyyy HH:mm') : '',
          'Tipo': s.sync_type || '',
          'Campos': (s.fields_synced || []).length,
          'Estado': s.status || '',
          'Usuario': s.synced_by || '',
          'Error': s.error_message || '',
        }));

        if (exportFormat === 'csv') {
          exportToCSV(
            syncData,
            ['Fecha', 'Tipo', 'Campos', 'Estado', 'Usuario', 'Error'],
            `sincronizacion_${timestamp}.csv`
          );
        } else {
          exportToPDF(syncData, 'Historial de Sincronización');
        }
      } else if (reportType === 'employees') {
        const employeesData = employees.map(e => ({
          'Código': e.codigo_empleado || '',
          'Nombre': e.nombre || '',
          'Departamento': e.departamento || '',
          'Puesto': e.puesto || '',
          'Email': e.email || '',
          'Estado': e.estado_empleado || '',
          'Tipo Jornada': e.tipo_jornada || '',
          'Turno': e.tipo_turno || '',
        }));

        if (exportFormat === 'csv') {
          exportToCSV(
            employeesData,
            ['Código', 'Nombre', 'Departamento', 'Puesto', 'Email', 'Estado', 'Tipo Jornada', 'Turno'],
            `empleados_${timestamp}.csv`
          );
        } else {
          exportToPDF(employeesData, 'Listado de Empleados');
        }
      }

      toast.success('Informe exportado correctamente');
    } catch (error) {
      toast.error('Error al exportar: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Exportar Informes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label>Tipo de Informe</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="absences">Informe de Ausencias</SelectItem>
              <SelectItem value="sync">Historial de Sincronización</SelectItem>
              <SelectItem value="employees">Listado de Empleados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Formato</Label>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV (Excel)
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  PDF (próximamente)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={exporting}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Download className="w-4 h-4 mr-2" />
          {exporting ? 'Exportando...' : 'Exportar Informe'}
        </Button>
      </CardContent>
    </Card>
  );
}