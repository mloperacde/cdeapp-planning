import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Settings, Edit3, Users, Search } from "lucide-react";
import LockerAssignmentDialog from "./LockerAssignmentDialog";

export default function LockerRoomMap({ lockerAssignments, employees, lockerRoomConfigs, saveAssignments }) {
  const [selectedVestuario, setSelectedVestuario] = useState("Vestuario Femenino Planta Alta");
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [quickEditMode, setQuickEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const vestuarioConfig = useMemo(() => {
    const config = lockerRoomConfigs.find(c => c.vestuario === selectedVestuario);
    return {
      total: config?.numero_taquillas_instaladas || 163,
      identificadores: config?.identificadores_taquillas || []
    };
  }, [selectedVestuario, lockerRoomConfigs]);

  const employeesWithoutLocker = useMemo(() => {
    return employees.filter(emp => {
      const assignment = lockerAssignments.find(la => String(la.employee_id) === String(emp.id));
      if (!assignment) return true;
      if (assignment.requiere_taquilla === false) return false;
      
      const tieneTaquilla = assignment.numero_taquilla_actual && 
                           String(assignment.numero_taquilla_actual).replace(/['"''‚„]/g, '').trim() !== "";
      
      return !tieneTaquilla;
    }).filter(emp => {
      if (!searchTerm) return true;
      return emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             emp.codigo_empleado?.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [employees, lockerAssignments, searchTerm]);

  const lockerData = useMemo(() => {
    const data = [];
    
    const identificadores = vestuarioConfig.identificadores.length > 0
      ? vestuarioConfig.identificadores
      : Array.from({ length: vestuarioConfig.total }, (_, i) => (i + 1).toString());
    
    identificadores.forEach((identificador) => {
      // Robust comparison with standardized regex
      const cleanId = cleanLockerNumber(identificador);
      
      const assignment = lockerAssignments.find(la => {
        if (!la.vestuario || la.vestuario !== selectedVestuario) return false;
        
        const laNumero = cleanLockerNumber(la.numero_taquilla_actual);
        const numeroMatch = laNumero === cleanId;
        const requiere = la.requiere_taquilla !== false;
        
        return numeroMatch && requiere;
      });
      
      const employee = assignment ? employees.find(e => String(e.id) === String(assignment.employee_id)) : null;
      
      data.push({
        numero: cleanId,
        ocupada: !!assignment,
        employee,
        assignment
      });
    });
    
    return data;
  }, [vestuarioConfig, lockerAssignments, selectedVestuario, employees]);

  const stats = useMemo(() => {
    const ocupadas = lockerData.filter(l => l.ocupada).length;
    const libres = lockerData.length - ocupadas;
    const porcentaje = lockerData.length > 0 ? Math.round((ocupadas / lockerData.length) * 100) : 0;
    
    return { ocupadas, libres, porcentaje };
  }, [lockerData]);

  const handleLockerClick = (locker) => {
    try {
      console.log("[LockerRoomMap] Locker clicked:", locker);
      setLastAction(`Click en taquilla ${locker.numero} - Ocupada: ${locker.ocupada}`);
      setSelectedLocker(locker);
    } catch (error) {
      console.error("Error handling click:", error);
      setLastAction(`Error al hacer click: ${error.message}`);
      toast.error(`Error: ${error.message}`);
    }
  };

  const handleDragStart = (e, employee) => {
    try {
      console.log("[LockerRoomMap] Drag start:", employee);
      setLastAction(`Arrastrando: ${employee.nombre}`);
      e.dataTransfer.setData('employeeId', employee.id);
      e.dataTransfer.setData('employeeName', employee.nombre);
      e.dataTransfer.effectAllowed = 'move';
    } catch (error) {
      console.error("Error drag start:", error);
    }
  };

  const handleDragOver = (e, locker) => {
    if (!locker.ocupada) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = async (e, locker) => {
    try {
      e.preventDefault();
      const employeeId = e.dataTransfer.getData('employeeId');
      const employeeName = e.dataTransfer.getData('employeeName');
      
      console.log("[LockerRoomMap] Drop:", { locker, employeeId, employeeName });
      setLastAction(`Drop: ${employeeName} en taquilla ${locker.numero}`);

      if (!employeeId || locker.ocupada) {
        setLastAction(`Drop ignorado: ${locker.ocupada ? 'Taquilla ocupada' : 'Sin ID empleado'}`);
        return;
      }
      
      // La asignación se manejará a través del dialog que se abrirá
      const selected = { ...locker, draggedEmployeeId: employeeId };
      console.log("[LockerRoomMap] Setting selected locker with dragged employee:", selected);
      setSelectedLocker(selected);
    } catch (error) {
      console.error("Error handling drop:", error);
      setLastAction(`Error en drop: ${error.message}`);
      toast.error(`Error al soltar: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2 flex-1 max-w-md">
          <label className="text-sm font-medium text-slate-700">Seleccionar Vestuario</label>
          <Select value={selectedVestuario} onValueChange={setSelectedVestuario}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Vestuario Femenino Planta Baja">Vestuario Femenino Planta Baja</SelectItem>
              <SelectItem value="Vestuario Femenino Planta Alta">Vestuario Femenino Planta Alta</SelectItem>
              <SelectItem value="Vestuario Masculino Planta Baja">Vestuario Masculino Planta Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={quickEditMode ? "default" : "outline"}
            onClick={() => setQuickEditMode(!quickEditMode)}
            className={quickEditMode ? "bg-blue-600" : ""}
          >
            <Edit3 className="w-4 h-4 mr-2" />
            {quickEditMode ? "Modo Edición Activo" : "Activar Edición Rápida"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Panel lateral con empleados sin taquilla */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 shadow-lg">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-slate-50">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-blue-600" />
                Sin Taquilla ({employeesWithoutLocker.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="mb-3">
                <Input
                  placeholder="Buscar empleado..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm"
                  icon={<Search className="w-4 h-4" />}
                />
              </div>
              
              {employeesWithoutLocker.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-600">Todos asignados</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {employeesWithoutLocker.map((emp) => (
                    <div
                      key={emp.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, emp)}
                      className="p-2 bg-slate-50 border-2 border-slate-200 rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-300 transition-all"
                    >
                      <div className="text-xs font-semibold text-slate-900 line-clamp-2">
                        {emp.nombre}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge className={`text-[10px] px-1 py-0 ${
                          emp.sexo === "Femenino" ? "bg-pink-100 text-pink-700" :
                          emp.sexo === "Masculino" ? "bg-blue-100 text-blue-700" :
                          "bg-purple-100 text-purple-700"
                        }`}>
                          {emp.sexo}
                        </Badge>
                        <span className="text-[10px] text-slate-500">{emp.departamento}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-800">
                <strong>💡 Tip:</strong> Arrastra un empleado a una taquilla libre para asignar
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mapa de taquillas */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Total Taquillas</p>
                    <p className="text-2xl font-bold text-slate-900">{lockerData.length}</p>
                  </div>
                  <Settings className="w-8 h-8 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-700 font-medium">Ocupadas</p>
                    <p className="text-2xl font-bold text-green-900">{stats.ocupadas}</p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-blue-700 font-medium">Disponibles</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.libres}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {selectedVestuario}
                </CardTitle>
                <Badge className="text-base px-4 py-1" variant="outline">
                  Ocupación: {stats.porcentaje}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="w-full bg-slate-200 rounded-full h-3 mb-6">
                <div
                  className={`h-3 rounded-full transition-all ${
                    stats.porcentaje > 90 ? 'bg-red-500' :
                    stats.porcentaje > 75 ? 'bg-amber-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${stats.porcentaje}%` }}
                />
              </div>

              {quickEditMode && (
                <div className="mb-4 p-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>🖱️ Modo Edición Rápida:</strong> Arrastra empleados desde la lista lateral a taquillas libres, o haz clic en una taquilla para asignar/liberar rápidamente
                  </p>
                </div>
              )}

              {!quickEditMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800">
                    💡 Haz clic en una taquilla para ver detalles y gestionar asignaciones. Activa el <strong>Modo Edición Rápida</strong> para arrastrar y soltar.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                {lockerData.map((locker) => (
                  <button
                    key={locker.numero}
                    onClick={() => handleLockerClick(locker)}
                    onDragOver={(e) => handleDragOver(e, locker)}
                    onDrop={(e) => handleDrop(e, locker)}
                    className={`
                      relative rounded-lg border-2 p-2 flex flex-col items-center justify-center
                      min-h-[70px] text-xs font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg
                      ${locker.ocupada 
                        ? 'bg-green-500 border-green-600 text-white hover:bg-green-600' 
                        : quickEditMode 
                          ? 'bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200 hover:border-blue-500'
                          : 'bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-300 hover:border-blue-400 hover:bg-blue-100'
                      }
                    `}
                    title={
                      locker.ocupada 
                        ? `Taquilla ${locker.numero} - ${locker.employee?.nombre}` 
                        : quickEditMode
                          ? `Taquilla ${locker.numero} - Arrastra un empleado aquí`
                          : `Taquilla ${locker.numero} - Disponible (clic para asignar)`
                    }
                  >
                    <div className="text-lg font-bold mb-1">#{locker.numero}</div>
                    {locker.ocupada && locker.employee && (
                      <div className="text-[8px] leading-tight text-center line-clamp-2 font-normal px-1">
                        {locker.employee.nombre.split(' ').slice(0, 2).join(' ')}
                      </div>
                    )}
                    {!locker.ocupada && quickEditMode && (
                      <div className="text-[8px] text-blue-700 font-semibold">
                        Arrastra aquí
                      </div>
                    )}
                    {!locker.ocupada && !quickEditMode && (
                      <div className="text-[8px] text-slate-500">
                        Disponible
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedLocker && (
        <LockerAssignmentDialog
          locker={selectedLocker}
          vestuario={selectedVestuario}
          employees={employees}
          lockerAssignments={lockerAssignments}
          onClose={() => setSelectedLocker(null)}
          saveAssignments={saveAssignments}
        />
      )}
    </div>
  );
}