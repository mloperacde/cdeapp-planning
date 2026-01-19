import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, User, KeyRound, Filter } from "lucide-react";
import LockerAssignmentDialog from "./LockerAssignmentDialog";

export default function LockerListView({ 
  lockerAssignments, 
  employees, 
  lockerRoomConfigs, 
  saveAssignments, 
  isDemoMode 
}) {
  const [selectedVestuario, setSelectedVestuario] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all"); // all, free, occupied
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocker, setSelectedLocker] = useState(null);

  // Generar lista plana de todas las taquillas posibles
  const allLockers = useMemo(() => {
    const lockers = [];
    
    lockerRoomConfigs.forEach(config => {
      const total = config.numero_taquillas_instaladas || 0;
      const ids = config.identificadores_taquillas || [];
      const vestuario = config.vestuario;
      
      const listaIds = ids.length > 0 
        ? ids 
        : Array.from({ length: total }, (_, i) => (i + 1).toString());
        
      listaIds.forEach(id => {
        const cleanId = String(id).replace(/['"''‚„]/g, '').trim();
        
        // Buscar asignación
        const assignment = lockerAssignments.find(la => 
          la.vestuario === vestuario &&
          (la.numero_taquilla_actual || '').replace(/['"''‚„]/g, '').trim() === cleanId &&
          la.requiere_taquilla !== false
        );
        
        const employee = assignment 
          ? employees.find(e => String(e.id) === String(assignment.employee_id))
          : null;
          
        lockers.push({
          id: `${vestuario}-${cleanId}`,
          numero: cleanId,
          vestuario,
          ocupada: !!assignment,
          employee,
          assignment
        });
      });
    });
    
    return lockers;
  }, [lockerRoomConfigs, lockerAssignments, employees]);

  // Filtrar
  const filteredLockers = useMemo(() => {
    return allLockers.filter(locker => {
      // Filtro Vestuario
      if (selectedVestuario !== "all" && locker.vestuario !== selectedVestuario) return false;
      
      // Filtro Estado
      if (filterEstado === "free" && locker.ocupada) return false;
      if (filterEstado === "occupied" && !locker.ocupada) return false;
      
      // Filtro Búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const numMatch = locker.numero.toLowerCase().includes(term);
        const empMatch = locker.employee?.nombre?.toLowerCase().includes(term);
        const codeMatch = locker.employee?.codigo_empleado?.toLowerCase().includes(term);
        
        return numMatch || empMatch || codeMatch;
      }
      
      return true;
    });
  }, [allLockers, selectedVestuario, filterEstado, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="space-y-1 min-w-[200px]">
            <label className="text-xs font-medium text-slate-500">Vestuario</label>
            <Select value={selectedVestuario} onValueChange={setSelectedVestuario}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Todos los vestuarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los vestuarios</SelectItem>
                {lockerRoomConfigs.map(c => (
                  <SelectItem key={c.vestuario} value={c.vestuario}>{c.vestuario}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1 min-w-[150px]">
            <label className="text-xs font-medium text-slate-500">Estado</label>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Libres</SelectItem>
                <SelectItem value="occupied">Ocupadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1 flex-1">
            <label className="text-xs font-medium text-slate-500">Buscar</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por número, empleado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-white"
              />
            </div>
          </div>
        </div>
        
        <div className="text-right min-w-[120px]">
          <span className="text-xs text-slate-500 block">Total mostradas</span>
          <span className="text-xl font-bold text-slate-700">{filteredLockers.length}</span>
        </div>
      </div>

      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Taquilla</TableHead>
              <TableHead>Vestuario</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Ocupante</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLockers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No se encontraron taquillas con los filtros actuales
                </TableCell>
              </TableRow>
            ) : (
              filteredLockers.slice(0, 100).map((locker) => (
                <TableRow key={locker.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-slate-400" />
                      <span className="text-lg">#{locker.numero}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {locker.vestuario}
                  </TableCell>
                  <TableCell>
                    {locker.ocupada ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
                        Ocupada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 border-slate-300">
                        Libre
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {locker.ocupada && locker.employee ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{locker.employee.nombre}</span>
                        <span className="text-xs text-slate-500">{locker.employee.departamento}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => setSelectedLocker(locker)}
                    >
                      {locker.ocupada ? "Gestionar" : "Asignar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
            {filteredLockers.length > 100 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-slate-500 text-xs">
                  Mostrando las primeras 100 taquillas. Refina la búsqueda para ver más.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedLocker && (
        <LockerAssignmentDialog
          locker={selectedLocker}
          vestuario={selectedLocker.vestuario}
          employees={employees}
          // Necesitamos pasar empleados sin taquilla para el select, aunque LockerAssignmentDialog ya lo calcula internamente
          // pero LockerRoomMap lo pasaba como prop. Aquí podemos pasarlo igual.
          // El diálogo usa 'employees' para la lista completa y filtra internamente también.
          lockerAssignments={lockerAssignments}
          onClose={() => setSelectedLocker(null)}
          saveAssignments={saveAssignments}
          isDemoMode={isDemoMode}
        />
      )}
    </div>
  );
}
