import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Car, Leaf, Award, BookOpen, FileCheck, AlertCircle } from 'lucide-react';

export default function MobilityOverview({ workCenter, plan, isAdmin, user }) {
  const [trips, setTrips] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!workCenter) { setLoading(false); return; }
      try {
        const [t, tr, co] = await Promise.all([
          base44.entities.CarpoolTrip.filter({ work_center_id: workCenter.id }),
          base44.entities.MobilityTraining.filter({ activo: true }),
          base44.entities.MobilityTrainingCompletion.filter({ user_id: user?.id })
        ]);
        setTrips(t || []);
        setTrainings(tr || []);
        setCompletions(co || []);
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [workCenter, user]);

  const validatedTrips = trips.filter(t => t.validado);
  const totalKm = validatedTrips.reduce((s, t) => s + (t.kilometros_estimados || 0), 0);
  const totalCo2 = validatedTrips.reduce((s, t) => s + (t.emisiones_evitadas_kgco2 || 0), 0);
  const totalPoints = validatedTrips.length * 10;
  const measuresDone = (plan?.medidas || []).filter(m => m.estado === 'Implantada').length;
  const measuresTotal = (plan?.medidas || []).length;
  const planProgress = measuresTotal ? Math.round((measuresDone / measuresTotal) * 100) : 0;

  const stats = [
    { label: 'Viajes validados', value: validatedTrips.length, icon: Car, color: 'text-blue-600' },
    { label: 'Km compartidos', value: totalKm, icon: Users, color: 'text-emerald-600' },
    { label: 'CO₂ evitado (kg)', value: totalCo2.toFixed(1), icon: Leaf, color: 'text-green-600' },
    { label: 'Puntos simulados', value: totalPoints, icon: Award, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`w-8 h-8 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileCheck className="w-4 h-4" /> Estado del Plan PMST</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Estado</span>
              <Badge variant={plan?.estado === 'Aprobado' ? 'default' : 'secondary'}>{plan?.estado || 'Sin plan'}</Badge>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Medidas implantadas</span>
                <span>{measuresDone}/{measuresTotal}</span>
              </div>
              <Progress value={planProgress} />
            </div>
            {plan?.proximo_seguimiento && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                Próximo informe seguimiento: {plan.proximo_seguimiento}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-4 h-4" /> Mi formación</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Módulos disponibles</span>
              <span className="font-medium">{trainings.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Completados por mí</span>
              <span className="font-medium">{completions.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Obligatorios pendientes</span>
              <span className="font-medium text-amber-600">
                {trainings.filter(t => t.obligatorio && !completions.some(c => c.training_id === t.id)).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {workCenter?.obligado_pmst && (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-amber-700 dark:text-amber-400">Centro obligado a PMST (Ley 9/2025)</p>
              <p className="text-amber-600 dark:text-amber-500">Supera los umbrales de 200 personas trabajadoras o 100 por turno. Fecha límite: 5 de diciembre de 2026.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}