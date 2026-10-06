import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Car, Users, MapPin, Clock, Check, X, MessageSquare } from 'lucide-react';

export default function CarpoolPanel({ workCenter, user, isAdmin }) {
  const { toast } = useToast();
  const [trips, setTrips] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    if (!workCenter) { setLoading(false); return; }
    try {
      const [t, r] = await Promise.all([
        base44.entities.CarpoolTrip.filter({ work_center_id: workCenter.id }),
        base44.entities.CarpoolRequest.filter({})
      ]);
      setTrips(t || []);
      setRequests(r || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [workCenter]);

  const myTrips = trips.filter(t => t.driver_user_id === user?.id || t.passenger_user_id === user?.id);
  const availableTrips = trips.filter(t => t.estado === 'disponible' && t.driver_user_id !== user?.id);

  const createTrip = async (data) => {
    try {
      await base44.entities.CarpoolTrip.create({
        ...data,
        driver_user_id: user.id,
        driver_name: user.full_name,
        work_center_id: workCenter.id,
        work_center_name: workCenter.nombre,
        estado: 'disponible',
        fecha_creacion: new Date().toISOString()
      });
      toast({ title: 'Viaje publicado' });
      setShowCreate(false);
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const requestTrip = async (trip) => {
    try {
      await base44.entities.CarpoolRequest.create({
        trip_id: trip.id,
        trip_driver_user_id: trip.driver_user_id,
        requester_user_id: user.id,
        requester_name: user.full_name,
        work_center_id: workCenter.id,
        estado: 'pendiente',
        fecha_solicitud: new Date().toISOString()
      });
      await base44.entities.CarpoolTrip.update(trip.id, { estado: 'solicitado' });
      toast({ title: 'Plaza solicitada' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const respondRequest = async (req, aceptar) => {
    try {
      await base44.entities.CarpoolRequest.update(req.id, { estado: aceptar ? 'aceptada' : 'rechazada', fecha_respuesta: new Date().toISOString() });
      if (aceptar) {
        const trip = trips.find(t => t.id === req.trip_id);
        await base44.entities.CarpoolTrip.update(trip.id, { estado: 'confirmado', passenger_user_id: req.requester_user_id, passenger_name: req.requester_name, plazas_ocupadas: 1 });
      }
      toast({ title: aceptar ? 'Plaza aceptada' : 'Solicitud rechazada' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const validateTrip = async (trip) => {
    try {
      await base44.entities.CarpoolTrip.update(trip.id, { validado: true, estado: 'completado' });
      toast({ title: 'Viaje validado. Puntos simulados sumados.' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  const cancelTrip = async (trip) => {
    try {
      await base44.entities.CarpoolTrip.update(trip.id, { estado: 'cancelado' });
      toast({ title: 'Viaje cancelado' });
      load();
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium text-muted-foreground">Organiza viajes compartidos con tus compañeros</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-1" /> Publicar viaje</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Car className="w-4 h-4" /> Viajes disponibles</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {availableTrips.length === 0 && <p className="text-sm text-muted-foreground">No hay viajes disponibles.</p>}
            {availableTrips.map(t => (
              <div key={t.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{t.driver_name}</span>
                  <Badge variant="outline" className="text-xs">{t.tipo}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div className="flex items-center gap-1"><CalendarIcon /> {t.fecha}</div>
                  <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.turno} · {t.hora_salida}</div>
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Zona: {t.zona_origen}</div>
                  <div className="flex items-center gap-1"><Users className="w-3 h-3" /> {t.plazas_ofrecidas - t.plazas_ocupadas} plazas</div>
                </div>
                <Button size="sm" className="w-full mt-2" onClick={() => requestTrip(t)}>Solicitar plaza</Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Mis viajes y solicitudes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myTrips.length === 0 && <p className="text-sm text-muted-foreground">Sin viajes propios.</p>}
            {myTrips.map(t => (
              <div key={t.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{t.fecha} · {t.turno}</span>
                  <Badge variant={t.estado === 'confirmado' ? 'default' : 'secondary'} className="text-xs">{t.estado}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">Zona: {t.zona_origen} · {t.driver_user_id === user.id ? 'Conductor' : 'Pasajero'}</div>
                {t.estado === 'confirmado' && !t.validado && (
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => validateTrip(t)}><Check className="w-4 h-4 mr-1" /> Validar viaje</Button>
                )}
                {t.estado !== 'completado' && t.estado !== 'cancelado' && t.driver_user_id === user.id && (
                  <Button size="sm" variant="ghost" className="w-full mt-1 text-red-600" onClick={() => cancelTrip(t)}><X className="w-4 h-4 mr-1" /> Cancelar</Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Solicitudes de plaza (gestión)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {requests.filter(r => r.trip_driver_user_id === user?.id || isAdmin).map(r => (
              <div key={r.id} className="border rounded-lg p-2 text-sm flex items-center justify-between">
                <div>
                  <span className="font-medium">{r.requester_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{new Date(r.fecha_solicitud).toLocaleString('es-ES')}</span>
                </div>
                {r.estado === 'pendiente' ? (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => respondRequest(r, true)}><Check className="w-3.5 h-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => respondRequest(r, false)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ) : <Badge variant="secondary" className="text-xs">{r.estado}</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {showCreate && <CreateTripDialog onSave={createTrip} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function CalendarIcon() { return <span className="text-[10px]">📅</span>; }

function CreateTripDialog({ onSave, onClose }) {
  const [data, setData] = useState({ tipo: 'ida', fecha: new Date().toISOString().slice(0, 10), turno: 'Mañana', hora_salida: '', zona_origen: '', punto_encuentro: '', plazas_ofrecidas: 1, kilometros_estimados: 0, notas: '' });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="!w-[min(90vw,600px)] !max-w-none">
        <DialogHeader><DialogTitle>Publicar viaje compartido</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select value={data.tipo} onValueChange={(v) => setData({ ...data, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ida">Ida</SelectItem><SelectItem value="vuelta">Vuelta</SelectItem><SelectItem value="ida_vuelta">Ida y vuelta</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label>Turno</Label>
              <Select value={data.turno} onValueChange={(v) => setData({ ...data, turno: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Mañana">Mañana</SelectItem><SelectItem value="Tarde">Tarde</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Fecha</Label><Input type="date" value={data.fecha} onChange={e => setData({ ...data, fecha: e.target.value })} /></div>
            <div><Label>Hora salida aprox.</Label><Input type="time" value={data.hora_salida} onChange={e => setData({ ...data, hora_salida: e.target.value })} /></div>
          </div>
          <div><Label>Zona de origen (código postal o zona, NO dirección)</Label><Input value={data.zona_origen} onChange={e => setData({ ...data, zona_origen: e.target.value })} placeholder="Ej: 28806 o Torrejón" /></div>
          <div><Label>Punto de encuentro</Label><Input value={data.punto_encuentro} onChange={e => setData({ ...data, punto_encuentro: e.target.value })} placeholder="Ej: Estación de tren" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Plazas ofrecidas</Label><Input type="number" min="1" max="4" value={data.plazas_ofrecidas} onChange={e => setData({ ...data, plazas_ofrecidas: parseInt(e.target.value) })} /></div>
            <div><Label>Km estimados</Label><Input type="number" value={data.kilometros_estimados} onChange={e => setData({ ...data, kilometros_estimados: parseFloat(e.target.value) })} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(data)}><Check className="w-4 h-4 mr-1" /> Publicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}