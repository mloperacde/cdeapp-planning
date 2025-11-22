import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Database, 
  ArrowLeft, 
  RefreshCw, 
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  FileText
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MasterEmployeeImport from "../components/master/MasterEmployeeImport";
import SyncComparisonDialog from "../components/master/SyncComparisonDialog";
import SyncHistoryPanel from "../components/master/SyncHistoryPanel";
import AdvancedSearch from "../components/common/AdvancedSearch";
import ThemeToggle from "../components/common/ThemeToggle";

export default function MasterEmployeeDatabasePage() {
  const [filters, setFilters] = useState({});
  const [syncing, setSyncing] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [historyEmployeeId, setHistoryEmployeeId] = useState(null);
  const queryClient = useQueryClient();

  const { data: masterEmployees = [], isLoading } = useQuery({
    queryKey: ['employeeMasterDatabase'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('-created_date'),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.EmployeeMasterDatabase.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
    },
  });

  const handleDeleteAll = async () => {
    setSyncing(true);
    try {
      let deletedCount = 0;
      for (const emp of masterEmployees) {
        await base44.entities.EmployeeMasterDatabase.delete(emp.id);
        deletedCount++;
      }
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
      alert(`✅ Eliminados ${deletedCount} registros de la Base de Datos Maestra`);
    } catch (error) {
      alert('❌ Error al eliminar: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleCleanOperationalData = async () => {
    if (!confirm('⚠️ LIMPIEZA COMPLETA DEL SISTEMA OPERATIVO\n\nEsta acción eliminará:\n• Todos los empleados del sistema operativo\n• Todas las asignaciones de taquillas\n• Todas las ausencias registradas\n• Todas las asignaciones de máquinas\n• Todas las asignaciones de turnos\n• Todas las habilidades de empleados\n• Todo el historial de sincronización\n\nLa Base de Datos Maestra se mantendrá intacta.\n\n¿Continuar?')) {
      return;
    }

    setSyncing(true);
    try {
      const response = await base44.functions.invoke('cleanEmployeeOperationalData', {});
      
      if (response.data.success) {
        const { results } = response.data;
        alert(`✅ Limpieza completada:\n\n` +
          `• Empleados eliminados: ${results.employees}\n` +
          `• Taquillas liberadas: ${results.lockerAssignments}\n` +
          `• Ausencias eliminadas: ${results.absences}\n` +
          `• Asignaciones de máquinas: ${results.machineAssignments}\n` +
          `• Asignaciones de turnos: ${results.shiftAssignments}\n` +
          `• Habilidades eliminadas: ${results.employeeSkills}\n` +
          `• Historial limpiado: ${results.syncHistory}\n\n` +
          `Base de Datos Maestra lista para sincronizar.`
        );
        
        queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        queryClient.invalidateQueries({ queryKey: ['syncHistory'] });
      } else {
        alert('❌ Error: ' + response.data.error);
      }
    } catch (error) {
      alert('❌ Error al limpiar datos: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const openSyncDialog = async (masterEmployee) => {
    let existingEmployee = null;
    
    if (masterEmployee.employee_id) {
      try {
        const result = await base44.entities.Employee.filter({ id: masterEmployee.employee_id });
        existingEmployee = result[0] || null;
      } catch (e) {
        existingEmployee = null;
      }
    }
    
    // Si no hay employee_id, buscar por código
    if (!existingEmployee && masterEmployee.codigo_empleado) {
      const existing = await base44.entities.Employee.filter({ 
        codigo_empleado: masterEmployee.codigo_empleado 
      });
      existingEmployee = existing[0] || null;
    }
    
    // Si no hay código, buscar por nombre exacto
    if (!existingEmployee && masterEmployee.nombre) {
      const existing = await base44.entities.Employee.filter({ 
        nombre: masterEmployee.nombre 
      });
      existingEmployee = existing[0] || null;
    }
    
    setSelectedEmployee({ master: masterEmployee, existing: existingEmployee });
    setSyncDialogOpen(true);
  };

  const handleSyncAll = async () => {
    const pending = masterEmployees.filter(e => e.estado_sincronizacion !== 'Sincronizado');

    if (pending.length === 0) {
      toast.info("No hay registros pendientes de sincronización");
      return;
    }

    if (!confirm(`¿Sincronizar automáticamente ${pending.length} empleados?`)) {
      return;
    }

    setSyncing(true);
    const user = await base44.auth.me().catch(() => null);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Obtener todos los empleados existentes de una vez
      const existingEmployees = await base44.entities.Employee.list();

      // Crear mapas para búsqueda rápida O(1)
      const existingByCode = new Map(existingEmployees.filter(e => e.codigo_empleado).map(e => [e.codigo_empleado, e]));
      const existingByName = new Map(existingEmployees.filter(e => e.nombre).map(e => [e.nombre.toLowerCase().trim(), e]));
      const existingById = new Map(existingEmployees.map(e => [e.id, e]));

      for (const masterEmployee of pending) {
        try {
          // Estrategia de búsqueda robusta
          let targetEmployee = null;

          if (masterEmployee.employee_id && existingById.has(masterEmployee.employee_id)) {
            targetEmployee = existingById.get(masterEmployee.employee_id);
          } else if (masterEmployee.codigo_empleado && existingByCode.has(masterEmployee.codigo_empleado)) {
            targetEmployee = existingByCode.get(masterEmployee.codigo_empleado);
          } else if (masterEmployee.nombre && existingByName.has(masterEmployee.nombre.toLowerCase().trim())) {
            targetEmployee = existingByName.get(masterEmployee.nombre.toLowerCase().trim());
          }

          // Preparar payload de datos
          const dataToSync = {};
          const excludeFields = ['id', 'created_date', 'updated_date', 'created_by', 'employee_id', 'ultimo_sincronizado', 'estado_sincronizacion'];

          Object.keys(masterEmployee).forEach(key => {
            if (!excludeFields.includes(key) && masterEmployee[key] !== null && masterEmployee[key] !== undefined) {
              dataToSync[key] = masterEmployee[key];
            }
          });

          // Asegurar campos críticos
          if (!targetEmployee) {
            dataToSync.estado_empleado = dataToSync.estado_empleado || 'Alta';
            dataToSync.disponibilidad = dataToSync.disponibilidad || 'Disponible';
            dataToSync.incluir_en_planning = dataToSync.incluir_en_planning ?? true;
          }

          let employeeId;
          let syncType;

          // Ejecutar operación
          if (targetEmployee) {
            await base44.entities.Employee.update(targetEmployee.id, dataToSync);
            employeeId = targetEmployee.id;
            syncType = 'Sincronización Total';
          } else {
            const newEmp = await base44.entities.Employee.create(dataToSync);
            employeeId = newEmp.id;
            syncType = 'Creación';

            // Actualizar cachés locales
            existingById.set(newEmp.id, newEmp);
            if(newEmp.codigo_empleado) existingByCode.set(newEmp.codigo_empleado, newEmp);
          }

          // Actualizar maestro y historial
          await base44.entities.EmployeeMasterDatabase.update(masterEmployee.id, {
            employee_id: employeeId,
            ultimo_sincronizado: new Date().toISOString(),
            estado_sincronizacion: 'Sincronizado'
          });

          await base44.entities.EmployeeSyncHistory.create({
            master_employee_id: masterEmployee.id,
            employee_id: employeeId,
            sync_date: new Date().toISOString(),
            sync_type: syncType,
            fields_synced: Object.keys(dataToSync),
            status: 'Exitoso',
            synced_by: user?.email || 'Sistema'
          });

          successCount++;

        } catch (error) {
          console.error('Error syncing employee:', masterEmployee.nombre, error);

          await base44.entities.EmployeeMasterDatabase.update(masterEmployee.id, {
            estado_sincronizacion: 'Error'
          });

          await base44.entities.EmployeeSyncHistory.create({
            master_employee_id: masterEmployee.id,
            sync_date: new Date().toISOString(),
            sync_type: 'Sincronización Total',
            status: 'Error',
            error_message: error.message,
            synced_by: user?.email || 'Sistema'
          });

          errorCount++;
        }
      }

      // Invalidación masiva de queries
      queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['shiftAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['machineAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['syncHistory'] });

      if (errorCount > 0) {
        toast.warning(`Sincronización: ${successCount} éxitos, ${errorCount} errores.`);
      } else {
        toast.success(`Sincronización completada: ${successCount} registros actualizados.`);
      }

    } catch (error) {
      toast.error('Error crítico en sincronización: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  // Opciones únicas para filtros
  const filterOptions = useMemo(() => {
    const departamentos = [...new Set(masterEmployees.map(e => e.departamento).filter(Boolean))].sort();
    const puestos = [...new Set(masterEmployees.map(e => e.puesto).filter(Boolean))].sort();
    const estados = [...new Set(masterEmployees.map(e => e.estado_empleado).filter(Boolean))].sort();
    const estadosSinc = [...new Set(masterEmployees.map(e => e.estado_sincronizacion).filter(Boolean))].sort();

    return {
      departamento: {
        label: 'Departamento',
        options: departamentos.map(d => ({ value: d, label: d }))
      },
      puesto: {
        label: 'Puesto',
        options: puestos.map(p => ({ value: p, label: p }))
      },
      estado_empleado: {
        label: 'Estado Empleado',
        options: estados.map(e => ({ value: e, label: e }))
      },
      estado_sincronizacion: {
        label: 'Estado Sincronización',
        options: estadosSinc.map(e => ({ value: e, label: e }))
      }
    };
  }, [masterEmployees]);

  const filteredEmployees = useMemo(() => {
    return masterEmployees.filter(emp => {
      const searchTerm = filters.searchTerm || "";
      const matchesSearch = !searchTerm || 
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.departamento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.puesto?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDept = !filters.departamento || filters.departamento === 'all' || 
        emp.departamento === filters.departamento;
      
      const matchesPuesto = !filters.puesto || filters.puesto === 'all' || 
        emp.puesto === filters.puesto;
      
      const matchesEstado = !filters.estado_empleado || filters.estado_empleado === 'all' || 
        emp.estado_empleado === filters.estado_empleado;
      
      const matchesEstadoSinc = !filters.estado_sincronizacion || filters.estado_sincronizacion === 'all' || 
        emp.estado_sincronizacion === filters.estado_sincronizacion;

      return matchesSearch && matchesDept && matchesPuesto && matchesEstado && matchesEstadoSinc;
    });
  }, [masterEmployees, filters]);

  const stats = {
    total: masterEmployees.length,
    sincronizados: masterEmployees.filter(e => e.estado_sincronizacion === 'Sincronizado').length,
    pendientes: masterEmployees.filter(e => e.estado_sincronizacion === 'Pendiente').length,
    errores: masterEmployees.filter(e => e.estado_sincronizacion === 'Error').length,
  };

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

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Base de Datos Maestra de Empleados
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Archivo maestro centralizado de empleados - Fuente única de verdad
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">Total Registros</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
                </div>
                <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-700 dark:text-green-300 font-medium">Sincronizados</p>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.sincronizados}</p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Pendientes</p>
                  <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.pendientes}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-700 dark:text-red-300 font-medium">Errores</p>
                  <p className="text-2xl font-bold text-red-900 dark:text-red-100">{stats.errores}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Importar Datos
            </TabsTrigger>
            <TabsTrigger value="database">
              <Database className="w-4 h-4 mr-2" />
              Base de Datos ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="history">
              <FileText className="w-4 h-4 mr-2" />
              Historial
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <MasterEmployeeImport />
          </TabsContent>

          <TabsContent value="database">
            <Card className="shadow-lg border-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="dark:text-slate-100">Registros en Base de Datos Maestra</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      onClick={async () => {
                        if (!confirm('¿Reorganizar y limpiar datos del maestro?\n\nEsto corregirá:\n• Campos en columnas incorrectas\n• Fechas mal formateadas\n• Datos duplicados o mal posicionados\n\n¿Continuar?')) return;
                        
                        setSyncing(true);
                        try {
                          const response = await base44.functions.invoke('reorganizeMasterEmployeeData', {});
                          if (response.data.success) {
                            alert(`✅ ${response.data.message}`);
                            queryClient.invalidateQueries({ queryKey: ['employeeMasterDatabase'] });
                          } else {
                            alert('❌ Error: ' + response.data.error);
                          }
                        } catch (error) {
                          alert('❌ Error: ' + error.message);
                        } finally {
                          setSyncing(false);
                        }
                      }}
                      disabled={syncing}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Reorganizar Datos
                    </Button>
                    <Button
                      onClick={handleSyncAll}
                      disabled={syncing || stats.pendientes === 0}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                      Sincronizar Pendientes ({stats.pendientes})
                    </Button>
                    <Button
                      onClick={handleCleanOperationalData}
                      disabled={syncing}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Limpiar Sistema Operativo
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm(`¿ELIMINAR TODOS LOS REGISTROS de la Base de Datos Maestra?\n\nSe eliminarán ${stats.total} registros.\n\nEsta acción NO se puede deshacer.`)) {
                          handleDeleteAll();
                        }
                      }}
                      disabled={syncing || stats.total === 0}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Borrar BD Maestra ({stats.total})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4">
                  <AdvancedSearch
                    data={masterEmployees}
                    onFilterChange={setFilters}
                    searchFields={['nombre', 'codigo_empleado', 'departamento', 'puesto']}
                    filterOptions={filterOptions}
                    placeholder="Buscar por nombre, código, departamento o puesto..."
                  />
                </div>

                {isLoading ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">Cargando...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    {filters.searchTerm || Object.keys(filters).length > 0 
                      ? 'No se encontraron resultados con los filtros aplicados' 
                      : 'No hay registros en la base de datos maestra'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800">
                          <TableHead className="dark:text-slate-300">Código</TableHead>
                          <TableHead className="dark:text-slate-300">Nombre</TableHead>
                          <TableHead className="dark:text-slate-300">Departamento</TableHead>
                          <TableHead className="dark:text-slate-300">Puesto</TableHead>
                          <TableHead className="dark:text-slate-300">Estado</TableHead>
                          <TableHead className="dark:text-slate-300">Sincronización</TableHead>
                          <TableHead className="text-right dark:text-slate-300">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEmployees.map((emp) => (
                          <TableRow key={emp.id} className="dark:border-slate-800 dark:hover:bg-slate-800/50">
                            <TableCell className="font-mono text-xs dark:text-slate-300">
                              {emp.codigo_empleado || '-'}
                            </TableCell>
                            <TableCell className="font-semibold dark:text-slate-200">
                              {emp.nombre}
                            </TableCell>
                            <TableCell className="dark:text-slate-300">{emp.departamento || '-'}</TableCell>
                            <TableCell className="dark:text-slate-300">{emp.puesto || '-'}</TableCell>
                            <TableCell>
                              <Badge className={
                                emp.estado_empleado === 'Alta' 
                                  ? 'bg-green-600 dark:bg-green-700' 
                                  : 'bg-slate-600 dark:bg-slate-700'
                              }>
                                {emp.estado_empleado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {emp.estado_sincronizacion === 'Sincronizado' && (
                                  <Badge className="bg-green-600">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Sincronizado
                                  </Badge>
                                )}
                                {emp.estado_sincronizacion === 'Pendiente' && (
                                  <Badge className="bg-amber-600">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pendiente
                                  </Badge>
                                )}
                                {emp.estado_sincronizacion === 'Error' && (
                                  <Badge className="bg-red-600">
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Error
                                  </Badge>
                                )}
                                {emp.ultimo_sincronizado && (
                                  <span className="text-[10px] text-slate-500">
                                    {(() => {
                                      try {
                                        const date = new Date(emp.ultimo_sincronizado);
                                        if (isNaN(date.getTime())) return '';
                                        return format(date, 'dd/MM/yy HH:mm', { locale: es });
                                      } catch {
                                        return '';
                                      }
                                    })()}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openSyncDialog(emp)}
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" />
                                  Sincronizar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setHistoryEmployeeId(emp.id)}
                                >
                                  <FileText className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (confirm('¿Eliminar este registro?')) {
                                      deleteMutation.mutate(emp.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 text-red-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Historial de Sincronizaciones</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {historyEmployeeId ? (
                  <div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setHistoryEmployeeId(null)}
                      className="mb-4"
                    >
                      ← Volver a la lista
                    </Button>
                    <SyncHistoryPanel masterEmployeeId={historyEmployeeId} />
                  </div>
                ) : (
                  <p className="text-center text-slate-500 py-8">
                    Selecciona un empleado desde la tabla para ver su historial
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {syncDialogOpen && selectedEmployee && (
        <SyncComparisonDialog
          masterEmployee={selectedEmployee.master}
          existingEmployee={selectedEmployee.existing}
          open={syncDialogOpen}
          onClose={() => {
            setSyncDialogOpen(false);
            setSelectedEmployee(null);
          }}
        />
      )}
    </div>
  );
}