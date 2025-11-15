import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Save, Filter, ArrowLeft, Bell, History, Settings, CheckCircle2, AlertCircle, BarChart3, Users, Upload, FileSpreadsheet, ArrowUpDown, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import LockerRoomMap from "../components/lockers/LockerRoomMap";
import LockerConfigForm from "../components/lockers/LockerConfigForm";

export default function LockerManagementPage() {
  const [filters, setFilters] = useState({
    departamento: "all",
    equipo: "all",
    sexo: "all",
    vestuario: "all",
    searchTerm: "",
    numeroTaquilla: ""
  });
  const [sortConfig, setSortConfig] = useState({ field: "nombre", direction: "asc" });
  const [showHistory, setShowHistory] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingAssignments, setEditingAssignments] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.Employee.list('nombre'),
    initialData: [],
  });

  const { data: lockerAssignments } = useQuery({
    queryKey: ['lockerAssignments'],
    queryFn: () => base44.entities.LockerAssignment.list(),
    initialData: [],
  });

  const { data: teams } = useQuery({
    queryKey: ['teamConfigs'],
    queryFn: () => base44.entities.TeamConfig.list(),
    initialData: [],
  });

  const { data: lockerRoomConfigs } = useQuery({
    queryKey: ['lockerRoomConfigs'],
    queryFn: () => base44.entities.LockerRoomConfig.list(),
    initialData: [],
  });

  const getAssignment = (employeeId) => {
    return lockerAssignments.find(la => la.employee_id === employeeId);
  };

  React.useEffect(() => {
    const assignments = {};
    lockerAssignments.forEach(la => {
      assignments[la.employee_id] = {
        requiere_taquilla: la.requiere_taquilla !== false,
        vestuario: la.vestuario || "",
        numero_taquilla_actual: la.numero_taquilla_actual || "",
        numero_taquilla_nuevo: ""
      };
    });
    setEditingAssignments(assignments);
  }, [lockerAssignments]);

  const normalizeString = (str) => {
    if (!str) return "";
    let normalized = str.toUpperCase();
    normalized = normalized.replace(/\?/g, '[ÑN]');
    normalized = normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    normalized = normalized.replace(/[^A-Z0-9\[\]]/g, "");
    return normalized;
  };

  const matchNames = (name1, name2) => {
    if (!name1 || !name2) return false;
    
    const norm1 = normalizeString(name1);
    const norm2 = normalizeString(name2);
    
    if (norm1 === norm2) return true;
    
    if (norm1.includes('[') || norm2.includes('[')) {
      const pattern1 = norm1.replace(/\[ÑN\]/g, '[ÑN]');
      const pattern2 = norm2.replace(/\[ÑN\]/g, '[ÑN]');
      
      const regex1 = new RegExp(`^${pattern1}$`);
      const regex2 = new RegExp(`^${pattern2}$`);
      
      if (regex1.test(norm2) || regex2.test(norm1)) return true;
    }
    
    return false;
  };

  const handleImportFile = async () => {
    if (!importFile) {
      toast.error("Selecciona un archivo");
      return;
    }

    setImporting(true);
    try {
      const text = await importFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const hasHeader = lines[0].toLowerCase().includes('nombre') || 
                        lines[0].toLowerCase().includes('codigo');
      const dataLines = hasHeader ? lines.slice(1) : lines;

      const matched = [];
      const unmatched = [];

      for (const line of dataLines) {
        const parts = line.includes(';') ? line.split(';') : line.split(',');
        if (parts.length < 3) continue;

        const codigo = parts[0]?.trim();
        const nombre = parts[1]?.trim();
        const vestuario = parts[2]?.trim();
        const numeroTaquilla = parts[3]?.trim();

        let employee = null;
        
        if (codigo) {
          employee = employees.find(e => e.codigo_empleado === codigo);
        }
        
        if (!employee && nombre) {
          employee = employees.find(e => matchNames(e.nombre, nombre));
        }

        if (employee) {
          matched.push({
            employee,
            vestuario,
            numeroTaquilla,
            codigo,
            nombre
          });
        } else {
          unmatched.push({ codigo, nombre, vestuario, numeroTaquilla });
        }
      }

      setImportPreview({ matched, unmatched });
      toast.success(`${matched.length} empleados encontrados, ${unmatched.length} sin coincidencia`);
    } catch (error) {
      toast.error("Error al procesar el archivo");
      console.error(error);
    } finally {
      setImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview?.matched) return;

    try {
      const promises = importPreview.matched.map(async ({ employee, vestuario, numeroTaquilla }) => {
        const existing = lockerAssignments.find(la => la.employee_id === employee.id);
        
        // Verificar duplicados antes de importar
        const duplicado = lockerAssignments.find(la => 
          la.vestuario === vestuario &&
          la.numero_taquilla_actual === numeroTaquilla &&
          la.employee_id !== employee.id &&
          la.requiere_taquilla !== false
        );

        if (duplicado) {
          const empDuplicado = employees.find(e => e.id === duplicado.employee_id);
          throw new Error(`Taquilla ${numeroTaquilla} en ${vestuario} ya asignada a ${empDuplicado?.nombre}`);
        }
        
        const now = new Date().toISOString();
        const hasChange = existing && existing.numero_taquilla_actual !== numeroTaquilla;

        const dataToSave = {
          employee_id: employee.id,
          requiere_taquilla: true,
          vestuario: vestuario,
          numero_taquilla_actual: numeroTaquilla,
          numero_taquilla_nuevo: "",
          fecha_asignacion: now,
          notificacion_enviada: false
        };

        if (hasChange && existing) {
          const historial = existing.historial_cambios || [];
          historial.push({
            fecha: now,
            vestuario_anterior: existing.vestuario,
            taquilla_anterior: existing.numero_taquilla_actual,
            vestuario_nuevo: vestuario,
            taquilla_nueva: numeroTaquilla,
            motivo: "Importación masiva"
          });
          dataToSave.historial_cambios = historial;
        }

        if (existing) {
          return base44.entities.LockerAssignment.update(existing.id, dataToSave);
        }
        return base44.entities.LockerAssignment.create(dataToSave);
      });

      await Promise.all(promises);
      
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      toast.success(`${importPreview.matched.length} asignaciones importadas con notificaciones pendientes`);
      setImportPreview(null);
      setImportFile(null);
    } catch (error) {
      toast.error(error.message);
      console.error(error);
    }
  };

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      // VALIDACIÓN: Detectar duplicados
      const errores = [];
      
      for (const [employeeId, data] of Object.entries(editingAssignments)) {
        if (!data.requiere_taquilla) continue;
        
        const numeroAUsar = data.numero_taquilla_nuevo || data.numero_taquilla_actual;
        if (!numeroAUsar || numeroAUsar.toString().trim() === "") continue;
        
        const vestuario = data.vestuario;
        if (!vestuario) continue;
        
        // Validar que el identificador existe en la configuración
        const config = lockerRoomConfigs.find(c => c.vestuario === vestuario);
        const identificadoresValidos = config?.identificadores_taquillas || [];
        
        if (identificadoresValidos.length > 0 && !identificadoresValidos.includes(numeroAUsar.toString())) {
          const emp = employees.find(e => e.id === employeeId);
          errores.push(`${emp?.nombre || 'Empleado'}: El identificador "${numeroAUsar}" no existe en ${vestuario}`);
          continue;
        }
        
        // Validar duplicados (excluir el mismo empleado)
        const duplicado = lockerAssignments.find(la => 
          la.vestuario === vestuario &&
          la.numero_taquilla_actual === numeroAUsar.toString() &&
          la.employee_id !== employeeId &&
          la.requiere_taquilla !== false
        );

        if (duplicado) {
          const emp1 = employees.find(e => e.id === employeeId);
          const emp2 = employees.find(e => e.id === duplicado.employee_id);
          errores.push(`⚠️ Taquilla "${numeroAUsar}" en ${vestuario}:\n   Ya asignada a: ${emp2?.nombre || 'otro empleado'}\n   No se puede asignar a: ${emp1?.nombre || 'este empleado'}`);
        }
      }
      
      if (errores.length > 0) {
        const mensaje = "❌ Errores de validación:\n\n" + errores.join('\n\n');
        toast.error(mensaje, { duration: 10000 });
        throw new Error("Validación fallida");
      }
      
      // Si no hay errores, proceder con el guardado
      const promises = Object.entries(editingAssignments).map(([employeeId, data]) => {
        const existing = lockerAssignments.find(la => la.employee_id === employeeId);
        
        const hasLockerChange = data.numero_taquilla_nuevo && 
          data.numero_taquilla_nuevo !== data.numero_taquilla_actual;
        
        const now = new Date().toISOString();
        const updatedData = {
          employee_id: employeeId,
          requiere_taquilla: data.requiere_taquilla,
          vestuario: data.vestuario,
          numero_taquilla_actual: hasLockerChange ? data.numero_taquilla_nuevo : data.numero_taquilla_actual,
          numero_taquilla_nuevo: "",
          fecha_asignacion: now,
          notificacion_enviada: hasLockerChange ? false : (existing?.notificacion_enviada || false)
        };

        if (hasLockerChange && existing) {
          const historial = existing.historial_cambios || [];
          historial.push({
            fecha: now,
            vestuario_anterior: existing.vestuario,
            taquilla_anterior: existing.numero_taquilla_actual,
            vestuario_nuevo: data.vestuario,
            taquilla_nueva: data.numero_taquilla_nuevo,
            motivo: "Reasignación manual"
          });
          updatedData.historial_cambios = historial;
        }

        if (existing) {
          return base44.entities.LockerAssignment.update(existing.id, updatedData);
        }
        return base44.entities.LockerAssignment.create(updatedData);
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      setHasChanges(false);
      toast.success("✅ Cambios guardados correctamente");
    },
    onError: (error) => {
      // Error ya mostrado en validación
    }
  });

  const sendNotificationMutation = useMutation({
    mutationFn: async ({ employeeId, vestuario, numeroTaquilla }) => {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee || !employee.email) return;

      await base44.integrations.Core.SendEmail({
        to: employee.email,
        subject: "Asignación de Taquilla",
        body: `Hola ${employee.nombre},\n\nSe te ha asignado una taquilla:\n\nVestuario: ${vestuario}\nNúmero de taquilla: ${numeroTaquilla}\n\nPor favor, toma nota de tu nueva asignación.\n\nSaludos.`
      });

      const existing = lockerAssignments.find(la => la.employee_id === employeeId);
      if (existing) {
        await base44.entities.LockerAssignment.update(existing.id, {
          notificacion_enviada: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lockerAssignments'] });
      toast.success("Notificación enviada");
    },
  });

  const departments = useMemo(() => {
    const depts = new Set();
    employees.forEach(emp => {
      if (emp.departamento) depts.add(emp.departamento);
    });
    return Array.from(depts).sort();
  }, [employees]);

  const filteredAndSortedEmployees = useMemo(() => {
    let filtered = employees.filter(emp => {
      const matchesDept = filters.departamento === "all" || emp.departamento === filters.departamento;
      const matchesTeam = filters.equipo === "all" || emp.equipo === filters.equipo;
      const matchesSex = filters.sexo === "all" || emp.sexo === filters.sexo;
      const matchesSearch = !filters.searchTerm || 
        emp.nombre?.toLowerCase().includes(filters.searchTerm.toLowerCase());
      
      const editData = editingAssignments[emp.id];
      const assignment = getAssignment(emp.id);
      const vestuario = editData?.vestuario || assignment?.vestuario || "";
      const matchesVestuario = filters.vestuario === "all" || vestuario === filters.vestuario;

      const numeroTaquilla = editData?.numero_taquilla_actual || assignment?.numero_taquilla_actual || "";
      const matchesNumeroTaquilla = !filters.numeroTaquilla || 
        numeroTaquilla.toString().includes(filters.numeroTaquilla);
      
      return matchesDept && matchesTeam && matchesSex && matchesSearch && matchesVestuario && matchesNumeroTaquilla;
    });

    filtered.sort((a, b) => {
      let aVal = "";
      let bVal = "";
      
      if (sortConfig.field === "nombre") {
        aVal = a.nombre || "";
        bVal = b.nombre || "";
      } else if (sortConfig.field === "vestuario") {
        const aAssign = editingAssignments[a.id] || getAssignment(a.id);
        const bAssign = editingAssignments[b.id] || getAssignment(b.id);
        aVal = aAssign?.vestuario || "";
        bVal = bAssign?.vestuario || "";
      } else if (sortConfig.field === "taquilla") {
        const aAssign = editingAssignments[a.id] || getAssignment(a.id);
        const bAssign = editingAssignments[b.id] || getAssignment(b.id);
        aVal = aAssign?.numero_taquilla_actual || "";
        bVal = bAssign?.numero_taquilla_actual || "";
      } else if (sortConfig.field === "departamento") {
        aVal = a.departamento || "";
        bVal = b.departamento || "";
      }

      if (sortConfig.field === "taquilla") {
        const numA = parseInt(aVal, 10);
        const numB = parseInt(bVal, 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortConfig.direction === "asc" ? numA - numB : numB - numA;
        }
      }

      if (sortConfig.direction === "asc") {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });

    return filtered;
  }, [employees, filters, sortConfig, editingAssignments, lockerAssignments]);

  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleFieldChange = (employeeId, field, value) => {
    setEditingAssignments(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleClearNewLocker = (employeeId) => {
    setEditingAssignments(prev => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {}),
        numero_taquilla_nuevo: ""
      }
    }));
    setHasChanges(true);
  };

  const handleSendNotification = (employeeId) => {
    const editData = editingAssignments[employeeId];
    if (editData) {
      sendNotificationMutation.mutate({ 
        employeeId, 
        vestuario: editData.vestuario,
        numeroTaquilla: editData.numero_taquilla_nuevo || editData.numero_taquilla_actual
      });
    }
  };

  const handleShowHistory = (employee) => {
    setSelectedEmployee(employee);
    setShowHistory(true);
  };

  const handleSaveAll = () => {
    if (window.confirm('¿Guardar todos los cambios realizados?')) {
      saveAllMutation.mutate();
    }
  };

  const downloadTemplate = () => {
    const csv = "codigo_empleado,nombre,vestuario,numero_taquilla\nEMP001,Juan Pérez,Vestuario Masculino Planta Baja,15\nEMP002,María García,Vestuario Femenino Planta Alta,42";
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_taquillas.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const employeesConTaquilla = new Set();
    lockerAssignments.forEach(la => {
      const tieneTaquilla = la.numero_taquilla_actual && 
                           la.numero_taquilla_actual.toString().trim() !== "";
      const requiere = la.requiere_taquilla !== false;
      if (tieneTaquilla && requiere) {
        employeesConTaquilla.add(la.employee_id);
      }
    });
    const conTaquilla = employeesConTaquilla.size;

    const sinTaquilla = employees.filter(emp => {
      const assignment = lockerAssignments.find(la => la.employee_id === emp.id);
      if (!assignment) return true;
      if (assignment.requiere_taquilla === false) return false;
      return !assignment.numero_taquilla_actual || assignment.numero_taquilla_actual.toString().trim() === "";
    }).length;

    const pendientesNotificacion = lockerAssignments.filter(la => {
      const tieneTaquilla = la.numero_taquilla_actual && 
                           la.numero_taquilla_actual.toString().trim() !== "";
      return !la.notificacion_enviada && tieneTaquilla;
    }).length;

    const cambiosPendientes = Object.values(editingAssignments).filter(ea => {
      const tieneNuevaTaquilla = ea.numero_taquilla_nuevo && 
                                ea.numero_taquilla_nuevo.toString().trim() !== "";
      const esDiferente = ea.numero_taquilla_nuevo !== ea.numero_taquilla_actual;
      return tieneNuevaTaquilla && esDiferente;
    }).length;
    
    return { conTaquilla, sinTaquilla, pendientesNotificacion, cambiosPendientes };
  }, [lockerAssignments, employees, editingAssignments]);

  const lockerRoomStats = useMemo(() => {
    const vestuarios = [
      "Vestuario Femenino Planta Baja",
      "Vestuario Femenino Planta Alta",
      "Vestuario Masculino Planta Baja"
    ];

    return vestuarios.map(vestuario => {
      const config = lockerRoomConfigs.find(c => c.vestuario === vestuario);
      const totalInstaladas = config?.numero_taquillas_instaladas || 0;
      
      const assignmentsEnVestuario = lockerAssignments.filter(la => {
        const esEsteVestuario = la.vestuario === vestuario;
        const tieneNumero = la.numero_taquilla_actual && 
                           la.numero_taquilla_actual.toString().trim() !== "";
        const requiere = la.requiere_taquilla !== false;
        
        return esEsteVestuario && tieneNumero && requiere;
      });
      
      const asignadas = assignmentsEnVestuario.length;
      const libres = Math.max(0, totalInstaladas - asignadas);
      
      // Detectar identificadores no válidos
      const identificadoresValidos = config?.identificadores_taquillas || [];
      const fueraDeRango = identificadoresValidos.length > 0 
        ? assignmentsEnVestuario.filter(la => 
            !identificadoresValidos.includes(la.numero_taquilla_actual)
          ).length
        : assignmentsEnVestuario.filter(la => {
            const num = parseInt(la.numero_taquilla_actual);
            return num > totalInstaladas;
          }).length;
      
      return {
        vestuario,
        totalInstaladas,
        asignadas,
        libres,
        fueraDeRango,
        porcentajeOcupacion: totalInstaladas > 0 ? Math.round((asignadas / totalInstaladas) * 100) : 0
      };
    });
  }, [lockerRoomConfigs, lockerAssignments]);

  const SortableHeader = ({ field, label }) => (
    <TableHead 
      className="cursor-pointer hover:bg-slate-100 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {label}
        <ArrowUpDown 
          className={`w-4 h-4 transition-transform 
            ${sortConfig.field === field 
              ? `text-blue-600 ${sortConfig.direction === 'desc' ? 'rotate-180' : ''}` 
              : 'text-slate-400'
            }`
          }
        />
      </div>
    </TableHead>
  );

  const problemasDetectados = useMemo(() => {
    const problemas = [];
    
    lockerRoomStats.forEach(stat => {
      if (stat.fueraDeRango > 0) {
        problemas.push({
          tipo: 'fuera_rango',
          mensaje: `${stat.vestuario}: ${stat.fueraDeRango} taquilla(s) con identificadores no válidos`
        });
      }
      
      if (stat.asignadas > stat.totalInstaladas) {
        problemas.push({
          tipo: 'exceso',
          mensaje: `${stat.vestuario}: ${stat.asignadas} asignadas vs ${stat.totalInstaladas} instaladas`
        });
      }
    });
    
    return problemas;
  }, [lockerRoomStats]);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to={createPageUrl("ShiftManagers")}>
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Jefes de Turno
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <KeyRound className="w-8 h-8 text-blue-600" />
              Gestión de Taquillas
            </h1>
            <p className="text-slate-600 mt-1">
              Configura vestuarios y asigna taquillas a empleados
            </p>
          </div>
        </div>

        {problemasDetectados.length > 0 && (
          <Card className="mb-6 bg-red-50 border-2 border-red-300">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-2">⚠️ Problemas Detectados en Asignaciones</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    {problemasDetectados.map((p, idx) => (
                      <li key={idx}>• {p.mensaje}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-red-700 mt-2">
                    Revisa y corrige las asignaciones en la pestaña "Asignaciones"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasChanges && (
          <Card className="mb-6 bg-amber-50 border-2 border-amber-300">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ Hay cambios sin guardar.</strong> Recuerda hacer clic en "Guardar Cambios" para aplicar las modificaciones.
                  </p>
                  {stats.cambiosPendientes > 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      {stats.cambiosPendientes} reasignación(es) pendiente(s) • Se notificará automáticamente
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleSaveAll}
                  disabled={saveAllMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveAllMutation.isPending ? "Guardando..." : "Guardar Ahora"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="estadisticas" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="estadisticas">
              <BarChart3 className="w-4 h-4 mr-2" />
              Estadísticas
            </TabsTrigger>
            <TabsTrigger value="mapa">
              <KeyRound className="w-4 h-4 mr-2" />
              Mapa Interactivo
            </TabsTrigger>
            <TabsTrigger value="importar">
              <Upload className="w-4 h-4 mr-2" />
              Importar
            </TabsTrigger>
            <TabsTrigger value="asignaciones">
              <Users className="w-4 h-4 mr-2" />
              Asignaciones
            </TabsTrigger>
            <TabsTrigger value="configuracion">
              <Settings className="w-4 h-4 mr-2" />
              Configuración
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estadisticas">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Empleados con Taquilla</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.conTaquilla}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-700 font-medium">Empleados sin Taquilla</p>
                      <p className="text-2xl font-bold text-slate-900">{stats.sinTaquilla}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-orange-700 font-medium">Pendientes Notificación</p>
                      <p className="text-2xl font-bold text-orange-900">{stats.pendientesNotificacion}</p>
                    </div>
                    <Bell className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  Resumen por Vestuario
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {lockerRoomStats.map((stat) => (
                    <div key={stat.vestuario} className={`border-2 rounded-lg p-5 bg-gradient-to-br from-slate-50 to-slate-100 ${
                      stat.fueraDeRango > 0 ? 'border-red-400 bg-red-50' : ''
                    }`}>
                      <h3 className="font-bold text-slate-900 mb-4 text-base">
                        {stat.vestuario}
                      </h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Total Instaladas:</span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 font-bold text-base">
                            {stat.totalInstaladas}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Asignadas:</span>
                          <Badge className={`font-bold text-base ${
                            stat.asignadas > stat.totalInstaladas 
                              ? 'bg-red-600 text-white' 
                              : 'bg-green-600 text-white'
                          }`}>
                            {stat.asignadas}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-600">Libres:</span>
                          <Badge className={`font-bold text-base ${
                            stat.libres > 10 ? "bg-green-100 text-green-800" :
                            stat.libres > 5 ? "bg-amber-100 text-amber-800" :
                            stat.libres >= 0 ? "bg-red-100 text-red-800" :
                            "bg-red-600 text-white"
                          }`}>
                            {stat.libres}
                          </Badge>
                        </div>
                        {stat.fueraDeRango > 0 && (
                          <div className="pt-2 border-t border-red-300">
                            <Badge className="bg-red-600 text-white w-full justify-center">
                              ⚠️ {stat.fueraDeRango} con ID no válido
                            </Badge>
                          </div>
                        )}
                        <div className="pt-3 border-t border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-slate-700">Ocupación:</span>
                            <span className="text-base font-bold text-slate-900">{stat.porcentajeOcupacion}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${
                                stat.porcentajeOcupacion > 100 ? 'bg-red-600' :
                                stat.porcentajeOcupacion > 90 ? 'bg-red-500' :
                                stat.porcentajeOcupacion > 75 ? 'bg-amber-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, stat.porcentajeOcupacion)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mapa">
            <LockerRoomMap 
              lockerAssignments={lockerAssignments}
              employees={employees}
              lockerRoomConfigs={lockerRoomConfigs}
            />
          </TabsContent>

          <TabsContent value="importar">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Importar Asignaciones desde Archivo</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">¿Cómo funciona?</h3>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Descarga la plantilla CSV o prepara tu archivo con: codigo_empleado, nombre, vestuario, numero_taquilla</li>
                    <li>El sistema busca coincidencias por código o nombre (soporta ? para Ñ y tildes)</li>
                    <li>Valida que no haya taquillas duplicadas en el mismo vestuario</li>
                    <li>Se configura automáticamente vestuario y taquilla actual</li>
                    <li>Se activan notificaciones pendientes para todos los cambios</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <Button onClick={downloadTemplate} variant="outline">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Descargar Plantilla CSV
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="locker-import">Seleccionar Archivo *</Label>
                    <input
                      type="file"
                      id="locker-import"
                      accept=".csv,.xlsx,.xls"
                      onChange={(e) => setImportFile(e.target.files[0])}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => document.getElementById('locker-import').click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importFile ? importFile.name : "Seleccionar Archivo"}
                    </Button>
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={handleImportFile}
                      disabled={!importFile || importing}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      {importing ? "Procesando..." : "Procesar Archivo"}
                    </Button>
                  </div>
                </div>

                {importPreview && (
                  <Card className="border-2 border-green-200 bg-green-50">
                    <CardHeader className="border-b border-green-200">
                      <CardTitle className="text-green-900">Vista Previa de Importación</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Badge className="bg-green-600 text-white mr-2">
                            {importPreview.matched.length} empleados encontrados
                          </Badge>
                          {importPreview.unmatched.length > 0 && (
                            <Badge className="bg-amber-600 text-white">
                              {importPreview.unmatched.length} sin coincidencia
                            </Badge>
                          )}
                        </div>
                        <Button
                          onClick={handleConfirmImport}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Confirmar Importación
                        </Button>
                      </div>

                      {importPreview.matched.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm text-slate-700">Asignaciones a Importar:</h3>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {importPreview.matched.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between p-3 bg-white rounded border">
                                <div>
                                  <div className="font-semibold text-slate-900">{item.employee.nombre}</div>
                                  <div className="text-xs text-slate-600">{item.employee.departamento}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium text-slate-700">{item.vestuario}</div>
                                  <Badge className="bg-blue-600 text-white font-mono">
                                    Taquilla {item.numeroTaquilla}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {importPreview.unmatched.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold text-sm text-amber-700">Sin Coincidencia:</h3>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {importPreview.unmatched.map((item, idx) => (
                              <div key={idx} className="text-xs p-2 bg-amber-100 rounded border border-amber-300">
                                {item.nombre} ({item.codigo})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="asignaciones">
            <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-blue-600" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="space-y-2">
                    <Label>Buscar por Nombre</Label>
                    <Input
                      placeholder="Nombre..."
                      value={filters.searchTerm}
                      onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nº Taquilla</Label>
                    <Input
                      placeholder="Número..."
                      value={filters.numeroTaquilla}
                      onChange={(e) => setFilters({...filters, numeroTaquilla: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Select value={filters.departamento} onValueChange={(value) => setFilters({...filters, departamento: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Equipo</Label>
                    <Select value={filters.equipo} onValueChange={(value) => setFilters({...filters, equipo: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.team_name}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Sexo</Label>
                    <Select value={filters.sexo} onValueChange={(value) => setFilters({...filters, sexo: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Vestuario</Label>
                    <Select value={filters.vestuario} onValueChange={(value) => setFilters({...filters, vestuario: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Vestuario Femenino Planta Baja">Femenino P. Baja</SelectItem>
                        <SelectItem value="Vestuario Femenino Planta Alta">Femenino P. Alta</SelectItem>
                        <SelectItem value="Vestuario Masculino Planta Baja">Masculino P. Baja</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <div className="flex justify-between items-center">
                  <CardTitle>Lista de Empleados ({filteredAndSortedEmployees.length})</CardTitle>
                  {hasChanges && (
                    <Button
                      onClick={handleSaveAll}
                      disabled={saveAllMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {saveAllMutation.isPending ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="w-12">Req.</TableHead>
                        <SortableHeader field="nombre" label="Empleado" />
                        <TableHead>Sexo</TableHead>
                        <SortableHeader field="departamento" label="Departamento" />
                        <SortableHeader field="vestuario" label="Vestuario" />
                        <SortableHeader field="taquilla" label="Taquilla Actual" />
                        <TableHead>Nueva Taquilla</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-slate-500">
                            No hay empleados con los filtros seleccionados
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAndSortedEmployees.map((employee) => {
                          const assignment = getAssignment(employee.id);
                          const editData = editingAssignments[employee.id] || {
                            requiere_taquilla: assignment?.requiere_taquilla !== false,
                            vestuario: assignment?.vestuario || "",
                            numero_taquilla_actual: assignment?.numero_taquilla_actual || "",
                            numero_taquilla_nuevo: ""
                          };
                          
                          const requiereTaquilla = editData.requiere_taquilla;
                          const hasNewLocker = editData.numero_taquilla_nuevo && 
                            editData.numero_taquilla_nuevo !== editData.numero_taquilla_actual;
                          
                          // Validar identificador
                          const config = lockerRoomConfigs.find(c => c.vestuario === editData.vestuario);
                          const identificadoresValidos = config?.identificadores_taquillas || [];
                          const idNoValido = editData.numero_taquilla_actual && 
                                            identificadoresValidos.length > 0 &&
                                            !identificadoresValidos.includes(editData.numero_taquilla_actual);
                          
                          return (
                            <TableRow key={employee.id} className={`hover:bg-slate-50 ${
                              !requiereTaquilla ? 'opacity-50' : 
                              idNoValido ? 'bg-red-50' : ''
                            }`}>
                              <TableCell>
                                <Checkbox
                                  checked={requiereTaquilla}
                                  onCheckedChange={(checked) => handleFieldChange(employee.id, 'requiere_taquilla', checked)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-slate-900">{employee.nombre}</div>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  employee.sexo === "Femenino" ? "bg-pink-100 text-pink-800" :
                                  employee.sexo === "Masculino" ? "bg-blue-100 text-blue-800" :
                                  "bg-purple-100 text-purple-800"
                                }>
                                  {employee.sexo || "N/A"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-slate-500">{employee.departamento}</div>
                              </TableCell>
                              <TableCell>
                                {requiereTaquilla && (
                                  <Select
                                    value={editData.vestuario}
                                    onValueChange={(value) => handleFieldChange(employee.id, 'vestuario', value)}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Vestuario Femenino Planta Baja">
                                        Femenino P. Baja (56)
                                      </SelectItem>
                                      <SelectItem value="Vestuario Femenino Planta Alta">
                                        Femenino P. Alta (163)
                                      </SelectItem>
                                      <SelectItem value="Vestuario Masculino Planta Baja">
                                        Masculino P. Baja (28)
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                              <TableCell>
                                {requiereTaquilla && (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editData.numero_taquilla_actual}
                                      onChange={(e) => handleFieldChange(employee.id, 'numero_taquilla_actual', e.target.value)}
                                      placeholder="ID"
                                      className={`w-20 font-mono ${idNoValido ? 'border-red-500 bg-red-50' : ''}`}
                                    />
                                    {idNoValido && (
                                      <Badge className="bg-red-600 text-white text-xs">
                                        No válido
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {requiereTaquilla && (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editData.numero_taquilla_nuevo}
                                      onChange={(e) => handleFieldChange(employee.id, 'numero_taquilla_nuevo', e.target.value)}
                                      placeholder="Vacío = sin cambio"
                                      className="w-32 font-mono text-xs"
                                    />
                                    {hasNewLocker && (
                                      <div className="flex gap-1">
                                        <Badge className="bg-orange-100 text-orange-800">
                                          Cambio
                                        </Badge>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleClearNewLocker(employee.id)}
                                          title="Cancelar reasignación"
                                        >
                                          <XCircle className="w-4 h-4 text-slate-500" />
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex justify-center gap-2">
                                  {editData.numero_taquilla_actual && !assignment?.notificacion_enviada && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSendNotification(employee.id)}
                                      disabled={sendNotificationMutation.isPending}
                                      className="bg-orange-600 hover:bg-orange-700"
                                      title="Enviar notificación de asignación"
                                    >
                                      <Bell className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {assignment?.historial_cambios && assignment.historial_cambios.length > 0 && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleShowHistory(employee)}
                                      title="Ver historial de cambios"
                                    >
                                      <History className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuracion">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100">
                <CardTitle>Configuración de Vestuarios e Identificadores</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>ℹ️ Información:</strong> Configura el número total de taquillas y sus identificadores únicos por vestuario.
                  </p>
                  <p className="text-xs text-blue-700">
                    Los identificadores pueden repetirse entre vestuarios diferentes (ej: "1" en Femenino y "1" en Masculino), 
                    pero deben ser únicos dentro del mismo vestuario.
                  </p>
                </div>

                <div className="space-y-6">
                  {["Vestuario Femenino Planta Baja", "Vestuario Femenino Planta Alta", "Vestuario Masculino Planta Baja"].map((vestuario) => {
                    const config = lockerRoomConfigs.find(c => c.vestuario === vestuario);
                    return (
                      <LockerConfigForm
                        key={vestuario}
                        vestuario={vestuario}
                        config={config}
                        lockerRoomStats={lockerRoomStats}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showHistory && selectedEmployee && (
        <Dialog open={true} onOpenChange={setShowHistory}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Historial de Taquillas - {selectedEmployee.nombre}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {(() => {
                const assignment = getAssignment(selectedEmployee.id);
                const historial = assignment?.historial_cambios || [];
                
                if (historial.length === 0) {
                  return (
                    <p className="text-center text-slate-500 py-8">
                      No hay historial de cambios
                    </p>
                  );
                }
                
                return historial.reverse().map((cambio, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">
                        {format(new Date(cambio.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                      </Badge>
                      {cambio.motivo && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {cambio.motivo}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 font-medium">Anterior:</p>
                        <p className="text-slate-900">{cambio.vestuario_anterior || "-"}</p>
                        <p className="text-slate-900 font-mono">Taquilla: {cambio.taquilla_anterior || "-"}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium">Nuevo:</p>
                        <p className="text-slate-900">{cambio.vestuario_nuevo || "-"}</p>
                        <p className="text-slate-900 font-mono">Taquilla: {cambio.taquilla_nueva || "-"}</p>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}