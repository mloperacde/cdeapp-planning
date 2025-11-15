import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, XCircle, Settings } from "lucide-react";
import LockerAssignmentDialog from "./LockerAssignmentDialog";

export default function LockerRoomMap({ lockerAssignments, employees, lockerRoomConfigs }) {
  const [selectedVestuario, setSelectedVestuario] = useState("Vestuario Femenino Planta Alta");
  const [selectedLocker, setSelectedLocker] = useState(null);

  const vestuarioConfig = useMemo(() => {
    const config = lockerRoomConfigs.find(c => c.vestuario === selectedVestuario);
    return {
      total: config?.numero_taquillas_instaladas || 163,
      identificadores: config?.identificadores_taquillas || []
    };
  }, [selectedVestuario, lockerRoomConfigs]);

  const lockerData = useMemo(() => {
    const data = [];
    
    // Si hay identificadores específicos, usarlos; si no, usar números secuenciales
    const identificadores = vestuarioConfig.identificadores.length > 0
      ? vestuarioConfig.identificadores
      : Array.from({ length: vestuarioConfig.total }, (_, i) => (i + 1).toString());
    
    identificadores.forEach((identificador) => {
      const assignment = lockerAssignments.find(la => {
        const esEsteVestuario = la.vestuario === selectedVestuario;
        const esEstaIdentificacion = la.numero_taquilla_actual === identificador;
        const requiere = la.requiere_taquilla !== false;
        
        return esEsteVestuario && esEstaIdentificacion && requiere;
      });
      
      const employee = assignment ? employees.find(e => e.id === assignment.employee_id) : null;
      
      data.push({
        numero: identificador,
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-800">
              💡 Haz clic en una taquilla <strong>libre</strong> para asignarla a un empleado, o en una <strong>ocupada</strong> para ver detalles o liberarla.
            </p>
          </div>

          <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
            {lockerData.map((locker) => (
              <button
                key={locker.numero}
                onClick={() => handleLockerClick(locker)}
                className={`
                  relative rounded-lg border-2 p-2 flex flex-col items-center justify-center
                  min-h-[70px] text-xs font-bold transition-all duration-200 hover:scale-105 hover:shadow-lg
                  ${locker.ocupada 
                    ? 'bg-green-500 border-green-600 text-white hover:bg-green-600' 
                    : 'bg-slate-200 border-slate-300 text-slate-600 hover:bg-slate-300 hover:border-blue-400 hover:bg-blue-100'
                  }
                `}
                title={locker.ocupada ? `Taquilla ${locker.numero} - ${locker.employee?.nombre}` : `Taquilla ${locker.numero} - Disponible (clic para asignar)`}
              >
                <div className="text-lg font-bold mb-1">#{locker.numero}</div>
                {locker.ocupada && locker.employee && (
                  <div className="text-[8px] leading-tight text-center line-clamp-2 font-normal px-1">
                    {locker.employee.nombre.split(' ').slice(0, 2).join(' ')}
                  </div>
                )}
                {!locker.ocupada && (
                  <div className="text-[8px] text-slate-500">
                    Disponible
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedLocker && (
        <LockerAssignmentDialog
          locker={selectedLocker}
          vestuario={selectedVestuario}
          employees={employees}
          lockerAssignments={lockerAssignments}
          onClose={() => setSelectedLocker(null)}
        />
      )}
    </div>
  );
}