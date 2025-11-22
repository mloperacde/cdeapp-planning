import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, CheckCircle2, XCircle, Wrench, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function EnhancedLockerRoomMap({ 
  lockerAssignments, 
  employees, 
  lockerRoomConfigs,
  onLockerClick 
}) {
  const [selectedVestuario, setSelectedVestuario] = useState("Vestuario Femenino Planta Baja");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocker, setSelectedLocker] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const vestuarioConfig = useMemo(() => {
    return lockerRoomConfigs.find(c => c.vestuario === selectedVestuario);
  }, [lockerRoomConfigs, selectedVestuario]);

  const lockersData = useMemo(() => {
    const config = vestuarioConfig;
    if (!config) return [];

    const totalLockers = config.numero_taquillas_instaladas || 0;
    const validIds = config.identificadores_taquillas || [];
    
    const lockers = [];
    
    // Si hay IDs específicos, usar esos
    if (validIds.length > 0) {
      validIds.forEach(lockerId => {
        const assignment = lockerAssignments.find(la => 
          la.vestuario === selectedVestuario && 
          la.numero_taquilla_actual?.replace(/['"]/g, '').trim() === lockerId &&
          la.requiere_taquilla !== false
        );
        
        const employee = assignment ? employees.find(e => e.id === assignment.employee_id) : null;
        
        lockers.push({
          id: lockerId,
          status: employee ? 'ocupada' : 'libre',
          employee: employee,
          assignment: assignment
        });
      });
    } else {
      // Generar IDs numéricos del 1 al total
      for (let i = 1; i <= totalLockers; i++) {
        const lockerId = i.toString();
        const assignment = lockerAssignments.find(la => 
          la.vestuario === selectedVestuario && 
          la.numero_taquilla_actual?.replace(/['"]/g, '').trim() === lockerId &&
          la.requiere_taquilla !== false
        );
        
        const employee = assignment ? employees.find(e => e.id === assignment.employee_id) : null;
        
        lockers.push({
          id: lockerId,
          status: employee ? 'ocupada' : 'libre',
          employee: employee,
          assignment: assignment
        });
      }
    }

    return lockers;
  }, [vestuarioConfig, lockerAssignments, employees, selectedVestuario]);

  const filteredLockers = useMemo(() => {
    return lockersData.filter(locker => {
      const matchesSearch = 
        locker.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        locker.employee?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === "all" ||
        locker.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [lockersData, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const total = lockersData.length;
    const ocupadas = lockersData.filter(l => l.status === 'ocupada').length;
    const libres = total - ocupadas;
    return { total, ocupadas, libres };
  }, [lockersData]);

  const handleLockerClick = (locker) => {
    setSelectedLocker(locker);
  };

  const getLockerColor = (status) => {
    if (status === 'ocupada') return 'bg-red-500 hover:bg-red-600';
    if (status === 'mantenimiento') return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  const getStatusIcon = (status) => {
    if (status === 'ocupada') return <XCircle className="w-4 h-4" />;
    if (status === 'mantenimiento') return <Wrench className="w-4 h-4" />;
    return <CheckCircle2 className="w-4 h-4" />;
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="border-b border-slate-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Mapa Visual de Taquillas
          </CardTitle>
          <div className="flex gap-2">
            <Badge className="bg-green-600">{stats.libres} Libres</Badge>
            <Badge className="bg-red-600">{stats.ocupadas} Ocupadas</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Controles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Vestuario</label>
            <Select value={selectedVestuario} onValueChange={setSelectedVestuario}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Vestuario Femenino Planta Baja">Femenino P. Baja</SelectItem>
                <SelectItem value="Vestuario Femenino Planta Alta">Femenino P. Alta</SelectItem>
                <SelectItem value="Vestuario Masculino Planta Baja">Masculino P. Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Número o empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="libre">Libres</SelectItem>
                <SelectItem value="ocupada">Ocupadas</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mapa de taquillas */}
        <div className="bg-slate-50 rounded-lg p-6 border-2 border-slate-200">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
            {filteredLockers.map((locker) => (
              <button
                key={locker.id}
                onClick={() => handleLockerClick(locker)}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center
                  text-white font-bold transition-all transform hover:scale-105
                  ${getLockerColor(locker.status)}
                  ${searchTerm && (
                    locker.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    locker.employee?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
                  ) ? 'ring-4 ring-blue-500 scale-110' : ''}
                `}
                title={locker.employee ? locker.employee.nombre : 'Libre'}
              >
                <span className="text-xs">{locker.id}</span>
                {getStatusIcon(locker.status)}
              </button>
            ))}
          </div>

          {filteredLockers.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              No se encontraron taquillas con los filtros aplicados
            </div>
          )}
        </div>

        {/* Leyenda */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-500 rounded"></div>
            <span className="text-sm text-slate-700">Libre</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-500 rounded"></div>
            <span className="text-sm text-slate-700">Ocupada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-500 rounded"></div>
            <span className="text-sm text-slate-700">Mantenimiento</span>
          </div>
        </div>
      </CardContent>

      {/* Dialog de detalles */}
      {selectedLocker && (
        <Dialog open={!!selectedLocker} onOpenChange={() => setSelectedLocker(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Taquilla {selectedLocker.id} - {selectedVestuario}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <span className="font-semibold">Estado:</span>
                <Badge className={
                  selectedLocker.status === 'ocupada' ? 'bg-red-600' :
                  selectedLocker.status === 'mantenimiento' ? 'bg-yellow-600' :
                  'bg-green-600'
                }>
                  {selectedLocker.status === 'ocupada' ? 'Ocupada' :
                   selectedLocker.status === 'mantenimiento' ? 'Mantenimiento' :
                   'Libre'}
                </Badge>
              </div>

              {selectedLocker.employee && (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-900">Empleado Asignado</span>
                    </div>
                    <p className="text-sm text-slate-700">
                      <strong>Nombre:</strong> {selectedLocker.employee.nombre}
                    </p>
                    {selectedLocker.employee.departamento && (
                      <p className="text-sm text-slate-700">
                        <strong>Departamento:</strong> {selectedLocker.employee.departamento}
                      </p>
                    )}
                    {selectedLocker.employee.codigo_empleado && (
                      <p className="text-sm text-slate-700">
                        <strong>Código:</strong> {selectedLocker.employee.codigo_empleado}
                      </p>
                    )}
                  </div>

                  {selectedLocker.assignment?.fecha_asignacion && (
                    <div className="text-xs text-slate-500">
                      Asignada: {new Date(selectedLocker.assignment.fecha_asignacion).toLocaleDateString('es-ES')}
                    </div>
                  )}
                </>
              )}

              {!selectedLocker.employee && (
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-green-900 font-semibold">
                    Taquilla disponible para asignación
                  </p>
                </div>
              )}

              {onLockerClick && (
                <Button 
                  onClick={() => {
                    onLockerClick(selectedLocker);
                    setSelectedLocker(null);
                  }}
                  className="w-full"
                >
                  {selectedLocker.employee ? 'Reasignar Taquilla' : 'Asignar a Empleado'}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}