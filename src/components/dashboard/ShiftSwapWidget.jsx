import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Plus, Calendar, ArrowRightLeft, Users, Bell, Filter, X, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_STYLES = {
  "Publicado": "bg-blue-100 text-blue-800",
  "Pendiente Aprobación": "bg-yellow-100 text-yellow-800",
  "Aprobada": "bg-green-100 text-green-800",
  "Rechazada": "bg-red-100 text-red-800",
  "Cancelada": "bg-slate-100 text-slate-600",
};

export default function ShiftSwapWidget() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showInteresadosFor, setShowInteresadosFor] = useState(null); // request to show interested
  const [filterTurno, setFilterTurno] = useState("Todos");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  const [requestData, setRequestData] = useState({
    employee_id: "",
    fecha_cambio: "",
    turno_actual: "Mañana",
    turno_deseado: "Tarde",
    motivo: "",
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.EmployeeMasterDatabase.list("nombre"),
  });

  const { data: validTeams = [] } = useQuery({
    queryKey: ["teamConfigs"],
    queryFn: () => base44.entities.TeamConfig.list(),
  });

  const { data: swapRequests = [], isLoading } = useQuery({
    queryKey: ["shiftSwapRequests"],
    queryFn: () => base44.entities.ShiftSwapRequest.list("-fecha_solicitud"),
  });

  const currentEmployee = useMemo(() => {
    if (!currentUser || !employees.length) return null;
    return employees.find(e => e.email === currentUser.email) || null;
  }, [currentUser, employees]);

  const validTeamNames = useMemo(() => {
    if (!validTeams.length) return null;
    return new Set(validTeams.map(t => t.team_name));
  }, [validTeams]);

  // Filtered open requests
  const openRequests = useMemo(() => {
    return swapRequests.filter(req => {
      if (req.estado !== "Publicado") return false;
      if (validTeamNames && !validTeamNames.has(req.equipo_solicitante)) return false;
      if (filterTurno !== "Todos" && req.turno_actual !== filterTurno) return false;
      if (filterDateFrom && req.fecha_cambio < filterDateFrom) return false;
      return true;
    });
  }, [swapRequests, validTeamNames, filterTurno, filterDateFrom]);

  const myRequests = useMemo(() => {
    if (!currentEmployee) return [];
    return swapRequests.filter(req =>
      req.solicitante_id === currentEmployee.id || req.receptor_id === currentEmployee.id
    );
  }, [swapRequests, currentEmployee]);

  // Count unseen interests on my requests (requests I made that have new interesados)
  const myRequestsWithInterest = useMemo(() => {
    if (!currentEmployee) return 0;
    return swapRequests.filter(req =>
      req.solicitante_id === currentEmployee.id &&
      req.estado === "Publicado" &&
      req.interesados?.length > 0
    ).length;
  }, [swapRequests, currentEmployee]);

  const sendNotification = async (toEmail, subject, body) => {
    try {
      await base44.integrations.Core.SendEmail({ to: toEmail, subject, body });
    } catch (_) {
      // Notifications are best-effort
    }
  };

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
        interesados: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shiftSwapRequests"] });
      setShowRequestForm(false);
      setRequestData({ employee_id: "", fecha_cambio: "", turno_actual: "Mañana", turno_deseado: "Tarde", motivo: "" });
      toast.success("Solicitud publicada correctamente");
    },
  });

  const expressInterestMutation = useMutation({
    mutationFn: async ({ request }) => {
      const already = (request.interesados || []).find(i => i.employee_id === currentEmployee?.id);
      if (already) throw new Error("Ya has mostrado interés en este cambio.");

      const newInteresado = {
        employee_id: currentEmployee.id,
        nombre: currentEmployee.nombre,
        equipo: currentEmployee.equipo || "",
        fecha_interes: new Date().toISOString(),
      };
      const updated = [...(request.interesados || []), newInteresado];
      return base44.entities.ShiftSwapRequest.update(request.id, { interesados: updated });
    },
    onSuccess: async (_, { request }) => {
      queryClient.invalidateQueries({ queryKey: ["shiftSwapRequests"] });
      toast.success("Has registrado tu interés en el cambio.");

      // Notify requester
      const solicitante = employees.find(e => e.id === request.solicitante_id);
      if (solicitante?.email) {
        await sendNotification(
          solicitante.email,
          "Nuevo interesado en tu cambio de turno",
          `Hola ${solicitante.nombre},\n\n${currentEmployee.nombre} ha mostrado interés en tu solicitud de cambio de turno del ${request.fecha_cambio} (${request.turno_actual} → ${request.turno_deseado}).\n\nAccede al tablón para aceptar o rechazar.`
        );
      }
    },
    onError: (e) => toast.error(e.message || "Error al registrar interés"),
  });

  const acceptInterestMutation = useMutation({
    mutationFn: async ({ request, interesado }) => {
      return base44.entities.ShiftSwapRequest.update(request.id, {
        receptor_id: interesado.employee_id,
        nombre_receptor: interesado.nombre,
        estado: "Pendiente Aprobación",
      });
    },
    onSuccess: async (_, { request, interesado }) => {
      queryClient.invalidateQueries({ queryKey: ["shiftSwapRequests"] });
      setShowInteresadosFor(null);
      toast.success(`Aceptada la candidatura de ${interesado.nombre}`);

      // Notify accepted employee
      const emp = employees.find(e => e.id === interesado.employee_id);
      if (emp?.email) {
        await sendNotification(
          emp.email,
          "Tu interés en un cambio de turno ha sido aceptado",
          `Hola ${interesado.nombre},\n\n${request.nombre_solicitante} ha aceptado tu interés para el cambio de turno del ${request.fecha_cambio}. La solicitud queda pendiente de aprobación del supervisor.`
        );
      }
    },
  });

  const handleCreateRequest = (e) => {
    e.preventDefault();
    createRequestMutation.mutate(requestData);
  };

  const handleInterest = (request) => {
    if (!currentEmployee) {
      toast.error("No se ha podido identificar tu perfil de empleado.");
      return;
    }
    if (currentEmployee.id === request.solicitante_id) return;

    const sameTeam = currentEmployee.equipo && request.equipo_solicitante && currentEmployee.equipo === request.equipo_solicitante;
    if (sameTeam) {
      toast.error("No puedes intercambiar turno con alguien de tu mismo equipo.");
      return;
    }
    const already = (request.interesados || []).find(i => i.employee_id === currentEmployee.id);
    if (already) {
      toast.info("Ya has mostrado interés en este cambio.");
      return;
    }
    expressInterestMutation.mutate({ request });
  };

  const isMine = (req) => currentEmployee?.id === req.solicitante_id;
  const hasInterest = (req) => (req.interesados || []).some(i => i.employee_id === currentEmployee?.id);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-600" />
          Tablón de Cambios de Turno
          {myRequestsWithInterest > 0 && (
            <Badge className="bg-orange-100 text-orange-700 text-xs flex items-center gap-1">
              <Bell className="w-3 h-3" />{myRequestsWithInterest}
            </Badge>
          )}
        </CardTitle>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-8 px-2" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (currentEmployee) setRequestData(prev => ({ ...prev, employee_id: currentEmployee.id }));
              setShowRequestForm(true);
            }}
            className="h-8 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Publicar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-2 pt-0">
        {/* Filters */}
        {showFilters && (
          <div className="flex gap-2 flex-wrap p-2 bg-slate-50 rounded-lg border text-xs">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Turno:</span>
              <select
                className="border rounded px-1 py-0.5 text-xs"
                value={filterTurno}
                onChange={e => setFilterTurno(e.target.value)}
              >
                {["Todos", "Mañana", "Tarde", "Noche"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Desde:</span>
              <input
                type="date"
                className="border rounded px-1 py-0.5 text-xs"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
              />
            </div>
            {(filterTurno !== "Todos" || filterDateFrom) && (
              <button
                className="text-red-500 hover:text-red-700 flex items-center gap-0.5"
                onClick={() => { setFilterTurno("Todos"); setFilterDateFrom(""); }}
              >
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>
        )}

        <Tabs defaultValue="board" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start shrink-0">
            <TabsTrigger value="board" className="flex-1 text-xs">Tablón ({openRequests.length})</TabsTrigger>
            <TabsTrigger value="my-requests" className="flex-1 text-xs">
              Mis Solicitudes ({myRequests.length})
              {myRequestsWithInterest > 0 && <span className="ml-1 w-2 h-2 bg-orange-400 rounded-full inline-block" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="flex-1 overflow-y-auto pr-1 -mr-1 mt-2">
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-6 text-slate-400 text-sm">Cargando...</div>
              ) : openRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed">
                  <RefreshCw className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">No hay solicitudes activas.</p>
                </div>
              ) : (
                openRequests.map(req => {
                  const mine = isMine(req);
                  const interested = hasInterest(req);
                  const numInterested = (req.interesados || []).length;
                  return (
                    <div key={req.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-medium text-sm">{req.nombre_solicitante}</span>
                        <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                          {req.equipo_solicitante}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{req.fecha_cambio ? format(new Date(req.fecha_cambio), "d MMM yyyy", { locale: es }) : "S/F"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs mb-2">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">{req.turno_actual}</span>
                        <ArrowRightLeft className="w-3 h-3 text-slate-400" />
                        <span className="px-2 py-0.5 bg-blue-50 rounded text-blue-700 font-medium">{req.turno_deseado}</span>
                        {numInterested > 0 && (
                          <span className="ml-auto flex items-center gap-1 text-orange-600 font-medium">
                            <Users className="w-3 h-3" />{numInterested} interesado{numInterested > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {req.motivo && (
                        <p className="text-[11px] text-slate-500 italic mb-2 line-clamp-1">"{req.motivo}"</p>
                      )}
                      {mine ? (
                        numInterested > 0 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                            onClick={() => setShowInteresadosFor(req)}
                          >
                            <Users className="w-3 h-3 mr-1" /> Ver {numInterested} interesado{numInterested > 1 ? "s" : ""}
                          </Button>
                        ) : (
                          <div className="w-full h-7 flex items-center justify-center text-xs text-slate-400">Tu solicitud · Sin interesados aún</div>
                        )
                      ) : (
                        <Button
                          size="sm"
                          variant={interested ? "secondary" : "outline"}
                          className="w-full h-7 text-xs"
                          onClick={() => handleInterest(req)}
                          disabled={interested || expressInterestMutation.isPending}
                        >
                          {interested ? <><CheckCircle className="w-3 h-3 mr-1 text-green-600" /> Interés registrado</> : "Me interesa este cambio"}
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-requests" className="flex-1 overflow-y-auto pr-1 -mr-1 mt-2">
            <div className="space-y-2">
              {myRequests.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No tienes solicitudes.</div>
              ) : (
                myRequests.map(req => {
                  const mine = currentEmployee?.id === req.solicitante_id;
                  const numInterested = (req.interesados || []).length;
                  return (
                    <div key={req.id} className="p-3 border rounded-lg bg-slate-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-500">
                          {req.fecha_solicitud ? format(new Date(req.fecha_solicitud), "dd/MM/yyyy") : ""}
                        </span>
                        <Badge className={`text-[10px] ${STATUS_STYLES[req.estado] || "bg-slate-100 text-slate-700"}`}>
                          {req.estado}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold mb-1">
                        {req.fecha_cambio ? format(new Date(req.fecha_cambio), "d MMM yyyy", { locale: es }) : "-"}
                        <span className="ml-2 text-xs font-normal text-slate-500">{req.turno_actual} → {req.turno_deseado}</span>
                      </div>
                      <div className="text-xs text-slate-600 mb-2">
                        {mine
                          ? req.nombre_receptor
                            ? `Aceptado: ${req.nombre_receptor}`
                            : `Sin candidato · ${numInterested} interesado${numInterested !== 1 ? "s" : ""}`
                          : `Solicitante: ${req.nombre_solicitante}`
                        }
                      </div>
                      {mine && numInterested > 0 && req.estado === "Publicado" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-7 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => setShowInteresadosFor(req)}
                        >
                          <Bell className="w-3 h-3 mr-1" /> Ver interesados ({numInterested})
                        </Button>
                      )}
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
            <DialogTitle>Publicar Solicitud de Cambio de Turno</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            {!currentEmployee && (
              <div className="space-y-2">
                <Label>Empleado (Modo admin)</Label>
                <Select
                  value={requestData.employee_id}
                  onValueChange={val => setRequestData({ ...requestData, employee_id: val })}
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
              <Input type="date" required value={requestData.fecha_cambio} onChange={e => setRequestData({ ...requestData, fecha_cambio: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tengo Turno</Label>
                <Select value={requestData.turno_actual} onValueChange={v => setRequestData({ ...requestData, turno_actual: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Mañana", "Tarde", "Noche"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quiero Turno</Label>
                <Select value={requestData.turno_deseado} onValueChange={v => setRequestData({ ...requestData, turno_deseado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Mañana", "Tarde", "Noche"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo (Opcional)</Label>
              <Textarea value={requestData.motivo} onChange={e => setRequestData({ ...requestData, motivo: e.target.value })} placeholder="Ej: Cita médica, asunto personal..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setShowRequestForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={!requestData.fecha_cambio || !requestData.employee_id || createRequestMutation.isPending}>
                Publicar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Interesados */}
      <Dialog open={!!showInteresadosFor} onOpenChange={() => setShowInteresadosFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Interesados en el cambio
            </DialogTitle>
          </DialogHeader>
          {showInteresadosFor && (
            <div className="space-y-3">
              <div className="text-sm text-slate-500 bg-slate-50 rounded p-2">
                Fecha: <strong>{showInteresadosFor.fecha_cambio ? format(new Date(showInteresadosFor.fecha_cambio), "d MMM yyyy", { locale: es }) : "-"}</strong>
                &nbsp;·&nbsp;{showInteresadosFor.turno_actual} → {showInteresadosFor.turno_deseado}
              </div>
              {(showInteresadosFor.interesados || []).length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Nadie ha mostrado interés todavía.</p>
              ) : (
                <ul className="space-y-2">
                  {(showInteresadosFor.interesados || []).map((interesado, i) => (
                    <li key={i} className="flex items-center justify-between p-2 border rounded-lg hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold">{interesado.nombre}</p>
                        <p className="text-xs text-slate-400">{interesado.equipo} · {interesado.fecha_interes ? format(new Date(interesado.fecha_interes), "d MMM HH:mm", { locale: es }) : ""}</p>
                      </div>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        onClick={() => acceptInterestMutation.mutate({ request: showInteresadosFor, interesado })}
                        disabled={acceptInterestMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Aceptar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowInteresadosFor(null)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}