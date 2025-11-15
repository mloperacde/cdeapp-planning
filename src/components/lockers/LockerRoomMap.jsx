import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, User, Settings, Mail } from "lucide-react";

export default function LockerRoomMap({ lockerAssignments, employees, lockerRoomConfigs }) {
  const [selectedVestuario, setSelectedVestuario] = useState("Vestuario Femenino Planta Alta");
  const [selectedLocker, setSelectedLocker] = useState(null);

  const vestuarioConfig = useMemo(() => {
    const config = lockerRoomConfigs.find(c => c.vestuario === selectedVestuario);
    return config?.numero_taquillas_instaladas || 163;
  }, [selectedVestuario, lockerRoomConfigs]);

  const lockerData = useMemo(() => {
    const data = [];
    
    for (let i = 1; i <= vestuarioConfig; i++) {
      // Buscar asignación para esta taquilla específica
      const assignment = lockerAssignments.find(la => {
        const esEsteVestuario = la.vestuario === selectedVestuario;
        const esEstaTaquilla = la.numero_taquilla_actual && 
                              la.numero_taquilla_actual.toString() === i.toString();
        const requiere = la.requiere_taquilla !== false;
        
        return esEsteVestuario && esEstaTaquilla && requiere;
      });
      
      const employee = assignment ? employees.find(e => e.id === assignment.employee_id) : null;
      
      data.push({
        numero: i,
        ocupada: !!assignment,
        employee,
        assignment
      });
    }
    
    return data;
  }, [vestuarioConfig, lockerAssignments, selectedVestuario, employees]);

  const stats = useMemo(() => {
    const ocupadas = lockerData.filter(l => l.ocupada).length;
    const libres = lockerData.filter(l => !l.ocupada).length;
    const porcentaje = vestuarioConfig > 0 ? Math.round((ocupadas / vestuarioConfig) * 100) : 0;
    
    return { ocupadas, libres, porcentaje };
  }, [lockerData, vestuarioConfig]);

  const handleLockerClick = (locker) => {
    setSelectedLocker(locker);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm text-slate-600">Ocupada</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-slate-200 rounded"></div>
            <span className="text-sm text-slate-600">Libre</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 font-medium">Total Instaladas</p>
                <p className="text-2xl font-bold text-slate-900">{vestuarioConfig}</p>
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
                <p className="text-xs text-blue-700 font-medium">Libres</p>
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

          <div className="grid grid-cols-6 md:grid-cols-10 lg:grid-cols-12 xl:grid-cols-15 gap-3">
            {lockerData.map((locker) => (
              <button
                key={locker.numero}
                onClick={() => handleLockerClick(locker)}
                className={`
                  relative rounded-lg border-2 p-3 flex flex-col items-center justify-center
                  text-xs font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg
                  ${locker.ocupada 
                    ? 'bg-green-500 border-green-600 text-white hover:bg-green-600' 
                    : 'bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-300'
                  }
                `}
                title={locker.ocupada ? `${locker.employee?.nombre}` : `Taquilla ${locker.numero} - Libre`}
              >
                <div className="text-base font-bold mb-1">{locker.numero}</div>
                {locker.ocupada && locker.employee && (
                  <div className="text-[9px] leading-tight text-center line-clamp-2 font-normal">
                    {locker.employee.nombre.split(' ').slice(0, 2).join(' ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedLocker && (
        <Dialog open={true} onOpenChange={() => setSelectedLocker(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                Taquilla #{selectedLocker.numero} - {selectedVestuario}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="text-center p-8">
                {selectedLocker.ocupada ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <User className="w-8 h-8 text-green-600" />
                    </div>
                    <Badge className="bg-green-600 text-white mb-4">Ocupada</Badge>
                    <div className="space-y-2">
                      <p className="font-bold text-lg text-slate-900">
                        {selectedLocker.employee?.nombre}
                      </p>
                      {selectedLocker.employee?.departamento && (
                        <p className="text-sm text-slate-600">
                          {selectedLocker.employee.departamento}
                        </p>
                      )}
                      {selectedLocker.employee?.puesto && (
                        <p className="text-sm text-slate-600">
                          {selectedLocker.employee.puesto}
                        </p>
                      )}
                      {selectedLocker.employee?.codigo_empleado && (
                        <p className="text-xs text-slate-500 font-mono mt-2">
                          Código: {selectedLocker.employee.codigo_empleado}
                        </p>
                      )}
                      {selectedLocker.employee?.email && (
                        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-2">
                          <Mail className="w-3 h-3" />
                          {selectedLocker.employee.email}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <XCircle className="w-8 h-8 text-slate-400" />
                    </div>
                    <Badge variant="outline" className="mb-4">Disponible</Badge>
                    <p className="text-slate-600">
                      Esta taquilla está disponible para asignación
                    </p>
                  </>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setSelectedLocker(null)} variant="outline">
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}