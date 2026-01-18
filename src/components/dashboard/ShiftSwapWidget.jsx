import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { RefreshCw, Plus, Calendar, ArrowRightLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function ShiftSwapWidget() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [interestedUser, setInterestedUser] = useState(null);
  const queryClient = useQueryClient();

  const [requestData, setRequestData] = useState({
    employee_id: "",
    equipo: "",
    fecha_cambio: "",
    turno_actual: "Mañana",
    turno_deseado: "Tarde",
    motivo: "",
  });

  // Current User
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list('nombre'),
  });

  const { data: swapRequests = [] } = useQuery({
    queryKey: ['shiftSwapRequests'],
    queryFn: () => base44.entities.ShiftSwapRequest.list('-fecha_solicitud'),
  });

  const currentEmployee = useMemo(() => {
    if (!currentUser || !employees) return null;
    return employees.find(e => e.email === currentUser.email) || null;
  }, [currentUser, employees]);

  const createRequestMutation = useMutation({
    mutationFn: (data) => {
      const employee = employees.find(e => e.id === data.employee_id);
      return base44.entities.ShiftSwapRequest.create({
        solicitante_id: data.employee_id,
        nombre_solicitante: employee?.nombre,
        equipo_solicitante: employee?.equipo,
        fecha_cambio: data.fecha_cambio,
        turno_actual: data.turno_actual,
        turno_deseado: data.turno_deseado,
        motivo: data.motivo,
        estado: "Publicado",
        fecha_solicitud: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftSwapRequests'] });
      setShowRequestForm(false);
      setRequestData({
        employee_id: "",
        equipo: "",
        fecha_cambio: "",
        turno_actual: "Mañana",
        turno_deseado: "Tarde",
        motivo: "",
      });
      toast.success("Solicitud publicada correctamente");
    },
  });

  const expressInterestMutation = useMutation({
    mutationFn: ({ requestId, receptorId, receptorName }) => {
      return base44.entities.ShiftSwapRequest.update(requestId, {
        receptor_id: receptorId,
        nombre_receptor: receptorName,
        estado: "Pendiente Aprobación",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shiftSwapRequests'] });
      setInterestedUser(null);
      toast.success("Has expresado interés en el cambio");
    },
  });

  const handleCreateRequest = (e) => {
    e.preventDefault();
    createRequestMutation.mutate(requestData);
  };

  const handleInterest = (request) => {
    if (currentEmployee) {
      if (currentEmployee.equipo === request.equipo_solicitante) {
        toast.error("No puedes intercambiar turno con alguien de tu mismo equipo.");
        return;
      }
      if (window.confirm(`¿Confirmar interés en el cambio de turno para el ${request.fecha_cambio}?`)) {
        expressInterestMutation.mutate({
          requestId: request.id,
          receptorId: currentEmployee.id,
          receptorName: currentEmployee.nombre
        });
      }
    } else {
        // Fallback for demo/admin: Select who is interested
        setInterestedUser(request);
    }
  };

  const submitInterest = (employeeId) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    
    if (employee.equipo === interestedUser.equipo_solicitante) {
        toast.error("No puedes intercambiar turno con alguien de tu mismo equipo.");
        return;
    }

    expressInterestMutation.mutate({
        requestId: interestedUser.id,
        receptorId: employee.id,
        receptorName: employee.nombre
    });
  };

  const openRequests = swapRequests.filter(req => req.estado === "Publicado");
  const myRequests = currentEmployee 
    ? swapRequests.filter(req => req.solicitante_id === currentEmployee.id || req.receptor_id === currentEmployee.id)
    : [];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-blue-600" />
          Tablón de Cambios
        </CardTitle>
        <Button
            size="sm"
            onClick={() => {
                if (currentEmployee) {
                    setRequestData(prev => ({...prev, employee_id: currentEmployee.id, equipo: currentEmployee.equipo}));
                }
                setShowRequestForm(true);
            }}
            className="h-8 bg-blue-600 hover:bg-blue-700"
        >
            <Plus className="w-4 h-4 mr-2" />
            Publicar
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <Tabs defaultValue="board" className="h-full flex flex-col">
            <TabsList className="w-full justify-start mb-2">
                <TabsTrigger value="board" className="flex-1">Tablón ({openRequests.length})</TabsTrigger>
                <TabsTrigger value="my-requests" className="flex-1">Mis Solicitudes ({myRequests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="board" className="flex-1 overflow-y-auto pr-1 -mr-1">
                <div className="space-y-3">
                    {openRequests.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">No hay solicitudes activas.</p>
                        </div>
                    ) : (
                        openRequests.map(req => (
                            <div key={req.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-sm">{req.nombre_solicitante}</span>
                                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                        {req.equipo_solicitante}
                                    </Badge>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                    <Calendar className="w-3 h-3" />
                                    <span>
                                        {req.fecha_cambio ? format(new Date(req.fecha_cambio), "d MMM", { locale: es }) : "S/F"}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs mb-3">
                                    <span className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-medium w-16 text-center">{req.turno_actual}</span>
                                    <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                                    <span className="px-2 py-1 bg-blue-50 rounded text-blue-700 font-medium w-16 text-center">{req.turno_deseado}</span>
                                </div>

                                {req.motivo && (
                                    <p className="text-xs text-slate-600 italic mb-2 line-clamp-1">"{req.motivo}"</p>
                                )}

                                <Button 
                                    size="sm"
                                    variant="outline"
                                    className="w-full h-7 text-xs" 
                                    onClick={() => handleInterest(req)}
                                    disabled={currentEmployee?.id === req.solicitante_id}
                                >
                                    {currentEmployee?.id === req.solicitante_id ? "Es tu solicitud" : "Me interesa"}
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </TabsContent>

            <TabsContent value="my-requests" className="flex-1 overflow-y-auto pr-1 -mr-1">
                <div className="space-y-2">
                    {myRequests.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            No tienes solicitudes.
                        </div>
                    ) : (
                        myRequests.map(req => {
                            const isSolicitante = req.solicitante_id === currentEmployee?.id;
                            return (
                                <div key={req.id} className="p-3 border rounded-lg bg-slate-50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-medium text-slate-500">
                                            {format(new Date(req.fecha_solicitud), "dd/MM")}
                                        </span>
                                        <Badge className={
                                            req.estado === "Publicado" ? "bg-blue-100 text-blue-800 scale-90" :
                                            req.estado === "Pendiente Aprobación" ? "bg-yellow-100 text-yellow-800 scale-90" :
                                            req.estado === "Aprobada" ? "bg-green-100 text-green-800 scale-90" :
                                            "bg-slate-100 text-slate-800 scale-90"
                                        }>
                                            {req.estado}
                                        </Badge>
                                    </div>
                                    <div className="text-sm font-medium mb-1">
                                        {req.fecha_cambio ? format(new Date(req.fecha_cambio), "d MMM yyyy") : "-"}
                                    </div>
                                    <div className="text-xs text-slate-600">
                                        {isSolicitante 
                                            ? `Esperando: ${req.nombre_receptor || "Nadie aún"}`
                                            : `Solicitante: ${req.nombre_solicitante}`
                                        }
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </TabsContent>
        </Tabs>
      </CardContent>

      {/* Modal Nueva Solicitud */}
      <Dialog open={showRequestForm} onOpenChange={setShowRequestForm}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Publicar Solicitud de Cambio</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRequest} className="space-y-4">
                {!currentEmployee && (
                    <div className="space-y-2">
                        <Label>Empleado (Admin mode)</Label>
                        <Select 
                            value={requestData.employee_id} 
                            onValueChange={(val) => {
                                const emp = employees.find(e => e.id === val);
                                setRequestData({...requestData, employee_id: val, equipo: emp?.equipo || ""});
                            }}
                        >
                            <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                            <SelectContent>
                                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                
                <div className="space-y-2">
                    <Label>Fecha del Cambio</Label>
                    <Input 
                        type="date" 
                        required 
                        value={requestData.fecha_cambio}
                        onChange={e => setRequestData({...requestData, fecha_cambio: e.target.value})}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Tengo Turno</Label>
                        <Select 
                            value={requestData.turno_actual} 
                            onValueChange={v => setRequestData({...requestData, turno_actual: v})}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Mañana">Mañana</SelectItem>
                                <SelectItem value="Tarde">Tarde</SelectItem>
                                <SelectItem value="Noche">Noche</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Quiero Turno</Label>
                        <Select 
                            value={requestData.turno_deseado} 
                            onValueChange={v => setRequestData({...requestData, turno_deseado: v})}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Mañana">Mañana</SelectItem>
                                <SelectItem value="Tarde">Tarde</SelectItem>
                                <SelectItem value="Noche">Noche</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Motivo (Opcional)</Label>
                    <Textarea 
                        value={requestData.motivo}
                        onChange={e => setRequestData({...requestData, motivo: e.target.value})}
                        placeholder="Ej: Cita médica, asunto personal..."
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => setShowRequestForm(false)}>Cancelar</Button>
                    <Button type="submit" disabled={!requestData.fecha_cambio || !requestData.employee_id}>Publicar</Button>
                </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Modal Selección Interesado */}
      <Dialog open={!!interestedUser} onOpenChange={() => setInterestedUser(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Confirmar Interés</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    Selecciona el empleado que está interesado en este cambio (Simulación de usuario logueado):
                </p>
                <Select onValueChange={submitInterest}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar empleado..." /></SelectTrigger>
                    <SelectContent>
                        {employees
                            .filter(e => e.id !== interestedUser?.solicitante_id)
                            .map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)
                        }
                    </SelectContent>
                </Select>
            </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
