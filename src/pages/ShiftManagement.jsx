import { useState, useMemo } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ShiftManagementPage() {
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
    },
  });

  const handleCreateRequest = (e) => {
    e.preventDefault();
    createRequestMutation.mutate(requestData);
  };

  const handleInterest = (request) => {
    // Determine the user who is interested. 
    // Ideally this is the logged in user (currentEmployee).
    // If testing without login, we might need a selector, but assuming logged in context or using a selector if user is admin.
    // For now, let's use a dialog to select the employee if currentEmployee is not found (admin mode) or just confirm if found.
    
    if (currentEmployee) {
      if (currentEmployee.equipo === request.equipo_solicitante) {
        alert("No puedes intercambiar turno con alguien de tu mismo equipo (mismo turno).");
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
        alert("No puedes intercambiar turno con alguien de tu mismo equipo.");
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
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Breadcrumbs />
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600" />
              Tablón de Cambios de Turno
            </h1>
            <p className="text-slate-600 mt-1">
              Publica y encuentra oportunidades de intercambio de turnos
            </p>
          </div>
          <Button
            onClick={() => {
                if (currentEmployee) {
                    setRequestData(prev => ({...prev, employee_id: currentEmployee.id, equipo: currentEmployee.equipo}));
                }
                setShowRequestForm(true);
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Publicar Solicitud
          </Button>
        </div>

        <div className="grid gap-6">
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4 flex items-start gap-3">
                    <Users className="w-5 h-5 text-blue-600 mt-1" />
                    <div>
                        <h3 className="font-semibold text-blue-900">¿Cómo funciona?</h3>
                        <p className="text-sm text-blue-800 mt-1">
                            1. Publica tu solicitud indicando el turno que tienes y el que quieres.<br/>
                            2. Espera a que un compañero de otro equipo se interese.<br/>
                            3. Cuando haya coincidencia, la solicitud se enviará a los jefes de turno para aprobación.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="board">
                <TabsList>
                    <TabsTrigger value="board">Tablón de Anuncios ({openRequests.length})</TabsTrigger>
                    <TabsTrigger value="my-requests">Mis Solicitudes ({myRequests.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="board">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {openRequests.length === 0 ? (
                            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-lg border border-dashed">
                                No hay solicitudes de cambio publicadas actualmente.
                            </div>
                        ) : (
                            openRequests.map(req => (
                                <Card key={req.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                {req.equipo_solicitante}
                                            </Badge>
                                            <span className="text-xs text-slate-500">
                                                {format(new Date(req.fecha_solicitud), "d MMM")}
                                            </span>
                                        </div>
                                        <CardTitle className="text-lg mt-2">{req.nombre_solicitante}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium">
                                                    {req.fecha_cambio ? format(new Date(req.fecha_cambio), "EEEE d MMMM", { locale: es }) : "Fecha no especificada"}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex-1 p-2 bg-slate-50 rounded border text-center">
                                                    <div className="text-xs text-slate-500 uppercase">Tiene</div>
                                                    <div className="font-semibold text-slate-700">{req.turno_actual}</div>
                                                </div>
                                                <RefreshCw className="w-4 h-4 text-slate-400" />
                                                <div className="flex-1 p-2 bg-blue-50 rounded border border-blue-100 text-center">
                                                    <div className="text-xs text-blue-500 uppercase">Busca</div>
                                                    <div className="font-semibold text-blue-700">{req.turno_deseado}</div>
                                                </div>
                                            </div>

                                            {req.motivo && (
                                                <p className="text-sm text-slate-600 italic">"{req.motivo}"</p>
                                            )}

                                            <Button 
                                                className="w-full mt-2" 
                                                onClick={() => handleInterest(req)}
                                                disabled={currentEmployee?.id === req.solicitante_id}
                                            >
                                                {currentEmployee?.id === req.solicitante_id ? "Es tu solicitud" : "Me interesa"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="my-requests">
                    <Card>
                        <CardHeader>
                            <CardTitle>Historial de Mis Solicitudes</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Fecha Cambio</TableHead>
                                            <TableHead>Tipo</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Intercambio con</TableHead>
                                            <TableHead>Turnos</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {myRequests.map(req => {
                                            const isSolicitante = req.solicitante_id === currentEmployee?.id;
                                            return (
                                                <TableRow key={req.id}>
                                                    <TableCell>
                                                        {req.fecha_cambio ? format(new Date(req.fecha_cambio), "dd/MM/yyyy") : "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {isSolicitante ? "Publicada por mí" : "Aceptada por mí"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={
                                                            req.estado === "Publicado" ? "bg-blue-100 text-blue-800" :
                                                            req.estado === "Pendiente Aprobación" ? "bg-yellow-100 text-yellow-800" :
                                                            req.estado === "Aprobada" ? "bg-green-100 text-green-800" :
                                                            "bg-slate-100 text-slate-800"
                                                        }>
                                                            {req.estado}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isSolicitante ? (req.nombre_receptor || "Esperando compañero...") : req.nombre_solicitante}
                                                    </TableCell>
                                                    <TableCell>
                                                        {req.turno_actual} ➔ {req.turno_deseado}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </div>

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

      {/* Modal Selección Interesado (Solo para modo sin usuario logueado/admin) */}
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
                            .map(e => (
                                <SelectItem key={e.id} value={e.id}>
                                    {e.nombre} ({e.equipo})
                                </SelectItem>
                            ))
                        }
                    </SelectContent>
                </Select>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
