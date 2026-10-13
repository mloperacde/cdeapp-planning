import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Users, RefreshCw, Info } from 'lucide-react';

function Dato({ label, value }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

export default function WorkforceDiagnosisCard({ plan, updatePlan, isAdmin, saving }) {
  const { toast } = useToast();
  const [calculating, setCalculating] = useState(false);
  const datos = plan?.diagnostico?.datos_plantilla;
  const zonas = plan?.diagnostico?.zonas_detalle || [];

  const calcular = async () => {
    setCalculating(true);
    try {
      const res = await base44.functions.invoke('aggregateMobilityDiagnosis', { plan_id: plan.id });
      const data = res?.data || {};
      if (data.error) throw new Error(data.error);
      await updatePlan({ diagnostico: data.diagnostico });
    } catch (e) {
      toast({ title: 'No se pudo calcular el diagnóstico', description: e.message, variant: 'destructive' });
    }
    setCalculating(false);
  };

  const fecha = datos?.generado_el ? new Date(datos.generado_el).toLocaleDateString('es-ES') : null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Datos reales de la plantilla
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Agrega los domicilios de la base maestra por municipio y código postal para calcular las zonas de origen y la distancia media. Solo se guardan datos agregados.
            </p>
          </div>
          {isAdmin && (
            <Button onClick={calcular} disabled={calculating || saving}>
              <RefreshCw className={`w-4 h-4 mr-1 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'Calculando...' : 'Calcular desde la plantilla'}
            </Button>
          )}
        </div>

        {!datos ? (
          <p className="text-xs text-muted-foreground border border-dashed rounded-md p-3">
            Todavía no se ha calculado el agregado de la plantilla.
            {isAdmin ? ' Usa «Calcular desde la plantilla» para rellenar el diagnóstico con los datos reales.' : ' Pide a una persona administradora que lo calcule.'}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Dato label="Personas en alta" value={datos.total_activos} />
              <Dato label="Con domicilio registrado" value={datos.con_domicilio} />
              <Dato label="Origen identificable" value={`${datos.identificados} (${datos.cobertura_pct}%)`} />
              <Dato label="Distancia media estimada" value={datos.distancia_media_km != null ? `${datos.distancia_media_km} km` : '—'} />
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="text-left px-2 py-1 font-semibold">Municipio de origen</th>
                    <th className="text-right px-2 py-1 font-semibold">Personas</th>
                    <th className="text-right px-2 py-1 font-semibold">%</th>
                    <th className="text-right px-2 py-1 font-semibold">Distancia</th>
                  </tr>
                </thead>
                <tbody>
                  {zonas.slice(0, 12).map((z) => (
                    <tr key={z.zona} className="border-t">
                      <td className="px-2 py-1">
                        {z.zona}
                        {z.cp?.length ? <span className="text-muted-foreground"> · CP {z.cp.join(', ')}</span> : null}
                      </td>
                      <td className="px-2 py-1 text-right">{z.personas}</td>
                      <td className="px-2 py-1 text-right">{z.porcentaje}%</td>
                      <td className="px-2 py-1 text-right">{z.km != null ? `${z.km} km` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {zonas.length > 12 && (
                <p className="text-[11px] text-muted-foreground px-2 py-1 border-t">
                  y {zonas.length - 12} municipios más, agrupados como «Otros municipios» en el documento.
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p>
                {datos.identificados} de {datos.con_domicilio} domicilios con municipio identificable
                {datos.sin_identificar ? ` (${datos.sin_identificar} sin identificar)` : ''} · {datos.distancia_base_domicilios} domicilios usados para la distancia media
                {fecha ? ` · actualizado el ${fecha}` : ''}. El reparto modal y las emisiones se completan con la encuesta anónima.
              </p>
            </div>

            {datos.metodo && <p className="text-[11px] text-muted-foreground">Método: {datos.metodo}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}