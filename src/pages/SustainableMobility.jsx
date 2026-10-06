import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/components/permissions/usePermissions';
import MobilityOverview from '@/components/mobility/MobilityOverview';
import PlanPanel from '@/components/mobility/PlanPanel';
import PrivacyPanel from '@/components/mobility/PrivacyPanel';
import CarpoolPanel from '@/components/mobility/CarpoolPanel';
import IncentivesPanel from '@/components/mobility/IncentivesPanel';
import TrainingPanel from '@/components/mobility/TrainingPanel';
import { Leaf, FileText, Shield, Car, Award, BookOpen, Building2, Plus } from 'lucide-react';

const DEFAULT_CENTER = {
  nombre: 'Central de Envasados',
  direccion: 'Calle Miguel Servet, 10',
  poligono_industrial: 'Polígono Industrial La Garena',
  municipio: 'Alcalá de Henares',
  provincia: 'Madrid',
  codigo_postal: '28806',
  obligado_pmst: true,
  autoridad_competente: 'Comunidad de Madrid'
};

export default function SustainableMobility() {
  const { toast } = useToast();
  const { isAdmin, user } = usePermissions();
  const [workCenter, setWorkCenter] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creatingPlan, setCreatingPlan] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let centers = await base44.entities.MobilityWorkCenter.filter({});
        if (centers.length === 0) {
          const wc = await base44.entities.MobilityWorkCenter.create(DEFAULT_CENTER);
          setWorkCenter(wc);
        } else {
          setWorkCenter(centers[0]);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!workCenter) return;
      try {
        const plans = await base44.entities.MobilityPlan.filter({ work_center_id: workCenter.id });
        setPlan(plans[0] || null);
      } catch (e) { console.error(e); }
    })();
  }, [workCenter]);

  const createPlan = async () => {
    setCreatingPlan(true);
    try {
      const p = await base44.entities.MobilityPlan.create({
        work_center_id: workCenter.id,
        work_center_name: workCenter.nombre,
        estado: 'Borrador',
        version: '1.0',
        medidas: [],
        negociacion: [],
        seguimientos: [],
        registrado_edim: false
      });
      setPlan(p);
      toast({ title: 'Plan PMST creado' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setCreatingPlan(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Leaf className="w-6 h-6 text-emerald-600" /> Movilidad Sostenible</h1>
          {workCenter && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" /> {workCenter.nombre} · {workCenter.direccion}, {workCenter.municipio} ({workCenter.provincia})
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="plan" className="text-xs">Plan PMST</TabsTrigger>
          <TabsTrigger value="privacidad" className="text-xs">Privacidad</TabsTrigger>
          <TabsTrigger value="coche" className="text-xs">Coche compartido</TabsTrigger>
          <TabsTrigger value="incentivos" className="text-xs">Incentivos</TabsTrigger>
          <TabsTrigger value="formacion" className="text-xs">Formación</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <MobilityOverview workCenter={workCenter} plan={plan} isAdmin={isAdmin} user={user} />
          {!plan && isAdmin && (
            <Card className="mt-4 border-dashed">
              <CardContent className="p-6 text-center">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No existe un Plan PMST para este centro.</p>
                <Button onClick={createPlan} disabled={creatingPlan}><Plus className="w-4 h-4 mr-1" /> Crear plan PMST</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          {!plan ? (
            <Card><CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">No hay plan creado.</p>
              {isAdmin && <Button onClick={createPlan} disabled={creatingPlan}><Plus className="w-4 h-4 mr-1" /> Crear plan PMST</Button>}
            </CardContent></Card>
          ) : (
            <PlanPanel plan={plan} setPlan={setPlan} workCenter={workCenter} isAdmin={isAdmin} />
          )}
        </TabsContent>

        <TabsContent value="privacidad" className="mt-4">
          <PrivacyPanel workCenter={workCenter} user={user} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="coche" className="mt-4">
          <CarpoolPanel workCenter={workCenter} user={user} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="incentivos" className="mt-4">
          <IncentivesPanel workCenter={workCenter} user={user} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="formacion" className="mt-4">
          <TrainingPanel workCenter={workCenter} user={user} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}