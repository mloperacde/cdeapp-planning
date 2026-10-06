import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Award, Gift, Info, TrendingUp } from 'lucide-react';

const CATALOGO = [
  { nombre: 'Tarjeta regalo combustible 20€', puntos: 200, nota: 'Simulado' },
  { nombre: 'Tarjeta regalo Amazon 15€', puntos: 150, nota: 'Simulado' },
  { nombre: 'Tarjeta regalo combustible 10€', puntos: 100, nota: 'Simulado' },
  { nombre: 'Medalla reconocimiento interno', puntos: 50, nota: 'Simulado' },
  { nombre: 'Día libre compensatorio (sujeto a política)', puntos: 500, nota: 'Simulado' },
];

const PUNTOS_POR_VIAJE = 10;
const PUNTOS_POR_KM = 0.5;

export default function IncentivesPanel({ workCenter, user, isAdmin }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!workCenter) { setLoading(false); return; }
      try {
        const t = await base44.entities.CarpoolTrip.filter({ work_center_id: workCenter.id });
        setTrips(t || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [workCenter]);

  const validated = trips.filter(t => t.validado);
  const userValidated = isAdmin ? validated : validated.filter(t => t.driver_user_id === user?.id || t.passenger_user_id === user?.id);

  const totalPoints = userValidated.reduce((s, t) => s + PUNTOS_POR_VIAJE + (t.kilometros_estimados || 0) * PUNTOS_POR_KM, 0);
  const totalKm = userValidated.reduce((s, t) => s + (t.kilometros_estimados || 0), 0);
  const totalCo2 = userValidated.reduce((s, t) => s + (t.emisiones_evitadas_kgco2 || 0), 0);

  const canjeables = CATALOGO.filter(c => totalPoints >= c.puntos);
  const proximos = CATALOGO.filter(c => totalPoints < c.puntos).sort((a, b) => a.puntos - b.puntos);

  return (
    <div className="space-y-4">
      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-3 flex items-start gap-2">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">
            <strong>Simulación.</strong> Los puntos son orientativos y no constituyen un saldo canjeable. No se emiten tarjetas regalo ni pagos reales. Esta herramienta ayuda a comparar escenarios de incentivos antes de su implantación.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Award className="w-4 h-4" /> Mis puntos simulados</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-amber-600">{Math.round(totalPoints)}</p>
              <p className="text-sm text-muted-foreground mt-1">puntos</p>
            </div>
            <div className="space-y-1 text-sm border-t pt-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Viajes validados</span><span>{userValidated.length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Km compartidos</span><span>{totalKm}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">CO₂ evitado (kg)</span><span>{totalCo2.toFixed(1)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Gift className="w-4 h-4" /> Catálogo de recompensas (simulado)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {CATALOGO.map((c) => {
              const alcanzado = totalPoints >= c.puntos;
              const progreso = Math.min(100, (totalPoints / c.puntos) * 100);
              return (
                <div key={c.nombre} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.nombre}</span>
                      <Badge variant={alcanzado ? 'default' : 'outline'} className="text-xs">{c.puntos} pts</Badge>
                    </div>
                    {alcanzado ? <Badge className="text-xs bg-emerald-600">Alcanzable</Badge> : <span className="text-xs text-muted-foreground">{Math.round(c.puntos - totalPoints)} pts restantes</span>}
                  </div>
                  {!alcanzado && <Progress value={progreso} className="h-1.5" />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Comparador de escenarios (gestión)</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
              <div className="border rounded-lg p-3"><p className="text-xs text-muted-foreground">Puntos totales centro</p><p className="text-xl font-bold">{Math.round(validated.reduce((s, t) => s + PUNTOS_POR_VIAJE + (t.kilometros_estimados || 0) * PUNTOS_POR_KM, 0))}</p></div>
              <div className="border rounded-lg p-3"><p className="text-xs text-muted-foreground">Viajes validados</p><p className="text-xl font-bold">{validated.length}</p></div>
              <div className="border rounded-lg p-3"><p className="text-xs text-muted-foreground">Km compartidos</p><p className="text-xl font-bold">{validated.reduce((s, t) => s + (t.kilometros_estimados || 0), 0)}</p></div>
              <div className="border rounded-lg p-3"><p className="text-xs text-muted-foreground">CO₂ evitado (kg)</p><p className="text-xl font-bold">{validated.reduce((s, t) => s + (t.emisiones_evitadas_kgco2 || 0), 0).toFixed(1)}</p></div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Configuración: {PUNTOS_POR_VIAJE} pts/viaje + {PUNTOS_POR_KM} pts/km. Ajustable en futuras versiones.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}