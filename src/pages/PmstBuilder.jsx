import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { usePermissions } from '@/components/permissions/usePermissions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import PmstWizard from '@/components/mobility/pmst/PmstWizard';
import WorkCenterDialog from '@/components/mobility/pmst/WorkCenterDialog';
import { PMST_DISCLAIMER } from '@/components/mobility/pmst/pmstRequirements';
import { Leaf, Building2, Plus, FileText, ShieldAlert } from 'lucide-react';

export default function PmstBuilder() {
  const { toast } = useToast();
  const { isAdmin } = usePermissions();
  const [centers, setCenters] = useState([]);
  const [centerId, setCenterId] = useState('');
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadCenters = async (selectId) => {
    const list = await base44.entities.MobilityWorkCenter.filter({});
    setCenters(list || []);
    setCenterId(selectId || (list?.[0]?.id ?? ''));
  };

  useEffect(() => {
    (async () => {
      try { await loadCenters(); } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!centerId) { setPlan(null); return; }
      setLoadingPlan(true);
      try {
        const plans = await base44.entities.MobilityPlan.filter({ work_center_id: centerId });
        setPlan((plans || [])[0] || null);
      } catch (e) { console.error(e); }
      setLoadingPlan(false);
    })();
  }, [centerId]);

  const center = centers.find((c) => c.id === centerId);

  const createPlan = async () => {
    setCreating(true);
    try {
      const created = await base44.entities.MobilityPlan.create({
        work_center_id: centerId,
        work_center_name: center?.nombre || '',
        estado: 'Borrador',
        version: '1.0',
        codigo_documento: `PMST-${new Date().getFullYear()}-${String(centers.length).padStart(3, '0')}`,
        identificacion: { centro_nombre: center?.nombre || '', direccion: center?.direccion || '', municipio: center?.municipio || '', provincia: center?.provincia || '', codigo_postal: center?.codigo_postal || '', poligono_industrial: center?.poligono_industrial || '', autoridad_competente: 'Comunidad de Madrid' },
        medidas: [],
        indicadores: [],
        negociacion: [],
        seguimientos: [],
        historial_versiones: [],
        registrado_edim: false,
      });
      setPlan(created);
      toast({ title: 'Plan PMST creado' });
    } catch (e) { toast({ title: 'Error', description: e.message, variant: 'destructive' }); }
    setCreating(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Leaf className="w-6 h-6 text-emerald-600" /> Constructor del PMST</h1>
          <p className="text-sm text-muted-foreground mt-1">Elaboración guiada del Plan de Movilidad Sostenible al Trabajo · Comunidad de Madrid</p>
        </div>
        <div className="flex items-center gap-2">
          {centers.length > 0 && (
            <Select value={centerId} onValueChange={setCenterId}>
              <SelectTrigger className="w-64 h-9"><SelectValue placeholder="Centro de trabajo" /></SelectTrigger>
              <SelectContent>{centers.map((c) => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {isAdmin && <Button variant="outline" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Nuevo centro</Button>}
        </div>
      </div>

      <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-3 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 dark:text-amber-500">{PMST_DISCLAIMER}</p>
        </CardContent>
      </Card>

      {!centers.length ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Crea un centro de trabajo para empezar a elaborar el plan.</p>
            {isAdmin && <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Crear centro de trabajo</Button>}
          </CardContent>
        </Card>
      ) : loadingPlan ? (
        <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : !plan ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <FileText className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No existe un plan PMST para {center?.nombre}. Créalo para abrir el asistente.</p>
            {isAdmin && <Button onClick={createPlan} disabled={creating}><Plus className="w-4 h-4 mr-1" /> {creating ? 'Creando...' : 'Crear plan PMST'}</Button>}
          </CardContent>
        </Card>
      ) : (
        <PmstWizard plan={plan} setPlan={setPlan} workCenter={center} isAdmin={isAdmin} />
      )}

      <WorkCenterDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={(c) => loadCenters(c.id)} />
    </div>
  );
}