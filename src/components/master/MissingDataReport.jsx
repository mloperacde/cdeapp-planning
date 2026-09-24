import { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Download, Search, FileWarning, CheckCircle2, Users } from "lucide-react";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { toast } from "sonner";
import { EMPLOYEE_FIELD_GROUPS, FIELD_LABEL_MAP, isEmptyValue } from "./employeeFieldDefinitions";

const CONFIG_KEY = "employee_required_fields";

export default function MissingDataReport() {
  const [searchTerm, setSearchTerm] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  // Cargar configuración de campos obligatorios
  const { data: configRecord } = useQuery({
    queryKey: ['appConfig', CONFIG_KEY],
    queryFn: async () => {
      const configs = await base44.entities.AppConfig.filter({ config_key: CONFIG_KEY });
      return configs[0] || null;
    },
    staleTime: 60000,
  });

  const requiredFields = useMemo(() => {
    if (!configRecord?.value) return [];
    try {
      const parsed = JSON.parse(configRecord.value);
      return Array.isArray(parsed.required_fields) ? parsed.required_fields : [];
    } catch { return []; }
  }, [configRecord]);

  // Cargar empleados
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase', 'all'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list(undefined, 5000),
    staleTime: 60000,
  });

  // Calcular empleados con datos faltantes
  const employeesWithMissing = useMemo(() => {
    if (!employees.length || !requiredFields.length) return [];
    return employees
      .filter(emp => onlyActive ? emp.estado_empleado === 'Alta' : true)
      .map(emp => {
        const missing = requiredFields.filter(fieldKey => isEmptyValue(emp[fieldKey]));
        return { ...emp, missingFields: missing };
      })
      .filter(emp => emp.missingFields.length > 0);
  }, [employees, requiredFields, onlyActive]);

  // Filtrar por búsqueda
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employeesWithMissing;
    const term = searchTerm.toLowerCase();
    return employeesWithMissing.filter(emp =>
      emp.nombre?.toLowerCase().includes(term) ||
      emp.codigo_empleado?.toLowerCase().includes(term) ||
      emp.departamento?.toLowerCase().includes(term)
    );
  }, [employeesWithMissing, searchTerm]);

  // Estadísticas
  const stats = useMemo(() => {
    const totalChecked = onlyActive
      ? employees.filter(e => e.estado_empleado === 'Alta').length
      : employees.length;
    const withMissing = employeesWithMissing.length;
    const complete = totalChecked - withMissing;
    const completenessRate = totalChecked > 0 ? Math.round((complete / totalChecked) * 100) : 0;

    // Contar cuántos empleados faltan cada campo
    const fieldGapCount = {};
    requiredFields.forEach(f => { fieldGapCount[f] = 0; });
    employeesWithMissing.forEach(emp => {
      emp.missingFields.forEach(f => { fieldGapCount[f] = (fieldGapCount[f] || 0) + 1; });
    });

    return { totalChecked, withMissing, complete, completenessRate, fieldGapCount };
  }, [employees, employeesWithMissing, requiredFields, onlyActive]);

  const handleExport = () => {
    if (filteredEmployees.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const dataToExport = filteredEmployees.map(emp => {
      const row = {
        'Código': emp.codigo_empleado || '',
        'Nombre': emp.nombre || '',
        'Departamento': emp.departamento || '',
        'Puesto': emp.puesto || '',
        'Estado': emp.estado_empleado || '',
        'Campos Faltantes (nº)': emp.missingFields.length,
      };
      // Añadir una columna por cada campo obligatorio con Sí/No
      requiredFields.forEach(f => {
        row[FIELD_LABEL_MAP[f] || f] = isEmptyValue(emp[f]) ? 'FALTA' : 'OK';
      });
      // Lista concatenada de campos faltantes
      row['Campos Faltantes (lista)'] = emp.missingFields.map(f => FIELD_LABEL_MAP[f] || f).join(', ');
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos Faltantes');

    // Ajustar anchos
    const colWidths = Object.keys(dataToExport[0] || {}).map(key => ({
      wch: Math.max(key.length, 12),
    }));
    ws['!cols'] = colWidths;

    const fileName = `Empleados_Datos_Faltantes_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Exportados ${dataToExport.length} empleados a Excel`);
  };

  if (!requiredFields.length) {
    return (
      <Card className="border-amber-200 dark:border-amber-800">
        <CardContent className="py-8 text-center">
          <FileWarning className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            No hay campos obligatorios configurados
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Ve a la pestaña "Campos Obligatorios" para configurar qué campos son obligatorios.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Total revisado</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.totalChecked}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-white dark:bg-slate-900 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-red-500" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Con datos faltantes</p>
              <p className="text-xl font-bold text-red-600 dark:text-red-400">{stats.withMissing}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-white dark:bg-slate-900 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase">Completos</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.complete}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div>
            <p className="text-[10px] text-slate-500 uppercase">% Completitud</p>
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.completenessRate}%</p>
          </div>
        </Card>
      </div>

      {/* Resumen por campo */}
      {Object.keys(stats.fieldGapCount).length > 0 && (
        <Card className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Faltas por campo obligatorio:</p>
          <div className="flex flex-wrap gap-1.5">
            {requiredFields
              .sort((a, b) => (stats.fieldGapCount[b] || 0) - (stats.fieldGapCount[a] || 0))
              .map(field => {
                const count = stats.fieldGapCount[field] || 0;
                return (
                  <Badge
                    key={field}
                    variant={count > 0 ? "destructive" : "secondary"}
                    className={`text-[10px] ${count === 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}`}
                  >
                    {FIELD_LABEL_MAP[field] || field}: {count}
                  </Badge>
                );
              })}
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Buscar por nombre, código, departamento..."
            className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOnlyActive(!onlyActive)}
          className={`h-9 ${onlyActive ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white dark:bg-slate-900'}`}
        >
          {onlyActive ? 'Solo activos' : 'Todos los estados'}
        </Button>
        <Button
          onClick={handleExport}
          size="sm"
          className="bg-green-600 hover:bg-green-700 h-9"
          disabled={filteredEmployees.length === 0}
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Tabla */}
      <Card className="flex-1 flex flex-col min-h-0 border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredEmployees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Todos los empleados tienen los datos obligatorios completos
              </p>
              <p className="text-xs text-slate-500 mt-1">No hay registros con datos faltantes</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-950">
                <TableRow>
                  <TableHead className="text-[10px] uppercase">Código</TableHead>
                  <TableHead className="text-[10px] uppercase">Nombre</TableHead>
                  <TableHead className="text-[10px] uppercase">Departamento</TableHead>
                  <TableHead className="text-[10px] uppercase">Puesto</TableHead>
                  <TableHead className="text-[10px] uppercase text-center">Faltan</TableHead>
                  <TableHead className="text-[10px] uppercase">Campos faltantes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map(emp => (
                  <TableRow key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell className="text-xs font-mono text-slate-600 dark:text-slate-400 py-1">
                      {emp.codigo_empleado || '-'}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-900 dark:text-slate-200 py-1">
                      {emp.nombre || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 py-1">
                      {emp.departamento || '-'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 py-1">
                      {emp.puesto || '-'}
                    </TableCell>
                    <TableCell className="text-center py-1">
                      <Badge variant="destructive" className="text-[10px] h-5">
                        {emp.missingFields.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1">
                      <div className="flex flex-wrap gap-1">
                        {emp.missingFields.map(f => (
                          <Badge
                            key={f}
                            variant="outline"
                            className="text-[9px] border-red-200 text-red-600 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20"
                          >
                            {FIELD_LABEL_MAP[f] || f}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
}